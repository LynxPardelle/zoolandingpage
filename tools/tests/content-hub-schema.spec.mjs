import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import Ajv from 'ajv';

const schemaBase = new URL('../../docs/api-driven-config/schemas/', import.meta.url);
const seedFixtureBase = new URL('./fixtures/content-hub/zoosite-seed-article/', import.meta.url);

const schemaFiles = {
  siteConfig: 'site-config.schema.json',
  pageConfig: 'page-config.schema.json',
  seo: 'seo.schema.json',
  publicConfig: 'content-hub-public.schema.json',
  articlePackage: 'content-hub-article-package.schema.json',
  publishedBundle: 'content-hub-published-bundle.schema.json',
  serverPolicy: 'content-hub-server-policy.schema.json',
  taxonomy: 'content-hub-taxonomy.schema.json',
  publishValidation: 'content-hub-publish-validation.schema.json',
};

test('page SEO schemas accept only explicit canonical suppression', async () => {
  const pageSchema = await readSchema('pageConfig');
  const seoSchema = await readSchema('seo');
  const page = {
    version: 1,
    pageId: 'article',
    domain: 'thehairnarrative.com',
    rootIds: ['article'],
    seo: { canonicalMode: 'none' },
  };
  const seo = {
    version: 1,
    pageId: 'article',
    domain: 'thehairnarrative.com',
    canonicalMode: 'none',
  };

  assert.deepEqual(validateWithAjv(pageSchema, page), []);
  assert.deepEqual(validateWithAjv(seoSchema, seo), []);
  for (const invalid of ['self', 'custom', 'auto', false]) {
    assert.notDeepEqual(validateWithAjv(pageSchema, {
      ...page,
      seo: { canonicalMode: invalid },
    }), [], String(invalid));
    assert.notDeepEqual(validateWithAjv(seoSchema, {
      ...seo,
      canonicalMode: invalid,
    }), [], String(invalid));
  }
});

const serverOnlyFields = [
  'credentialRef',
  'clientSecret',
  'accessToken',
  'refreshToken',
  'idToken',
  'privateKey',
  'userPoolId',
  'tableName',
  'bucketName',
  'serverPolicy',
  'lambdaArn',
];

const signedUrlExamples = [
  'https://assets.example.com/file.png?X-Amz-Signature=abc',
  'https://assets.example.com/file.png?X-Amz-Credential=abc',
  'https://assets.example.com/file.png?X-Amz-Security-Token=abc',
  'https://assets.example.com/file.png?Expires=123&Signature=abc',
];

async function readSchema(name) {
  return JSON.parse(await readFile(new URL(schemaFiles[name], schemaBase), 'utf8'));
}

async function readFixtureJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, seedFixtureBase), 'utf8'));
}

function validateWithAjv(schema, value) {
  const validate = new Ajv({ allErrors: true, strict: true }).compile(schema);
  if (validate(value)) return [];
  return (validate.errors ?? []).map((error) => (
    `${error.instancePath || '$'} ${error.keyword}: ${error.message}`
  ));
}

function resolveSchemaRef(root, ref) {
  assert.equal(ref.startsWith('#/'), true, `Unsupported schema ref: ${ref}`);
  return ref
    .slice(2)
    .split('/')
    .reduce((current, part) => current?.[part], root);
}

function validateSchema(schema, value, root = schema, path = '$') {
  if (schema.$ref) {
    return validateSchema(resolveSchemaRef(root, schema.$ref), value, root, path);
  }

  const errors = [];

  if (schema.anyOf) {
    const branchErrors = schema.anyOf.map((branch) => validateSchema(branch, value, root, path));
    if (!branchErrors.some((items) => items.length === 0)) {
      errors.push(`${path} must match one allowed schema: ${branchErrors.flat().join('; ')}`);
    }
  }

  if (schema.allOf) {
    for (const branch of schema.allOf) {
      errors.push(...validateSchema(branch, value, root, path));
    }
  }

  if (schema.if) {
    const conditionMatches = validateSchema(schema.if, value, root, path).length === 0;
    if (conditionMatches && schema.then) {
      errors.push(...validateSchema(schema.then, value, root, path));
    } else if (!conditionMatches && schema.else) {
      errors.push(...validateSchema(schema.else, value, root, path));
    }
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path} must equal ${JSON.stringify(schema.const)}`);
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path} must be one of ${schema.enum.join(', ')}`);
  }

  if (schema.not) {
    const notErrors = validateSchema(schema.not, value, root, path);
    if (notErrors.length === 0) {
      errors.push(`${path} must not match the disallowed schema`);
    }
  }

  const allowedTypes = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (allowedTypes.length > 0) {
    const actualType = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
    if (!allowedTypes.includes(actualType)) {
      errors.push(`${path} must be ${allowedTypes.join(' or ')}`);
      return errors;
    }
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path} is shorter than ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path} is longer than ${schema.maxLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) {
      errors.push(`${path} does not match ${schema.pattern}`);
    }
    if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) {
      errors.push(`${path} must use date-time format`);
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path} is below ${schema.minimum}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path} needs at least ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${path} allows at most ${schema.maxItems} items`);
    }
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validateSchema(schema.items, item, root, `${path}[${index}]`));
      });
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (schema.minProperties !== undefined && Object.keys(value).length < schema.minProperties) {
      errors.push(`${path} needs at least ${schema.minProperties} properties`);
    }
    if (schema.propertyNames) {
      for (const key of Object.keys(value)) {
        errors.push(...validateSchema(schema.propertyNames, key, root, `${path}.${key}<propertyName>`));
      }
    }

    for (const requiredKey of schema.required ?? []) {
      if (!Object.hasOwn(value, requiredKey)) {
        errors.push(`${path}.${requiredKey} is required`);
      }
    }

    const propertySchemas = schema.properties ?? {};
    for (const [key, item] of Object.entries(value)) {
      if (propertySchemas[key]) {
        errors.push(...validateSchema(propertySchemas[key], item, root, `${path}.${key}`));
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}.${key} is not allowed`);
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        errors.push(...validateSchema(schema.additionalProperties, item, root, `${path}.${key}`));
      }
    }
  }

  return errors;
}

