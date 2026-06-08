import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const zoneTestingHelpers = new Set([
  'discardPeriodicTasks',
  'fakeAsync',
  'flush',
  'flushMicrotasks',
  'resetFakeAsyncZone',
  'tick',
  'waitForAsync',
]);
const angularTestingImport = /import\s*\{(?<imports>[\s\S]*?)\}\s*from\s*['"]@angular\/core\/testing['"]/g;

async function listSpecFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listSpecFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith('.spec.ts') ? [fullPath] : [];
  }));
  return nested.flat();
}

test('Karma test target does not load ZoneJS polyfills', () => {
  const angularConfig = JSON.parse(readFileSync(path.join(repoRoot, 'angular.json'), 'utf8'));
  const testOptions = angularConfig.projects.zoolandingpage.architect.test.options;
  const polyfills = testOptions.polyfills ?? [];

  assert.deepEqual(polyfills, []);
  assert.equal(testOptions.main, 'src/test.ts');
});

test('package metadata does not keep ZoneJS as a direct dependency', () => {
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const packageLock = JSON.parse(readFileSync(path.join(repoRoot, 'package-lock.json'), 'utf8'));

  assert.equal(packageJson.dependencies?.['zone.js'], undefined);
  assert.equal(packageJson.devDependencies?.['zone.js'], undefined);
  assert.equal(packageLock.packages?.['']?.dependencies?.['zone.js'], undefined);
  assert.equal(packageLock.packages?.['']?.devDependencies?.['zone.js'], undefined);
});

test('test providers force Angular TestBed into zoneless mode', () => {
  const mainSource = readFileSync(path.join(repoRoot, 'src', 'test.ts'), 'utf8');
  const source = readFileSync(path.join(repoRoot, 'src', 'test-providers.ts'), 'utf8');

  assert.match(mainSource, /initTestEnvironment/);
  assert.match(mainSource, /testProviders/);
  assert.match(source, /provideZonelessChangeDetection/);
  assert.doesNotMatch(source, /provideZoneChangeDetection/);
});

test('test providers isolate the real Angora CSS generator by default', () => {
  const source = readFileSync(path.join(repoRoot, 'src', 'test-providers.ts'), 'utf8');

  assert.match(source, /NgxAngoraService/);
  assert.match(source, /testNgxAngoraService/);
  assert.match(source, /cssCreate:\s*\(\)\s*=>\s*undefined/);
  assert.match(source, /\{\s*provide:\s*NgxAngoraService,\s*useValue:\s*testNgxAngoraService/);
});

test('Angular specs do not import ZoneJS-only test helpers', async () => {
  const specFiles = await listSpecFiles(path.join(repoRoot, 'src'));
  const offenders = specFiles.flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    const importedZoneHelpers = Array.from(source.matchAll(angularTestingImport))
      .flatMap((match) => match.groups.imports.split(','))
      .map((entry) => entry.trim().split(/\s+as\s+/)[0])
      .filter((entry) => zoneTestingHelpers.has(entry));

    return importedZoneHelpers.length
      ? [`${path.relative(repoRoot, file).replaceAll(path.sep, '/')}: ${importedZoneHelpers.join(', ')}`]
      : [];
  });

  assert.deepEqual(offenders, []);
});
