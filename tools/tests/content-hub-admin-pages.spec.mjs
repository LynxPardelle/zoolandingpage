import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import path from 'node:path';

const repoRoot = process.cwd();
const draftRoot = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx');

const pageIds = [
  'admin-blog',
  'admin-blog-articulos',
  'admin-blog-articulos-nuevo',
  'admin-blog-articulo-editor',
  'admin-blog-articulo-preview',
  'admin-blog-articulo-seo',
  'admin-blog-articulo-versiones',
  'admin-blog-programados',
  'admin-blog-moderacion',
  'admin-blog-medios',
  'admin-blog-analiticas',
  'admin-blog-categorias',
  'admin-blog-tags',
  'admin-blog-hub',
  'admin-blog-configuracion',
];

const allowedGenericTypes = new Set([
  'container',
  'generic-button',
  'generic-card',
  'generic-cell',
  'generic-file-dropzone',
  'generic-link',
  'generic-loading-spinner',
  'generic-media',
  'generic-rich-text',
  'generic-table',
  'generic-text',
  'interaction-scope',
  'button',
  'input',
  'link',
  'media',
  'modal',
  'pagination',
  'search-box',
  'text',
  'toast',
]);

const forbiddenPublicKeys = [
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
];

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(draftRoot, relativePath), 'utf8'));
}

function flattenComponents(payload) {
  return Array.isArray(payload.components) ? payload.components : [];
}

function textSearch(payload) {
  return JSON.stringify(payload);
}

function componentById(components, id) {
  return components.find((component) => component.id === id);
}

