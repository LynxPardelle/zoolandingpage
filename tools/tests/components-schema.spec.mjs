import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentsSchemaPath = new URL('../../docs/api-driven-config/schemas/components.schema.json', import.meta.url);
const contentBuilderPrimitivesDocPath = new URL('../../docs/api-driven-config/20-generic-content-builder-primitives.md', import.meta.url);

test('interaction scope schema exposes an opt-in native validation bypass', async () => {
  const schema = JSON.parse(await readFile(componentsSchemaPath, 'utf8'));
  assert.equal(schema.definitions.interactionScopeConfig.properties.noValidate?.type, 'boolean');
});

test('components schema documents scoped auth form validation controls', async () => {
  const schema = JSON.parse(await readFile(componentsSchemaPath, 'utf8'));
  const input = schema.definitions?.genericInputConfig;
  const button = schema.definitions?.genericButtonConfig;
  const validationRule = schema.definitions?.interactionValidationRule;

  assert.equal(input.properties.showValidationChecklist.type, 'boolean');
  assert.equal(input.properties.validationChecklistClasses.type, 'string');
  assert.equal(input.properties.validationChecklistValidIcon.type, 'string');
  assert.ok(input.properties.inputType.enum.includes('datetime-local'));

  assert.equal(button.properties.loading.type, 'boolean');
  assert.equal(button.properties.loadingLabel.type, 'string');
  assert.equal(button.properties.loadingClasses.type, 'string');
  assert.equal(button.properties.disabledWhenInvalidScope.type, 'boolean');

  const matchRule = validationRule.oneOf.find((entry) => entry.properties?.type?.const === 'matchesField');
  assert.equal(matchRule.required.includes('fieldId'), true);
  assert.equal(matchRule.properties.fieldId.minLength, 1);
});

test('components schema documents generic content-builder primitives', async () => {
  const schema = JSON.parse(await readFile(componentsSchemaPath, 'utf8'));

  assert.equal(schema.definitions?.genericTableConfig.required.includes('columns'), true);
  assert.equal(schema.definitions?.genericTableConfig.properties.actionColumnLabel.type, 'string');
  assert.equal(schema.definitions?.genericTableConfig.properties.actionIconClasses.type, 'string');
  assert.ok(schema.definitions?.genericTableConfig.properties.actionLabelMode.enum.includes('tooltip'));
  assert.equal(schema.definitions?.genericTableConfig.properties.eventPayloadFields.items.type, 'string');
  assert.equal(schema.definitions?.genericTableConfig.properties.rowActions.items.additionalProperties, false);
  assert.equal(schema.definitions?.genericTableConfig.properties.rowActions.items.properties.hrefTemplate.type, 'string');
  assert.equal(schema.definitions?.genericTableConfig.properties.pagination.properties.hideWhenSinglePage.type, 'boolean');
  assert.equal(schema.definitions?.genericCellConfig.properties.componentIds.items.type, 'string');
  assert.equal(schema.definitions?.genericRichTextConfig.properties.provider.enum.includes('quill'), true);
  assert.equal(schema.definitions?.genericRichTextConfig.properties.format.enum.includes('quill-delta-json'), true);
  assert.equal(schema.definitions?.genericFileDropzoneConfig.properties.maxFileSizeBytes.type, 'number');

  const refs = schema.properties.components.items.allOf
    .map((entry) => entry.then?.properties?.config?.$ref)
    .filter(Boolean);

  assert.ok(refs.includes('#/definitions/genericTableConfig'));
  assert.ok(refs.includes('#/definitions/genericCellConfig'));
  assert.ok(refs.includes('#/definitions/genericRichTextConfig'));
  assert.ok(refs.includes('#/definitions/genericFileDropzoneConfig'));
});

test('components schema documents language opt-out, accessibility, and currency contracts', async () => {
  const schema = JSON.parse(await readFile(componentsSchemaPath, 'utf8'));
  const link = schema.definitions?.genericLinkConfig;
  const button = schema.definitions?.genericButtonConfig;
  const container = schema.definitions?.genericContainerConfig;
  const cell = schema.definitions?.genericCellConfig;
  const column = schema.definitions?.genericTableColumnConfig;

  assert.ok(link.required?.includes('href'));
  assert.equal(link.properties.href.type, 'string');
  assert.deepEqual(link.properties.target.enum, ['_self', '_blank', '_parent', '_top']);
  assert.equal(link.properties.components.items.type, 'string');
  assert.equal(link.properties.preserveLanguageQueryParam.type, 'boolean');
  assert.equal(button.properties.ariaChecked.type, 'boolean');
  assert.deepEqual(container.properties.tag.enum, ['span', 'div', 'section', 'main', 'header', 'footer', 'nav', 'article', 'figure', 'ul', 'ol', 'li', 'aside']);
  assert.equal(container.properties.components.items.type, 'string');
  assert.deepEqual(container.properties.ariaLive.enum, ['off', 'polite', 'assertive']);
  assert.equal(container.properties.tabindex.type, 'number');

  for (const config of [cell, column]) {
    assert.ok(config.properties.format.enum.includes('currency'));
    assert.equal(config.properties.currency.pattern, '^[A-Z]{3}$');
    assert.deepEqual(config.properties.currencyDisplay.enum, ['symbol', 'narrowSymbol', 'code', 'name']);
    assert.equal(config.properties.maximumFractionDigits.minimum, 0);
    assert.equal(config.properties.maximumFractionDigits.maximum, 20);
    assert.equal(config.properties.showCurrencyCode.type, 'boolean');
    const currencyRequirement = config.allOf?.find((entry) => entry.if?.properties?.format?.const === 'currency');
    assert.ok(currencyRequirement?.then?.required?.includes('currency'));
  }
});

test('generic content-builder documentation uses the canonical container discriminator', async () => {
  const markdown = await readFile(contentBuilderPrimitivesDocPath, 'utf8');
  const jsonBlocks = Array.from(markdown.matchAll(/```json\r?\n([\s\S]*?)\r?\n```/g));
  const resultRegionBlock = jsonBlocks.find((match) => match[1]?.includes('"id": "calculatorResult"'));

  assert.ok(resultRegionBlock?.[1], 'expected the calculator result JSON example');
  const resultRegion = JSON.parse(resultRegionBlock[1]);
  assert.equal(resultRegion.type, 'container');
});

test('container language is explicit without narrowing existing accessibility contracts', async () => {
  const schema = JSON.parse(await readFile(componentsSchemaPath, 'utf8'));
  const container = schema.definitions.genericContainerConfig;

  assert.equal(container.properties.lang?.type, 'string');
  assert.equal(container.properties.tabindex.type, 'number');
  assert.equal(container.properties.tabindex.maximum, undefined);
  assert.ok(container.properties.tag.enum.includes('figure'));
  assert.deepEqual(container.properties.ariaLive.enum, ['off', 'polite', 'assertive']);
});
