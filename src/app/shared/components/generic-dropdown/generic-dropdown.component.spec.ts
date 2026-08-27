import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AngoraCombosService } from '../../services/angora-combos.service';
import { DRAFT_RUNTIME_STICKY_QUERY_PARAMS } from '../../services/draft-runtime.service';
import { LanguageService } from '../../services/language.service';
import { currentBrowserPath } from '../../utility/navigation/browser-navigation.utility';
import { GenericDropdown } from './generic-dropdown.component';
import type { DropdownConfig, DropdownItem } from './generic-dropdown.types';

@Component({
  template: `<generic-dropdown [items]="items" [config]="config"
    ><span trigger>Menu</span></generic-dropdown
  ><div id="dropdown-inline-target"></div><button id="after-dropdown">After menu</button>`,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [GenericDropdown],
})
class HostTestComponent {
  items: DropdownItem[] = [
    { id: '1', label: 'One' },
    { id: '2', label: 'Two' },
  ];
  config: DropdownConfig = {
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
  let scheduleCssCreate: jasmine.Spy;

  beforeEach(async () => {
    scheduleCssCreate = jasmine.createSpy('scheduleCssCreate');
    await TestBed.configureTestingModule({
      imports: [HostTestComponent],
      providers: [
        {
          provide: AngoraCombosService,
          useValue: { scheduleCssCreate },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HostTestComponent);
    overlayContainer = TestBed.inject(OverlayContainer);
    fixture.detectChanges();
  });
  it('should render trigger content', () => {
    expect(fixture.nativeElement.textContent).toContain('Menu');
  });

  it('applies configurable accessibility attributes to the trigger', () => {
    const button = fixture.nativeElement.querySelector(
      'button'
    ) as HTMLButtonElement;

    expect(button.getAttribute('role')).toBe('combobox');
    expect(button.getAttribute('aria-label')).toBe('Choose an option');
  });

  it('splits overlay panel classes into valid DOM tokens', () => {
    const button = fixture.nativeElement.querySelector(
      'button'
    ) as HTMLButtonElement;

    expect(() => button.click()).not.toThrow();

    const panel = overlayContainer
      .getContainerElement()
      .querySelector('.menu-shell.menu-theme');
    expect(panel).not.toBeNull();
    expect(scheduleCssCreate).toHaveBeenCalledWith(350);
  });

  it('resolves locale-map labels from draft-native items', () => {
    const language = TestBed.inject(LanguageService);
    language.configureLanguages(['en', 'es'], { defaultLanguage: 'en' });
    language.setLanguage('es');

    fixture.destroy();
    fixture = TestBed.createComponent(HostTestComponent);
    fixture.componentInstance.items = [
      {
        id: 'contact',
        value: 'contact',
        label: { en: 'Contact', es: 'Contacto', default: 'Contact' },
      },
    ];
    fixture.detectChanges();

    const component = fixture.debugElement.children[0]
      .componentInstance as GenericDropdown;
    const currentUrl = new URL(window.location.href);
    const stickyQuery = new URLSearchParams();
    DRAFT_RUNTIME_STICKY_QUERY_PARAMS.forEach((key) => {
      if (currentUrl.searchParams.has(key)) {
        stickyQuery.set(key, currentUrl.searchParams.get(key) ?? '');
      }
    });
    const serializedStickyQuery = stickyQuery.toString();
    expect(component.normalizedItems()[0]?.label).toBe('Contacto');
    expect(component.normalizedItems()[0]?.value).toBe('contact');
    expect(component.itemHref(component.normalizedItems()[0])).toBe(
      `${currentUrl.pathname}${serializedStickyQuery ? `?${serializedStickyQuery}` : ''}#contact`
    );
  });

  it('preserves the configured selected option when focus moves to the first opened item', () => {
    const button = fixture.nativeElement.querySelector(
      'button'
    ) as HTMLButtonElement;

    button.click();
    fixture.detectChanges();

    const options = overlayContainer
      .getContainerElement()
      .querySelectorAll('a[role="option"]');

    expect(options[0]?.getAttribute('aria-selected')).toBe('false');
    expect(options[1]?.getAttribute('aria-selected')).toBe('true');
  });

  it('closes an opened menu when client navigation changes', () => {
    const button = fixture.nativeElement.querySelector(
      'button'
    ) as HTMLButtonElement;
    const component = fixture.debugElement.children[0]
      .componentInstance as GenericDropdown;

    button.click();
    fixture.detectChanges();
    expect(component.opened()).toBeTrue();

    window.dispatchEvent(new PopStateEvent('popstate'));
    fixture.detectChanges();

    expect(component.opened()).toBeFalse();
  });

  it('navigates internal menu hrefs while preserving draft query params', () => {
    window.history.pushState({}, '', '/?draftDomain=grupoastralegal.com&debugWorkspace=false&lang=es');
    fixture.destroy();
    fixture = TestBed.createComponent(HostTestComponent);
    fixture.componentInstance.items = [
      { id: 'services', label: 'Services', href: '/servicios' },
    ];
    fixture.componentInstance.config = {
      ...fixture.componentInstance.config,
      menuRole: 'menu',
      itemRole: 'menuitem',
    };
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    const link = overlayContainer.getContainerElement().querySelector('a[role="menuitem"]') as HTMLAnchorElement;
    link.click();
    fixture.detectChanges();

    expect(currentBrowserPath()).toBe('/servicios?draftDomain=grupoastralegal.com&debugWorkspace=false&lang=es');
  });

  describe('portalled keyboard interaction', () => {
    function key(target: HTMLElement, value: string, shiftKey = false): KeyboardEvent {
      const event = new KeyboardEvent('keydown', {
        key: value,
        shiftKey,
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(event);
      fixture.detectChanges();
      return event;
    }

    async function openMenu(renderMode: 'inline' | 'overlay', config: Partial<DropdownConfig> = {}) {
      fixture.componentInstance.config = {
        ...fixture.componentInstance.config,
        renderMode,
        inlinePortalTargetSelector: '#dropdown-inline-target',
        ...config,
      };
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
      const component = fixture.debugElement.children[0].componentInstance as GenericDropdown;
      button.focus();
      expect(key(button, 'ArrowDown').defaultPrevented).toBeTrue();
      await fixture.whenStable();
      fixture.detectChanges();
      const root = renderMode === 'inline'
        ? fixture.nativeElement.querySelector('#dropdown-inline-target') as HTMLElement
        : overlayContainer.getContainerElement();
      const options = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[role="option"]'));
      return { button, component, root, options };
    }

    for (const renderMode of ['inline', 'overlay'] as const) {
      it(`${renderMode}: Escape from a portalled option closes and restores the trigger focus`, async () => {
        const { button, component, root, options } = await openMenu(renderMode);
        const host = fixture.nativeElement.querySelector('generic-dropdown') as HTMLElement;
        expect(host.contains(options[0])).toBeFalse();
        expect(document.activeElement).toBe(options[0]);

        expect(key(options[0], 'Escape').defaultPrevented).toBeTrue();

        expect(component.opened()).toBeFalse();
        expect(root.querySelector('a[role="option"]')).toBeNull();
        expect(document.activeElement).toBe(button);
        expect(button.getAttribute('aria-expanded')).toBe('false');
      });

      it(`${renderMode}: arrows and boundaries move focus once and skip disabled options`, async () => {
        fixture.componentInstance.items = [
          { id: 'disabled-first', label: 'Disabled first', disabled: true },
          { id: 'one', label: 'One' },
          { id: 'disabled-middle', label: 'Disabled middle', disabled: true },
          { id: 'two', label: 'Two' },
          { id: 'three', label: 'Three' },
          { id: 'disabled-last', label: 'Disabled last', disabled: true },
        ];
        const { component, options } = await openMenu(renderMode);
        expect(document.activeElement).toBe(options[1]);
        key(options[1], 'ArrowDown');
        expect(document.activeElement).toBe(options[3]);
        key(options[3], 'ArrowUp');
        expect(document.activeElement).toBe(options[1]);
        key(options[1], 'End');
        expect(document.activeElement).toBe(options[4]);
        key(options[4], 'ArrowDown');
        expect(document.activeElement).toBe(options[1]);
        key(options[1], 'ArrowUp');
        expect(document.activeElement).toBe(options[4]);
        key(options[4], 'Home');
        expect(document.activeElement).toBe(options[1]);
        expect(component.activeIndex()).toBe(1);
        expect(options.filter((option) => option.tabIndex === 0)).toEqual([options[1]]);
      });

      for (const activationKey of ['Enter', ' ']) {
        it(`${renderMode}: ${JSON.stringify(activationKey)} selects the focused option once and restores focus`, async () => {
          const { button, component, options } = await openMenu(renderMode);
          const selections: DropdownItem[] = [];
          component.selectItem.subscribe((item) => selections.push(item));
          // Focus can move through pointer or assistive technology, independently
          // of the last arrow-navigation index.
          options[1].focus();

          expect(key(options[1], activationKey).defaultPrevented).toBeTrue();

          expect(selections.map((item) => item.id)).toEqual(['2']);
          expect(component.opened()).toBeFalse();
          expect(document.activeElement).toBe(button);
        });
      }

      for (const shiftKey of [false, true]) {
        it(`${renderMode}: ${shiftKey ? 'Shift+Tab' : 'Tab'} closes without preventing native focus traversal`, async () => {
          const { button, component, options } = await openMenu(renderMode);
          const event = key(options[0], 'Tab', shiftKey);

          expect(event.defaultPrevented).toBeFalse();
          expect(component.opened()).toBeFalse();
          // The native Tab default action runs after keydown, relative to this
          // trigger instead of a removed portal node or document.body.
          expect(document.activeElement).toBe(button);
        });
      }

      it(`${renderMode}: keys on an unrelated control are not intercepted`, async () => {
        const { component } = await openMenu(renderMode);
        const outside = fixture.nativeElement.querySelector('#after-dropdown') as HTMLButtonElement;
        outside.focus();

        expect(key(outside, 'ArrowDown').defaultPrevented).toBeFalse();
        expect(key(outside, 'Escape').defaultPrevented).toBeFalse();
        expect(component.opened()).toBeTrue();
        expect(document.activeElement).toBe(outside);
      });

      it(`${renderMode}: retained menus select once and keep their focused option`, async () => {
        const { component, options } = await openMenu(renderMode, { closeOnSelect: false });
        const selections: DropdownItem[] = [];
        component.selectItem.subscribe((item) => selections.push(item));

        key(options[0], 'Enter');

        expect(selections.map((item) => item.id)).toEqual(['1']);
        expect(component.opened()).toBeTrue();
        expect(document.activeElement).toBe(options[0]);
      });

      it(`${renderMode}: an empty or entirely disabled menu has no invalid focus index`, async () => {
        fixture.componentInstance.items = [];
        const empty = await openMenu(renderMode);
        key(empty.button, 'ArrowDown');
        expect(empty.component.activeIndex()).toBe(-1);
        expect(document.activeElement).toBe(empty.button);
        key(empty.button, 'Escape');
        fixture.componentInstance.items = [{ id: 'disabled', label: 'Unavailable', disabled: true }];
        const disabled = await openMenu(renderMode);
        key(disabled.button, 'ArrowDown');
        expect(disabled.component.activeIndex()).toBe(-1);
        expect(document.activeElement).toBe(disabled.button);
      });
    }

    it('an inline portal inside its own host processes each key only once', async () => {
      fixture.componentInstance.items = [
        { id: 'one', label: 'One' },
        { id: 'two', label: 'Two' },
        { id: 'three', label: 'Three' },
      ];
      const { component } = await openMenu('inline', { inlinePortalTargetSelector: 'generic-dropdown' });
      const options = Array.from(fixture.nativeElement.querySelectorAll('a[role="option"]')) as HTMLAnchorElement[];
      const selections: DropdownItem[] = [];
      component.selectItem.subscribe((item) => selections.push(item));

      key(options[0], 'ArrowDown');
      expect(document.activeElement).toBe(options[1]);
      key(options[1], 'Enter');

      expect(selections.map((item) => item.id)).toEqual(['two']);
      expect(component.opened()).toBeFalse();
    });

    it('closing before deferred focus capture does not focus another menu or stale node', async () => {
      fixture.componentInstance.config = {
        ...fixture.componentInstance.config,
        renderMode: 'inline',
        inlinePortalTargetSelector: '#dropdown-inline-target',
      };
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      const component = fixture.debugElement.children[0].componentInstance as GenericDropdown;
      const outside = fixture.nativeElement.querySelector('#after-dropdown') as HTMLButtonElement;
      component.open();
      component.close(false);
      outside.focus();
      await fixture.whenStable();

      expect(component.opened()).toBeFalse();
      expect(component.activeIndex()).toBe(-1);
      expect(document.activeElement).toBe(outside);
    });
  });
});
