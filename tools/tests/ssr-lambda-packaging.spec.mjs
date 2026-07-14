import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('SSR packaging defaults to test and never to cloud dev', () => {
  const source = readFileSync(new URL('../package-ssr-lambda.mjs', import.meta.url), 'utf8');

  assert.match(source, /process\.env\.DEPLOY_ENV \|\| 'test'/);
  assert.doesNotMatch(source, /process\.env\.DEPLOY_ENV \|\| 'dev'/);
});
