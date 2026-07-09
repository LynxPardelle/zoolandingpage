import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const mainSource = readFileSync(resolve('src/main.ts'), 'utf8');

test('static SSR pages with critical Angora hooks bootstrap before the boot curtain fallback can release', () => {
  const hookBranch = mainSource.indexOf('hasStaticAngoraReadinessHooks(appRoot)');
  const interactiveBranch = mainSource.indexOf('hasStaticInteractiveControls(appRoot)');

  assert.ok(hookBranch > -1, 'main.ts should check critical Angora readiness hooks');
  assert.ok(interactiveBranch > -1, 'main.ts should still check interactive static controls');
  assert.ok(hookBranch < interactiveBranch, 'critical Angora hooks must be handled before static release paths');
  assert.match(mainSource, /STATIC_ANGORA_READINESS_SELECTOR = '[^']*sectionTitle[^']*sectionSubtitle[^']*heroCaption/);
  assert.match(mainSource, /function bootstrapStaticSsrContentWithRuntimeCurtain\(\)[\s\S]*bootstrapClient\(\)[\s\S]*STATIC_BOOT_CURTAIN_FALLBACK_MS/);
});