function buildPublicConfig() {
  return {
    version: 1,
    hubs: [
      {
        hubId: 'zoosite-main',
        ownerDraftDomain: 'zoositioweb.com.mx',
        source: 'primary',
        routeBasePath: '/blog',
        listPath: '/blog',
        articlePathPattern: '/blog/:categorySlug/:articleSlug',
        defaultLocale: 'es',
        locales: ['es', 'en'],
        canonicalMode: 'host-adaptive',
        runtimeSourceId: 'contentHubArticles',
        publicApiBasePath: '/content-hub',
        analyticsContext: {
          contentGroup: 'blog',
          eventPrefix: 'blog',
        },
        publicArticles: [
          {
            articleId: 'art_20260620_blog_builder',
            locale: 'es',
            status: 'published',
            title: 'Como crear blogs visuales',
            summary: 'Resumen publico del articulo.',
            path: '/blog/web/blog-builder-seo',
            categorySlug: 'web',
            tags: ['seo', 'builder'],
            publishedAt: '2026-06-20T07:00:00.000Z',
            updatedAt: '2026-06-20T07:30:00.000Z',
            authorLabel: 'Zoolandingpage',
            canonicalPath: '/blog/web/blog-builder-seo',
            robots: 'index,follow',
            imageSrc: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3',
            imageAlt: 'Equipo revisando contenido visual',
            commentPolicy: 'authenticated',
            contentSafety: {
              rating: 'general',
              warnings: [],
            },
            interactions: {
              reactions: { enabled: true, moderation: 'spam-check' },
              ctas: { enabled: true, moderation: 'spam-check' },
              forms: { enabled: true, moderation: 'queue' },
            },
          },
        ],
        publicTaxonomy: [
          {
            taxonomyId: 'cat_web',
            kind: 'category',
            slug: 'web',
            label: 'Web',
            locale: 'es',
            visible: true,
            path: '/blog/web',
          },
        ],
      },
    ],
  };
}

function buildArticlePackageManifest() {
  return {
    version: 1,
    hubId: 'zoosite-main',
    articleId: 'art_20260620_blog_builder',
    ownerDraftDomain: 'zoositioweb.com.mx',
    originDraftDomain: 'zoositioweb.com.mx',
    status: 'scheduled',
    visibility: 'public',
    createdAt: '2026-06-20T07:00:00.000Z',
    updatedAt: '2026-06-20T07:30:00.000Z',
    scheduledAt: '2026-06-21T15:00:00.000Z',
    primaryLocale: 'es',
    languages: [
      {
        locale: 'es',
        status: 'ready',
        slug: 'blog-builder-seo',
        title: 'Blog builder con SEO',
        summary: 'Contrato inicial para artículos visuales.',
        packagePointer: {
          key: 'content-hubs/zoosite-main/articles/art_20260620_blog_builder/lang/es/revisions/rev_001/package.json',
          sha256: 'a'.repeat(64),
        },
        latestRevisionId: 'rev_001',
      },
    ],
    taxonomy: {
      categories: ['web'],
      tags: ['seo', 'builder'],
    },
    seo: {
      title: 'Blog builder con SEO',
      description: 'Contrato inicial para artículos visuales y SEO.',
      canonicalPath: '/blog/web/blog-builder-seo',
      robots: 'index,follow',
      structuredDataTypes: ['Article', 'BreadcrumbList'],
    },
    media: [
      {
        assetId: 'asset_cover',
        kind: 'image',
        publicUrl: 'https://assets.zoolandingpage.com.mx/zoositioweb.com.mx/blog/cover.webp',
        alt: 'Editor visual del blog',
        mimeType: 'image/webp',
        bytes: 120000,
      },
    ],
    comments: {
      mode: 'authenticated',
      moderation: 'queue',
    },
    interactions: {
      reactions: { enabled: true, moderation: 'spam-check' },
      ctas: { enabled: true, moderation: 'spam-check' },
      forms: { enabled: true, moderation: 'queue' },
    },
    contentSafety: {
      sanitizerPolicyId: 'trusted-authors',
      htmlFreedom: 'trusted',
      allowedComponentPresetIds: ['article-core', 'advanced-author'],
    },
    analytics: {
      contentGroup: 'blog',
      eventPrefix: 'blog',
      piiPolicy: 'no-pii',
    },
    revisions: [
      {
        revisionId: 'rev_001',
        kind: 'snapshot',
        createdAt: '2026-06-20T07:30:00.000Z',
        packagePointer: {
          key: 'content-hubs/zoosite-main/articles/art_20260620_blog_builder/revisions/rev_001/snapshot.json',
          sha256: 'b'.repeat(64),
        },
      },
    ],
  };
}

function buildPublishedBundle() {
  return buildDeployedPublishedBundle();
}

