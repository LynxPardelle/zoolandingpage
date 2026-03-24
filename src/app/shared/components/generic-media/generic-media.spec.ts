import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericMedia } from './generic-media';

describe('GenericMedia', () => {
  let component: GenericMedia;
  let fixture: ComponentFixture<GenericMedia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericMedia]
    })
      .compileComponents();

    fixture = TestBed.createComponent(GenericMedia);
    component = fixture.componentInstance;
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
});
