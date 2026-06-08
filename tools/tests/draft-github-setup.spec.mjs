import assert from 'node:assert/strict';
import test from 'node:test';

import { repoNameForDomain, testAliasesFor } from '../draft-github-setup.mjs';

test('repoNameForDomain maps domains to draft repo names', () => {
  assert.equal(repoNameForDomain('pamelabetancourt.com'), 'draft-pamelabetancourt-com');
  assert.equal(
    repoNameForDomain('pokeapi-demo.zoolandingpage.com.mx'),
    'draft-pokeapi-demo-zoolandingpage-com-mx',
  );
});

test('testAliasesFor does not create dedicated test aliases by default', () => {
  assert.deepEqual(testAliasesFor('pamelabetancourt.com', ['pamelabetancourt.zoolandingpage.com.mx']), [
  ]);
});

test('testAliasesFor keeps only explicitly configured test aliases', () => {
  assert.deepEqual(testAliasesFor('zoolandingpage.com.mx', ['test.zoolandingpage.com.mx', 'zoolandingpage.com']), [
    'test.zoolandingpage.com.mx',
  ]);
});
