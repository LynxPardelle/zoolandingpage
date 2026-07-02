import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import path from 'node:path';

const repoRoot = process.cwd();
const draftRoot = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx');
const siteConfigPath = path.join(draftRoot, 'site-config.json');
const pageConfigPath = path.join(draftRoot, 'admin-combos', 'page-config.json');
const componentsPath = path.join(draftRoot, 'admin-combos', 'components.json');
const comboI18nEsPath = path.join(draftRoot, 'admin-combos', 'i18n', 'es.json');
const comboI18nEnPath = path.join(draftRoot, 'admin-combos', 'i18n', 'en.json');

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

  it('declares comboCatalog runtime with the deployed same-origin front door', async () => {
    const siteConfig = await readJson(siteConfigPath);
    const runtime = siteConfig.runtime?.comboCatalog;

    assert.deepEqual(runtime, {
      enabled: true,
      endpoint: '/features/combo-catalog/read',
      authProfileId: 'staff',
      draftDomain: 'zoositioweb.com.mx',
    });
    assert.equal(JSON.stringify(runtime).includes('credentialRef'), false);
    assert.equal(JSON.stringify(runtime).includes('clientSecret'), false);
    assert.equal(JSON.stringify(runtime).includes('tableName'), false);
  });

  it('wires combo catalog data sources and protected admin actions', async () => {
    const siteConfig = await readJson(siteConfigPath);
    const sources = new Map((siteConfig.runtime?.dataSources ?? []).map((source) => [source.id, source]));
    const actions = new Map((siteConfig.runtime?.apiActions ?? []).map((action) => [action.id, action]));

    assert.equal(sources.get('combo_catalog_combo_list')?.kind, 'combo-catalog');
    assert.equal(sources.get('combo_catalog_combo_list')?.comboCatalog?.read, 'comboList');
    assert.equal(sources.get('combo_catalog_combo_options')?.comboCatalog?.read, 'comboList');
    assert.equal(sources.get('combo_catalog_combo_options')?.target, 'remote.comboCatalog.comboOptions');
    assert.ok(sources.get('combo_catalog_combo_options')?.pageIds?.includes('admin-blog-articulo-editor'));
    assert.deepEqual(sources.get('combo_catalog_combo_options')?.mapper?.fields?.value, { path: 'comboId' });
    assert.deepEqual(sources.get('combo_catalog_combo_options')?.mapper?.fields?.label, { path: 'comboId', transform: 'titleCase' });
    assert.equal(sources.get('combo_catalog_group_list')?.comboCatalog?.read, 'groupList');
    assert.equal(sources.get('combo_catalog_draft_policy')?.comboCatalog?.read, 'draftPolicy');

    for (const [id, operation] of [
      ['combo_catalog_create_combo', 'createCombo'],
      ['combo_catalog_update_combo', 'updateCombo'],
      ['combo_catalog_batch_upsert_combos', 'batchUpsertCombos'],
      ['combo_catalog_soft_delete_combo', 'softDeleteCombo'],
      ['combo_catalog_create_group', 'createGroup'],
      ['combo_catalog_update_group', 'updateGroup'],
      ['combo_catalog_set_draft_policy', 'setDraftPolicy'],
    ]) {
      assert.equal(actions.get(id)?.kind, 'combo-catalog', `${id} kind`);
      assert.equal(actions.get(id)?.comboCatalog?.action, operation, `${id} operation`);
      assert.equal(actions.get(id)?.requiresUserGesture, true, `${id} must require user gesture`);
    }
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
    assert.ok(JSON.stringify(components).includes('"type":"interaction-scope"') || JSON.stringify(components).includes('"type": "interaction-scope"'));
    assert.ok(JSON.stringify(components).includes('"type":"generic-table"') || JSON.stringify(components).includes('"type": "generic-table"'));
    assert.ok(JSON.stringify(components).includes('proxyAction:combo_catalog_create_combo'));
    assert.ok(JSON.stringify(components).includes('proxyAction:combo_catalog_set_draft_policy'));
    assert.equal(JSON.stringify(components).includes('/admin/blog'), false, 'combo admin page must not be nested under blog UI');
  });

  it('ships valid i18n payloads for the protected admin combos page', async () => {
    const spanish = await readJson(comboI18nEsPath);
    const english = await readJson(comboI18nEnPath);

    assert.equal(spanish.pageId, 'admin-combos');
    assert.equal(spanish.lang, 'es');
    assert.equal(spanish.dictionary?.title, 'Catálogo de combos');
    assert.equal(english.pageId, 'admin-combos');
    assert.equal(english.lang, 'en');
    assert.equal(english.dictionary?.title, 'Combo catalog');
  });
});
