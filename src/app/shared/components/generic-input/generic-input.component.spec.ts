import { TestBed } from '@angular/core/testing';
import { InteractionScopeService } from '../interaction-scope/interaction-scope.service';
import { GenericInputComponent } from './generic-input.component';

describe('GenericInputComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GenericInputComponent],
            providers: [InteractionScopeService],
        }).compileComponents();
    });

    it('renders a text input and emits value changes', () => {
        const fixture = TestBed.createComponent(GenericInputComponent);
        const component = fixture.componentInstance;
        spyOn(component.valueChanged, 'emit');

        fixture.componentRef.setInput('config', {
            fieldId: 'fullName',
            controlType: 'text',
            label: 'Full name',
            value: 'Alice',
        });
        fixture.detectChanges();

        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        expect(input).toBeTruthy();
        expect(input.value).toBe('Alice');

        input.value = 'Alicia';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        expect(component.valueChanged.emit).toHaveBeenCalledWith(
            jasmine.objectContaining({ fieldId: 'fullName', value: 'Alicia' })
        );
    });

    it('writes values into the nearest interaction scope', () => {
        const scope = TestBed.inject(InteractionScopeService);
        scope.configure({ scopeId: 'leadForm' });

        const fixture = TestBed.createComponent(GenericInputComponent);
        fixture.componentRef.setInput('config', {
            fieldId: 'companySize',
            controlType: 'number',
            value: 5,
        });
        fixture.detectChanges();

        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        input.value = '12';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        expect(scope.snapshot().values['companySize']).toBe(12);
    });

    it('renders a textarea control when requested', () => {
        const fixture = TestBed.createComponent(GenericInputComponent);

        fixture.componentRef.setInput('config', {
            fieldId: 'message',
            controlType: 'textarea',
            rows: 6,
            value: 'Initial summary',
        });
        fixture.detectChanges();

        const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
        expect(textarea).toBeTruthy();
        expect(textarea.rows).toBe(6);
        expect(textarea.value).toBe('Initial summary');
    });

    it('renders a file input and emits the selected file', () => {
        const fixture = TestBed.createComponent(GenericInputComponent);
        const component = fixture.componentInstance;
        spyOn(component.valueChanged, 'emit');

        fixture.componentRef.setInput('config', {
            fieldId: 'heroImageFile',
            controlType: 'file',
            accept: 'image/*',
        });
        fixture.detectChanges();

        const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['image'], 'hero.png', { type: 'image/png' });
        Object.defineProperty(input, 'files', {
            configurable: true,
            value: [file],
        });

        input.dispatchEvent(new Event('change'));
        fixture.detectChanges();

        expect(component.valueChanged.emit).toHaveBeenCalledWith(
            jasmine.objectContaining({ fieldId: 'heroImageFile', value: file })
        );
    });

    it('renders the selected option label and payload-owned select indicator for select controls', () => {
        const fixture = TestBed.createComponent(GenericInputComponent);

        fixture.componentRef.setInput('config', {
            fieldId: 'matterType',
            controlType: 'select',
            value: 'corporate-advisory',
            fieldClasses: 'selectField',
            dropdownTriggerClasses: 'selectTrigger',
            dropdownIndicatorText: 'v',
            dropdownIndicatorClasses: 'selectIndicator',
            dropdownTriggerTextConfig: { classes: 'selectTriggerText' },
            options: [
                { value: 'contract-review', label: 'Contract review' },
                { value: 'corporate-advisory', label: 'Corporate advisory' },
            ],
        });
        fixture.detectChanges();

        const dropdown = fixture.nativeElement.querySelector('generic-dropdown');
        expect(dropdown).toBeTruthy();
        expect(fixture.nativeElement.textContent).toContain('Corporate advisory');
        expect(fixture.nativeElement.textContent).toContain('v');
        expect(fixture.nativeElement.querySelector('.selectTrigger')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('.selectIndicator')).toBeTruthy();
    });

    it('updates select-like controls through the generic dropdown adapter', () => {
        const fixture = TestBed.createComponent(GenericInputComponent);
        const component = fixture.componentInstance;
        spyOn(component.valueChanged, 'emit');

        fixture.componentRef.setInput('config', {
            fieldId: 'matterType',
            controlType: 'select',
            value: 'contract-review',
            options: [
                { value: 'contract-review', label: 'Contract review' },
                { value: 'corporate-advisory', label: 'Corporate advisory' },
            ],
        });
        fixture.detectChanges();

        component.onDropdownSelect({ id: 'matterType-1-corporate-advisory', label: 'Corporate advisory', value: 'corporate-advisory' });
        fixture.detectChanges();

        expect(component.valueChanged.emit).toHaveBeenCalledWith(
            jasmine.objectContaining({ fieldId: 'matterType', value: 'corporate-advisory' })
        );
        expect(fixture.nativeElement.textContent).toContain('Corporate advisory');
    });

    it('resolves validation rules from thunks before registering the field', () => {
        const scope = TestBed.inject(InteractionScopeService);
        scope.configure({ scopeId: 'leadForm' });

        const fixture = TestBed.createComponent(GenericInputComponent);
        fixture.componentRef.setInput('config', {
            fieldId: 'email',
            controlType: 'text',
            value: '',
            validation: () => [{ type: 'required', message: 'Email is required.' }],
        });

        expect(() => fixture.detectChanges()).not.toThrow();
        expect(scope.snapshot().fields['email'].errors).toContain('Email is required.');
    });
});
