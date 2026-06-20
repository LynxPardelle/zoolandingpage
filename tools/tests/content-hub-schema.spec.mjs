import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const schemaBase = new URL('../../docs/api-driven-config/schemas/', import.meta.url);
const seedFixtureBase = new URL('./fixtures/content-hub/zoosite-seed-article/', import.meta.url);

const schemaFiles = {
  siteConfig: 'site-config.schema.json',
  publicConfig: 'content-hub-public.schema.json',
  articlePackage: 'content-hub-article-package.schema.json',
  publishedBundle: 'content-hub-published-bundle.schema.json',
  serverPolicy: 'content-hub-server-policy.schema.json',
  taxonomy: 'content-hub-taxonomy.schema.json',
  publishValidation: 'content-hub-publish-validation.schema.json',
};

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
  return {
    version: 1,
    bundleId: 'bundle_art_20260620_blog_builder_es',
    hubId: 'zoosite-main',
    articleId: 'art_20260620_blog_builder',
    ownerDraftDomain: 'zoositioweb.com.mx',
    renderDomain: 'zoositioweb.com.mx',
    locale: 'es',
    path: '/blog/web/blog-builder-seo',
    status: 'published',
    publishedAt: '2026-06-21T15:00:00.000Z',
    seo: {
      title: 'Blog builder con SEO',
      description: 'Contrato inicial para artículos visuales y SEO.',
      canonical: 'https://zoositioweb.com.mx/blog/web/blog-builder-seo',
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
    components: {
      version: 1,
      components: [
        {
          id: 'articleTitle',
          type: 'text',
          condition: 'varEq:article.visible,true',
          valueInstructions: 'set:config.text,i18n,article.title',
          eventInstructions: 'track:blog_article_title_view',
          loopConfig: {
            source: 'var',
            path: 'article.sections',
          },
          config: { text: 'Blog builder con SEO' },
        },
      ],
    },
    variables: {
      version: 1,
      variables: {},
    },
    i18n: {
      version: 1,
      lang: 'es',
      dictionary: {},
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
  leaked.components.components[0].config.onLoad = 'alert(1)';
  leaked.seo.canonical = signedUrlExamples[1];
  const leakedNested = buildPublishedBundle();
  leakedNested.structuredData[0].json.sameAs = signedUrlExamples[2];
  leakedNested.variables.variables.credentialRef = 'ssm:/not-public';
  leakedNested.variables.variables.access_token = 'not-public';
  leakedNested.variables.variables.ACCESS_TOKEN = 'not-public';
  leakedNested.variables.variables.Access_Token = 'not-public';
  leakedNested.i18n.dictionary.onClick = 'alert(1)';
  leakedNested.components.components[0].config.onclick = 'alert(1)';
  leakedNested.components.components[0].config.OnClick = 'alert(1)';

  assert.deepEqual(validateSchema(schema, valid), []);
  assert.match(validateSchema(schema, leaked).join('\n'), /accessToken|onLoad|canonical/);
  assert.match(validateSchema(schema, leakedNested).join('\n'), /sameAs|credentialRef|access_token|ACCESS_TOKEN|Access_Token|onClick|onclick|OnClick/);
  assert.equal(schema.properties.serverPolicy, undefined);
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
  assert.deepEqual(validateSchema(taxonomySchema, taxonomy), []);
  assert.deepEqual(validateSchema(publishValidationSchema, validationReport), []);
});
