import type { FixedArticleClient } from './fixed-article-client';
import type { FixedArticleEditor } from '../../../state/blog/fixed-article-editor';

type NormalizedImage = { imageBase64: string; contentType: string };
type PrivateAsset = { assetId: string; status: string; alt: string; width: number; height: number };
type PreviewAsset = PrivateAsset & NormalizedImage;
type Normalizer = (source: Blob) => Promise<NormalizedImage>;
type PreviewUrls = { create(blob: Blob): string; revoke(url: string): void };
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 4_194_304;
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;

/** Canvas re-encodes pixels only: filename, EXIF and location are not sent. */
export async function preparePrivateImage(file: Blob): Promise<NormalizedImage> {
  if (!file || !TYPES.has(file.type) || file.size <= 0 || file.size > 8_388_608) throw new Error('invalid_source');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    if (bitmap.width <= 0 || bitmap.height <= 0 || bitmap.width > 8000 || bitmap.height > 8000
        || bitmap.width * bitmap.height > 24_000_000) throw new Error('image_dimensions');
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('image_processing_failed');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const output = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('image_processing_failed')), 'image/webp', 0.9));
    if (!TYPES.has(output.type) || output.size <= 0 || output.size > MAX_BYTES) throw new Error('image_too_large');
    const bytes = new Uint8Array(await output.arrayBuffer());
    // Chunking avoids a call-stack-sized spread on images near the byte limit.
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    return { contentType: output.type, imageBase64: btoa(binary) };
  } finally { bitmap.close(); }
}

export class FixedArticleMedia {
  private status: 'idle' | 'normalizing' | 'uploading' | 'saving' | 'error' = 'idle';
  private generation = 0;
  private readonly previews = new Map<string, string>();
  private readonly listeners = new Set<() => void>();

  constructor(private readonly client: Pick<FixedArticleClient, 'action' | 'read'>,
              private readonly editor: Pick<FixedArticleEditor, 'snapshot' | 'canLeave' | 'change' | 'flush'>,
              private readonly normalize: Normalizer = preparePrivateImage,
              private readonly urls: PreviewUrls = { create: blob => URL.createObjectURL(blob), revoke: url => URL.revokeObjectURL(url) }) {}

  snapshot() { return { status: this.status }; }
  subscribe(callback: () => void) { this.listeners.add(callback); return () => this.listeners.delete(callback); }
  private setStatus(status: typeof this.status) { this.status = status; this.listeners.forEach(callback => callback()); }

  uploadCover(file: Blob, alt: string) { return this.upload(file, alt, 'cover'); }
  uploadInline(file: Blob, alt: string) { return this.upload(file, alt, 'inline'); }

  private async upload(file: Blob, alt: string, placement: 'cover' | 'inline'): Promise<void> {
    if (this.status !== 'idle' && this.status !== 'error') throw new Error('upload_busy');
    const initial = this.editor.snapshot(), generation = this.generation;
    const imageCount = () => this.editor.snapshot().package.delta.ops.filter(op => typeof op.insert === 'object').length;
    const sameEditor = () => {
      const current = this.editor.snapshot();
      if (generation !== this.generation || current.articleId !== initial.articleId || current.locale !== initial.locale) throw new Error('editor_changed');
      if (placement === 'inline' && imageCount() >= 20) throw new Error('image_limit');
      return current;
    };
    if (!initial.articleId || !ID.test(initial.articleId) || !alt.trim() || alt.length > 240) throw new Error('image_alt_required');
    sameEditor();
    this.setStatus('saving');
    try {
      if (!await this.editor.canLeave()) throw new Error('save_required');
      sameEditor();
      this.setStatus('normalizing');
      const image = await this.normalize(file);
      sameEditor();
      if (!await this.editor.canLeave()) throw new Error('save_required');
      const saved = sameEditor();
      this.setStatus('uploading');
      const result = await this.client.action<{asset:PrivateAsset}>('uploadAsset', {
        articleId: saved.articleId, locale: saved.locale, concurrencyToken: saved.concurrencyToken, alt: alt.trim(), ...image,
      });
      const current = sameEditor(), asset = result?.asset;
      if (!asset || !ID.test(asset.assetId) || asset.status !== 'ready') throw new Error('invalid_image_response');
      if (placement === 'cover') this.editor.change({cover:{assetId:asset.assetId,alt:alt.trim(),focalX:50,focalY:50}});
      else this.editor.change({delta:{ops:[...current.package.delta.ops,{insert:{image:asset.assetId}},{insert:'\n'}]}});
      this.setStatus('saving');
      await this.editor.flush();
      if (this.editor.snapshot().dirty) throw new Error('save_required');
      this.setStatus('idle');
    } catch (error) { if (generation === this.generation) this.setStatus('error'); throw error; }
  }