function buildDeployedPublishedBundle() {
  return {
    version: 1,
    bundleId: 'art_20260620_blog_builder:rev_001:zoositioweb.com.mx:es',
    hubId: 'zoosite-main',
    articleId: 'art_20260620_blog_builder',
    revisionId: 'rev_001',
    ownerDraftDomain: 'zoositioweb.com.mx',
    renderDomain: 'zoositioweb.com.mx',
    locale: 'es',
    path: '/blog/web/blog-builder-seo',
    safeArticlePath: '/blog/web/blog-builder-seo',
    status: 'published',
    publishedAt: '2026-06-21T15:00:00.000Z',
    previewedAt: '',
    title: 'Blog builder con SEO',
    summary: 'Contrato inicial para artículos visuales y SEO.',
    slug: 'blog-builder-seo',
    category: {
      taxonomyId: 'cat_web',
      slug: 'web',
      label: 'Web',
    },
    tags: [
      {
        taxonomyId: 'tag_seo',
        slug: 'seo',
        label: 'SEO',
      },
    ],
    commentPolicy: 'moderated',
    contentSafety: {
      rating: 'general',
      warnings: [],
    },
    interactions: {
      ctas: { enabled: true, moderation: 'spam-check' },
      reactions: { enabled: true, moderation: 'spam-check' },
      shares: { enabled: true },
      readProgress: { enabled: true },
      assetDownloads: { enabled: false },
      forms: { enabled: false },
    },
    seo: {
      title: 'Blog builder con SEO',
      description: 'Contrato inicial para artículos visuales y SEO.',
      canonical: '/blog/web/blog-builder-seo',
      canonicalMode: 'self',
      robots: 'index,follow',
    },
    structuredData: [
      {
        type: 'Article',
        json: {
          '@type': 'Article',
          headline: 'Blog builder con SEO',
        },
      },
    ],
    components: [
      {
        id: 'articleCover',
        type: 'media',
        config: {
          tag: 'image',
          src: 'https://assets.example.com/cover.webp',
          alt: 'Editorial cover',
          classes: 'article-cover',
        },
      },
    ],
    variables: {
      articleContent: {
        version: 1,
        blocks: [
          { type: 'paragraph', text: 'Contenido editorial seguro.' },
        ],
      },
    },
    i18n: {
      'article.title': 'Blog builder con SEO',
    },
    analytics: {
      contentGroup: 'blog',
      eventPrefix: 'blog',
      piiPolicy: 'no-pii',
    },
  };
}

function buildServerPolicy() {
  return {
    version: 1,
    hubs: [
      {
        hubId: 'zoosite-main',
        ownerDraftDomain: 'zoositioweb.com.mx',
        tenantId: 'zoosite',
        authProfileId: 'staff',
        storage: {
          tablesByCapability: {
            contentMetadataTableName: 'zlp-test-content-hub-metadata',
            contentModerationTableName: 'zlp-test-content-hub-moderation',
            contentMediaTableName: 'zlp-test-content-hub-media',
            contentInteractionsTableName: 'zlp-test-content-hub-interactions',
          },
          bucketsByCapability: {
            packageBucketName: 'zlp-test-content-packages',
            publishedBucketName: 'zlp-test-content-published',
            mediaBucketName: 'zlp-test-content-media',
            analyticsBucketName: 'zlp-test-analytics',
          },
          prefixes: {
            packagePrefix: 'content-hubs/test/zoosite-main/articles/',
            publishedPrefix: 'content-hubs/test/zoosite-main/published/',
            mediaPrefix: 'content-hubs/test/zoosite-main/assets/',
            analyticsPrefix: 'analytics/test/eventPrefix=blog/',
          },
        },
        roles: [
          {
            roleId: 'blog-admin',
            groups: ['zoosite-admin'],
            permissions: ['blog:article:create', 'blog:article:publish'],
          },
        ],
        hubConnections: [
          {
            draftDomain: 'zoolandingpage.com.mx',
            mode: 'read-published',
          },
        ],
        sanitizerPolicies: [
          {
            policyId: 'trusted-authors',
            level: 'trusted',
            allowedRoles: ['blog-admin'],
          },
        ],
        spamProtection: {
          provider: 'rate-limit',
          moderationQueue: true,
        },
      },
    ],
  };
}

function buildTaxonomyRecords() {
  return {
    version: 1,
    hubId: 'zoosite-main',
    records: [
      {
        taxonomyId: 'web',
        kind: 'category',
        slug: 'web',
        createdByDraftDomain: 'zoositioweb.com.mx',
        defaultLocale: 'es',
        labels: {
          es: 'Web',
          en: 'Web',
        },
        visibility: {
          default: 'visible',
          overrides: [
            {
              draftDomain: 'sulandingpage.com.mx',
              visible: true,
              labels: {
                es: 'Sitios web',
              },
            },
          ],
        },
      },
      {
        taxonomyId: 'seo',
        kind: 'tag',
        slug: 'seo',
        createdByDraftDomain: 'zoositioweb.com.mx',
        defaultLocale: 'es',
        labels: {
          es: 'SEO',
          en: 'SEO',
        },
        visibility: {
          default: 'visible',
          overrides: [],
        },
      },
    ],
  };
}

function buildPublishValidationReport() {
  return {
    version: 1,
    hubId: 'zoosite-main',
    articleId: 'art_20260620_blog_builder',
    revisionId: 'rev_001',
    environment: 'test',
    status: 'pass',
    checkedAt: '2026-06-20T07:45:00.000Z',
    checks: [
      {
        code: 'seo-title',
        severity: 'info',
        status: 'pass',
        message: 'SEO title is present.',
      },
    ],
  };
}

