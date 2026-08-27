import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const publicBasePath = '/assets/thehairnarrative.com/booksaw-20260827';
const assetRoot = path.join(repoRoot, 'public', publicBasePath.slice(1));
const approved = {
  'images/narrative-hero.webp': [59032, 'c128eb1fb000840a5a60a07cf49b417970b6f8c81af976b139118150b3eeb061'],
  'images/journal-form-movement.webp': [47284, '7ce0c84c10f84e6ef294e315b1ae8d04dfe07b30fa8e4904f071d93f97fda8d7'],
  'images/journal-observation-process.webp': [47096, '75b9ba90b7c1351ec36abd433966133db403cf781d3c93f9c45cfe8f11081458'],
  'images/journal-bridal-forms.webp': [35654, '772c004bce663c753b705c9f183d873984a2357b1bb6d8b93776c26da5c6483c'],
  'images/practice-journal-form-movement.webp': [27950, '38c4791a1de262a05f52275e12be9732c1e5e1214188e7299868022114608546'],
  'images/practice-journal-observation-process.webp': [26778, '92ad7b7d2f5ccdf54562bc3d2a93dc780ae6c8772b2981ce5ba3d04d34e462ea'],
  'images/practice-journal-bridal-forms.webp': [19810, 'd6f8eb21da1699c9908574633736c9daf55d934dfe9021e8601749cc793863df'],
  'images/nina-studio-portrait.webp': [13394, 'bedcbd95f97a49e8aa5083bcc01db0dcdf439879a2fba35156815be5a4204c9f'],
  'images/practice-design-sketch.webp': [12638, '530b15c77b6026757445665010a7c418ab4a3ed668312b0b98b476b69984e39d'],
  'images/practice-references.webp': [17796, '872eef00e34504f3ace9e3f280418c2a31cc29fbd3088e1505ad4638e7db5d0f'],
  'images/practice-hands.webp': [13930, '5305e5301ea28623b85d0ec1451ef485bc12d53d065103a33ebc8c8e4d390369'],
  'fonts/newsreader-latin-400-normal.woff2': [57268, '725d78a558da7c48dd6753e4aa21bc40b4a5dc721c457e2b7d3ef782e8a9904b'],
  'fonts/newsreader-latin-500-normal.woff2': [60724, 'd411a65041e3042e040c79ab7d128b0707002718a72c3cdb72f4b5461376ab07'],
  'fonts/open-sans-latin-400-normal.woff2': [18640, '0e44026ad31376af1b56593cd4acb4f353f8e8789c51759e18f64578e4ef296a'],
  'fonts/open-sans-latin-600-normal.woff2': [18620, 'a97a6ed7ef9f75c495e9224f5c59b2271d826e4a4345b738b390b0c76cc9f412'],
};
const approvedLicenses = {
  'fonts/Newsreader-OFL.txt': [4394, 'fdfad38143ec470553cae82a1e45320bdd1b9ec70415d37bd0171051d8a4ded8'],
  'fonts/OpenSans-OFL.txt': [4389, 'fbbbcfef55318de350562559b671360de6d597112ecc5c73881b05092db89602'],
};

function readManifest() {
  const manifestPath = path.join(assetRoot, 'asset-manifest.txt');
  assert.ok(existsSync(manifestPath), 'Approved public assets and provenance must be present in the hub checkout');
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

function listFiles(directory, root = directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    assert.equal(entry.isSymbolicLink(), false, `Do not publish symlinks: ${entry.name}`);
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(child, root);
    assert.equal(entry.isFile(), true, `Unexpected public filesystem entry: ${entry.name}`);
    return [path.relative(root, child).replaceAll('\\', '/')];
  });
}

function assertPinnedFile(file, expected) {
  const bytes = readFileSync(path.join(assetRoot, file));
  assert.equal(bytes.length, expected[0], `${file} changed size`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected[1], `${file} differs from approved bytes`);
  return bytes;
}

