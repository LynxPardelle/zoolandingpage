import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import path from 'node:path';

const repoRoot = process.cwd();
const draftRoot = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx');
const siteConfigPath = path.join(draftRoot, 'site-config.json');
const pageConfigPath = path.join(draftRoot, 'admin-combos', 'page-config.json');
const componentsPath = path.join(draftRoot, 'admin-combos', 'components.json');

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function findComponentById(root, componentId) {
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    if (current.id === componentId) return current;
    for (const value of Object.values(current)) {
      if (Array.isArray(value)) stack.push(...value);
      else if (value && typeof value === 'object') stack.push(value);
    }
  }
  return null;
}

describe('Zoosite combo catalog draft contract', () => {
  it('keeps /admin/combos protected, noindexed, and outside blog routing', async () => {
    const siteConfig = await readJson(siteConfigPath);
    const routes = new Map(siteConfig.routes.map((route) => [route.path, route]));
    const route = routes.get('/admin/combos');

    assert.ok(route, 'missing /admin/combos route');
    assert.equal(route.pageId, 'admin-combos');
    assert.deepEqual(route.auth, {
      required: true,
      redirectTo: '/acceso',
      allowedGroups: ['zoosite-admin'],
    });
    assert.ok(siteConfig.sitemap?.excludePaths?.includes('/admin/combos'), '/admin/combos must be excluded from sitemap');
  });

  it('declares comboCatalog runtime as optional and disabled until the Lambda endpoint is deployed', async () => {
    const siteConfig = await readJson(siteConfigPath);
    const runtime = siteConfig.runtime?.comboCatalog;

    assert.deepEqual(runtime, {
      enabled: false,
      endpoint: '/features/combo-catalog/read',
      authProfileId: 'staff',
      draftDomain: 'zoositioweb.com.mx',
    });
    assert.equal(JSON.stringify(runtime).includes('credentialRef'), false);
    assert.equal(JSON.stringify(runtime).includes('clientSecret'), false);
    assert.equal(JSON.stringify(runtime).includes('tableName'), false);
  });

  it('uses the shared site header/footer and generic components for the admin combos surface', async () => {
    const pageConfig = await readJson(pageConfigPath);
    const components = await readJson(componentsPath);

    assert.deepEqual(pageConfig.rootIds, [
      'skipToMainLink',
      'siteHeader',
      'adminCombosRoot',
      'siteFooter',
    ]);
    assert.ok(findComponentById(components, 'adminCombosCatalogCard'));
    assert.ok(findComponentById(components, 'adminCombosEditorCard'));
    assert.ok(findComponentById(components, 'adminCombosPolicyCard'));
    assert.ok(findComponentById(components, 'adminCombosPreviewCard'));
    assert.equal(JSON.stringify(components).includes('/admin/blog'), false, 'combo admin page must not be nested under blog UI');
  });
});
