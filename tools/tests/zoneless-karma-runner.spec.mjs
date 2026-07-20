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

test('Karma uses a test-only Chromium launcher without History API flood throttling', () => {
  const angularConfig = JSON.parse(readFileSync(path.join(repoRoot, 'angular.json'), 'utf8'));
  const testOptions = angularConfig.projects.zoolandingpage.architect.test.options;
  const karmaConfig = readFileSync(path.join(repoRoot, 'karma.conf.cjs'), 'utf8');

  assert.equal(testOptions.karmaConfig, 'karma.conf.cjs');
  assert.equal(testOptions.browsers, 'ChromeHeadlessStable');
  assert.match(karmaConfig, /ChromeHeadlessStable/);
  assert.match(karmaConfig, /base:\s*['"]ChromeHeadless['"]/);
  assert.match(karmaConfig, /--disable-ipc-flooding-protection/);
  assert.match(karmaConfig, /ChromeHeadlessNoSandbox/);
  assert.match(karmaConfig, /--no-sandbox/);
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

test('application compilation excludes the Karma-only harness', () => {
  const appTsConfig = JSON.parse(readFileSync(path.join(repoRoot, 'tsconfig.app.json'), 'utf8'));

  assert.ok(appTsConfig.exclude.includes('src/test.ts'));
  assert.ok(appTsConfig.exclude.includes('src/test-browser-state.ts'));
  assert.ok(appTsConfig.exclude.includes('src/test-providers.ts'));
});

test('Karma restores native browser history methods before every spec', () => {
  const mainSource = readFileSync(path.join(repoRoot, 'src', 'test.ts'), 'utf8');
  const browserStateSource = readFileSync(path.join(repoRoot, 'src', 'test-browser-state.ts'), 'utf8');

  assert.match(browserStateSource, /__zlpTestBrowserHistoryOriginals__/);
  assert.match(browserStateSource, /pushState:\s*History\.prototype\.pushState/);
  assert.match(browserStateSource, /replaceState:\s*History\.prototype\.replaceState/);
  assert.match(mainSource, /beforeEach\(\(\)\s*=>\s*\{[\s\S]*restoreTestBrowserHistory\(\)/);
});

test('Karma clears persisted browser state before every spec', () => {
  const mainSource = readFileSync(path.join(repoRoot, 'src', 'test.ts'), 'utf8');
  const setup = mainSource.match(/beforeEach\(\(\) => \{(?<body>[\s\S]*?)\n\}\);/)?.groups?.body ?? '';

  assert.match(setup, /localStorage\.clear\(\)/);
  assert.match(setup, /sessionStorage\.clear\(\)/);
  assert.match(setup, /zlp_lang=;/);
});

test('Karma drains destroyed TestBed work before restoring the shared browser URL', () => {
  const mainSource = readFileSync(path.join(repoRoot, 'src', 'test.ts'), 'utf8');
  const cleanup = mainSource.match(/afterEach\(async \(\) => \{(?<body>[\s\S]*?)\n\}\);/)?.groups?.body ?? '';

  assert.match(mainSource, /const initialTestUrl\s*=/);
  assert.ok(cleanup, 'global Karma cleanup must be asynchronous');
  assert.ok(cleanup.indexOf('getTestBed().resetTestingModule()') < cleanup.indexOf('await '));
  assert.ok(cleanup.indexOf('await ') < cleanup.indexOf('initialTestUrl'));
});

test('navigation specs never replace shared browser history with a no-op stub', () => {
  const source = readFileSync(path.join(
    repoRoot,
    'src', 'app', 'shared', 'utility', 'event-handler', 'handlers', 'ui.handlers.spec.ts',
  ), 'utf8');

  assert.doesNotMatch(source, /spyOn\(window\.history, 'pushState'\)\.and\.stub\(\)/);
});

test('Angular specs use the shared browser history harness instead of capturing mutable prototypes', async () => {
  const specFiles = await listSpecFiles(path.join(repoRoot, 'src'));
  const offenders = specFiles
    .filter((file) => /History\.prototype\.(?:pushState|replaceState)/.test(readFileSync(file, 'utf8')))
    .map((file) => path.relative(repoRoot, file).replaceAll(path.sep, '/'));

  assert.deepEqual(offenders, []);
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
