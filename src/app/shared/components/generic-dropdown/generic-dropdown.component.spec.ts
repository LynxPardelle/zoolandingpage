import { OverlayContainer } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageService } from '../../services/language.service';
import { GenericDropdown } from './generic-dropdown.component';
import type { DropdownItem } from './generic-dropdown.types';

@Component({
  template: `<generic-dropdown [items]="items" [config]="config"><span trigger>Menu</span></generic-dropdown>`,
  imports: [GenericDropdown],
})
class HostTestComponent {
  items: DropdownItem[] = [
    { id: '1', label: 'One' },
    { id: '2', label: 'Two' },
  ];
  config = {
    ariaLabel: 'Choose an option',
    triggerRole: 'combobox',
    menuRole: 'listbox' as const,
    itemRole: 'option' as const,
    selectedItemId: '2',
    selectedItemClasses: 'is-selected',
    menuContainerClasses: 'menu-shell menu-theme',
  };
}

describe('GenericDropdown', () => {
  let fixture: ComponentFixture<HostTestComponent>;
  let overlayContainer: OverlayContainer;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostTestComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostTestComponent);
    overlayContainer = TestBed.inject(OverlayContainer);
    fixture.detectChanges();
  });
  it('should render trigger content', () => {
    expect(fixture.nativeElement.textContent).toContain('Menu');
  });

  it('applies configurable accessibility attributes to the trigger', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.getAttribute('role')).toBe('combobox');
    expect(button.getAttribute('aria-label')).toBe('Choose an option');
  });

  it('splits overlay panel classes into valid DOM tokens', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(() => button.click()).not.toThrow();

    const panel = overlayContainer.getContainerElement().querySelector('.menu-shell.menu-theme');
    expect(panel).not.toBeNull();
  });

  it('resolves locale-map labels from draft-native items', () => {
    const language = TestBed.inject(LanguageService);
    language.configureLanguages(['en', 'es'], { defaultLanguage: 'en' });
    language.setLanguage('es');

    fixture.destroy();
    fixture = TestBed.createComponent(HostTestComponent);
    fixture.componentInstance.items = [
      { id: 'contact', value: 'contact', label: { en: 'Contact', es: 'Contacto', default: 'Contact' } },
    ];
    fixture.detectChanges();

    const component = fixture.debugElement.children[0].componentInstance as GenericDropdown;
    expect(component.normalizedItems()[0]?.label).toBe('Contacto');
    expect(component.normalizedItems()[0]?.value).toBe('contact');
    expect(component.itemHref(component.normalizedItems()[0])).toBe('#contact');
  });

  it('preserves the configured selected option when focus moves to the first opened item', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    button.click();
    fixture.detectChanges();

    const options = overlayContainer.getContainerElement().querySelectorAll('a[role="option"]');

    expect(options[0]?.getAttribute('aria-selected')).toBe('false');
    expect(options[1]?.getAttribute('aria-selected')).toBe('true');
  });

  it('closes an opened menu when client navigation changes', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const component = fixture.debugElement.children[0].componentInstance as GenericDropdown;

    button.click();
    fixture.detectChanges();
    expect(component.opened()).toBeTrue();

    window.dispatchEvent(new PopStateEvent('popstate'));
    fixture.detectChanges();

    expect(component.opened()).toBeFalse();
  });
});
