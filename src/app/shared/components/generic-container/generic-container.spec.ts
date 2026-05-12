import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericContainerComponent } from './generic-container';

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
});
