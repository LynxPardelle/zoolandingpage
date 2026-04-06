import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericMedia } from './generic-media';

describe('GenericMedia', () => {
  let component: GenericMedia;
  let fixture: ComponentFixture<GenericMedia>;

  const defaultConfig = {
    id: 'default-media',
    tag: 'image' as const,
    src: '/assets/default-image.webp',
    alt: 'Default media',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericMedia]
    })
      .compileComponents();

    fixture = TestBed.createComponent(GenericMedia);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('config', defaultConfig);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should resolve thunk-based media values before rendering', () => {
    fixture.componentRef.setInput('config', {
      id: () => 'hero-media',
      tag: () => 'image',
      classes: () => 'hero-image spotlight',
      src: () => '/assets/music/hero-cover.webp',
      alt: () => 'Lynx Pardelle portrait'
    });

    fixture.detectChanges();

    const image: HTMLImageElement | null = fixture.nativeElement.querySelector('img');

    expect(component.id()).toBe('hero-media');
    expect(component.tag()).toBe('image');
    expect(component.classes()).toBe('hero-image spotlight');
    expect(component.src()).toBe('/assets/music/hero-cover.webp');
    expect(component.alt()).toBe('Lynx Pardelle portrait');
    expect(image).not.toBeNull();
    expect(image?.id).toBe('hero-media');
    expect(image?.getAttribute('class')).toBe('hero-image spotlight');
    expect(image?.getAttribute('src')).toBe('/assets/music/hero-cover.webp');
    expect(image?.getAttribute('alt')).toBe('Lynx Pardelle portrait');
  });

  it('renders document media as an external link using alt text when available', () => {
    fixture.componentRef.setInput('config', {
      id: 'legal-pdf',
      tag: 'document',
      classes: 'legal-link',
      src: '/assets/legal/privacy.pdf',
      alt: 'Privacy notice',
    });

    fixture.detectChanges();

    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a');

    expect(link).not.toBeNull();
    expect(link?.id).toBe('legal-pdf');
    expect(link?.getAttribute('href')).toBe('/assets/legal/privacy.pdf');
    expect(link?.textContent?.trim()).toBe('Privacy notice');
  });

  it('falls back to the source when link-style media has no alt text', () => {
    fixture.componentRef.setInput('config', {
      id: 'asset-link',
      tag: 'other',
      src: '/assets/files/brief.pdf',
    });

    fixture.detectChanges();

    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a');

    expect(link?.textContent?.trim()).toBe('/assets/files/brief.pdf');
  });
});
