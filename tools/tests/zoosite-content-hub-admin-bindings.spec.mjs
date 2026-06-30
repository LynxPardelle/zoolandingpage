import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import path from 'node:path';

const repoRoot = process.cwd();
const siteConfigPath = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'site-config.json');
const authProfileRegistryPath = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'server', 'auth-profile-registry.json');
const adminArticlesComponentsPath = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'admin-blog-articulos', 'components.json');
const adminOverviewComponentsPath = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'admin-blog', 'components.json');
const adminEditorComponentsPath = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'admin-blog-articulo-editor', 'components.json');
const adminNewArticleComponentsPath = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'admin-blog-articulos-nuevo', 'components.json');
const adminCategoriesComponentsPath = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'admin-blog-categorias', 'components.json');
const adminTagsComponentsPath = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'admin-blog-tags', 'components.json');
const adminAnalyticsComponentsPath = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'admin-blog-analiticas', 'components.json');

const adminRoutes = [
  '/admin/blog',
  '/admin/blog/articulos',
  '/admin/blog/articulos/nuevo',
  '/admin/blog/articulos/:id/editor',
  '/admin/blog/articulos/:id/preview',
  '/admin/blog/articulos/:id/seo',
  '/admin/blog/articulos/:id/versiones',
  '/admin/blog/programados',
  '/admin/blog/moderacion',
  '/admin/blog/medios',
  '/admin/blog/analiticas',
  '/admin/blog/categorias',
  '/admin/blog/tags',
  '/admin/blog/hub',
  '/admin/blog/configuracion',
];

const blogEditorGroups = ['zoosite-admin', 'zoosite-blog-editor', 'zoosite-blog-publisher'];
const blogEntryGroups = [
  'zoosite-admin',
  'zoosite-blog-editor',
  'zoosite-blog-publisher',
  'zoosite-blog-media',
  'zoosite-blog-moderator',
  'zoosite-blog-analyst',
];
const adminRouteGroups = new Map([
  ['/admin/blog', blogEntryGroups],
  ['/admin/blog/articulos', blogEditorGroups],
  ['/admin/blog/articulos/nuevo', blogEditorGroups],
  ['/admin/blog/articulos/:id/editor', blogEditorGroups],
  ['/admin/blog/articulos/:id/preview', blogEditorGroups],
  ['/admin/blog/articulos/:id/seo', blogEditorGroups],
  ['/admin/blog/articulos/:id/versiones', blogEditorGroups],
  ['/admin/blog/programados', blogEditorGroups],
  ['/admin/blog/moderacion', ['zoosite-admin', 'zoosite-blog-moderator']],
  ['/admin/blog/medios', ['zoosite-admin', 'zoosite-blog-media', 'zoosite-blog-editor', 'zoosite-blog-publisher']],
  ['/admin/blog/analiticas', ['zoosite-admin', 'zoosite-blog-analyst']],
  ['/admin/blog/categorias', blogEditorGroups],
  ['/admin/blog/tags', blogEditorGroups],
  ['/admin/blog/hub', ['zoosite-admin']],
  ['/admin/blog/configuracion', ['zoosite-admin']],
]);

const requiredReads = [
  'articleList',
  'articleDetail',
  'taxonomyList',
  'revisionList',
  'assetList',
  'moderationQueue',
  'publicBundlePreview',
  'analyticsSummary',
];

const requiredActions = [
  'createArticle',
  'updatePackage',
  'upsertTaxonomy',
  'uploadAsset',
  'validate',
  'submitReview',
  'approveArticle',
  'publish',
  'unpublishArticle',
  'archiveArticle',
  'schedule',
  'cancelSchedule',
  'queueComment',
  'moderateComment',
  'recordInteraction',
  'restoreRevision',
];

const forbiddenKeys = [
  'credentialRef',
  'clientSecret',
  'accessToken',
  'refreshToken',
  'idToken',
  'serverPolicy',
  'tableName',
  'bucketName',
  'lambdaArn',
  'groupsToRoles',
  'authorizationDecision',
  'signedUrl',
  'ssm:/',
  'secretsmanager:/',
  'X-Amz-Signature',
];

