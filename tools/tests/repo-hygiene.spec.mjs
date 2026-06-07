import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

function listTrackedFiles() {
  return execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);
}

test('repository does not track local Superpowers artifacts', () => {
  const blocked = listTrackedFiles().filter((filePath) => (
    filePath === '.superpowers'
    || filePath.startsWith('.superpowers/')
    || filePath === 'docs/superpowers'
    || filePath.startsWith('docs/superpowers/')
  ));

  assert.deepEqual(blocked, []);
});
