import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GenericLink } from './generic-link';

describe('GenericLink', () => {
  let component: GenericLink;
  let fixture: ComponentFixture<GenericLink>;

  beforeEach(async () => {
    window.history.replaceState({}, '', '/home?draftDomain=pamelabetancourt.com&debugWorkspace=true');
    await TestBed.configureTestingModule({
      imports: [GenericLink],
      providers: [provideRouter([])],
    })
      .compileComponents();

    fixture = TestBed.createComponent(GenericLink);
    component = fixture.componentInstance;
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
