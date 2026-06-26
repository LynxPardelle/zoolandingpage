import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentsSchemaPath = new URL('../../docs/api-driven-config/schemas/components.schema.json', import.meta.url);

test('components schema documents scoped auth form validation controls', async () => {
  const schema = JSON.parse(await readFile(componentsSchemaPath, 'utf8'));
  const input = schema.definitions?.genericInputConfig;
  const button = schema.definitions?.genericButtonConfig;
  const validationRule = schema.definitions?.interactionValidationRule;

  assert.equal(input.properties.showValidationChecklist.type, 'boolean');
  assert.equal(input.properties.validationChecklistClasses.type, 'string');
  assert.equal(input.properties.validationChecklistValidIcon.type, 'string');

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