  async preview(assetId: string): Promise<string> {
    const snapshot = this.editor.snapshot(), generation = this.generation;
    if (!ID.test(assetId) || !snapshot.articleId) throw new Error('invalid_preview');
    const key = [snapshot.articleId, snapshot.locale, assetId].join(':');
    const cached = this.previews.get(key);
    if (cached) return cached;
    const result = await this.client.read<{items:PreviewAsset[]}>('assetList', {articleId:snapshot.articleId,locale:snapshot.locale,assetId});
    const asset = result?.items?.length === 1 ? result.items[0] : null;
    if (!asset || asset.assetId !== assetId || !TYPES.has(asset.contentType)
        || typeof asset.imageBase64 !== 'string' || asset.imageBase64.length > 5_592_408) throw new Error('invalid_preview');
    const current = this.editor.snapshot();
    if (generation !== this.generation || current.articleId !== snapshot.articleId || current.locale !== snapshot.locale) throw new Error('editor_changed');
    let binary: string;
    try { binary = atob(asset.imageBase64); } catch { throw new Error('invalid_preview'); }
    if (!binary.length || binary.length > MAX_BYTES || btoa(binary) !== asset.imageBase64) throw new Error('invalid_preview');
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    // Concurrent image requests reuse one URL; private bytes live in memory only.
    const previous = this.previews.get(key);
    if (previous) return previous;
    const url = this.urls.create(new Blob([bytes], {type:asset.contentType}));
    this.previews.set(key,url);
    return url;
  }

  async hydratePreview(html: string): Promise<string> {
    if (typeof html !== 'string' || html.length > 3_200_000) throw new Error('invalid_preview_markup');
    const template = document.createElement('template');
    // Template contents are inert; no source is attached to the live document
    // before the full allowlist has been checked and private reads finish.
    template.innerHTML = html;
    const allowed = new Set(['P','H2','H3','STRONG','EM','A','UL','OL','LI','BLOCKQUOTE','FIGURE','IMG']);
    const elements = Array.from(template.content.querySelectorAll('*'));
    const images: HTMLImageElement[] = [];
    for (const element of elements) {
      const attrs = element.tagName === 'A' ? ['href'] : element.tagName === 'IMG' ? ['data-private-asset','alt'] : [];
      if (!allowed.has(element.tagName) || Array.from(element.attributes).some(attr => !attrs.includes(attr.name))) throw new Error('invalid_preview_markup');
      if (element.tagName === 'A') {
        const href = element.getAttribute('href') ?? '';
        if (!href || (!/^\/(?!\/)/.test(href) && !/^https:\/\/|^mailto:/i.test(href)) || /[\u0000-\u0020\\]/.test(href)) throw new Error('invalid_preview_markup');
      }
      if (element.tagName === 'IMG') {
        if (!ID.test(element.getAttribute('data-private-asset') ?? '')) throw new Error('invalid_preview_markup');
        images.push(element as HTMLImageElement);
      }
    }
    if (images.length > 20) throw new Error('invalid_preview_markup');
    const generation = this.generation;
    for (const image of images) {
      image.src = await this.preview(image.getAttribute('data-private-asset')!);
      image.removeAttribute('data-private-asset');
    }
    if (generation !== this.generation) throw new Error('editor_changed');
    return template.innerHTML;
  }

  cancel() {
    this.generation++;
    this.setStatus('idle');
  }

  destroy() {
    this.cancel();
    this.previews.forEach(url => this.urls.revoke(url)); this.previews.clear(); this.listeners.clear();
  }
}