test('THN public manifest contains exactly the fifteen approved same-origin assets', () => {
  const manifest = readManifest();
  assert.deepEqual(Object.keys(manifest).sort(), [
    'schemaVersion', 'domain', 'assetSet', 'preparedOn', 'timeZone', 'intendedEnvironment',
    'publicBasePath', 'totalAssetBytes', 'handling', 'imageRights', 'resolutionCaveat', 'assets', 'licenses',
  ].sort());
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.domain, 'thehairnarrative.com');
  assert.equal(manifest.assetSet, 'booksaw-20260827');
  assert.equal(manifest.intendedEnvironment, 'test');
  assert.equal(manifest.publicBasePath, publicBasePath);
  assert.equal(manifest.totalAssetBytes, 476614);
  assert.equal(manifest.assets.length, 15);
  assert.deepEqual(manifest.assets.map(asset => asset.file).sort(), Object.keys(approved).sort());
  for (const asset of manifest.assets) {
    const mediaFields = asset.file.endsWith('.webp')
      ? ['width', 'height'] : ['family', 'weight', 'style', 'axes', 'license'];
    assert.deepEqual(Object.keys(asset).sort(), [
      'file', 'publicPath', 'contentType', 'bytes', 'sha256', 'source', ...mediaFields,
    ].sort());
    const expected = approved[asset.file];
    assert.equal(asset.bytes, expected[0]);
    assert.equal(asset.sha256, expected[1]);
    assert.equal(asset.publicPath, `${publicBasePath}/${asset.file}`);
    assert.match(asset.publicPath, /^\/assets\/thehairnarrative\.com\/booksaw-20260827\/(?:images|fonts)\/[a-z0-9-]+\.(?:webp|woff2)$/);
    const resolved = new URL(asset.publicPath, 'https://test.zoolandingpage.com.mx/');
    assert.equal(resolved.origin, 'https://test.zoolandingpage.com.mx');
    assert.equal(resolved.search, '');
    assert.equal(resolved.hash, '');
  }
});

test('THN image and font delivery preserves approved binary bytes and media formats', () => {
  readManifest();
  for (const [file, expected] of Object.entries(approved)) {
    const bytes = assertPinnedFile(file, expected);
    if (file.endsWith('.webp')) {
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    } else {
      assert.equal(bytes.toString('ascii', 0, 4), 'wOF2');
    }
  }
});

test('THN public namespace excludes extra files, source composites, and private payloads', () => {
  readManifest();
  const expectedFiles = [...Object.keys(approved), ...Object.keys(approvedLicenses), 'asset-manifest.txt', 'README.md'].sort();
  assert.deepEqual(listFiles(assetRoot).sort(), expectedFiles);
  assert.deepEqual(readdirSync(path.dirname(assetRoot)), ['booksaw-20260827']);
});

test('THN font provenance includes the intact upstream OFL notices', () => {
  const manifest = readManifest();
  assert.deepEqual(manifest.licenses.map(license => license.file).sort(), Object.keys(approvedLicenses).sort());
  for (const license of manifest.licenses) {
    assert.deepEqual(Object.keys(license).sort(), ['file', 'license', 'bytes', 'sha256', 'source'].sort());
    const expected = approvedLicenses[license.file];
    assert.equal(license.bytes, expected[0]);
    assert.equal(license.sha256, expected[1]);
    assert.match(assertPinnedFile(license.file, expected).toString('utf8'), /SIL OPEN FONT LICENSE Version 1\.1/);
    assert.match(license.source, /^https:\/\/raw\.githubusercontent\.com\/google\/fonts\/main\/ofl\/(?:newsreader|opensans)\/OFL\.txt$/);
  }
  for (const font of manifest.assets.filter(asset => asset.contentType === 'font/woff2')) {
    assert.ok(Object.hasOwn(approvedLicenses, font.license));
    assert.match(font.source, /^https:\/\/fonts\.gstatic\.com\/s\/(?:newsreader|opensans)\/[A-Za-z0-9/_-]+\.woff2$/);
    assert.equal(font.style, 'normal');
  }
  assert.equal(manifest.assets.filter(asset => asset.contentType === 'image/webp').length, 11);
  assert.equal(manifest.assets.filter(asset => asset.contentType === 'font/woff2').length, 4);
});

test('the existing Angular public projection includes the THN asset namespace without draft checkout dependencies', () => {
  const angular = JSON.parse(readFileSync(path.join(repoRoot, 'angular.json'), 'utf8'));
  for (const target of ['build', 'test']) {
    const projection = angular.projects.zoolandingpage.architect[target].options.assets.find(asset => asset.input === 'public');
    assert.equal(projection?.glob, '**/*');
    assert.equal(projection?.output ?? '', '');
    assert.equal(projection?.ignore?.length ?? 0, 0);
  }
});
