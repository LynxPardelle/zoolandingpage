import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { validateReleaseManifest, validateRouteManifest } from './ops/sync-thn-content-hub-v2-front-door.mjs';

const fail = reason => { throw new Error(`THN private artifact rejected: ${reason}`); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hashed = /(?:^|[._-])(?:[A-Fa-f0-9]{8,64}|[A-Z2-7]{8})(?=[._-])/;
const allowed = /\.(?:js|mjs|css|woff2?|ttf|otf|png|jpe?g|webp|avif|svg|ico)$/i;
const forbidden = new Set(['server', 'drafts', '.git', '.github', 'tools', 'node_modules', 'ai_notes', 'findings', 'errors-reports', 'devonly', 'logs', 'reports', '.superpowers']);
const bindingName = 'thn-protected-origin-binding.json';
const exists = async file => { try { await lstat(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };

function resourcePath(value, parent = '') {
  if (typeof value !== 'string' || !value || value.length > 1024 || /[%?#\\\s:]/.test(value) || value.startsWith('//')) fail('resource path');
  const relative = path.posix.normalize(value.startsWith('/') ? value.slice(1) : path.posix.join(path.posix.dirname(parent || '_'), value));
  if (relative.startsWith('../') || relative.split('/').some(part => !/^[A-Za-z0-9][A-Za-z0-9._~-]*$/.test(part) || forbidden.has(part.toLowerCase())) || !allowed.test(relative)) fail('resource boundary');
  return relative;
}

async function regularBytes(root, relative) {
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) fail('linked resource root');
  let target = root;
  const segments = relative.split('/');
  for (let i = 0; i < segments.length; i++) {
    target = path.join(target, segments[i]);
    const stat = await lstat(target);
    if (stat.isSymbolicLink() || (i === segments.length - 1 ? !stat.isFile() : !stat.isDirectory())) fail('linked resource');
  }
  return readFile(target);
}

/** The tracked public manifest, not an ignored draft checkout, owns CI font dependencies. */
export async function thnFontSiteConfig(manifest,browserRoot) {
  const base='/assets/thehairnarrative.com/booksaw-20260827';
  const fields=['schemaVersion','domain','assetSet','preparedOn','timeZone','intendedEnvironment','publicBasePath','totalAssetBytes','handling','imageRights','resolutionCaveat','assets','licenses'];
  if(!manifest||Object.keys(manifest).sort().join(',')!==fields.sort().join(',')||manifest.schemaVersion!==1
    ||manifest.domain!=='thehairnarrative.com'||manifest.assetSet!=='booksaw-20260827'||manifest.intendedEnvironment!=='test'
    ||manifest.publicBasePath!==base||!Array.isArray(manifest.assets))fail('tracked asset manifest schema');
  const expected=['fonts/newsreader-latin-400-normal.woff2','fonts/newsreader-latin-500-normal.woff2',
    'fonts/open-sans-latin-400-normal.woff2','fonts/open-sans-latin-600-normal.woff2'];
  const fonts=manifest.assets.filter(asset=>asset?.contentType==='font/woff2');
  if(JSON.stringify(fonts.map(f=>f.file).sort())!==JSON.stringify(expected.sort()))fail('tracked font inventory');
  const fontFields=['file','publicPath','contentType','bytes','sha256','source','family','weight','style','axes','license'].sort().join(',');
  for(const font of fonts){
    if(Object.keys(font).sort().join(',')!==fontFields||font.publicPath!==base+'/'+font.file
      ||!Number.isSafeInteger(font.bytes)||font.bytes<=0||!/^[a-f0-9]{64}$/.test(font.sha256))fail('tracked font schema');
    const bytes=await regularBytes(browserRoot,resourcePath(font.publicPath));
    if(bytes.length!==font.bytes||hash(bytes)!==font.sha256)fail('tracked font integrity');
  }
  return {domain:manifest.domain,site:{fonts:fonts.map(font=>({src:font.publicPath}))}};
}

/** Build only dependencies reachable from the compiled shell and declared THN fonts/icons. */
export async function prepareThnAdminArtifact({ browserRoot, serverRoot, siteConfig, routeManifest, releaseId, environment, enabled = false }) {
  const releaseFile = path.join(path.dirname(browserRoot), 'thn-admin-release.json');
  const bindingFile = path.join(serverRoot, bindingName);
  if (typeof enabled !== 'boolean') fail('enabled flag');
  if (await exists(releaseFile) || await exists(bindingFile)) fail('stale artifact already exists');
  if (!enabled) return { enabled: false };
  if (environment !== 'test') fail('TEST only');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(releaseId) || siteConfig?.domain !== 'thehairnarrative.com') fail('release/domain');
  const routes = validateRouteManifest(routeManifest);
  const assetUrls = {}, assetHashes = {}, emitted = new Map(), processing = new Set();
  async function visit(relative) {
    if (assetUrls['/' + relative]) return assetUrls['/' + relative];
    if (processing.has(relative)) fail('cyclic CSS import');
    processing.add(relative);
    let bytes;
    try { bytes = await regularBytes(browserRoot, relative); } catch { fail('missing or linked resource'); }
    const extension = path.posix.extname(relative).toLowerCase();
    if (extension === '.js' || extension === '.mjs') {
      if (!hashed.test(path.posix.basename(relative))) fail('unhashed compiled module');
      const url = '/browser/' + relative;
      assetUrls['/' + relative] = url; assetHashes[url] = hash(bytes);
      const file = ts.createSourceFile(relative, bytes.toString('utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      const imports = [];
      function scan(node) {
        let argument;
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) argument = node.moduleSpecifier;
        else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          argument = node.arguments[0];
          if (!argument || !ts.isStringLiteralLike(argument)) fail('unbounded module import');
        }
        if (argument && ts.isStringLiteralLike(argument)) {
          if (!argument.text.startsWith('./') && !argument.text.startsWith('../')) fail('external module import');
          imports.push(resourcePath(argument.text, relative));
        }
        ts.forEachChild(node, scan);
      }
      scan(file);
      for (const dependency of imports) await visit(dependency);
      processing.delete(relative);
      return url;
    }
    let transformed = bytes;
    if (extension === '.css') {
      const source = bytes.toString('utf8');
      const expression = /url\(\s*(['"]?)([^'"\)]+)\1\s*\)|@import\s+(['"])([^'"]+)\3/g;
      let output = '', previous = 0;
      for (const match of source.matchAll(expression)) {
        const value = (match[2] ?? match[4]).trim();
        if (value.startsWith('data:') || value.startsWith('#')) continue;
        const target = await visit(resourcePath(value, relative));
        output += source.slice(previous, match.index) + (match[2] === undefined ? `@import "${target}"` : `url("${target}")`);
        previous = match.index + match[0].length;
      }
      transformed = Buffer.from(output + source.slice(previous));
    }
    const digest = hash(transformed);
    const target = hashed.test(path.posix.basename(relative)) && transformed.equals(bytes)
      ? relative : `thn-admin-assets/${digest.slice(0, 16)}.${path.posix.basename(relative)}`;
    const url = '/browser/' + target;
    assetUrls['/' + relative] = url; assetHashes[url] = digest;
    if (target !== relative) emitted.set(target, transformed);
    processing.delete(relative);
    return url;
  }
  const html = (await regularBytes(browserRoot, 'index.csr.html')).toString('utf8');
  for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*>/g)) {
    const value = tag.match(/\b(?:src|href)=["']([^"']+)["']/)?.[1];
    if (value) await visit(resourcePath(value));
  }
  for (const font of siteConfig.site?.fonts ?? []) await visit(resourcePath(font.src));
  for (const key of ['favicon', 'appleTouchIcon', 'maskIcon', 'manifest']) {
    const value = siteConfig.site?.icons?.[key];
    if (value) await visit(resourcePath(value));
  }
  const staticAssetPaths = Object.keys(assetHashes).sort();
  if (!staticAssetPaths.length || staticAssetPaths.length > 64) fail('bounded asset inventory');
  const release = validateReleaseManifest({ version: 1, environment: 'test', releaseId, staticAssetPaths });
  const binding = { origin: 'https://admin-test.thehairnarrative.com', domain: 'thehairnarrative.com', pagePrefix: '/admin/journal',
    pageRoutes: routes.origins.admin.pageRoutes.map(route => route.path),
    backendRoutes: routes.origins.admin.backendRoutes.map(({path, methods}) => ({path, methods})),
    backendPrefixes: ['/auth-v2', '/features/content-hub-v2/read', '/features/content-hub-v2/action'],
    staticPaths: release.staticAssetPaths, assetUrls: Object.fromEntries(Object.entries(assetUrls).sort()) };
  const bindingPackage = { version: 1, environment: 'test', releaseId, binding,
    assetHashes: Object.fromEntries(Object.entries(assetHashes).sort()) };
  for (const target of emitted.keys()) if (await exists(path.join(browserRoot, target))) fail('stale immutable asset already exists');
  for (const [target, bytes] of emitted) {
    await mkdir(path.dirname(path.join(browserRoot, target)), { recursive: true });
    await writeFile(path.join(browserRoot, target), bytes, { flag: 'wx' });
  }
  await writeFile(bindingFile, JSON.stringify(bindingPackage, null, 2) + '\n', { flag: 'wx' });
  await writeFile(releaseFile, JSON.stringify(release, null, 2) + '\n', { flag: 'wx' });
  return { enabled: true, release, bindingPackage };
}

/** Seal the same TEST selection into the ZIP; a stale/default-off build must never activate it. */
export async function verifyThnAdminArtifact({browserRoot,serverRoot,releaseId,environment,enabled=false}) {
  const releaseFile=path.join(path.dirname(browserRoot),'thn-admin-release.json');
  const bindingFile=path.join(serverRoot,bindingName);
  if(typeof enabled!=='boolean')fail('enabled flag');
  if(!enabled) {
    if(await exists(releaseFile)||await exists(bindingFile))fail('disabled artifact contains private binding');
    return {enabled:false};
  }
  if(environment!=='test')fail('TEST only');
  try {
    const bytes=await regularBytes(path.dirname(browserRoot),'thn-admin-release.json');
    const release=validateReleaseManifest(JSON.parse(bytes));
    if(release.releaseId!==releaseId||bytes.toString('utf8')!==JSON.stringify(release,null,2)+'\n')fail('release selection');
    const bindingPackage=JSON.parse(await regularBytes(serverRoot,bindingName));
    if(JSON.stringify(bindingPackage.binding?.staticPaths)!==JSON.stringify(release.staticAssetPaths))fail('manifest drift');
    const actualHashes={};
    for(const asset of release.staticAssetPaths)actualHashes[asset]=hash(await regularBytes(browserRoot,asset.slice('/browser/'.length)));
    // Reuse the runtime's closed validator rather than maintain a second binding schema.
    const source=await readFile(new URL('../src/app/shared/utility/auth/protected-admin-origin.utility.ts',import.meta.url),'utf8');
    const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
    const {readPackagedProtectedOrigin}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
    if(!readPackagedProtectedOrigin(bindingPackage,asset=>actualHashes[asset],releaseId))fail('binding integrity');
    return {enabled:true,release};
  }catch{fail('build selection or integrity');}
}

async function main() {
  if (process.argv.length !== 2) fail('arguments');
  const flag = process.env.THN_ADMIN_ARTIFACT_ENABLED ?? 'false';
  if (!['true', 'false'].includes(flag)) fail('enabled flag');
  const root = path.resolve('dist/zoolandingpage');
  const enabled = flag === 'true';
  const result = await prepareThnAdminArtifact({ browserRoot: path.join(root, 'browser'), serverRoot: path.join(root, 'server'), enabled,
    environment: process.env.DEPLOY_ENV, releaseId: process.env.RELEASE_ID,
    siteConfig: enabled ? await thnFontSiteConfig(JSON.parse(await readFile('public/assets/thehairnarrative.com/booksaw-20260827/asset-manifest.txt','utf8')),path.join(root,'browser')) : undefined,
    routeManifest: enabled ? JSON.parse(await readFile(new URL('./ops/thn-content-hub-v2-route-manifest.json', import.meta.url), 'utf8')) : undefined });
  console.log(JSON.stringify({ ok: true, adminEnabled: enabled, staticAssetCount: result.release?.staticAssetPaths.length ?? 0, deployed: false }));
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
