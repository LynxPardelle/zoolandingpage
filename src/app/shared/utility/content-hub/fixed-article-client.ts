/** Opt-in private v2 transport. No protected request is sent from public pages. */
export type FixedEditorBinding = {
  requiredOrigin: string; domain: string; hubId: string; authProfileId: string;
  csrfCookieName: string; basePath: string;
};
export type FixedEditorBrowserContext = {
  origin: string; path: string; surface: string; cookie(): string;
};
export class FixedEditorTransportError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}
const READS = new Set(['articleList', 'articleDetail', 'taxonomyList', 'assetList', 'publicBundlePreview']);
const ACTIONS = new Set(['createArticle', 'updatePackage', 'uploadAsset', 'validate', 'publish', 'unpublishArticle']);
const safeId = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

function validateImagePayload(data: Record<string, unknown>): void {
  const {imageBase64, ...metadata} = data;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(String(metadata['contentType']))
      || typeof imageBase64 !== 'string' || imageBase64.length === 0 || imageBase64.length > 5_592_408
      || new TextEncoder().encode(JSON.stringify(metadata)).byteLength > 65_536) {
    throw new FixedEditorTransportError(413, 'invalid_image_payload');
  }
  let decoded: string;
  try { decoded = atob(imageBase64); } catch { throw new FixedEditorTransportError(413, 'invalid_image_payload'); }
  if (decoded.length > 4_194_304 || btoa(decoded) !== imageBase64) throw new FixedEditorTransportError(413, 'invalid_image_payload');
}

export class FixedArticleClient {
  constructor(private readonly binding: FixedEditorBinding, private readonly context: FixedEditorBrowserContext,
              private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis)) {}

  read<T>(operation: string, data: Record<string, unknown>): Promise<T> { return this.request<T>('read', operation, data); }
  action<T>(operation: string, data: Record<string, unknown>): Promise<T> { return this.request<T>('action', operation, data); }

  private async request<T>(kind: 'read' | 'action', operation: string, data: Record<string, unknown>): Promise<T> {
    const { binding, context } = this;
    let required: URL;
    try { required = new URL(binding.requiredOrigin); } catch { throw new FixedEditorTransportError(403, 'origin_denied'); }
    if (required.protocol !== 'https:' || required.origin !== binding.requiredOrigin || context.origin !== required.origin
        || context.surface !== 'protected-admin' || !/^\/admin\/journal(?:\/|$)/.test(context.path)
        || binding.basePath !== '/features/content-hub-v2' || !safeId.test(binding.hubId) || !safeId.test(binding.authProfileId)
        || !/^[a-z0-9.-]+$/.test(binding.domain) || !(kind === 'read' ? READS : ACTIONS).has(operation)) {
      throw new FixedEditorTransportError(403, 'origin_denied');
    }
    const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json',
      'X-ZLP-Domain': binding.domain, 'X-ZLP-Auth-Profile-Id': binding.authProfileId, 'X-ZLP-Content-Hub-Id': binding.hubId };
    if (kind === 'action') {
      if (!/^zlp_csrf_[a-z0-9_]{1,64}$/.test(binding.csrfCookieName)) throw new FixedEditorTransportError(403, 'csrf_denied');
      const values = context.cookie().split(';').map(v => v.trim()).filter(v => v.startsWith(binding.csrfCookieName + '='));
      const csrf = values.length === 1 ? values[0].slice(binding.csrfCookieName.length + 1) : '';
      if (!csrf || csrf.length > 2048 || /[\s\r\n]/.test(csrf)) throw new FixedEditorTransportError(403, 'csrf_denied');
      headers['X-ZLP-CSRF'] = csrf;
    }
    if (kind === 'action' && operation === 'uploadAsset') validateImagePayload(data);
    const body = JSON.stringify({ domain: binding.domain, input: { contentHub: { hubId: binding.hubId, [kind]: operation, data } } });
    const maxBytes = kind === 'action' && operation === 'uploadAsset' ? 5_750_000 : 600_000;
    if (new TextEncoder().encode(body).byteLength > maxBytes) throw new FixedEditorTransportError(413, 'request_too_large');
    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(),
      operation === 'publish' || operation === 'unpublishArticle' ? 120_000 : operation === 'uploadAsset' ? 60_000 : 15_000);
    try {
      const response = await this.fetcher(binding.basePath + '/' + kind, { method: 'POST', headers, body,
        credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal });
      const parsed: unknown = await response.json();
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new FixedEditorTransportError(502, 'invalid_response');
      const result = parsed as Record<string, unknown>;
      if (!response.ok || result['ok'] !== true) {
        const code = typeof result['code'] === 'string' && /^[a-z_]{1,64}$/.test(result['code']) ? result['code'] : 'request_failed';
        throw new FixedEditorTransportError(response.status, code);
      }
      return result['data'] as T;
    } finally { globalThis.clearTimeout(timer); }
  }
}
