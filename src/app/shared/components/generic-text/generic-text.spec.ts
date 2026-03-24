import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GenericTextComponent } from './generic-text';

describe('GenericTextComponent', () => {
  let component: GenericTextComponent;
  let fixture: ComponentFixture<GenericTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericTextComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(GenericTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should ignore nested component objects when resolving template component ids', () => {
    fixture.componentRef.setInput('config', {
      tag: 'p',
      text: 'Hello',
      components: [
        'named-template',
        {
          id: 'nested-child',
          type: 'text',
          config: { text: 'Nested child' },
        } as any,
      ],
    });

    fixture.detectChanges();

    expect(component.components()).toEqual(['named-template']);
  });
});