async function loadSiteConfig() {
  return JSON.parse(await readFile(siteConfigPath, 'utf8'));
}

async function loadAuthProfileRegistry() {
  return JSON.parse(await readFile(authProfileRegistryPath, 'utf8'));
}

async function loadDraftComponents(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function findComponentById(root, componentId) {
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    if (current.id === componentId) return current;
    for (const value of Object.values(current)) {
      if (Array.isArray(value)) {
        stack.push(...value);
      } else if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }
  return null;
}

describe('Zoosite content hub admin bindings', () => {
  it('keeps every blog admin route protected and out of the sitemap', async () => {
    const siteConfig = await loadSiteConfig();
    const authProfileRegistry = await loadAuthProfileRegistry();
    const authProfile = authProfileRegistry.profiles.find((profile) => profile.domain === 'zoositioweb.com.mx');
    const profileGroups = new Set(authProfile?.allowedGroups ?? []);
    const routesByPath = new Map(siteConfig.routes.map((route) => [route.path, route]));
    const excluded = new Set(siteConfig.sitemap?.excludePaths ?? []);

    for (const routePath of adminRoutes) {
      const route = routesByPath.get(routePath);
      assert.ok(route, `missing route ${routePath}`);
      assert.equal(route.auth?.required, true, `${routePath} must be auth protected`);
      assert.deepEqual(route.auth?.allowedGroups, adminRouteGroups.get(routePath), `${routePath} must use the expected auth groups`);
      assert.equal(route.auth?.redirectTo, '/acceso', `${routePath} must redirect to access`);
      assert.ok(excluded.has(routePath), `${routePath} must be excluded from sitemap`);
      for (const group of route.auth?.allowedGroups ?? []) {
        assert.ok(profileGroups.has(group), `${routePath} uses auth group missing from server profile: ${group}`);
      }
    }
  });

  it('declares content-hub data sources for every phase-6 admin read surface', async () => {
    const siteConfig = await loadSiteConfig();
    const dataSources = siteConfig.runtime?.dataSources?.filter((source) => source.kind === 'content-hub') ?? [];
    const reads = new Set(dataSources.map((source) => source.contentHub?.read));

    for (const read of requiredReads) {
      assert.ok(reads.has(read), `missing content-hub read ${read}`);
    }
    for (const source of dataSources) {
      assert.equal(source.contentHub?.hubId, 'zoosite-main');
      assert.match(source.target, /^remote\.contentHub\./);
      assert.match(source.statusTarget, /^remoteStatus\.contentHub\./);
    }

    const articleDetail = dataSources.find((source) => source.contentHub?.read === 'articleDetail');
    assert.deepEqual(articleDetail?.input?.articleId, {
      source: 'routeParam',
      key: 'id',
      transforms: ['trim'],
    });
    assert.deepEqual(articleDetail?.requiredInputKeys, ['articleId']);

    for (const read of ['revisionList', 'publicBundlePreview']) {
      const source = dataSources.find((entry) => entry.contentHub?.read === read);
      assert.deepEqual(source?.input?.articleId, {
        source: 'routeParam',
        key: 'id',
        transforms: ['trim'],
      }, `${read} must hydrate selected article ids from the detail route`);
      assert.deepEqual(source?.requiredInputKeys, ['articleId'], `${read} must not call the BFF without articleId`);
    }

    const assetSources = dataSources.filter((source) => source.contentHub?.read === 'assetList');
    assert.equal(assetSources.length, 2, 'assetList must be split between article detail and media library contexts');
    const editorAssets = assetSources.find((source) => source.pageIds?.includes('admin-blog-articulo-editor'));
    const mediaAssets = assetSources.find((source) => source.pageIds?.includes('admin-blog-medios'));
    assert.deepEqual(editorAssets?.input?.articleId, {
      source: 'routeParam',
      key: 'id',
      transforms: ['trim'],
    });
    assert.deepEqual(editorAssets?.requiredInputKeys, ['articleId']);
    assert.deepEqual(mediaAssets?.input?.articleId, {
      source: 'queryParam',
      key: 'articleId',
      transforms: ['trim'],
    });

    const categories = dataSources.find((source) => source.id === 'content_hub_categories');
    assert.equal(categories?.contentHub?.read, 'taxonomyList');
    assert.deepEqual(categories?.input?.taxonomyKind, { source: 'literal', value: 'category' });
    assert.ok(categories?.pageIds?.includes('admin-blog-articulos-nuevo'));
    assert.ok(categories?.pageIds?.includes('admin-blog-articulo-editor'));
    assert.equal(categories?.target, 'remote.contentHub.categories');
    assert.deepEqual(categories?.mapper?.fields?.value, { path: 'slug' });
    assert.deepEqual(categories?.mapper?.fields?.label, {
      path: 'label',
      transform: 'titleCase',
      fallback: 'Sin nombre',
    });

    const tags = dataSources.find((source) => source.id === 'content_hub_tags');
    assert.equal(tags?.contentHub?.read, 'taxonomyList');
    assert.deepEqual(tags?.input?.taxonomyKind, { source: 'literal', value: 'tag' });
    assert.ok(tags?.pageIds?.includes('admin-blog-articulos-nuevo'));
    assert.ok(tags?.pageIds?.includes('admin-blog-articulo-editor'));
    assert.equal(tags?.target, 'remote.contentHub.tags');
    assert.deepEqual(tags?.mapper?.fields?.value, { path: 'slug' });
    assert.deepEqual(tags?.mapper?.fields?.label, {
      path: 'slug',
      fallback: 'Sin tag',
    });

    const analytics = dataSources.find((source) => source.id === 'content_hub_analytics_summary');
    assert.equal(analytics?.contentHub?.read, 'analyticsSummary');
    assert.equal(analytics?.target, 'remote.contentHub.analytics');
    assert.equal(analytics?.statusTarget, 'remoteStatus.contentHub.analytics');
    assert.deepEqual(analytics?.pageIds, ['admin-blog-analiticas']);
  });

  it('declares content-hub actions for every phase-6 admin mutation contract', async () => {
    const siteConfig = await loadSiteConfig();
    const actions = siteConfig.runtime?.apiActions?.filter((action) => action.kind === 'content-hub') ?? [];
    const actionKinds = new Set(actions.map((action) => action.contentHub?.action));

    for (const action of requiredActions) {
      assert.ok(actionKinds.has(action), `missing content-hub action ${action}`);
    }
    for (const action of actions) {
      assert.equal(action.contentHub?.hubId, 'zoosite-main');
      assert.match(action.statusTarget, /^remoteStatus\.contentHub\./);
      assert.ok(Array.isArray(action.inputFields), `${action.id} must declare safe inputFields`);
    }
    assert.deepEqual(
      actions.find((action) => action.id === 'content_hub_record_interaction')?.inputFields,
      ['articleId', 'eventType', 'targetId', 'value', 'path'],
      'recordInteraction must not expose free-form metadata from draft UI',
    );
  });

  it('does not expose server-only content-hub policy in public site config', async () => {
    const serialized = JSON.stringify(await loadSiteConfig());
    for (const key of forbiddenKeys) {
      assert.equal(serialized.includes(key), false, `site-config leaked ${key}`);
    }
  });

  it('shows the account blog admin entry to dedicated blog roles without widening user admin access', async () => {
    const accountComponentsPath = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'mi-cuenta', 'components.json');
    const components = await loadDraftComponents(accountComponentsPath);
    const userAdminLink = findComponentById(components, 'miCuentaAdminLink');
    const blogAdminLink = findComponentById(components, 'miCuentaAdminBlogLink');

    assert.equal(userAdminLink?.condition, 'all:varEq,remote.auth.account.items.0.isAdminText,Administrador');
    assert.equal(blogAdminLink?.config?.href, '/admin/blog');
    for (const group of blogEntryGroups) {
      assert.match(
        blogAdminLink?.condition ?? '',
        new RegExp(`varIncludes,remote\\.auth\\.account\\.items\\.0\\.rolesText,${group}`),
        `account blog link must be discoverable for ${group}`,
      );
    }
  });

  it('uses clean route-param detail links instead of duplicating articleId in query strings', async () => {
    for (const filePath of [adminArticlesComponentsPath, adminOverviewComponentsPath, adminEditorComponentsPath]) {
      const serialized = JSON.stringify(await loadDraftComponents(filePath));
      assert.equal(serialized.includes('/editor?articleId='), false, `${filePath} must not duplicate editor articleId`);
      assert.equal(serialized.includes('/preview?articleId='), false, `${filePath} must not duplicate preview articleId`);
      assert.equal(serialized.includes('/seo?articleId='), false, `${filePath} must not duplicate SEO articleId`);
      assert.equal(serialized.includes('/versiones?articleId='), false, `${filePath} must not duplicate versions articleId`);
    }
  });

  it('hydrates article category and tag controls from protected taxonomy reads', async () => {
    const siteConfig = await loadSiteConfig();
    const newArticleComponents = await loadDraftComponents(adminNewArticleComponentsPath);
    const editorComponents = await loadDraftComponents(adminEditorComponentsPath);
    const categoryComponents = await loadDraftComponents(adminCategoriesComponentsPath);
    const tagComponents = await loadDraftComponents(adminTagsComponentsPath);
    const articleDetailSource = siteConfig.runtime.dataSources.find((source) => source.id === 'content_hub_article_detail');
    assert.equal(
      articleDetailSource?.mapper?.fields?.articleContent?.path,
      'articleContent',
      'article detail mapper must expose editable rich text content to draft components',
    );

    const newCategory = findComponentById(newArticleComponents, 'newArticleCategory');
    assert.equal(newCategory?.config?.controlType, 'select');
    assert.deepEqual(newCategory?.config?.options, {
      source: 'var',
      path: 'remote.contentHub.categories.items',
      fallback: [
      { value: 'web', label: 'Web' },
      { value: 'seo', label: 'SEO' },
      { value: 'builder', label: 'Editor visual' },
      { value: 'angora', label: 'Diseño del sitio CSS' },
      ],
    });

    const newTags = findComponentById(newArticleComponents, 'newArticleTags');
    assert.deepEqual(newTags?.config?.autocompleteOptions, {
      source: 'var',
      path: 'remote.contentHub.tags.items',
      fallback: [
        { value: 'seo', label: 'seo' },
        { value: 'blog-builder', label: 'blog-builder' },
        { value: 'sitios-web', label: 'sitios-web' },
        { value: 'content-hub', label: 'herramientas del blog' },
      ],
    });

    const editorCategory = findComponentById(editorComponents, 'editorCategoryInput');
    assert.deepEqual(editorCategory?.config?.options, newCategory?.config?.options);

    const editorTags = findComponentById(editorComponents, 'editorTagsInput');
    assert.deepEqual(editorTags?.config?.autocompleteOptions, newTags?.config?.autocompleteOptions);

    const editorRichText = findComponentById(editorComponents, 'articleRichText');
    assert.equal(
      editorRichText?.valueInstructions,
      'set:config.value,varOr,remote.contentHub.articleDetail.items.0.articleContent,',
      'article editor rich text must hydrate from articleDetail package content',
    );

    const categoriesTable = findComponentById(categoryComponents, 'categoriesTable');
    const tagsTable = findComponentById(tagComponents, 'tagsTable');
    assert.equal(categoriesTable?.config?.rowsSource?.path, 'remote.contentHub.categories.items');
    assert.equal(tagsTable?.config?.rowsSource?.path, 'remote.contentHub.tags.items');
    assert.equal(categoriesTable?.config?.columns?.some((column) => column.id === 'kind'), false);
    assert.equal(tagsTable?.config?.columns?.some((column) => column.id === 'kind'), false);

    const analyticsComponents = await loadDraftComponents(adminAnalyticsComponentsPath);
    const analyticsTable = findComponentById(analyticsComponents, 'analyticsTable');
    assert.equal(analyticsTable?.config?.rowsSource?.path, 'remote.contentHub.analytics.items');
    assert.match(String(analyticsTable?.valueInstructions ?? ''), /remoteStatus\.contentHub\.analytics/);
  });
});
