import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { TestBed } from '@angular/core/testing';
import { jsonVariableOrValueHandler } from './variable.value-handlers';

describe('variable value handlers', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('serializes runtime variable values for JSON textarea editors', () => {
        TestBed.configureTestingModule({ providers: [VariableStoreService] });
        const store = TestBed.inject(VariableStoreService);
        store.setRuntimeValue('remote.contentHub.articleDetail.items.0.components', [
            {
                type: 'container',
                config: { classes: 'ank-p-16px' },
            },
        ]);

        const handler = TestBed.runInInjectionContext(() => jsonVariableOrValueHandler());
        const value = handler.resolve({} as never, ['remote.contentHub.articleDetail.items.0.components', '[]', 2]);

        expect(value).toContain('"type": "container"');
        expect(value).toContain('"classes": "ank-p-16px"');
    });

    it('returns fallback text when the runtime variable is empty', () => {
        TestBed.configureTestingModule({ providers: [VariableStoreService] });

        const handler = TestBed.runInInjectionContext(() => jsonVariableOrValueHandler());

        expect(handler.resolve({} as never, ['missing.path', '[{"type":"text"}]', 2])).toBe('[{"type":"text"}]');
    });
});
