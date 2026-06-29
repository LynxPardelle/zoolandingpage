import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import path from 'node:path';

const repoRoot = process.cwd();
const siteConfigPath = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'site-config.json');
const adminArticlesComponentsPath = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'admin-blog-articulos', 'components.json');
const adminOverviewComponentsPath = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'admin-blog', 'components.json');
const adminEditorComponentsPath = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'admin-blog-articulo-editor', 'components.json');

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

const requiredReads = [
  'articleList',
  'articleDetail',
  'taxonomyList',
  'revisionList',
  'assetList',
  'moderationQueue',
  'publicBundlePreview',
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

async function loadDraftComponents(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

describe('Zoosite content hub admin bindings', () => {
  it('keeps every blog admin route protected and out of the sitemap', async () => {
    const siteConfig = await loadSiteConfig();
    const routesByPath = new Map(siteConfig.routes.map((route) => [route.path, route]));
    const excluded = new Set(siteConfig.sitemap?.excludePaths ?? []);

    for (const routePath of adminRoutes) {
      const route = routesByPath.get(routePath);
      assert.ok(route, `missing route ${routePath}`);
      assert.equal(route.auth?.required, true, `${routePath} must be auth protected`);
      assert.deepEqual(route.auth?.allowedGroups, ['zoosite-admin'], `${routePath} must be admin-only`);
      assert.equal(route.auth?.redirectTo, '/acceso', `${routePath} must redirect to access`);
      assert.ok(excluded.has(routePath), `${routePath} must be excluded from sitemap`);
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
  });

  it('does not expose server-only content-hub policy in public site config', async () => {
    const serialized = JSON.stringify(await loadSiteConfig());
    for (const key of forbiddenKeys) {
      assert.equal(serialized.includes(key), false, `site-config leaked ${key}`);
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
});
