import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAuditUrls,
  findSearchLeaks,
  findTextLeaks,
  parseArgs,
} from '../content-hub-public-fixture-audit.mjs';

test('parseArgs reads public fixture audit options', () => {
  assert.deepEqual(
    parseArgs([
      '--base-url=https://test.zoolandingpage.com.mx',
      '--domain=zoositioweb.com.mx',
      '--lang=es',
      '--shared-preview=false',
    ]),
    {
      'base-url': 'https://test.zoolandingpage.com.mx',
      domain: 'zoositioweb.com.mx',
      lang: 'es',
      'shared-preview': 'false',
    },
  );
});

test('buildAuditUrls keeps shared draft preview scoped', () => {
  const urls = buildAuditUrls({
    baseUrl: 'https://test.zoolandingpage.com.mx/',
    domain: 'zoositioweb.com.mx',
    lang: 'es',
    sharedPreview: true,
    includeBlog: false,
  });

  assert.equal(urls.length, 3);
  assert.equal(urls[0].surface, 'search');
  assert.match(urls[0].url, /^https:\/\/test\.zoolandingpage\.com\.mx\/content-hub-search\.json\?/);
  assert.match(urls[0].url, /draftDomain=zoositioweb\.com\.mx/);
  assert.match(urls[0].url, /lang=es/);
});

test('findTextLeaks flags public QA fixture routes and titles', () => {
  assert.deepEqual(
    findTextLeaks('<loc>https://zoositioweb.com.mx/blog/qa/qa-product-smoke-20260630193018</loc>'),
    ['qa-product-smoke slug', 'product-smoke tag', '/blog/qa public route'],
  );
  assert.deepEqual(findTextLeaks('Cómo crear blogs visuales con Zoolandingpage'), []);
});

test('findSearchLeaks flags QA article records without blocking real seed content', () => {
  const leaks = findSearchLeaks({
    articles: [
      {
        articleId: 'art_qa',
        title: 'QA Browser Body 20260630202009',
        path: '/blog/qa/qa-browser-body-20260630202009',
        categorySlug: 'qa',
        tags: ['qa', 'browser-smoke'],
      },
      {
        articleId: 'art_20260620_blog_builder',
        title: 'Cómo crear blogs visuales con Zoolandingpage',
        path: '/blog/web/blog-builder-seo',
        categorySlug: 'web',
        tags: ['seo', 'builder', 'angora'],
      },
    ],
  });

  assert.equal(leaks.length, 1);
  assert.equal(leaks[0].articleId, 'art_qa');
  assert.deepEqual(leaks[0].reasons, [
    '/blog/qa public route',
    'QA Browser Body title',
    'browser-smoke tag',
    'qa category',
    'qa-browser-body slug',
  ]);
});