test('content hub schemas exist with draft-07 metadata and closed top-level contracts', async () => {
  for (const name of Object.keys(schemaFiles)) {
    if (name === 'siteConfig') continue;
    const schema = await readSchema(name);
    assert.equal(schema.$schema, 'http://json-schema.org/draft-07/schema#');
    assert.equal(schema.type, 'object');
    assert.equal(schema.additionalProperties, false, `${name} must be closed at the top level`);
    assert.equal(typeof schema.definitions, 'object', `${name} must define reusable definitions`);
  }
});

test('public content hub config validates browser-safe hub references only', async () => {
  const schema = await readSchema('publicConfig');
  const valid = buildPublicConfig();
  const leaked = buildPublicConfig();
  leaked.hubs[0].credentialRef = 'ssm:/not-for-browser';
  leaked.hubs[0].endpoint = 'https://evil.example/api';
  leaked.hubs[0].scriptUrl = 'https://cdn.example.com/editor.js';

  assert.deepEqual(validateSchema(schema, valid), []);
  assert.match(validateSchema(schema, leaked).join('\n'), /credentialRef|endpoint|scriptUrl/);
  for (const field of serverOnlyFields) {
    assert.equal(schema.definitions.publicHub.properties[field], undefined, `${field} must not be a public hub property`);
  }
});

test('article package manifest validates article metadata and rejects unsafe public assets or handlers', async () => {
  const schema = await readSchema('articlePackage');
  const valid = buildArticlePackageManifest();
  const leaked = buildArticlePackageManifest();
  leaked.languages[0].onClick = 'alert(1)';
  leaked.media[0].publicUrl = signedUrlExamples[0];
  leaked.media[0].clientSecret = 'never';

  assert.deepEqual(validateSchema(schema, valid), []);
  assert.match(validateSchema(schema, leaked).join('\n'), /onClick|publicUrl|clientSecret/);
  assert.equal(schema.properties.serverPolicy, undefined);
});

test('published bundle schema keeps SSR bundle public and component-tree based', async () => {
  const schema = await readSchema('publishedBundle');
  const valid = buildPublishedBundle();
  const leaked = buildPublishedBundle();
  leaked.accessToken = 'never';
  leaked.components[0].config.onLoad = 'alert(1)';
  leaked.seo.canonical = signedUrlExamples[1];
  const leakedNested = buildPublishedBundle();
  leakedNested.structuredData[0].json.sameAs = signedUrlExamples[2];
  leakedNested.variables.credentialRef = 'ssm:/not-public';
  leakedNested.variables.access_token = 'not-public';
  leakedNested.variables.ACCESS_TOKEN = 'not-public';
  leakedNested.variables.Access_Token = 'not-public';
  leakedNested.i18n.onClick = 'alert(1)';
  leakedNested.components[0].config.onclick = 'alert(1)';
  leakedNested.components[0].config.OnClick = 'alert(1)';

  assert.deepEqual(validateSchema(schema, valid), []);
  assert.match(validateSchema(schema, leaked).join('\n'), /accessToken|onLoad|canonical/);
  assert.match(validateSchema(schema, leakedNested).join('\n'), /sameAs|credentialRef|access_token|ACCESS_TOKEN|Access_Token|onClick|onclick|OnClick/);
  assert.equal(schema.properties.serverPolicy, undefined);
});

test('published bundle schema accepts the deployed direct v1 projection', async () => {
  const schema = await readSchema('publishedBundle');
  const bundle = buildDeployedPublishedBundle();
  bundle.variables.articleContent.blocks[0].text = 'Data: observations become editorial notes.';

  assert.deepEqual(validateSchema(schema, bundle), []);
  assert.deepEqual(validateWithAjv(schema, bundle), []);
});

test('published bundle schema allows legitimate direct objects that use wrapper-like key names', async () => {
  const schema = await readSchema('publishedBundle');
  const bundle = buildDeployedPublishedBundle();
  bundle.variables.version = 1;
  bundle.variables.variables = { editorialState: 'ready' };
  bundle.variables.articleContent = { paragraphs: ['Visible editorial copy'] };
  bundle.i18n.version = 1;
  bundle.i18n.lang = 'es';
  bundle.i18n.dictionary = { label: 'Visible' };
  bundle.i18n.article = { title: 'Título visible' };

  assert.deepEqual(validateWithAjv(schema, bundle), []);
});

test('published bundle schema permits prose metadata keys but rejects executable script keys', async () => {
  const schema = await readSchema('publishedBundle');
  const legitimate = buildDeployedPublishedBundle();
  legitimate.variables.description = 'Editorial description';
  legitimate.variables.seoDescription = 'Search description';
  legitimate.variables.transcription = 'Interview transcription';

  assert.deepEqual(validateWithAjv(schema, legitimate), []);

  for (const key of ['script', 'scriptUrl']) {
    const unsafe = buildDeployedPublishedBundle();
    unsafe.variables[key] = '/unsafe.js';
    assert.notDeepEqual(validateWithAjv(schema, unsafe), [], key);
  }
});

