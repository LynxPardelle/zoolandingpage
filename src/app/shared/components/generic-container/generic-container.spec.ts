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
});