describe('Zoosite blog admin draft pages', () => {
  it('ships complete draft package files for every admin blog page', async () => {
    for (const pageId of pageIds) {
      const pageConfig = await readJson(`${pageId}/page-config.json`);
      const components = await readJson(`${pageId}/components.json`);
      const variables = await readJson(`${pageId}/variables.json`);
      const es = await readJson(`${pageId}/i18n/es.json`);
      const en = await readJson(`${pageId}/i18n/en.json`);
      const combos = await readJson(`${pageId}/angora-combos.json`);

      assert.equal(pageConfig.pageId, pageId);
      assert.ok(Array.isArray(pageConfig.rootIds), `${pageId} must declare rootIds`);
      assert.ok(pageConfig.rootIds.length > 0, `${pageId} must declare at least one root component`);
      assert.equal(components.pageId, pageId);
      const componentIds = new Set(flattenComponents(components).map((component) => component.id));
      for (const rootId of pageConfig.rootIds) {
        assert.ok(componentIds.has(rootId), `${pageId} rootIds references missing component ${rootId}`);
      }
      assert.equal(typeof pageConfig.seo?.canonical, 'string', `${pageId} must declare seo.canonical`);
      assert.equal(variables.pageId, pageId);
      assert.equal(es.pageId, pageId);
      assert.equal(en.pageId, pageId);
      assert.equal(combos.pageId, pageId);
      assert.ok(pageConfig.seo?.robots?.default?.includes('noindex'), `${pageId} must stay noindex`);
    }
  });

  it('uses only generic/admin-safe component types and no server-only fields', async () => {
    for (const pageId of pageIds) {
      const payload = await readJson(`${pageId}/components.json`);
      for (const component of flattenComponents(payload)) {
        assert.ok(allowedGenericTypes.has(component.type), `${pageId}/${component.id} uses non-generic type ${component.type}`);
      }

      const serialized = textSearch(payload);
      for (const key of forbiddenPublicKeys) {
        assert.equal(serialized.includes(key), false, `${pageId} leaked ${key}`);
      }
    }
  });

  it('keeps admin button and link touch targets large enough for mobile', async () => {
    for (const pageId of pageIds) {
      const payload = await readJson(`${pageId}/components.json`);
      for (const component of flattenComponents(payload)) {
        if (!['button', 'link'].includes(component.type)) continue;

        const classes = String(component.config?.classes ?? '');
        assert.match(classes, /ank-minHeight-(?:4[8-9]|[5-9][0-9])px/, `${pageId}/${component.id} needs a >=48px touch target`);
      }
    }
  });

  it('keeps admin generic input configs valid for runtime rendering', async () => {
    const allowedControlTypes = new Set(['text', 'textarea', 'number', 'range', 'checkbox', 'switch', 'select', 'file', 'button-group']);
    for (const pageId of pageIds) {
      const payload = await readJson(`${pageId}/components.json`);
      for (const component of flattenComponents(payload)) {
        if (component.type !== 'input') continue;

        assert.ok(allowedControlTypes.has(component.config?.controlType), `${pageId}/${component.id} needs a valid controlType`);
      }
    }
  });

  it('keeps admin primitive configs aligned with runtime allowlists', async () => {
    for (const pageId of pageIds) {
      const payload = await readJson(`${pageId}/components.json`);
      for (const component of flattenComponents(payload)) {
        if (component.type === 'button') {
          assert.equal(component.config?.text, undefined, `${pageId}/${component.id} button must use config.label`);
          assert.equal(component.config?.eventInstructions, undefined, `${pageId}/${component.id} button eventInstructions must be top-level`);
        }
        if (component.type === 'search-box') {
          assert.equal(component.config?.queryParam, undefined, `${pageId}/${component.id} search-box query state belongs outside config`);
          assert.equal(component.config?.target, undefined, `${pageId}/${component.id} search-box target state belongs outside config`);
        }
        if (component.type === 'generic-table' && component.config?.rowsSource) {
          assert.equal(component.config.rowsSource.key, undefined, `${pageId}/${component.id} rowsSource must use path`);
          assert.equal(typeof component.config.rowsSource.path, 'string', `${pageId}/${component.id} rowsSource requires path`);
        }
        if (component.type === 'generic-rich-text') {
          assert.equal(component.config?.outputFormat, undefined, `${pageId}/${component.id} rich text must use format`);
        }
        if (component.type === 'generic-file-dropzone') {
          assert.equal(component.config?.maxFiles, undefined, `${pageId}/${component.id} dropzone maxFiles is not runtime-supported`);
          assert.equal(component.config?.uploadActionId, undefined, `${pageId}/${component.id} upload action must be wired through event handlers`);
        }
      }
    }
  });

  it('keeps protected admin table errors state-driven instead of always visible', async () => {
    for (const pageId of pageIds) {
      const payload = await readJson(`${pageId}/components.json`);
      for (const component of flattenComponents(payload)) {
        if (component.type !== 'generic-table') continue;
        const valueInstructions = String(component.valueInstructions ?? '');
        if (!valueInstructions.includes('remoteStatus.contentHub.')) continue;

        assert.equal(
          component.config?.errorText,
          undefined,
          `${pageId}/${component.id} must not render a static protected-data error before the read runs`,
        );
        assert.match(
          valueInstructions,
          /set:config\.errorText,varOr,remoteStatus\.contentHub\.[^;\s]+\.error,/,
          `${pageId}/${component.id} must bind errorText to the remote content-hub status`,
        );
      }
    }
  });

  it('implements the article index controls required by phase 6', async () => {
    const payload = await readJson('admin-blog-articulos/components.json');
    const components = flattenComponents(payload);
    const table = componentById(components, 'adminBlogArticulosTable');
    const columns = table?.config?.columns ?? [];
    const columnIds = columns.map((column) => column.id);
    const rowActions = table?.config?.rowActions ?? [];

    assert.ok(componentById(components, 'adminBlogArticulosSearch'));
    assert.ok(componentById(components, 'adminBlogArticulosPagination'));
    assert.ok(componentById(components, 'adminBlogArticulosValidateButton'));
    assert.ok(componentById(components, 'adminBlogArticulosNewLink'));
    for (const columnId of ['title', 'status', 'language', 'category', 'tags', 'schedule', 'updatedAt']) {
      assert.ok(columnIds.includes(columnId), `missing article index column ${columnId}`);
    }
    const tagsColumn = columns.find((column) => column.id === 'tags');
    assert.equal(tagsColumn?.format, 'list');
    assert.equal(tagsColumn?.itemPath, 'label');
    assert.equal(tagsColumn?.separator, ', ');
    for (const actionId of ['edit', 'preview', 'seo', 'versions', 'schedule']) {
      assert.ok(rowActions.some((action) => action.id === actionId), `missing article row action ${actionId}`);
    }
    assert.equal(table?.config?.rowIdPath, 'articleId');
    assert.deepEqual(table?.config?.eventPayloadFields, ['articleId', 'status', 'latestRevisionId', 'path']);
    assert.equal(table?.config?.rowsSource?.fallback, undefined);
    for (const action of rowActions) {
      assert.equal(action.disabled, undefined, `${action.id} must not stay visually disabled after BFF contract exists`);
      assert.match(action.eventInstructions ?? '', /^navigateWithEventData:/, `${action.id} must use dynamic row navigation`);
      assert.equal(String(action.eventInstructions ?? '').includes('art_20260620_blog_builder'), false, `${action.id} must not hardcode seed article ids`);
    }
  });

  it('implements create and editor controls with draft-configured field IDs', async () => {
    const createPayload = await readJson('admin-blog-articulos-nuevo/components.json');
    const editorPayload = await readJson('admin-blog-articulo-editor/components.json');
    const createText = textSearch(createPayload);
    const editorText = textSearch(editorPayload);

    for (const fieldId of [
      'articleTitle',
      'articleLanguage',
      'articleCategory',
      'articleTags',
      'articleSummary',
      'articleSeoTitle',
      'articleSeoDescription',
      'articleSlug',
      'articleCanonicalPolicy',
      'articleCommentPolicy',
      'articleContentSafetyPolicy',
    ]) {
      assert.ok(createText.includes(`"fieldId":"${fieldId}"`) || createText.includes(`"fieldId": "${fieldId}"`), `missing create field ${fieldId}`);
    }

    for (const expected of ['generic-rich-text', 'generic-file-dropzone', 'advancedMode', 'componentInspector', 'allowedComponentPreset']) {
      assert.ok(editorText.includes(expected), `missing editor capability ${expected}`);
    }
  });

  it('implements dedicated SEO, revision, scheduling, moderation, media, analytics, taxonomy, and hub config surfaces', async () => {
    const expectations = new Map([
      ['admin-blog-articulo-seo', ['canonical', 'hreflang', 'socialPreview', 'structuredData', 'robots', 'sitemap']],
      ['admin-blog-articulo-versiones', ['revisionId', 'delta', 'snapshot', 'compare', 'restore']],
      ['admin-blog-programados', ['publishAt', 'unpublishAt', 'timezone', 'reschedule', 'cancelSchedule']],
      ['admin-blog-moderacion', ['commentQueue', 'spam', 'approve', 'reject', 'archive', 'audit']],
      ['admin-blog-medios', ['upload', 'assetList', 'metadata', 'usageRefs', 'publicability', 'archive']],
      ['admin-blog-analiticas', ['views', 'readProgress', 'ctaClicks', 'reactions', 'comments', 'shares', 'assetDownloads']],
      ['admin-blog-categorias', ['translation', 'slug', 'seoDescription', 'visible', 'redirectWarning']],
      ['admin-blog-tags', ['translation', 'slug', 'seoDescription', 'visible', 'redirectWarning']],
      ['admin-blog-hub', ['connectedDrafts', 'visibility', 'authorizedHubs']],
      ['admin-blog-configuracion', ['defaultCommentPolicy', 'contentSafetyPolicy', 'componentAllowlistPreset', 'languageFallback', 'seoDefaults']],
    ]);

    for (const [pageId, requiredTerms] of expectations) {
      const text = textSearch(await readJson(`${pageId}/components.json`));
      for (const term of requiredTerms) {
        assert.ok(text.includes(term), `${pageId} missing ${term}`);
      }
    }
  });
});
