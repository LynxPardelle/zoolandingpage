import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const expressRequire = createRequire(require.resolve('express'));
const qs = expressRequire('qs');

test('SSR query dependency rejects bracket comma arrays beyond the configured limit', () => {
  assert.throws(
    () => qs.parse('items[]=one,two,three,four', {
      comma: true, arrayLimit: 3, throwOnLimitExceeded: true,
    }),
    RangeError,
  );
});

test('SSR query dependency safely serializes parsed constructor-shaped input', () => {
  const parsed = qs.parse('filter[constructor][isBuffer]=value', { plainObjects: true });
  assert.doesNotThrow(() => qs.stringify(parsed));
});

test('ordinary draft, language and repeated query parameters retain their meaning', () => {
  const input = 'draftDomain=thehairnarrative.com&lang=es&tag=hair&tag=bridal';
  assert.deepEqual(qs.parse(input), {
    draftDomain: 'thehairnarrative.com', lang: 'es', tag: ['hair', 'bridal'],
  });
});
