import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import path from 'node:path';

const repoRoot = process.cwd();
const siteConfigPath = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'site-config.json');

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
  'taxonomyList',
  'revisionList',
  'assetList',
  'moderationQueue',
  'publicBundlePreview',
];

const requiredActions = [
  'createArticle',
  'updatePackage',
  'uploadAsset',
  'validate',
  'publish',
  'schedule',
  'moderateComment',
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
});
