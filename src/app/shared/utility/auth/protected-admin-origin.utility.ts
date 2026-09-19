/** Public-safe identity is supplied by the SSR request context, never a query/header. */
export type ProtectedOriginContext = { origin: string; domain: string; originRole: 'protected-admin'; assetUrls?: Readonly<Record<string,string>> };
export type ProtectedOriginBinding = {
  origin: string; domain: string; pagePrefix: string; pageRoutes: readonly string[];
  backendRoutes: readonly { path: string; methods: readonly string[] }[];
  backendPrefixes: readonly string[]; staticPaths: readonly string[];
  assetUrls?: Readonly<Record<string,string>>;
};
export type ProtectedOriginDecision = {kind: 'deny' | 'public' | 'page' | 'asset' | 'backend'; context?: ProtectedOriginContext};
const safePath = (value: string): boolean => /^\/[A-Za-z0-9_./:-]*$/.test(value)
  && !value.includes('//') && !value.split('/').some(part => part === '.' || part === '..');
export function isExactHttpsOrigin(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { const url = new URL(value); return url.protocol === 'https:' && url.origin === value && !url.username && !url.password; }
  catch { return false; }
}
export function isProtectedOriginBinding(value: unknown): value is ProtectedOriginBinding {
  if (!value || typeof value !== 'object') return false;
  const v = value as ProtectedOriginBinding;
  return isExactHttpsOrigin(v.origin) && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(v.domain)
    && typeof v.pagePrefix === 'string' && safePath(v.pagePrefix) && v.pagePrefix !== '/'
    && Array.isArray(v.pageRoutes) && v.pageRoutes.length > 0 && v.pageRoutes.every(p => typeof p === 'string' && safePath(p) && (p === v.pagePrefix || p.startsWith(v.pagePrefix + '/')))
    && Array.isArray(v.backendPrefixes) && v.backendPrefixes.every(p => typeof p === 'string' && safePath(p) && p !== '/')
    && Array.isArray(v.backendRoutes) && v.backendRoutes.every(r => r && typeof r.path === 'string' && safePath(r.path) && v.backendPrefixes.some(p => r.path === p || r.path.startsWith(p + '/')) && Array.isArray(r.methods) && r.methods.length > 0 && r.methods.every((m: unknown) => typeof m === 'string' && ['GET','POST'].includes(m)))
    && Array.isArray(v.staticPaths) && v.staticPaths.every(p => typeof p === 'string' && safePath(p) && /\.(js|mjs|css|woff2?|ttf|otf|png|jpe?g|webp|avif|svg|ico)$/.test(p))
    && (v.assetUrls === undefined || (isProtectedAssetMap(v.assetUrls) && Object.values(v.assetUrls).every(p => v.staticPaths.includes(p))));
}
export function isProtectedAssetMap(value: unknown): value is Readonly<Record<string,string>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries=Object.entries(value);
  return entries.length>0 && entries.length<=64 && entries.every(([source,target])=>safePath(source)
    && !source.includes(':') && !source.split('/').some(p=>p.startsWith('_')||p==='server'||p==='drafts')
    && typeof target==='string' && safePath(target) && target.startsWith('/browser/')
    && /(?:^|[._-])(?:[A-Fa-f0-9]{8,64}|[A-Z2-7]{8})(?=[._-])/.test(target.split('/').at(-1)??'')
    && /\.(js|mjs|css|woff2?|ttf|otf|png|jpe?g|webp|avif|svg|ico)$/.test(target));
}
/** Only explicit server-selected static resources are rewritten; navigation is unchanged. */
export function projectProtectedAssetAttributes(html: string, assetUrls?: Readonly<Record<string,string>>): string {
  if (!assetUrls) return html;
  return html.replace(/\b(src|href)=(["'])([^"']*)\2/g, (match, attribute:string, quote:string, value:string)=>{
    const source=value.startsWith('/')?value:'/'+value;
    return Object.prototype.hasOwnProperty.call(assetUrls,source)?`${attribute}=${quote}${assetUrls[source]}${quote}`:match;
  });
}
/** A malformed/mismatched optional artifact disables only the private surface. */
export function readPackagedProtectedOrigin(value: unknown, assetHash: (path:string)=>string, expectedReleaseId?:string): ProtectedOriginBinding | null {
  try {
    const v=value as {version:number;environment:string;releaseId:string;binding:ProtectedOriginBinding;assetHashes:Record<string,string>};
    if (!v || Object.keys(v).sort().join(',')!=='assetHashes,binding,environment,releaseId,version' || v.version!==1 || v.environment!=='test'
      || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(v.releaseId) || (expectedReleaseId!==undefined&&v.releaseId!==expectedReleaseId)
      || !isProtectedOriginBinding(v.binding) || v.binding.origin!=='https://admin-test.thehairnarrative.com'
      || v.binding.domain!=='thehairnarrative.com' || !v.binding.assetUrls || v.binding.pagePrefix!=='/admin/journal') return null;
    if (Object.keys(v.binding).sort().join(',')!=='assetUrls,backendPrefixes,backendRoutes,domain,origin,pagePrefix,pageRoutes,staticPaths') return null;
    const pages=['/admin/journal','/admin/journal/access','/admin/journal/mfa','/admin/journal/new','/admin/journal/:articleId/edit','/admin/journal/:articleId/preview'];
    const backend=[['/auth-v2/runtime-config',['GET','POST']],['/auth-v2/session/signin',['POST']],['/auth-v2/session/challenge/respond',['POST']],
      ['/auth-v2/session/mfa/setup',['POST']],['/auth-v2/session/mfa/verify',['POST']],['/auth-v2/session/me',['GET']],['/auth-v2/session/logout',['POST']],
      ['/features/content-hub-v2/read',['POST']],['/features/content-hub-v2/action',['POST']]];
    if (JSON.stringify([...v.binding.pageRoutes].sort())!==JSON.stringify(pages.sort())
      || JSON.stringify(v.binding.backendPrefixes)!==JSON.stringify(['/auth-v2','/features/content-hub-v2/read','/features/content-hub-v2/action'])
      || JSON.stringify(v.binding.backendRoutes.map(r=>[r.path,r.methods]))!==JSON.stringify(backend)) return null;
    const paths=[...v.binding.staticPaths].sort();
    if (!paths.length || paths.length>64 || new Set(paths).size!==paths.length
      || JSON.stringify(Object.keys(v.assetHashes).sort())!==JSON.stringify(paths)
      || JSON.stringify([...new Set(Object.values(v.binding.assetUrls))].sort())!==JSON.stringify(paths)) return null;
    for (const p of paths) if (!/^[a-f0-9]{64}$/.test(v.assetHashes[p]) || assetHash(p)!==v.assetHashes[p]) return null;
    return v.binding;
  } catch { return null; }
}
export function classifyProtectedOriginRequest(host: string, rawPath: string, method: string, binding: ProtectedOriginBinding): ProtectedOriginDecision {
  if (!isProtectedOriginBinding(binding)) return {kind:'deny'};
  let url: URL;
  try { url = new URL(rawPath, binding.origin); } catch { return {kind:'deny'}; }
  const privateHost = host.toLowerCase() === new URL(binding.origin).host;
  // Decode before rejecting public-host aliases; an upstream router may decode again.
  let decoded = url.pathname;
  try {
    for(let i=0; i<4 && decoded.includes('%'); i++) decoded = decodeURIComponent(decoded);
    if(decoded.includes('%') || decoded.includes('\\')) return {kind:'deny'};
    decoded = new URL(decoded,binding.origin).pathname;
  } catch { return {kind:'deny'}; }
  const reserved = [binding.pagePrefix, ...binding.backendPrefixes].some(p => decoded.startsWith(p));
  if (!privateHost) return {kind: reserved ? 'deny' : 'public'};
  if (!rawPath.startsWith('/') || rawPath.startsWith('//') || !safePath(rawPath.split('?')[0]) || url.origin !== binding.origin
    || [...url.searchParams.keys()].some(k => /^(draftDomain|draftPageId|debugWorkspace)(=|$)/i.test(k))) return {kind:'deny'};
  const matches = (pattern: string): boolean => {
    const parts = pattern.split('/'); const actual = url.pathname.split('/');
    return parts.length === actual.length && parts.every((p,i) => p.startsWith(':') ? /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(actual[i]) : p === actual[i]);
  };
  const context: ProtectedOriginContext = {origin:binding.origin,domain:binding.domain,originRole:'protected-admin',...(binding.assetUrls?{assetUrls:binding.assetUrls}:{})};
  if ((method === 'GET' || method === 'HEAD') && binding.pageRoutes.some(matches)) return {kind:'page',context};
  if ((method === 'GET' || method === 'HEAD') && binding.staticPaths.includes(url.pathname)) return {kind:'asset',context};
  if (binding.backendRoutes.some(r => r.methods.includes(method) && matches(r.path))) return {kind:'backend',context};
  return {kind:'deny'};
}
export function canResolveProtectedAuth(requiredOrigin: string | undefined, origin: string, context: {
  path?: string; originRole?: string; route?: { auth?: { required?: boolean } } | null;
}): boolean {
  if (requiredOrigin === undefined) return true; // Existing drafts retain their bootstrap behavior.
  return isExactHttpsOrigin(requiredOrigin) && origin === requiredOrigin && context.originRole === 'protected-admin'
    && context.route?.auth?.required === true && /^\/admin\/journal(?:\/|$)/.test(context.path ?? '');
}