test('published bundle schema rejects encoded signed query names without rejecting benign encoded values', async () => {
  const schema = await readSchema('publishedBundle');
  const benign = buildDeployedPublishedBundle();
  benign.components[0].config.src = 'https://assets.example.com/file.webp?utm_source=journal&redirect=%2Fnotes%2Fone';
  assert.deepEqual(validateWithAjv(schema, benign), []);

  for (const query of [
    '%58-Amz-Signature=private',
    '%2558-Amz-Signature=private',
    'X%2dAmz%2dSignature=private',
    'X%252dAmz%252dSignature=private',
    'sig%3dprivate',
    'sig%253dprivate',
  ]) {
    const unsafe = buildDeployedPublishedBundle();
    unsafe.components[0].config.src = `https://assets.example.com/file.webp?${query}`;
    assert.notDeepEqual(validateWithAjv(schema, unsafe), [], query);
  }
});

test('published bundle schema restricts articleContent to renderer-supported container shapes', async () => {
  const schema = await readSchema('publishedBundle');

  for (const articleContent of [null, true, 42]) {
    const bundle = buildDeployedPublishedBundle();
    bundle.variables.articleContent = articleContent;
    assert.notDeepEqual(validateWithAjv(schema, bundle), [], String(articleContent));
  }
});

test('published bundle schema enforces canonical mode combinations without rejecting public cache URLs', async () => {
  const schema = await readSchema('publishedBundle');

  for (const [canonicalMode, canonical] of [
    ['self', '/blog/web/blog-builder-seo'],
    ['custom', '/journal/blog-builder-seo'],
    ['custom', 'https://thehairnarrative.com/journal/blog-builder-seo'],
    ['none', ''],
  ]) {
    const bundle = buildDeployedPublishedBundle();
    bundle.seo.canonicalMode = canonicalMode;
    bundle.seo.canonical = canonical;
    bundle.components[0].config.src = 'https://assets.example.com/file.webp?expires=public-cache';
    assert.deepEqual(validateWithAjv(schema, bundle), [], `${canonicalMode} + ${canonical}`);
  }

  for (const [canonicalMode, canonical] of [
    ['self', 'https://thehairnarrative.com/journal/blog-builder-seo'],
    ['self', ''],
    ['custom', ''],
    ['none', '/blog/web/blog-builder-seo'],
    ['none', 'https://thehairnarrative.com/journal/blog-builder-seo'],
  ]) {
    const bundle = buildDeployedPublishedBundle();
    bundle.seo.canonicalMode = canonicalMode;
    bundle.seo.canonical = canonical;
    assert.notDeepEqual(validateWithAjv(schema, bundle), [], `${canonicalMode} + ${canonical}`);
  }
});

test('published bundle schema rejects case-insensitive public leaks and contradictory canonical settings', async () => {
  const schema = await readSchema('publishedBundle');
  const unsafeBundles = [];

  for (const [key, value] of [
    ['access-token', 'not-public'],
    ['tenantId', 'tenant-internal'],
    ['authorizationDecision', 'allow'],
    ['SeCrEt', 'not-public'],
    ['ToKeN', 'not-public'],
    ['Api-Key', 'not-public'],
    ['Pass_word', 'not-public'],
    ['Session_Token', 'not-public'],
    ['href', 'JaVaScRiPt:alert(1)'],
    ['src', 'data:text/html,bad'],
  ]) {
    const bundle = buildDeployedPublishedBundle();
    bundle.variables[key] = value;
    unsafeBundles.push(bundle);
  }

  for (const signedQuery of [
    'x-aMz-signature=not-public',
    'x-goog-signature=not-public',
    'sig=not-public',
  ]) {
    const signedUrl = buildDeployedPublishedBundle();
    signedUrl.components[0].config.src = `https://assets.example.com/file.webp?${signedQuery}`;
    unsafeBundles.push(signedUrl);
  }

  const malformedAssetUrl = buildDeployedPublishedBundle();
  malformedAssetUrl.components[0].config.src = 'https://:';
  unsafeBundles.push(malformedAssetUrl);

  const signedSameOriginHref = buildDeployedPublishedBundle();
  signedSameOriginHref.components[0] = {
    id: 'articleCta',
    type: 'link',
    config: { href: '/journal/article?X-Amz-Signature=not-public', text: 'Read' },
  };
  unsafeBundles.push(signedSameOriginHref);

  const contradictoryCanonical = buildDeployedPublishedBundle();
  contradictoryCanonical.seo.canonicalMode = 'none';
  contradictoryCanonical.seo.canonical = '/blog/web/blog-builder-seo';
  unsafeBundles.push(contradictoryCanonical);

  for (const bundle of unsafeBundles) {
    assert.notDeepEqual(validateWithAjv(schema, bundle), []);
  }
});

test('published bundle schema rejects the obsolete wrapped projection', async () => {
  const schema = await readSchema('publishedBundle');
  const wrapped = buildDeployedPublishedBundle();
  wrapped.components = { version: 1, components: wrapped.components };
  wrapped.variables = { version: 1, variables: wrapped.variables };
  wrapped.i18n = { version: 1, lang: 'es', dictionary: wrapped.i18n };

  assert.match(
    validateSchema(schema, wrapped).join('\n'),
    /components|variables|i18n/,
  );
  assert.notDeepEqual(validateWithAjv(schema, wrapped), []);
});

