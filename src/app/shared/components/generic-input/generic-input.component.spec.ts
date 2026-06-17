import { TestBed } from '@angular/core/testing';
import { VariableStoreService } from '../../services/variable-store.service';
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

    it('renders autocomplete options for text inputs without submitting the field', () => {
        const fixture = TestBed.createComponent(GenericInputComponent);

        fixture.componentRef.setInput('config', {
            fieldId: 'pokemon',
            controlType: 'text',
            inputType: 'search',
            value: '',
            autocompleteOptions: [
                { value: 'bulbasaur', label: 'Bulbasaur' },
                { value: 'charmander', label: 'Charmander' },
            ],
        });
        fixture.detectChanges();

        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        const datalist = fixture.nativeElement.querySelector('datalist') as HTMLDataListElement;

        expect(input.getAttribute('list')).toBe('pokemon-autocomplete');
        expect(datalist.id).toBe('pokemon-autocomplete');
        expect(Array.from(datalist.querySelectorAll('option')).map((option) => option.value)).toEqual([
            'bulbasaur',
            'charmander',
        ]);
    });

    it('can reveal and mask password inputs when configured', () => {
        const fixture = TestBed.createComponent(GenericInputComponent);

        fixture.componentRef.setInput('config', {
            fieldId: 'password',
            controlType: 'text',
            inputType: 'password',
            value: 'StrongPassphrase123!',
            showPasswordToggle: true,
            showPasswordLabel: 'Mostrar contraseña',
            hidePasswordLabel: 'Ocultar contraseña',
            fieldClasses: 'passwordField',
            inputClasses: 'passwordInput',
            passwordToggleClasses: 'passwordToggle',
        });
        fixture.detectChanges();

        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        const toggle = fixture.nativeElement.querySelector('button.passwordToggle') as HTMLButtonElement;
        expect(input.type).toBe('password');
        expect(toggle.getAttribute('aria-label')).toBe('Mostrar contraseña');

        toggle.click();
        fixture.detectChanges();

        expect(input.type).toBe('text');
        expect(toggle.getAttribute('aria-label')).toBe('Ocultar contraseña');

        toggle.click();
        fixture.detectChanges();

        expect(input.type).toBe('password');
    });

    it('renders an always-visible validation checklist and updates rule status while typing', () => {
        const fixture = TestBed.createComponent(GenericInputComponent);

        fixture.componentRef.setInput('config', {
            fieldId: 'password',
            controlType: 'text',
            inputType: 'password',
            value: '',
            showValidationChecklist: true,
            validationChecklistClasses: 'checklist',
            validationChecklistItemClasses: 'checklistItem',
            validationChecklistValidItemClasses: 'isValid',
            validationChecklistInvalidItemClasses: 'isInvalid',
            validation: [
                { type: 'minLength', value: 12, message: 'Usa al menos 12 caracteres.' },
                { type: 'pattern', value: '[a-z]', message: 'Incluye una minúscula.' },
                { type: 'pattern', value: '[A-Z]', message: 'Incluye una mayúscula.' },
                { type: 'pattern', value: '\\d', message: 'Incluye un número.' },
                { type: 'pattern', value: '[^A-Za-z0-9\\s]', message: 'Incluye un símbolo.' },
            ],
        });
        fixture.detectChanges();

        const checklist = fixture.nativeElement.querySelector('ul.checklist') as HTMLUListElement;
        expect(checklist).toBeTruthy();
        expect(checklist.textContent).toContain('Incluye un símbolo.');
        expect(Array.from(checklist.querySelectorAll('li')).every((item) => item.getAttribute('data-valid') === 'false')).toBeTrue();

        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        input.value = 'StrongPass123!';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        const items = Array.from(checklist.querySelectorAll('li'));
        expect(items.every((item) => item.getAttribute('data-valid') === 'true')).toBeTrue();
        expect(items.every((item) => item.classList.contains('isValid'))).toBeTrue();
    });

    it('updates text field validation from keyup fallback events', () => {
        const fixture = TestBed.createComponent(GenericInputComponent);

        fixture.componentRef.setInput('config', {
            fieldId: 'password',
            controlType: 'text',
            inputType: 'password',
            value: '',
            showValidationChecklist: true,
            validation: [
                { type: 'minLength', value: 12, message: 'Usa al menos 12 caracteres.' },
                { type: 'pattern', value: '[^A-Za-z0-9\\s]', message: 'Incluye un símbolo.' },
            ],
        });
        fixture.detectChanges();

        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        input.value = 'StrongPass123!';
        input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
        fixture.detectChanges();

        const items = Array.from(fixture.nativeElement.querySelectorAll('li')) as HTMLLIElement[];
        expect(items.length).toBe(2);
        expect(items.every((item) => item.getAttribute('data-valid') === 'true')).toBeTrue();
    });

    it('can delay and filter autocomplete options by the typed text', () => {
        const fixture = TestBed.createComponent(GenericInputComponent);

        fixture.componentRef.setInput('config', {
            fieldId: 'pokemon',
            controlType: 'text',
            inputType: 'search',
            value: '',
            autocompleteMinLength: 3,
            autocompleteMatchMode: 'startsWith',
            autocompleteMaxOptions: 2,
            autocompleteOptions: [
                { value: 'bulbasaur', label: 'Bulbasaur' },
                { value: 'charmander', label: 'Charmander' },
                { value: 'charmeleon', label: 'Charmeleon' },
                { value: 'charizard', label: 'Charizard' },
            ],
        });
        fixture.detectChanges();

        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        expect(input.getAttribute('list')).toBeNull();
        expect(fixture.nativeElement.querySelector('datalist')).toBeNull();

        input.value = 'cha';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        expect(input.getAttribute('list')).toBe('pokemon-autocomplete');
        const options = Array.from(fixture.nativeElement.querySelectorAll('datalist option')) as HTMLOptionElement[];
        expect(options.map((option) => option.value)).toEqual([
            'charmander',
            'charmeleon',
        ]);
    });

    it('reacts when option sources are populated after first render', () => {
        const variables = TestBed.inject(VariableStoreService);
        variables.clearRuntimeValues();

        const fixture = TestBed.createComponent(GenericInputComponent);
        const component = fixture.componentInstance;

        fixture.componentRef.setInput('config', {
            fieldId: 'move',
            controlType: 'select',
            value: 'thunder-shock',
            options: {
                source: 'var',
                path: 'remote.pokemon.moveOptions.items',
                fallback: [{ value: 'all', label: 'Todos' }],
            },
        });
        fixture.detectChanges();

        expect(component.options().map((option) => option.value)).toEqual(['all']);
        expect(component.selectedOptionLabel()).toBe('Todos');

        variables.setRuntimeValue('remote.pokemon.moveOptions.items', [
            { value: 'all', label: 'Todos' },
            { value: 'mega-punch', label: 'Mega Punch' },
            { value: 'thunder-shock', label: 'Thunder Shock' },
        ]);
        fixture.detectChanges();

        expect(component.options().map((option) => option.value)).toEqual(['all', 'mega-punch', 'thunder-shock']);
        expect(component.selectedOptionLabel()).toBe('Thunder Shock');
    });

    it('renders a switch control and coerces string booleans safely', () => {
        const fixture = TestBed.createComponent(GenericInputComponent);
        const component = fixture.componentInstance;
        spyOn(component.valueChanged, 'emit');

        fixture.componentRef.setInput('config', {
            fieldId: 'autoSearch',
            controlType: 'switch',
            value: 'false',
            label: 'Auto search',
            fieldClasses: 'switchField',
            inputClasses: 'switchInput',
            switchTrackClasses: 'switchTrack',
            switchTrackActiveClasses: 'switchTrackActive',
            switchThumbClasses: 'switchThumb',
            switchThumbActiveClasses: 'switchThumbActive',
        });
        fixture.detectChanges();

        const input = fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
        expect(input.checked).toBeFalse();
        expect(input.getAttribute('role')).toBe('switch');
        expect(fixture.nativeElement.querySelector('.switchTrackActive')).toBeFalsy();

        input.checked = true;
        input.dispatchEvent(new Event('change'));
        fixture.detectChanges();

        expect(component.valueChanged.emit).toHaveBeenCalledWith(
            jasmine.objectContaining({ fieldId: 'autoSearch', value: true })
        );
        expect(fixture.nativeElement.querySelector('.switchTrackActive')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('.switchThumbActive')).toBeTruthy();
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
