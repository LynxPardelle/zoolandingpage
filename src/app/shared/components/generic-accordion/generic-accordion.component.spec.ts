import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../services/i18n.service';
import { VariableStoreService } from '../../services/variable-store.service';
import { GenericAccordionComponent } from './generic-accordion.component';

describe('GenericAccordionComponent', () => {
  let fixture: ComponentFixture<GenericAccordionComponent>;
  let comp: GenericAccordionComponent;
  let i18n: I18nService;
  let variables: VariableStoreService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GenericAccordionComponent] }).compileComponents();
    fixture = TestBed.createComponent(GenericAccordionComponent);
    comp = fixture.componentInstance;
    i18n = TestBed.inject(I18nService);
    variables = TestBed.inject(VariableStoreService);
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

  it('resolves detail items from draft-native var and i18n payloads', () => {
    variables.setPayload({
      version: 1,
      pageId: 'default',
      domain: 'zoolandingpage.com.mx',
      variables: {
        processSection: {
          steps: [
            {
              id: '1',
              step: 1,
              titleKey: 'process.0.title',
              summaryKey: 'process.0.summary',
              contentKey: 'process.0.content',
              metaKey: 'process.0.meta',
              detailItemsKey: 'process.0.detailItems',
            },
          ],
        },
      },
      computed: {},
    });
    const processTranslations = {
      process: [
        {
          title: 'Discovery',
          summary: 'Understand the business goals',
          content: 'Detailed description',
          meta: '2 days',
          detailItems: ['Item A', 'Item B'],
        },
      ],
    };
    i18n.setTranslations('es', processTranslations, { applyIfCurrent: true });
    i18n.setTranslations('en', processTranslations, { applyIfCurrent: true });

    fixture.componentRef.setInput('config', {
      renderMode: 'detail',
      mode: 'single',
      itemsSource: {
        source: 'var',
        path: 'processSection.steps',
      },
    });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    host.querySelector('button')?.click();
    fixture.detectChanges();

    expect(comp.items()[0]?.title).toBe('Discovery');
    expect(host.textContent).toContain('Understand the business goals');
    expect(host.textContent).toContain('Detailed description');
    expect(host.textContent).toContain('Item B');
  });
});
