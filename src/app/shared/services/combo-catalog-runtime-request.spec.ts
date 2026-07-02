import { buildComboCatalogRuntimeInput } from './combo-catalog-runtime-request';

describe('buildComboCatalogRuntimeInput', () => {
    it('keeps legitimate combo grouping fields while dropping server-only values', () => {
        const input = buildComboCatalogRuntimeInput({
            action: 'updateCombo',
        }, {
            classes: ['ank-d-flex', 'ssm:/must-not-travel'],
            comboId: 'HeroCard',
            credentialRef: 'ssm:/secret',
            groupId: 'bad/id',
            groups: 'corporativo,landing',
            scope: 'draft',
            tableName: 'server-only-table',
            updatedAt: '2026-07-01T17:58:00-06:00',
        }, 'action');

        expect(input).toEqual({
            action: 'updateCombo',
            classes: ['ank-d-flex'],
            comboId: 'HeroCard',
            groups: 'corporativo,landing',
            scope: 'draft',
            updatedAt: '2026-07-01T17:58:00-06:00',
        });
    });

    it('drops action-only and unsafe fields from public reads', () => {
        const input = buildComboCatalogRuntimeInput({
            read: 'comboList',
        }, {
            batchJson: '[{"combo":"secret"}]',
            comboId: 'unknown',
            query: 'hero',
            signedUrl: 'https://example.test/file?X-Amz-Signature=secret',
            scope: 'global',
        }, 'read');

        expect(input).toEqual({
            read: 'comboList',
            query: 'hero',
            scope: 'global',
        });
    });
});
