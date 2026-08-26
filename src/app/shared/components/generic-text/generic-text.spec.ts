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

  it('renders block authored html inside a div host when the configured tag would create invalid markup', () => {
    fixture.componentRef.setInput('componentId', 'help-list');
    fixture.componentRef.setInput('config', {
      html: '<ul><li>One</li><li>Two</li></ul>',
    });

    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector('#help-list-text') as HTMLDivElement | null;

    expect(host?.tagName).toBe('DIV');
    expect(host?.querySelectorAll('li').length).toBe(2);
    expect(fixture.nativeElement.querySelector('p')).toBeNull();
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

  it('should resolve dynamic inline styles', () => {
    fixture.componentRef.setInput('config', {
      tag: 'p',
      text: 'Styled text',
      styles: () => ({
        color: '#ee8130',
        '--text-accent': '#ee8130',
      }),
    });

    fixture.detectChanges();

    const paragraph = fixture.nativeElement.querySelector('p') as HTMLParagraphElement;

    expect(paragraph.style.color).toBe('rgb(238, 129, 48)');
    expect(paragraph.style.getPropertyValue('--text-accent')).toBe('#ee8130');
  });

  it('renders authored figure captions with their styling and accessibility attributes', () => {
    fixture.componentRef.setInput('config', {
      tag: 'figcaption',
      text: 'Evaluation caption',
      classes: 'caption-class',
      styles: {
        fontSize: '.85rem',
        textAlign: 'center',
      },
      ariaLabel: 'Evaluation result caption',
    });

    fixture.detectChanges();

    const caption = fixture.nativeElement.querySelector('figcaption') as HTMLElement | null;

    expect(caption).not.toBeNull();
    expect(caption?.textContent).toContain('Evaluation caption');
    expect(caption?.classList.contains('caption-class')).toBeTrue();
    expect(caption?.style.fontSize).toBe('0.85rem');
    expect(caption?.style.textAlign).toBe('center');
    expect(caption?.getAttribute('aria-label')).toBe('Evaluation result caption');
  });
});
