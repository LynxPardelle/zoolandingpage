import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GenericAccordionComponent } from './generic-accordion.component';

describe('GenericAccordionComponent', () => {
  let fixture: ComponentFixture<GenericAccordionComponent>;
  let comp: GenericAccordionComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GenericAccordionComponent] }).compileComponents();
    fixture = TestBed.createComponent(GenericAccordionComponent);
    comp = fixture.componentInstance;
    fixture.componentRef.setInput('config', {
      items: [
        { id: 'a', title: 'A', content: 'aa' },
        { id: 'b', title: 'B', content: 'bb' },
      ],
    });
    fixture.detectChanges();
  });
  it('should render two items', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('button').length).toBe(2);
  });

  it('renders canonical detail fields when expanded', () => {
    fixture.componentRef.setInput('config', {
      renderMode: 'detail',
      mode: 'single',
      items: [
        {
          id: 'step-1',
          title: 'Step 1',
          summary: 'Summary text',
          content: 'Long-form content',
          meta: '2 days',
          detailItems: ['Item A', 'Item B'],
        },
      ],
    });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    host.querySelector('button')?.click();
    fixture.detectChanges();

    expect(host.textContent).toContain('Summary text');
    expect(host.textContent).toContain('Long-form content');
    expect(host.textContent).toContain('2 days');
    expect(host.textContent).toContain('Item A');
    expect(host.textContent).toContain('Item B');
  });

  it('does not render fallback detail icons when the config omits them', () => {
    fixture.componentRef.setInput('config', {
      renderMode: 'detail',
      mode: 'single',
      items: [
        {
          id: 'step-1',
          title: 'Step 1',
          summary: 'Summary text',
          content: 'Long-form content',
          meta: '2 days',
          detailItems: ['Item A'],
        },
      ],
    });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    host.querySelector('button')?.click();
    fixture.detectChanges();

    expect(host.querySelectorAll('mat-icon').length).toBe(0);
  });
});