test('published bundle schema accepts only the strict canonical public component subset', async () => {
  const schema = await readSchema('publishedBundle');
  const validConfigs = new Map([
    ['container', { components: [], classes: 'article-shell', tag: 'article' }],
    ['media', {
      tag: 'image',
      src: 'https://assets.example.test/cover.webp',
      alt: 'Editorial cover',
      classes: 'article-cover',
    }],
    ['text', { tag: 'h1', text: 'Observing form', classes: 'article-title' }],
    ['link', { href: '/the-journal/article', text: 'Read', target: '_self' }],
  ]);

  for (const [componentType, config] of validConfigs) {
    const bundle = buildDeployedPublishedBundle();
    bundle.components[0].type = componentType;
    bundle.components[0].config = config;
    assert.deepEqual(validateWithAjv(schema, bundle), [], componentType);
  }

  for (const componentType of [
    'accordion',
    'button',
    'dropdown',
    'embed-frame',
    'generic-card',
    'generic-cell',
    'generic-component-preview',
    'generic-file-dropzone',
    'generic-rich-text',
    'generic-table',
    'icon',
    'input',
    'interaction-scope',
    'loading-spinner',
    'pagination',
    'qr-code',
    'search-box',
    'stats-counter',
    'tab-group',
    'tooltip',
    'generic-text',
    'image',
    'custom-widget',
    'modal',
    'none',
  ]) {
    const bundle = buildDeployedPublishedBundle();
    bundle.components[0].type = componentType;
    assert.notDeepEqual(validateWithAjv(schema, bundle), [], componentType);
  }

  assert.deepEqual(schema.definitions.renderableComponentType.enum, [
    'container',
    'media',
    'text',
    'link',
  ]);
});

test('published bundle schema rejects configs outside the strict public writer contract', async () => {
  const schema = await readSchema('publishedBundle');
  const invalidComponents = [
    { id: 'bad:id', type: 'text', config: { tag: 'p', text: 'Invalid component id' } },
    { id: 'unsafe-meta', type: 'text', config: { tag: 'p', text: 'Copy' }, meta_title: 'javascript:alert(1)' },
    { id: 'huge-order', type: 'text', config: { tag: 'p', text: 'Copy' }, order: Number.MAX_VALUE },
    { id: 'missing-link-href', type: 'link', config: { text: 'Read' } },
    { id: 'bad-link-target', type: 'link', config: { href: '/journal/article', target: '_new' } },
    { id: 'external-link', type: 'link', config: { href: 'https://example.com/article' } },
    { id: 'unsafe-link', type: 'link', config: { href: 'data: text/html,<script>alert(1)</script>' } },
    {
      id: 'nested-unsafe-link',
      type: 'link',
      config: { href: '/journal/article', items: [{ href: 'data: text/html,<script>alert(1)</script>' }] },
    },
    { id: 'link-editor-field', type: 'link', config: { href: '/journal/article', preserveLanguageQueryParam: false } },
    { id: 'link-child-field', type: 'link', config: { href: '/journal/article', components: ['label'] } },
    { id: 'missing-container-children', type: 'container', config: { tag: 'article' } },
    { id: 'bad-container-tag', type: 'container', config: { components: [], tag: 'dialog' } },
    { id: 'container-runtime-field', type: 'container', config: { components: [], role: 'main' } },
    { id: 'bad-container-children', type: 'container', config: { components: ['title', 42] } },
    { id: 'bad-container-child-id', type: 'container', config: { components: ['title:legacy'] } },
    { id: 'duplicate-container-children', type: 'container', config: { components: ['title', 'title'] } },
    { id: 'missing-media-src', type: 'media', config: { tag: 'image', alt: 'Cover' } },
    { id: 'missing-media-tag', type: 'media', config: { src: 'https://assets.example.com/cover.webp', alt: 'Cover' } },
    { id: 'missing-media-alt', type: 'media', config: { tag: 'image', src: 'https://assets.example.com/cover.webp' } },
    { id: 'blank-media-alt', type: 'media', config: { tag: 'image', src: 'https://assets.example.com/cover.webp', alt: '   ' } },
    { id: 'non-image-media', type: 'media', config: { tag: 'video', src: 'https://assets.example.com/cover.webp', alt: 'Cover' } },
    { id: 'localhost-media', type: 'media', config: { tag: 'image', src: 'https://localhost/cover.webp', alt: 'Cover' } },
    { id: 'localhost-subdomain-media', type: 'media', config: { tag: 'image', src: 'https://assets.localhost/cover.webp', alt: 'Cover' } },
    { id: 'private-ip-media', type: 'media', config: { tag: 'image', src: 'https://127.0.0.1/cover.webp', alt: 'Cover' } },
    { id: 'public-ip-media', type: 'media', config: { tag: 'image', src: 'https://8.8.8.8/cover.webp', alt: 'Cover' } },
    { id: 'ipv6-media', type: 'media', config: { tag: 'image', src: 'https://[2606:4700:4700::1111]/cover.webp', alt: 'Cover' } },
    { id: 'port-media', type: 'media', config: { tag: 'image', src: 'https://assets.example.com:443/cover.webp', alt: 'Cover' } },
    { id: 'http-media', type: 'media', config: { tag: 'image', src: 'http://assets.example.com/cover.webp', alt: 'Cover' } },
    { id: 'media-runtime-field', type: 'media', config: { id: 'cover', tag: 'image', src: 'https://assets.example.com/cover.webp', alt: 'Cover' } },
    { id: 'media-renderer-ignored-variant', type: 'media', config: { tag: 'image', src: 'https://assets.example.com/cover.webp', alt: 'Cover', variant: 'hero' } },
    {
      id: 'private-loop-config',
      type: 'text',
      config: { tag: 'p', text: 'Copy' },
      loopConfig: { source: 'var', path: 'items', templateId: 'articleItem' },
    },
    { id: 'missing-text-tag', type: 'text', config: { text: 'Observing form' } },
    { id: 'missing-text-copy', type: 'text', config: { tag: 'h1' } },
    { id: 'bad-text-tag', type: 'text', config: { tag: 'script', text: 'Unsafe' } },
    { id: 'html-text', type: 'text', config: { tag: 'p', html: '<img src=x onerror=alert(1)>' } },
    { id: 'text-runtime-field', type: 'text', config: { id: 'title', tag: 'h1', text: 'Observing form' } },
    { id: 'public-rich-text', type: 'generic-rich-text', config: { fieldId: 'articleContent' } },
  ];

  for (const component of invalidComponents) {
    const bundle = buildDeployedPublishedBundle();
    bundle.components = [component];
    assert.notDeepEqual(validateWithAjv(schema, bundle), [], component.id);
  }
});

