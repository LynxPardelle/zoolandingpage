import { REQUEST } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfigStoreService } from '../../services/config-store.service';
import { DRAFT_RUNTIME_STICKY_QUERY_PARAMS } from '../../services/draft-runtime.service';
import { resolveNavigationTarget } from '../../utility/navigation/navigation-target.utility';

import { GenericLink } from './generic-link';

describe('GenericLink', () => {
  const draftPreviewUrl = '/home?draftDomain=pamelabetancourt.com&debugWorkspace=true';
  const nativeHistoryReplaceState = History.prototype.replaceState;
  let component: GenericLink;
  let fixture: ComponentFixture<GenericLink>;
  let store: ConfigStoreService;
  let requestState: { url: string };

  const resetDraftPreviewUrl = (url = draftPreviewUrl): void => {
    nativeHistoryReplaceState.call(window.history, {}, '', url);
    requestState.url = new URL(url, window.location.origin).toString();
  };

  const resolveDraftPreviewHref = (href: string, url = draftPreviewUrl): string =>
    resolveNavigationTarget(href, {
      currentHref: `http://localhost${ url }`,
      stickyQueryParams: DRAFT_RUNTIME_STICKY_QUERY_PARAMS,
    }).href;

  beforeEach(async () => {
    requestState = { url: '' };
    resetDraftPreviewUrl();
    await TestBed.configureTestingModule({
      imports: [GenericLink],
      providers: [{ provide: REQUEST, useValue: requestState }],
    })
      .compileComponents();

    fixture = TestBed.createComponent(GenericLink);
    component = fixture.componentInstance;
    store = TestBed.inject(ConfigStoreService);
    resetDraftPreviewUrl();
    fixture.componentRef.setInput('config', { id: 'spec', href: '#home', text: 'Home' });
    fixture.detectChanges();
  });

  afterEach(() => {
    nativeHistoryReplaceState.call(window.history, {}, '', '/context.html');
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

  it('should resolve dynamic inline styles', () => {
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: '#home',
      text: 'Home',
      styles: () => ({
        borderColor: '#ee8130',
        '--link-accent': '#ee8130',
      }),
    });
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(anchor.style.borderColor).toBe('rgb(238, 129, 48)');
    expect(anchor.style.getPropertyValue('--link-accent')).toBe('#ee8130');
  });

  it('should ignore _blank for internal hrefs', () => {
    resetDraftPreviewUrl();
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: '/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true',
      text: 'Servicios',
      target: '_blank',
    });
    resetDraftPreviewUrl();
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(component.target()).toBeNull();
    expect(anchor.getAttribute('target')).toBeNull();
    expect(component.href()).toBe('/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true');
  });

  it('should preserve debugWorkspace on internal hrefs', () => {
    const href = resolveDraftPreviewHref('/acerca-de-mi?draftDomain=pamelabetancourt.com');
    resetDraftPreviewUrl();
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href,
      text: 'Acerca de mi',
    });
    resetDraftPreviewUrl();
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
    const href = resolveDraftPreviewHref('/servicios');
    resetDraftPreviewUrl();
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href,
      text: 'Servicios',
    });
    resetDraftPreviewUrl();
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(component.href()).toBe('/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true');
    expect(component.routerLinkQueryParams()).toEqual({
      draftDomain: 'pamelabetancourt.com',
      debugWorkspace: 'true',
    });
    expect(anchor.getAttribute('href')).toContain('/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true');
  });

  it('should use the request URL to carry draft params during SSR', () => {
    nativeHistoryReplaceState.call(window.history, {}, '', '/context.html');
    requestState.url = 'https://test.zoolandingpage.com.mx/blog?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es';
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: '/blog/web/qa-ssr',
      text: 'Artículo SSR',
    });
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(component.href()).toBe('/blog/web/qa-ssr?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es');
    expect(anchor.getAttribute('href')).toContain('/blog/web/qa-ssr?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es');
  });

  it('should preserve the active language on internal hrefs', () => {
    const previewUrl = '/home?draftDomain=pamelabetancourt.com&debugWorkspace=true&lang=es';
    const href = resolveDraftPreviewHref('/servicios', previewUrl);
    resetDraftPreviewUrl(previewUrl);
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href,
      text: 'Servicios',
    });
    resetDraftPreviewUrl(previewUrl);
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
    const href = resolveDraftPreviewHref('/cont%C3%A1ctame?draftDomain=pamelabetancourt.com');
    resetDraftPreviewUrl();
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href,
      text: 'Contáctame',
    });
    resetDraftPreviewUrl();
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
    resetDraftPreviewUrl();
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
    const pushState = spyOn(window.history, 'pushState').and.callThrough();
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: '/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true',
      text: 'Servicios',
    });
    resetDraftPreviewUrl();
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(pushState).toHaveBeenCalledWith({}, '', '/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true');
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo.calls.argsFor(0)[0] as ScrollToOptions).toEqual({ top: 0, left: 0, behavior: 'auto' });
  });

  it('should let link config override global scroll restoration', () => {
    resetDraftPreviewUrl();
    store.setSiteConfig({
      version: 1,
      domain: 'pamelabetancourt.com',
      routes: [{ path: '/home', pageId: 'home' }, { path: '/servicios', pageId: 'servicios' }],
      runtime: {
        navigation: {
          scrollRestoration: {
            mode: 'preserve',
          },
        },
      },
      site: {} as any,
    } as any);
    const scrollTo = spyOn(window, 'scrollTo');
    const pushState = spyOn(window.history, 'pushState').and.callThrough();
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: '/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true',
      text: 'Servicios',
      scrollRestoration: {
        mode: 'top',
      },
    });
    resetDraftPreviewUrl();
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(pushState).toHaveBeenCalledWith({}, '', '/servicios?draftDomain=pamelabetancourt.com&debugWorkspace=true');
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

  it('should resolve dynamic event instructions for analytics attributes', () => {
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: '/blog/web/qa',
      text: 'Artículo',
    });
    fixture.componentRef.setInput('eventInstructions', () => 'trackEvent:blog_cta_click,blog,qa');
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(component.eventInstructionsAttribute()).toBe('trackEvent:blog_cta_click,blog,qa');
    expect(anchor.getAttribute('data-event-instructions')).toBe('trackEvent:blog_cta_click,blog,qa');
  });
});
