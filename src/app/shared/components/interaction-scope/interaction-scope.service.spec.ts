import { TestBed } from '@angular/core/testing';
import { InteractionScopeService } from './interaction-scope.service';

describe('InteractionScopeService', () => {
    let service: InteractionScopeService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [InteractionScopeService],
        });

        service = TestBed.inject(InteractionScopeService);
        service.configure({
            scopeId: 'pricingScope',
            initialValues: {
                visitors: 1000,
            },
            computations: [
                {
                    resultId: 'projectedLeads',
                    initial: { source: 'field', fieldId: 'visitors' },
                    steps: [
                        { op: 'multiply', value: { source: 'literal', value: 0.1 } },
                        { op: 'round', precision: 0 },
                    ],
                },
            ],
        });
    });

    it('shares field values and computed outputs inside one scope', () => {
        service.registerField({
            fieldId: 'visitors',
            required: true,
        });

        expect(service.snapshot().values['visitors']).toBe(1000);
        expect(service.snapshot().computed['projectedLeads']).toBe(100);

        service.setFieldValue('visitors', 2400, { markTouched: true });

        expect(service.snapshot().values['visitors']).toBe(2400);
        expect(service.snapshot().computed['projectedLeads']).toBe(240);
    });

    it('marks required fields invalid on submit and resets to initial values', () => {
        service.registerField({
            fieldId: 'email',
            initialValue: '',
            required: true,
            validation: [{ type: 'email' }],
        });

        const submitted = service.submit();
        expect(submitted.valid).toBeFalse();
        expect(submitted.fields['email'].errors.length).toBeGreaterThan(0);

        service.setFieldValue('email', 'hello@example.com', { markTouched: true });
        expect(service.snapshot().fields['email'].valid).toBeTrue();

        service.reset();
        expect(service.snapshot().values['email']).toBe('');
        expect(service.submitted()).toBeFalse();
    });

    it('exposes unregistered initial values through scope values', () => {
        expect(service.snapshot().values['visitors']).toBe(1000);
        expect(service.resolvePath('values.visitors')).toBe(1000);
    });

    it('syncs new initial values until the user edits the field', () => {
        service.registerField({
            fieldId: 'pageSize',
            initialValue: '10',
        });

        expect(service.snapshot().values['pageSize']).toBe('10');

        service.registerField({
            fieldId: 'pageSize',
            initialValue: '3',
        });

        expect(service.snapshot().values['pageSize']).toBe('3');

        service.setFieldValue('pageSize', '5', { markTouched: true });
        service.registerField({
            fieldId: 'pageSize',
            initialValue: '20',
        });

        expect(service.snapshot().values['pageSize']).toBe('5');
    });

    it('revalidates fields that depend on another field value', () => {
        service.registerField({
            fieldId: 'password',
            initialValue: '',
        });
        service.registerField({
            fieldId: 'confirmPassword',
            initialValue: '',
            validation: [
                {
                    type: 'matchesField',
                    fieldId: 'password',
                    message: 'Las contraseñas deben coincidir.',
                },
            ],
        });

        service.setFieldValue('password', 'StrongPassword123!', { markTouched: true });
        service.setFieldValue('confirmPassword', 'StrongPassword123?', { markTouched: true });

        expect(service.snapshot().fields['confirmPassword'].valid).toBeFalse();
        expect(service.snapshot().fields['confirmPassword'].errors).toContain('Las contraseñas deben coincidir.');

        service.setFieldValue('confirmPassword', 'StrongPassword123!', { markTouched: true });
        expect(service.snapshot().fields['confirmPassword'].valid).toBeTrue();

        service.setFieldValue('password', 'ChangedPassword123!', { markTouched: true });
        expect(service.snapshot().fields['confirmPassword'].valid).toBeFalse();
    });

    it('revalidates dependent fields when the matched field is registered later', () => {
        service.registerField({
            fieldId: 'confirmPassword',
            initialValue: 'StrongPassword123!',
            validation: [
                {
                    type: 'matchesField',
                    fieldId: 'password',
                    message: 'Las contraseñas deben coincidir.',
                },
            ],
        });

        expect(service.snapshot().fields['confirmPassword'].valid).toBeFalse();

        service.registerField({
            fieldId: 'password',
            initialValue: 'StrongPassword123!',
        });

        expect(service.snapshot().fields['confirmPassword'].valid).toBeTrue();
    });
});