test('published bundle schema bounds public component and JSON collection sizes', async () => {
  const schema = await readSchema('publishedBundle');
  const tooManyComponents = buildDeployedPublishedBundle();
  tooManyComponents.components = Array.from({ length: 121 }, (_, index) => ({
    id: `paragraph-${index}`,
    type: 'text',
    config: { tag: 'p', text: `Paragraph ${index}` },
  }));
  const oversizedString = buildDeployedPublishedBundle();
  oversizedString.variables.articleContent = { text: 'x'.repeat(50001) };
  const oversizedArray = buildDeployedPublishedBundle();
  oversizedArray.variables.articleContent = Array.from({ length: 5001 }, () => null);

  assert.notDeepEqual(validateWithAjv(schema, tooManyComponents), []);
  assert.notDeepEqual(validateWithAjv(schema, oversizedString), []);
  assert.notDeepEqual(validateWithAjv(schema, oversizedArray), []);
});

test('published bundle schema rejects prototype-pollution keys recursively', async () => {
  const schema = await readSchema('publishedBundle');

  for (const key of ['__proto__', 'constructor', 'prototype']) {
    const bundle = buildDeployedPublishedBundle();
    const articleContent = {};
    Object.defineProperty(articleContent, key, {
      value: { polluted: true },
      enumerable: true,
      configurable: true,
    });
    bundle.variables.articleContent = articleContent;

    assert.notDeepEqual(validateWithAjv(schema, bundle), [], key);
  }
});

test('content hub public SEO schemas share the index,nofollow robots policy', async () => {
  const publicSchema = await readSchema('publicConfig');
  const siteSchema = await readSchema('siteConfig');

  assert.ok(publicSchema.definitions.publicArticle.properties.robots.enum.includes('index,nofollow'));
  assert.ok(siteSchema.definitions.contentHubPublicArticle.properties.robots.enum.includes('index,nofollow'));
  assert.ok(siteSchema.definitions.contentHubPublicArticleLocalization.properties.robots.enum.includes('index,nofollow'));
});

test('published bundle schema accepts the fixed The Hair Narrative article projection', async () => {
  const schema = await readSchema('publishedBundle');
  const bundle = buildDeployedPublishedBundle();
  bundle.bundleId = 'art_observing_form:rev_001:thehairnarrative.com:en';
  bundle.hubId = 'thehairnarrative-com-journal';
  bundle.articleId = 'art_observing_form';
  bundle.ownerDraftDomain = 'thehairnarrative.com';
  bundle.renderDomain = 'thehairnarrative.com';
  bundle.locale = 'en';
  bundle.path = '/the-journal/observing-form';
  bundle.safeArticlePath = bundle.path;
  bundle.seo.canonical = bundle.path;
  bundle.components = [];
  bundle.variables = {
    articleContent: {
      html: '<p>Form, movement, and observation.</p>',
    },
  };
  bundle.structuredData = [];

  assert.deepEqual(validateWithAjv(schema, bundle), []);
  assert.deepEqual(validateSchema(schema, bundle), []);
});

test('content hub schemas reject invalid same-origin paths where applicable', async () => {
  const publicSchema = await readSchema('publicConfig');
  const articleSchema = await readSchema('articlePackage');
  const bundleSchema = await readSchema('publishedBundle');

  const badPaths = [
    'https://evil.example/blog',
    '//evil.example/blog',
    'javascript:alert(1)',
    '/blog bad',
    '/blog\\bad',
  ];

  for (const path of badPaths) {
    const publicConfig = buildPublicConfig();
    publicConfig.hubs[0].routeBasePath = path;
    assert.match(validateSchema(publicSchema, publicConfig).join('\n'), /routeBasePath/, path);

    const article = buildArticlePackageManifest();
    article.seo.canonicalPath = path;
    assert.match(validateSchema(articleSchema, article).join('\n'), /canonicalPath/, path);

    const bundle = buildPublishedBundle();
    bundle.path = path;
    assert.match(validateSchema(bundleSchema, bundle).join('\n'), /path/, path);
  }
});

