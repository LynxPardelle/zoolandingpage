import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import path from 'node:path';

const repoRoot = process.cwd();
const draftRoot = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx');
const qaChecklistPath = path.join(draftRoot, 'qa', 'admin-blog-qa-checklist.md');

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
  'tooltip',
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

const productReadinessBlocks = [
  'Editorial lifecycle',
  'Blog roles and permissions',
  'Rich text and component builder stability',
  'Visual component catalog and advanced mode',
  'Taxonomy product UX',
  'Media lifecycle',
  'Scheduling and revision history',
  'Public interactions and moderation',
  'SEO product completion',
  'Analytics productization',
  'Operations, observability, and audit',
  'Full QA, release, and product readiness',
];

function sectionBody(markdown, heading) {
  const lines = markdown.split(/\r?\n/u);
  const headingLine = `## ${heading}`;
  const start = lines.findIndex((line) => line.trim() === headingLine);
  if (start === -1) return '';
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n');
}

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

const userFacingStringKeys = new Set([
  'text',
  'label',
  'helperText',
  'placeholder',
  'emptyText',
  'loadingText',
  'errorText',
  'successText',
  'ariaLabel',
  'tooltip',
]);

function collectUserFacingStrings(value, trail = [], hits = []) {
  if (!value || typeof value !== 'object') return hits;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUserFacingStrings(item, [...trail, String(index)], hits));
    return hits;
  }
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'string' && userFacingStringKeys.has(key)) {
      hits.push([`${[...trail, key].join('.')}`, child]);
      continue;
    }
    collectUserFacingStrings(child, [...trail, key], hits);
  }
  return hits;
}

function collectAllStrings(value, trail = [], hits = []) {
  if (typeof value === 'string') {
    hits.push([trail.join('.'), value]);
    return hits;
  }
  if (!value || typeof value !== 'object') return hits;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectAllStrings(item, [...trail, String(index)], hits));
    return hits;
  }
  for (const [key, child] of Object.entries(value)) collectAllStrings(child, [...trail, key], hits);
  return hits;
}

