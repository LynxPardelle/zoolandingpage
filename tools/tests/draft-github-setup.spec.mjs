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

test('testAliasesFor keeps configured test aliases and adds managed test alias', () => {
  assert.deepEqual(testAliasesFor('pamelabetancourt.com', ['pamelabetancourt.zoolandingpage.com.mx']), [
    'test.pamelabetancourt.com',
    'test.pamelabetancourt.zoolandingpage.com.mx',
  ]);
});

test('testAliasesFor moves existing test aliases into test environment set', () => {
  assert.deepEqual(testAliasesFor('zoolandingpage.com.mx', ['test.zoolandingpage.com.mx', 'zoolandingpage.com']), [
    'test.zoolandingpage.com',
    'test.zoolandingpage.com.mx',
  ]);
});