test('site-config schema exposes only public content hub runtime references', async () => {
  const schema = await readSchema('siteConfig');
  const runtime = schema.definitions.runtimeConfig;
  const contentHubRuntime = schema.definitions.contentHubRuntime;
  const valid = buildPublicConfig().hubs[0];
  const invalid = {
    ...valid,
    hubId: '../bad',
    ownerDraftDomain: '../bad',
    defaultLocale: 'bad locale',
    analyticsContext: {
      contentGroup: '../bad',
      eventPrefix: '../bad',
    },
  };

  assert.equal(runtime.properties.contentHubs.items.$ref, '#/definitions/contentHubRuntime');
  assert.deepEqual(contentHubRuntime.required, [
    'hubId',
    'ownerDraftDomain',
    'source',
    'routeBasePath',
    'listPath',
    'articlePathPattern',
    'defaultLocale',
    'locales',
    'canonicalMode',
  ]);
  for (const field of serverOnlyFields) {
    assert.equal(contentHubRuntime.properties[field], undefined, `${field} must not be a public runtime hub property`);
  }
  assert.deepEqual(validateSchema(contentHubRuntime, valid, schema), []);
  assert.match(validateSchema(contentHubRuntime, invalid, schema).join('\n'), /hubId|ownerDraftDomain|defaultLocale|contentGroup|eventPrefix/);
});

test('server-only hub policy validates private storage and role boundaries', async () => {
  const schema = await readSchema('serverPolicy');
  const valid = buildServerPolicy();
  const bad = buildServerPolicy();
  bad.hubs[0].storage.bucketsByCapability.packageBucketName = '';
  bad.hubs[0].storage.tablesByCapability.contentModerationTableName = '';
  bad.hubs[0].storage.prefixes.packagePrefix = '/content-hubs//bad';
  bad.hubs[0].roles[0].credentialRef = 'ssm:/not-a-role-field';
  const flatStorage = buildServerPolicy();
  flatStorage.hubs[0].storage.metadataTableName = 'legacy-flat-table';

  assert.deepEqual(validateSchema(schema, valid), []);
  assert.match(
    validateSchema(schema, bad).join('\n'),
    /packageBucketName|contentModerationTableName|packagePrefix|credentialRef/,
  );
  assert.match(validateSchema(schema, flatStorage).join('\n'), /metadataTableName/);
  assert.equal(schema.definitions.storagePolicy.properties.metadataTableName, undefined);
  assert.equal(schema.definitions.serverHub.properties.publicApiBasePath, undefined);
});

test('article package interactions require moderation or spam control when enabled', async () => {
  const schema = await readSchema('articlePackage');
  const bad = buildArticlePackageManifest();
  bad.interactions.reactions.moderation = 'off';

  assert.match(validateSchema(schema, bad).join('\n'), /interactions\.reactions\.moderation/);
});

test('taxonomy schema supports shared records with per-draft labels and visibility overrides', async () => {
  const schema = await readSchema('taxonomy');
  const valid = buildTaxonomyRecords();
  const bad = buildTaxonomyRecords();
  bad.records[0].visibility.overrides[0].draftDomain = '../bad';
  bad.records[0].labels.es = '';

  assert.deepEqual(validateSchema(schema, valid), []);
  assert.match(validateSchema(schema, bad).join('\n'), /draftDomain|labels/);
  assert.deepEqual(schema.definitions.taxonomyRecord.properties.kind.enum, ['category', 'tag']);
});

test('publish validation report schema records deterministic publish gates', async () => {
  const schema = await readSchema('publishValidation');
  const valid = buildPublishValidationReport();
  const bad = buildPublishValidationReport();
  bad.status = 'maybe';
  bad.checks[0].severity = 'critical';
  bad.lambdaArn = 'arn:aws:lambda:us-east-1:123456789012:function:secret';

  assert.deepEqual(validateSchema(schema, valid), []);
  assert.match(validateSchema(schema, bad).join('\n'), /status|severity|lambdaArn/);
});

test('public schemas reject signed URLs and external script or event handler fields by contract', async () => {
  const articleSchema = await readSchema('articlePackage');
  const bundleSchema = await readSchema('publishedBundle');

  for (const signedUrl of signedUrlExamples) {
    const article = buildArticlePackageManifest();
    article.media[0].publicUrl = signedUrl;
    assert.match(validateSchema(articleSchema, article).join('\n'), /publicUrl/, signedUrl);

    const bundle = buildPublishedBundle();
    bundle.seo.canonical = signedUrl;
    assert.match(validateSchema(bundleSchema, bundle).join('\n'), /canonical/, signedUrl);
  }
});

test('zoosite seed article fixture files validate against content hub schemas', async () => {
  const articleSchema = await readSchema('articlePackage');
  const bundleSchema = await readSchema('publishedBundle');
  const taxonomySchema = await readSchema('taxonomy');
  const publishValidationSchema = await readSchema('publishValidation');
  const manifest = await readFixtureJson(
    'content-hubs/test/zoosite-main/articles/art_20260620_blog_builder/manifest.json',
  );
  const bundle = await readFixtureJson(
    'content-hubs/test/zoosite-main/published/zoositioweb.com.mx/es/art_20260620_blog_builder/rev_001/bundle.json',
  );
  const taxonomy = await readFixtureJson('content-hubs/test/zoosite-main/taxonomy/taxonomy.json');
  const validationReport = await readFixtureJson(
    'content-hubs/test/zoosite-main/articles/art_20260620_blog_builder/lang/es/revisions/rev_001/validation-report.json',
  );

  assert.deepEqual(validateSchema(articleSchema, manifest), []);
  assert.deepEqual(validateSchema(bundleSchema, bundle), []);
  assert.deepEqual(validateWithAjv(bundleSchema, bundle), []);
  assert.deepEqual(validateSchema(taxonomySchema, taxonomy), []);
  assert.deepEqual(validateSchema(publishValidationSchema, validationReport), []);
});