describe('Zoosite blog admin draft pages', () => {
  it('keeps the Zoosite blog QA checklist aligned with the 12 product-completion blocks', async () => {
    const checklist = await readFile(qaChecklistPath, 'utf8');

    for (const block of productReadinessBlocks) {
      assert.match(checklist, new RegExp(`^## ${block}$`, 'mu'), `QA checklist must include block: ${block}`);
      assert.match(sectionBody(checklist, block), /^- \[ \] /mu, `QA checklist block must include at least one actionable item: ${block}`);
    }
    const releaseBody = sectionBody(checklist, 'Full QA, release, and product readiness');
    assert.match(releaseBody, /testing/iu, 'release QA block must require testing validation');
    assert.match(releaseBody, /produccion|production/iu, 'release QA block must require production validation');
    assert.match(releaseBody, /desktop.*mobile|mobile.*desktop/iu, 'release QA block must require desktop and mobile validation');
  });

  it('ships complete draft package files for every admin blog page', async () => {
    const sharedComponents = flattenComponents(await readJson('components.json'));
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
      const componentIds = new Set([...sharedComponents, ...flattenComponents(components)].map((component) => component.id));
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
        assert.ok(
          /set:config\.errorText,varOr,remoteStatus\.contentHub\.[^;\s]+\.error,/.test(valueInstructions)
            || /set:config\.errorText,when,"all:varEq,remoteStatus\.contentHub\.[^"]+\.state,error"/.test(valueInstructions),
          `${pageId}/${component.id} must bind errorText to the remote content-hub status`,
        );
      }
    }
  });

  it('keeps visible admin copy free of raw technical placeholders', async () => {
    const rawVisibleCopyPattern = /\b(?:articleId|revisionId|query string|backend|BFF|CSRF|endpoint|payload|tenant|buckets?|authorizer policy)\b|\[object Object\]|Invalid id/iu;
    const rawStatusInstructionPattern = /set:config\.text,varOr,remoteStatus\.contentHub\.[^,]+\.error/;
    const forbiddenFragments = [
      'articleId pendiente',
      'revisionId pendiente',
      'La respuesta no incluyó articleId',
      'La respuesta no incluyó revisionId',
      'query string',
      'backend',
      'Invalid id',
      '[object Object]',
    ];

    for (const pageId of pageIds.filter((id) => id.startsWith('admin-blog-'))) {
      const payload = await readJson(`${pageId}/components.json`);
      const serialized = textSearch(payload);
      for (const fragment of forbiddenFragments) {
        assert.equal(serialized.includes(fragment), false, `${pageId} must not include raw visible fragment: ${fragment}`);
      }

      for (const component of flattenComponents(payload)) {
        assert.equal(
          rawStatusInstructionPattern.test(String(component.valueInstructions ?? '')),
          false,
          `${pageId}/${component.id} must not pass raw content-hub error text into visible text`,
        );
      }

      for (const [trail, value] of collectUserFacingStrings(payload)) {
        assert.equal(rawVisibleCopyPattern.test(value), false, `${pageId}/${trail} has raw technical copy: ${value}`);
      }

      for (const language of ['es', 'en']) {
        const translations = await readJson(`${pageId}/i18n/${language}.json`);
        for (const [trail, value] of collectAllStrings(translations)) {
          assert.equal(rawVisibleCopyPattern.test(value), false, `${pageId}/i18n/${language}.json/${trail} has raw technical copy: ${value}`);
        }
      }
    }
  });

  it('implements the article index controls required by phase 6', async () => {
    const payload = await readJson('admin-blog-articulos/components.json');
    const components = flattenComponents(payload);
    const shell = componentById(components, 'admin-blog-articulosShell');
    const toolbar = componentById(components, 'adminBlogArticulosToolbar');
    const filtersScope = componentById(components, 'adminBlogArticulosFiltersScope');
    const search = componentById(components, 'adminBlogArticulosSearch');
    const searchButton = componentById(components, 'adminBlogArticulosSearchButton');
    const statusFilter = componentById(components, 'adminBlogArticulosStatusFilter');
    const pageSizeFilter = componentById(components, 'adminBlogArticulosPageSize');
    const table = componentById(components, 'adminBlogArticulosTable');
    const pagination = componentById(components, 'adminBlogArticulosPagination');
    const columns = table?.config?.columns ?? [];
    const columnIds = columns.map((column) => column.id);
    const rowActions = table?.config?.rowActions ?? [];

    assert.equal(shell?.config?.components?.includes('adminBlogArticulosPagination'), true);
    assert.deepEqual(toolbar?.config?.components, [
      'adminBlogArticulosMutationNotice',
      'adminBlogArticulosFiltersScope',
      'adminBlogArticulosSearchTooltip',
      'adminBlogArticulosActionStatus',
    ]);
    assert.equal(filtersScope?.type, 'interaction-scope');
    assert.match(filtersScope?.config?.submitEventInstructions ?? '', /^navigateWithScopeQuery:\/admin\/blog\/articulos,,q=values\.search,status=values\.status,pageSize=values\.pageSize,page=1$/);
    assert.equal(search?.type, 'input');
    assert.equal(search?.config?.inputType, 'search');
    assert.equal(search?.config?.value, '');
    assert.equal(search?.valueInstructions, 'set:config.value,queryParamOr,q,');
    assert.equal(searchButton?.type, 'button');
    assert.equal(searchButton?.config?.type, 'submit');
    assert.equal(statusFilter?.config?.value, 'all');
    assert.equal(statusFilter?.valueInstructions, 'set:config.value,queryParamOr,status,all');
    assert.equal(pageSizeFilter?.config?.value, '10');
    assert.equal(pageSizeFilter?.valueInstructions, 'set:config.value,queryParamOr,pageSize,10');
    assert.equal(statusFilter?.config?.dropdownIndicatorText, '▼');
    assert.equal(pageSizeFilter?.config?.dropdownIndicatorText, '▼');
    assert.deepEqual(
      pageSizeFilter?.config?.options?.map((option) => String(option.value)),
      ['3', '5', '10', '20', '50'],
    );
    assert.equal(typeof statusFilter?.config?.dropdownConfig?.menuContainerClasses, 'string');
    assert.ok(componentById(components, 'adminBlogArticulosPagination'));
    assert.equal(pagination?.config?.hideWhenSinglePage, false);
    assert.ok(componentById(components, 'adminBlogArticulosValidateButton'));
    assert.ok(componentById(components, 'adminBlogArticulosValidateIdle'));
    assert.ok(componentById(components, 'adminBlogArticulosNewLink'));
    for (const columnId of ['title', 'status', 'language', 'category', 'tags', 'schedule', 'updatedAt']) {
      assert.ok(columnIds.includes(columnId), `missing article index column ${columnId}`);
    }
    const tagsColumn = columns.find((column) => column.id === 'tags');
    assert.equal(tagsColumn?.format, 'list');
    assert.equal(tagsColumn?.itemPath, 'label');
    assert.equal(tagsColumn?.separator, ', ');
    assert.equal(tagsColumn?.emptyText, 'Sin tags');
    for (const actionId of ['edit', 'preview', 'seo', 'versions', 'schedule']) {
      assert.ok(rowActions.some((action) => action.id === actionId), `missing article row action ${actionId}`);
    }
    assert.equal(table?.config?.rowIdPath, 'articleId');
    assert.deepEqual(table?.config?.eventPayloadFields, ['articleId', 'status', 'latestRevisionId', 'path']);
    assert.equal(table?.config?.rowsSource?.fallback, undefined);
    assert.equal(table?.config?.pagination?.enabled, false);
    assert.equal(pagination?.config?.hideWhenSinglePage, false);
    for (const action of rowActions) {
      assert.equal(action.disabled, undefined, `${action.id} must not stay visually disabled after BFF contract exists`);
      const navigationTemplate = String(action.hrefTemplate ?? action.eventInstructions ?? '');
      assert.ok(
        navigationTemplate.startsWith('/') || navigationTemplate.startsWith('navigateWithEventData:/'),
        `${action.id} must use dynamic row navigation`,
      );
      assert.equal(navigationTemplate.includes('{articleId}'), true, `${action.id} must include the selected article id`);
      assert.equal(navigationTemplate.includes('art_20260620_blog_builder'), false, `${action.id} must not hardcode seed article ids`);
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

  it('shows direct post-create next-step links bound to the created article ids', async () => {
    const payload = await readJson('admin-blog-articulos-nuevo/components.json');
    const components = flattenComponents(payload);
    const status = componentById(components, 'newArticleCreateStatus');
    const successCondition = 'all:varEq,remoteStatus.contentHub.content_hub_create_article.state,success';
    const articleIdInstruction = 'set:config.articleId,varOr,remoteStatus.contentHub.content_hub_create_article.articleId,';
    const revisionIdInstruction = 'set:config.revisionId,varOr,remoteStatus.contentHub.content_hub_create_article.revisionId,';

    const expectations = new Map([
      ['newArticleCreateEditorLink', ['/admin/blog/articulos/', '/editor']],
      ['newArticleCreatePreviewLink', ['/admin/blog/articulos/', '/preview']],
      ['newArticleCreateSeoLink', ['/admin/blog/articulos/', '/seo']],
      ['newArticleCreateVersionsLink', ['/admin/blog/articulos/', '/versiones']],
      ['newArticleCreateScheduleLink', ['/admin/blog/programados?articleId=', '&revisionId=']],
    ]);

    for (const componentId of expectations.keys()) {
      assert.equal(status?.config?.components?.includes(componentId), true, `create success state must include ${componentId}`);
    }

    for (const [componentId, requiredFragments] of expectations) {
      const component = componentById(components, componentId);
      assert.equal(component?.type, 'link', `${componentId} must be a direct generic link`);
      assert.equal(component?.condition, successCondition, `${componentId} must only show after createArticle succeeds`);
      assert.equal(String(component?.valueInstructions ?? '').includes(articleIdInstruction), true, `${componentId} must use the created articleId`);
      for (const fragment of requiredFragments) {
        assert.equal(String(component?.valueInstructions ?? '').includes(fragment), true, `${componentId} must build href with ${fragment}`);
      }
      assert.equal(String(component?.config?.href ?? '').startsWith('/admin/'), true, `${componentId} fallback href must stay same-origin so sticky draft query context is preserved`);
      assert.equal(String(component?.config?.href ?? '').includes('draftDomain='), false, `${componentId} must not hardcode draftDomain`);
      assert.equal(String(component?.config?.href ?? '').includes('debugWorkspace='), false, `${componentId} must not hardcode debugWorkspace`);
      assert.equal(String(component?.config?.href ?? '').includes('lang='), false, `${componentId} must not hardcode lang`);
    }

    const scheduleLink = componentById(components, 'newArticleCreateScheduleLink');
    assert.equal(
      String(scheduleLink?.valueInstructions ?? '').includes(revisionIdInstruction),
      true,
      'schedule success link must use the created revisionId',
    );
  });

  it('hydrates preview and SEO revision ids from protected article detail', async () => {
    const previewComponents = flattenComponents(await readJson('admin-blog-articulo-preview/components.json'));
    const seoComponents = flattenComponents(await readJson('admin-blog-articulo-seo/components.json'));

    for (const [pageId, component] of [
      ['admin-blog-articulo-preview', componentById(previewComponents, 'previewRevisionId')],
      ['admin-blog-articulo-seo', componentById(seoComponents, 'seoRevisionId')],
    ]) {
      assert.equal(component?.type, 'input', `${pageId} revision control must stay a generic input`);
      assert.equal(component?.config?.fieldId, 'revisionId', `${pageId} revision control must submit revisionId for actions`);
      assert.equal(component?.config?.readOnly, true, `${pageId} revisionId must not depend on empty editable input`);
      assert.equal(
        component?.valueInstructions,
        'set:config.value,varOr,remote.contentHub.articleDetail.items.0.latestRevisionId,',
        `${pageId} revisionId must hydrate from articleDetail.latestRevisionId`,
      );
    }
  });

  it('keeps category and tag admin tables scoped to their dedicated taxonomy reads', async () => {
    const categoryComponents = flattenComponents(await readJson('admin-blog-categorias/components.json'));
    const tagComponents = flattenComponents(await readJson('admin-blog-tags/components.json'));

    const categoriesGrid = componentById(categoryComponents, 'categoriesGrid');
    const tagsGrid = componentById(tagComponents, 'tagsGrid');
    assert.equal(categoriesGrid?.config?.components?.includes('categoriesKind'), false);
    assert.equal(tagsGrid?.config?.components?.includes('tagsKind'), false);

    const categoriesTable = componentById(categoryComponents, 'categoriesTable');
    const tagsTable = componentById(tagComponents, 'tagsTable');
    assert.equal(categoriesTable?.config?.rowsSource?.path, 'remote.contentHub.categories.items');
    assert.equal(tagsTable?.config?.rowsSource?.path, 'remote.contentHub.tags.items');
    assert.equal(categoriesTable?.config?.columns?.some((column) => column.id === 'kind'), false);
    assert.equal(tagsTable?.config?.columns?.some((column) => column.id === 'kind'), false);
  });

  it('keeps editorial lifecycle action errors user-facing instead of raw backend passthrough', async () => {
    const lifecycleErrorComponents = new Map([
      ['admin-blog-articulos-nuevo', ['newArticleCreateError']],
      ['admin-blog-articulo-editor', ['editorSaveError', 'editorUploadError']],
      ['admin-blog-articulo-seo', ['seoValidateError', 'seoPublishError']],
      ['admin-blog-programados', ['scheduledScheduleError', 'scheduledPublishError']],
      ['admin-blog-articulo-versiones', ['versionsRestoreError']],
    ]);

    for (const [pageId, errorComponentIds] of lifecycleErrorComponents) {
      const payload = await readJson(`${pageId}/components.json`);
      const text = textSearch(payload);
      assert.equal(text.includes('Invalid id'), false, `${pageId} must not expose raw Invalid id copy`);

      const components = flattenComponents(payload);
      for (const componentId of errorComponentIds) {
        const component = componentById(components, componentId);
        assert.equal(component?.type, 'text', `${pageId}/${componentId} must be a user-facing text status`);
        assert.equal(
          String(component?.valueInstructions ?? '').includes('.error'),
          false,
          `${pageId}/${componentId} must not pass backend error text directly to authors`,
        );
        assert.match(
          component?.config?.text ?? '',
          /art[ií]culo|campos obligatorios|recarga|lista|servicio de contenido|permisos|sesi[oó]n/iu,
          `${pageId}/${componentId} needs actionable editorial error copy`,
        );
      }
    }
  });

  it('makes article identity and lifecycle action state explicit in create, editor, SEO, and schedule forms', async () => {
    const createPayload = await readJson('admin-blog-articulos-nuevo/components.json');
    const editorPayload = await readJson('admin-blog-articulo-editor/components.json');
    const previewPayload = await readJson('admin-blog-articulo-preview/components.json');
    const seoPayload = await readJson('admin-blog-articulo-seo/components.json');
    const scheduledPayload = await readJson('admin-blog-programados/components.json');
    const versionsPayload = await readJson('admin-blog-articulo-versiones/components.json');

    const createComponents = flattenComponents(createPayload);
    const editorComponents = flattenComponents(editorPayload);
    const previewComponents = flattenComponents(previewPayload);
    const seoComponents = flattenComponents(seoPayload);
    const scheduledComponents = flattenComponents(scheduledPayload);
    const versionsComponents = flattenComponents(versionsPayload);

    const createIntro = componentById(createComponents, 'admin-blog-articulos-nuevoIntro');
    const createButton = componentById(createComponents, 'newArticleCreateButton');
    assert.equal(String(createIntro?.config?.text ?? '').includes('query string'), false);
    assert.match(createIntro?.config?.text ?? '', /lista|editor|SEO|programaci[oó]n/iu);
    assert.equal(createButton?.config?.disabledWhenInvalidScope, true);
    assert.ok(componentById(createComponents, 'newArticleCreateIdle'));
    assert.ok(componentById(createComponents, 'newArticleCreateSuccess'));
    assert.ok(componentById(createComponents, 'newArticleCreateArticleId'));
    assert.ok(componentById(createComponents, 'newArticleCreateEditorHint'));

    const editorReadout = componentById(editorComponents, 'editorArticleIdReadoutValue');
    const editorHiddenId = componentById(editorComponents, 'editorArticleId');
    assert.equal(editorReadout?.valueInstructions, 'set:config.text,routeParamOr,id,Abre el editor desde la lista de artículos.');
    assert.equal(editorHiddenId?.config?.readOnly, true);
    assert.match(editorHiddenId?.config?.classes ?? '', /ank-display-none/);
    assert.equal(editorHiddenId?.valueInstructions, 'set:config.value,routeParamOr,id,');
    assert.ok(componentById(editorComponents, 'editorSaveIdle'));

    const previewArticleId = componentById(previewComponents, 'previewArticleId');
    assert.equal(previewArticleId?.config?.readOnly, true);
    assert.equal(previewArticleId?.config?.required, true);
    assert.equal(previewArticleId?.valueInstructions, 'set:config.value,routeParamOr,id,');
    assert.equal(componentById(previewComponents, 'previewRevisionId')?.config?.required, true);

    const seoArticleId = componentById(seoComponents, 'seoArticleId');
    assert.equal(seoArticleId?.config?.readOnly, true);
    assert.equal(seoArticleId?.config?.required, true);
    assert.equal(seoArticleId?.valueInstructions, 'set:config.value,routeParamOr,id,');
    assert.equal(componentById(seoComponents, 'seoRevisionId')?.config?.required, true);
    assert.ok(componentById(seoComponents, 'seoArticleIdGuidance'));
    assert.ok(componentById(seoComponents, 'seoActionIdle'));
    for (const [componentId, actionId] of [
      ['seoSubmitReviewButton', 'content_hub_submit_review_article'],
      ['seoApproveButton', 'content_hub_approve_article'],
      ['seoPublishButton', 'content_hub_publish_article'],
      ['seoUnpublishButton', 'content_hub_unpublish_article'],
      ['seoArchiveButton', 'content_hub_archive_article'],
    ]) {
      const button = componentById(seoComponents, componentId);
      assert.equal(button?.type, 'button', `${componentId} must be a draft-composed generic button`);
      assert.equal(button?.eventInstructions, `proxyAction:${actionId}`);
      assert.equal(button?.config?.disabledWhenInvalidScope, true);
    }
    for (const componentId of [
      'seoSubmitReviewError',
      'seoApproveError',
      'seoPublishError',
      'seoUnpublishError',
      'seoArchiveError',
    ]) {
      const component = componentById(seoComponents, componentId);
      assert.equal(component?.type, 'text', `${componentId} must be a safe text status`);
      assert.equal(String(component?.valueInstructions ?? '').includes('.error'), false, `${componentId} must not expose raw backend errors`);
      assert.match(component?.config?.text ?? '', /art[ií]culo|permisos|sesi[oó]n/iu);
    }

    const scheduledArticleId = componentById(scheduledComponents, 'scheduledArticleId');
    assert.equal(scheduledArticleId?.config?.readOnly, true);
    assert.equal(scheduledArticleId?.config?.required, true);
    assert.equal(scheduledArticleId?.valueInstructions, 'set:config.value,queryParamOr,articleId,');
    assert.match(JSON.stringify(scheduledArticleId?.config?.validation ?? []), /Abre Programar desde la lista de art[ií]culos/iu);
    const scheduledRevisionId = componentById(scheduledComponents, 'scheduledRevisionId');
    assert.equal(scheduledRevisionId?.config?.required, true);
    assert.equal(scheduledRevisionId?.valueInstructions, 'set:config.value,queryParamOr,revisionId,');
    assert.match(scheduledRevisionId?.config?.label ?? '', /versi[oó]n/i);
    assert.match(componentById(scheduledComponents, 'scheduledTimezone')?.config?.label ?? '', /zona horaria/i);
    assert.match(componentById(scheduledComponents, 'scheduledAction')?.config?.label ?? '', /acci[oó]n/i);
    assert.ok(componentById(scheduledComponents, 'scheduledArticleIdGuidance'));
    assert.ok(componentById(scheduledComponents, 'scheduledActionIdle'));

    const versionsIntro = componentById(versionsComponents, 'admin-blog-articulo-versionesIntro');
    assert.equal(String(versionsIntro?.config?.text ?? '').includes('_'), false);
    assert.match(versionsIntro?.config?.text ?? '', /versiones|restaura|historial/iu);
    const versionsArticleId = componentById(versionsComponents, 'versionsArticleId');
    assert.equal(versionsArticleId?.config?.required, true);
    assert.equal(versionsArticleId?.valueInstructions, 'set:config.value,routeParamOr,id,');
    assert.match(JSON.stringify(versionsArticleId?.config?.validation ?? []), /lista de art[ií]culos/iu);
    const versionsRevisionId = componentById(versionsComponents, 'versionsRevisionId');
    assert.equal(versionsRevisionId?.config?.required, true);
    assert.match(JSON.stringify(versionsRevisionId?.config?.validation ?? []), /versi[oó]n/iu);
    const versionsTable = componentById(versionsComponents, 'versionsTable');
    assert.deepEqual(
      versionsTable?.config?.eventPayloadFields,
      ['articleId', 'revisionId', 'delta', 'snapshot', 'status'],
    );
    assert.equal(/remoteStatus\.contentHub\.[^;\s]+\.error/.test(String(versionsTable?.valueInstructions ?? '')), false);
    const restoreButton = componentById(versionsComponents, 'versionsRestoreButton');
    assert.equal(restoreButton?.config?.disabledWhenInvalidScope, true);
    assert.ok(componentById(versionsComponents, 'versionsRestoreIdle'));

    for (const pageId of ['admin-blog', 'admin-blog-articulos', 'admin-blog-programados']) {
      const pageText = textSearch(await readJson(`${pageId}/components.json`));
      assert.ok(pageText.includes('/admin/blog/programados?articleId={articleId}&revisionId={latestRevisionId}'), `${pageId} schedule link must preserve article and revision ids`);
    }

    const mediaPayload = await readJson('admin-blog-medios/components.json');
    const mediaArticleId = componentById(flattenComponents(mediaPayload), 'mediaArticleId');
    assert.equal(mediaArticleId?.config?.readOnly, true);
    assert.equal(mediaArticleId?.valueInstructions, 'set:config.value,queryParamOr,articleId,');
  });

  it('implements dedicated SEO, revision, scheduling, moderation, media, analytics, taxonomy, and hub config surfaces', async () => {
    const expectations = new Map([
      ['admin-blog-articulo-seo', ['canonical', 'hreflang', 'socialPreview', 'structuredData', 'robots', 'sitemap']],
      ['admin-blog-articulo-versiones', ['revisionId', 'delta', 'snapshot', 'compare', 'restore']],
      ['admin-blog-programados', ['publishAt', 'unpublishAt', 'timezone', 'publish', 'unpublish']],
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
