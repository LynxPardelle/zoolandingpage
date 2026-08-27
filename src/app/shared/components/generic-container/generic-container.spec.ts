import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericContainerComponent } from './generic-container';
import type { GenericContainerComponentTag } from './generic-container.types';

describe('GenericContainerComponent', () => {
  let component: GenericContainerComponent;
  let fixture: ComponentFixture<GenericContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericContainerComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(GenericContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should ignore nested component objects in internal slot token normalization', () => {
    fixture.componentRef.setInput('config', {
      tag: 'div',
      components: [
        '__content__',
        {
          id: 'nested-child',
          type: 'text',
          config: { text: 'Nested child' },
        } as any,
        'named-template',
      ],
    });

    fixture.detectChanges();

    expect(component.components()).toEqual(['__content__', 'named-template']);
    expect(component.templateComponentIds()).toEqual(['named-template']);
    expect(component.hasContentToken()).toBeTrue();
  });

  it('should render supported semantic tags from the typed contract', () => {
    fixture.componentRef.setInput('config', {
      tag: 'ol',
      id: 'ordered-list',
      classes: 'ordered-list',
    });

    fixture.detectChanges();

    const element = fixture.nativeElement.querySelector('ol');
    expect(element).toBeTruthy();
    expect(element?.id).toBe('ordered-list');
    expect(element?.className).toContain('ordered-list');
  });

  it('renders authored figure containers without falling back to a div', () => {
    fixture.componentRef.setInput('config', {
      tag: 'figure',
      id: 'media-figure',
    } as any);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('figure#media-figure')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('div#media-figure')).toBeFalsy();
  });

  it('should derive a root id from the component id when config.id is missing', () => {
    fixture.componentRef.setInput('componentId', 'hero');
    fixture.componentRef.setInput('config', {
      tag: 'section',
      classes: 'hero-section',
    });

    fixture.detectChanges();

    const element = fixture.nativeElement.querySelector('section') as HTMLElement | null;
    expect(element?.id).toBe('hero-container');
  });

  it('should resolve dynamic class maps', () => {
    fixture.componentRef.setInput('config', {
      tag: 'div',
      classMap: () => ({
        active: true,
        hidden: false,
      }),
    });

    fixture.detectChanges();

    const element = fixture.nativeElement.querySelector('div') as HTMLElement | null;
    expect(element?.classList.contains('active')).toBeTrue();
    expect(element?.classList.contains('hidden')).toBeFalse();
  });

  it('should resolve dynamic inline styles', () => {
    fixture.componentRef.setInput('config', {
      tag: 'div',
      styles: () => ({
        '--card-accent': '#f7b731',
        opacity: 1,
      }),
    });

    fixture.detectChanges();

    const element = fixture.nativeElement.querySelector('div') as HTMLElement | null;
    expect(element?.style.getPropertyValue('--card-accent')).toBe('#f7b731');
    expect(element?.style.opacity).toBe('1');
  });

  it('binds authored status-region focus and live announcement attributes', () => {
    fixture.componentRef.setInput('config', {
      tag: 'section',
      id: 'calculation-result',
      role: 'status',
      tabindex: -1,
      ariaLive: 'polite',
    } as any);

    fixture.detectChanges();

    const element = fixture.nativeElement.querySelector('section') as HTMLElement;
    expect(element.getAttribute('role')).toBe('status');
    expect(element.getAttribute('tabindex')).toBe('-1');
    expect(element.getAttribute('aria-live')).toBe('polite');
  });

  const semanticTags: readonly GenericContainerComponentTag[] = [
    'div', 'span', 'section', 'main', 'header', 'footer',
    'nav', 'article', 'figure', 'aside', 'ul', 'ol', 'li',
  ];

  for (const tag of semanticTags) {
    it(`should declare the content language on the rendered ${tag}, not its host`, () => {
      fixture.nativeElement.setAttribute('lang', 'es');
      fixture.componentRef.setInput('config', { tag, lang: ' en ' });

      fixture.detectChanges();

      const element = fixture.nativeElement.querySelector(tag) as HTMLElement;
      expect(element.getAttribute('lang')).toBe('en');
      expect(element.matches(':lang(en)')).toBeTrue();
      expect(element.matches(':lang(es)')).toBeFalse();
      expect(fixture.nativeElement.getAttribute('lang')).toBe('es');
    });

    it(`should preserve the authored focus and live region attributes on ${tag}`, () => {
      fixture.componentRef.setInput('config', { tag, tabindex: -1, ariaLive: 'polite' });

      fixture.detectChanges();

      const element = fixture.nativeElement.querySelector(tag) as HTMLElement;
      expect(element.getAttribute('tabindex')).toBe('-1');
      expect(element.getAttribute('aria-live')).toBe('polite');
      expect(element.tabIndex).toBe(-1);
    });
  }

  it('should let an English main receive focus while the surrounding shell stays Spanish', () => {
    fixture.nativeElement.setAttribute('lang', 'es');
    fixture.componentRef.setInput('config', {
      tag: 'main', id: 'page-main', lang: 'en', tabindex: -1,
    });
    fixture.detectChanges();

    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    main.focus();

    expect(document.activeElement).toBe(main);
    expect(main.matches(':lang(en)')).toBeTrue();
    expect(fixture.nativeElement.matches(':lang(es)')).toBeTrue();
    expect(main.tabIndex).toBe(-1);
  });

  it('should resolve an orchestrator-owned language value without leaking it to the host', () => {
    fixture.componentRef.setInput('config', { tag: 'section', lang: () => 'es-419' });

    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('section') as HTMLElement;
    expect(section.getAttribute('lang')).toBe('es-419');
    expect(section.matches(':lang(es)')).toBeTrue();
    expect(fixture.nativeElement.hasAttribute('lang')).toBeFalse();
  });

  it('should remove an empty or omitted language so the content inherits its shell language', () => {
    fixture.nativeElement.setAttribute('lang', 'es');
    fixture.componentRef.setInput('config', { tag: 'section', lang: 'en' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section').matches(':lang(en)')).toBeTrue();

    for (const lang of ['', ' \t\n ', undefined, null]) {
      fixture.componentRef.setInput('config', { tag: 'section', lang });
      fixture.detectChanges();

      const section = fixture.nativeElement.querySelector('section') as HTMLElement;
      expect(section.hasAttribute('lang')).toBeFalse();
      expect(section.matches(':lang(es)')).toBeTrue();
    }
  });

  it('should bind language text as an attribute rather than interpreting markup', () => {
    const lang = 'en" autofocus onfocus="alert(1)';
    fixture.componentRef.setInput('config', { tag: 'section', lang });

    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('section') as HTMLElement;
    expect(section.getAttribute('lang')).toBe(lang);
    expect(section.hasAttribute('autofocus')).toBeFalse();
    expect(section.hasAttribute('onfocus')).toBeFalse();
  });

  it('should preserve the existing finite numeric tabindex contract', () => {
    for (const tabindex of [-2, -1, 0, 1, 10, 0.5]) {
      fixture.componentRef.setInput('config', { tag: 'main', tabindex });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('main').getAttribute('tabindex')).toBe(String(tabindex));
    }

    for (const tabindex of [Number.NaN, Number.POSITIVE_INFINITY, undefined, null, '-1']) {
      fixture.componentRef.setInput('config', { tag: 'main', tabindex });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('main').hasAttribute('tabindex')).toBeFalse();
    }
  });
});
