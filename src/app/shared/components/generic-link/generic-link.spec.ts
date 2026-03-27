import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GenericLink } from './generic-link';

describe('GenericLink', () => {
  let component: GenericLink;
  let fixture: ComponentFixture<GenericLink>;

  beforeEach(async () => {
    window.history.replaceState({}, '', '/home?draftDomain=pamelabetancourt.preview&debugWorkspace=true');
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

  it('should ignore _blank for internal hrefs', () => {
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: '/servicios?draftDomain=pamelabetancourt.preview',
      text: 'Servicios',
      target: '_blank',
    });
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(component.target()).toBeNull();
    expect(anchor.getAttribute('target')).toBeNull();
    expect(component.href()).toBe('/servicios?draftDomain=pamelabetancourt.preview&debugWorkspace=true');
  });

  it('should preserve debugWorkspace on internal hrefs', () => {
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: '/acerca-de-mi?draftDomain=pamelabetancourt.preview',
      text: 'Acerca de mi',
    });
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(component.href()).toBe('/acerca-de-mi?draftDomain=pamelabetancourt.preview&debugWorkspace=true');
    expect(component.routableInternalHref()).toBeTrue();
    expect(component.routerLinkPath()).toBe('/acerca-de-mi');
    expect(component.routerLinkQueryParams()).toEqual({
      draftDomain: 'pamelabetancourt.preview',
      debugWorkspace: 'true',
    });
    expect(anchor.getAttribute('href')).toContain('/acerca-de-mi?draftDomain=pamelabetancourt.preview&debugWorkspace=true');
  });

  it('should normalize encoded unicode internal hrefs without double-encoding them', () => {
    fixture.componentRef.setInput('config', {
      id: 'spec',
      href: '/cont%C3%A1ctame?draftDomain=pamelabetancourt.preview',
      text: 'Contáctame',
    });
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(component.href()).toBe('/cont%C3%A1ctame?draftDomain=pamelabetancourt.preview&debugWorkspace=true');
    expect(component.routerLinkPath()).toBe('/contáctame');
    expect(component.routerLinkQueryParams()).toEqual({
      draftDomain: 'pamelabetancourt.preview',
      debugWorkspace: 'true',
    });
    expect(anchor.getAttribute('href')).toContain('/cont%C3%A1ctame?draftDomain=pamelabetancourt.preview&debugWorkspace=true');
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
});
