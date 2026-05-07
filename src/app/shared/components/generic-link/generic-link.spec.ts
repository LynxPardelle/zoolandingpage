import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfigStoreService } from '../../services/config-store.service';

import { GenericLink } from './generic-link';

describe('GenericLink', () => {
  let component: GenericLink;
  let fixture: ComponentFixture<GenericLink>;
  let store: ConfigStoreService;

  beforeEach(async () => {
    window.history.replaceState({}, '', '/home?draftDomain=pamelabetancourt.com&debugWorkspace=true');
    await TestBed.configureTestingModule({
      imports: [GenericLink],
    })
      .compileComponents();

    fixture = TestBed.createComponent(GenericLink);
    component = fixture.componentInstance;
    store = TestBed.inject(ConfigStoreService);
    fixture.componentRef.setInput('config', { id: 'spec', href: '#home', text: 'Home' });
    fixture.detectChanges();
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/context.html');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should serialize only string component tokens into the data attribute', () => {
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: '#home',
      text: 'Home',
      components: [
        'nav-item',
        {
          id: 'nested-child',
          type: 'text',
          config: { text: 'Nested child' },
        } as any,
      ],
    });
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(component.componentTokens()).toEqual(['nav-item']);
    expect(anchor.getAttribute('data-components')).toBe('nav-item');
  });

  it('should compose root and child ids from the component id when config.id is missing', () => {
    fixture.componentRef.setInput('componentId', 'nav-home');
    fixture.componentRef.setInput('config', {
      href: '#home',
      text: 'Home',
    });
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(anchor.id).toBe('nav-home-link');
    expect(anchor.querySelector('#nav-home-link-content')).toBeTruthy();
    expect(anchor.querySelector('#nav-home-link-content-text')?.textContent).toContain('Home');
  });

  it('should ignore _blank for internal hrefs', () => {
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: '/servicios?draftDomain=pamelabetancourt.com',
      text: 'Servicios',
      target: '_blank',
    });
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(component.target()).toBeNull();
    expect(anchor.getAttribute('target')).toBeNull();
    expect(component.href()).toBe('/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true');
  });

  it('should preserve debugWorkspace on internal hrefs', () => {
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: '/acerca-de-mi?draftDomain=pamelabetancourt.com',
      text: 'Acerca de mi',
    });
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(component.href()).toBe('/acerca-de-mi?draftDomain=pamelabetancourt.com&debugWorkspace=true');
    expect(component.routableInternalHref()).toBeTrue();
    expect(component.routerLinkPath()).toBe('/acerca-de-mi');
    expect(component.routerLinkQueryParams()).toEqual({
      draftDomain: 'pamelabetancourt.com',
      debugWorkspace: 'true',
    });
    expect(anchor.getAttribute('href')).toContain('/acerca-de-mi?draftDomain=pamelabetancourt.com&debugWorkspace=true');
  });

  it('should carry the active draftDomain onto internal hrefs that omit it', () => {
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: '/servicios',
      text: 'Servicios',
    });
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(component.href()).toBe('/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true');
    expect(component.routerLinkQueryParams()).toEqual({
      draftDomain: 'pamelabetancourt.com',
      debugWorkspace: 'true',
    });
    expect(anchor.getAttribute('href')).toContain('/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true');
  });

  it('should preserve the active language on internal hrefs', () => {
    window.history.replaceState({}, '', '/home?draftDomain=pamelabetancourt.com&debugWorkspace=true&lang=es');
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: '/servicios',
      text: 'Servicios',
    });
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(component.href()).toBe('/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true&lang=es');
    expect(component.routerLinkQueryParams()).toEqual({
      draftDomain: 'pamelabetancourt.com',
      debugWorkspace: 'true',
      lang: 'es',
    });
    expect(anchor.getAttribute('href')).toContain('/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true&lang=es');
  });

  it('should normalize encoded unicode internal hrefs without double-encoding them', () => {
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: '/cont%C3%A1ctame?draftDomain=pamelabetancourt.com',
      text: 'Contáctame',
    });
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(component.href()).toBe('/cont%C3%A1ctame?draftDomain=pamelabetancourt.com&debugWorkspace=true');
    expect(component.routerLinkPath()).toBe('/contáctame');
    expect(component.routerLinkQueryParams()).toEqual({
      draftDomain: 'pamelabetancourt.com',
      debugWorkspace: 'true',
    });
    expect(anchor.getAttribute('href')).toContain('/cont%C3%A1ctame?draftDomain=pamelabetancourt.com&debugWorkspace=true');
    expect(anchor.getAttribute('href')).not.toContain('%25C3%25A1');
  });

  it('should preserve _blank for external hrefs', () => {
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: 'https://example.com/profile',
      text: 'Profile',
      target: '_blank',
    });
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(component.target()).toBe('_blank');
    expect(anchor.getAttribute('target')).toBe('_blank');
  });

  it('should scroll to the configured top position after internal navigation', () => {
    store.setSiteConfig({
      version: 1,
      domain: 'pamelabetancourt.com',
      routes: [{ path: '/home', pageId: 'home' }, { path: '/servicios', pageId: 'servicios' }],
      runtime: {
        navigation: {
          scrollRestoration: {
            mode: 'top',
          },
        },
      },
      site: {} as any,
    } as any);
    const scrollTo = spyOn(window, 'scrollTo');
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: '/servicios',
      text: 'Servicios',
    });
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    anchor.click();

    expect(window.location.pathname).toBe('/servicios');
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo.calls.argsFor(0)[0] as ScrollToOptions).toEqual({ top: 0, left: 0, behavior: 'auto' });
  });

  it('should resolve dynamic link metadata without hardcoded component styling assumptions', () => {
    fixture.componentRef.setInput('config', {
      id: () => 'dynamic-link',
      href: () => '#faq',
      text: () => 'FAQ',
      classes: () => 'faqLink',
      ariaLabel: () => 'Open FAQ section',
      ariaExpanded: () => true,
      ariaControls: () => 'faq-panel',
      ariaCurrent: () => 'page',
    });
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(component.id()).toBe('dynamic-link');
    expect(component.text()).toBe('FAQ');
    expect(component.classes()).toBe('faqLink');
    expect(component.ariaLabel()).toBe('Open FAQ section');
    expect(component.ariaExpanded()).toBeTrue();
    expect(component.ariaControls()).toBe('faq-panel');
    expect(component.ariaCurrent()).toBe('page');
    expect(anchor.getAttribute('id')).toBe('dynamic-link');
    expect(anchor.getAttribute('class')).toContain('faqLink');
    expect(anchor.getAttribute('aria-label')).toBe('Open FAQ section');
    expect(anchor.getAttribute('aria-expanded')).toBe('true');
    expect(anchor.getAttribute('aria-controls')).toBe('faq-panel');
    expect(anchor.getAttribute('aria-current')).toBe('page');
  });
});
