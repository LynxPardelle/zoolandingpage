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

  it('renders sanitized authored html when html is provided', () => {
    fixture.componentRef.setInput('config', {
      tag: 'p',
      html: '<strong>Hello</strong><script>alert(1)</script>',
    });

    fixture.detectChanges();

    const paragraph = fixture.nativeElement.querySelector('p');

    expect(paragraph.innerHTML).toContain('<strong>Hello</strong>');
    expect(paragraph.innerHTML).not.toContain('<script>');
  });

  it('should compose root and content ids from the component id when config.id is missing', () => {
    fixture.componentRef.setInput('componentId', 'intro');
    fixture.componentRef.setInput('config', {
      tag: 'p',
      text: 'Hello world',
    });

    fixture.detectChanges();

    const paragraph = fixture.nativeElement.querySelector('p') as HTMLParagraphElement;
    const content = paragraph.querySelector('#intro-text-content') as HTMLSpanElement | null;

    expect(paragraph.id).toBe('intro-text');
    expect(content?.textContent).toContain('Hello world');
  });
});
