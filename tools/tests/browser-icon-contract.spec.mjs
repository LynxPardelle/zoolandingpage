import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const repoRoot = resolve(import.meta.dirname, '../..');
const indexHtml = readFileSync(resolve(repoRoot, 'src/index.html'), 'utf8');
const nginxConfig = readFileSync(resolve(repoRoot, 'nginx.conf'), 'utf8');
const defaultFaviconPath = resolve(repoRoot, 'public/assets/brand/zoolandingpage-default-favicon.svg');
const legacyFaviconPath = resolve(repoRoot, 'public/favicon.ico');
const inheritedAngularFaviconBlob = '57614f9c967596fad0a3989bec2b1deff33034f6';

function relTokens(linkTag) {
  const rel = linkTag.match(/\brel\s*=\s*(["'])(.*?)\1/i)?.[2] ?? '';
  return rel.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function gitBlobOid(contents) {
  return createHash('sha1')
    .update(`blob ${contents.length}\0`)
    .update(contents)
    .digest('hex');
}

function readPngBackedIcoSizes(contents) {
  assert.equal(contents.readUInt16LE(0), 0);
  assert.equal(contents.readUInt16LE(2), 1);
  const count = contents.readUInt16LE(4);
  assert.ok(count > 0);

  const sizes = [];
  for (let index = 0; index < count; index += 1) {
    const entryOffset = 6 + (index * 16);
    const width = contents[entryOffset] || 256;
    const height = contents[entryOffset + 1] || 256;
    const resourceLength = contents.readUInt32LE(entryOffset + 8);
    const resourceOffset = contents.readUInt32LE(entryOffset + 12);
    const signature = contents.subarray(resourceOffset, resourceOffset + 8).toString('hex');

    assert.equal(width, height);
    assert.ok(resourceOffset + resourceLength <= contents.length);
    assert.equal(signature, '89504e470d0a1a0a');
    sizes.push(width);
  }

  return sizes;
}

test('the static shell exposes one Zoolandingpage favicon without an Angular fallback', () => {
  const faviconLinks = Array.from(indexHtml.matchAll(/<link\b[^>]*>/gi), match => match[0])
    .filter(linkTag => relTokens(linkTag).includes('icon'));

  assert.equal(faviconLinks.length, 1);
  assert.match(faviconLinks[0], /href=["']\/assets\/brand\/zoolandingpage-default-favicon\.svg["']/i);
  assert.doesNotMatch(indexHtml, /(?:alternate\s+icon|\/favicon\.ico)/i);
  assert.equal(existsSync(legacyFaviconPath), true, 'the static origin must keep a safe legacy favicon');
  const legacyFavicon = readFileSync(legacyFaviconPath);
  assert.notEqual(
    gitBlobOid(legacyFavicon),
    inheritedAngularFaviconBlob,
    'the inherited Angular favicon must not remain in the static release',
  );
  assert.deepEqual(readPngBackedIcoSizes(legacyFavicon), [16, 32, 48, 64, 128, 256]);
  assert.equal(existsSync(defaultFaviconPath), true, 'the configured fallback favicon must exist');
  assert.match(readFileSync(defaultFaviconPath, 'utf8'), /<svg\b/i);
});

test('the static-server legacy favicon route redirects without preserving the Angular cache', () => {
  const legacyLocation = nginxConfig.match(/location\s*=\s*\/favicon\.ico\s*\{([^{}]*)\}/i)?.[1] ?? '';

  assert.match(legacyLocation, /return\s+302\s+\/assets\/brand\/zoolandingpage-default-favicon\.svg;/i);
  assert.match(legacyLocation, /Cache-Control\s+"no-store"/i);
  assert.match(
    legacyLocation,
    /absolute_redirect\s+off;/i,
    'the relative redirect must stay scheme-neutral behind the TLS-terminating proxy',
  );
});
