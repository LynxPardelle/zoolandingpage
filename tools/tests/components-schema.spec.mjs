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
