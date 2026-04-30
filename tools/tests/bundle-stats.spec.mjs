import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('browser bundle does not include the full simple-icons index', async () => {
  const stats = JSON.parse(await readFile('dist/zoolandingpage/stats.json', 'utf8'));
  const browserOutputs = Object.entries(stats.outputs ?? {})
    .filter(([fileName]) => fileName.endsWith('.js'));

  const simpleIconsRootImport = browserOutputs
    .flatMap(([, output]) => Object.keys(output.inputs ?? {}))
    .find((input) => input.replace(/\\/g, '/') === 'node_modules/simple-icons/index.mjs');

  assert.equal(simpleIconsRootImport, undefined);
});
