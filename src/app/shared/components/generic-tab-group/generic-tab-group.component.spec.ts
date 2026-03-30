import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../services/i18n.service';
import { VariableStoreService } from '../../services/variable-store.service';
import { GenericTabGroupComponent } from './generic-tab-group.component';

describe('GenericTabGroupComponent', () => {
  let fixture: ComponentFixture<GenericTabGroupComponent>;
  let comp: GenericTabGroupComponent;
  let i18n: I18nService;
  let variables: VariableStoreService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GenericTabGroupComponent] }).compileComponents();
    fixture = TestBed.createComponent(GenericTabGroupComponent);
    comp = fixture.componentInstance;
    i18n = TestBed.inject(I18nService);
    variables = TestBed.inject(VariableStoreService);
    fixture.componentRef.setInput('config', {
      tabs: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C', disabled: true },
        { id: 'd', label: 'D' },
      ],
    });
    fixture.detectChanges();
  });
  it('should activate first enabled tab', () => {
    expect(comp.activeId()).toBe('a');
  });
  it('should move to next enabled on ArrowRight skipping disabled', () => {
    const el = fixture.nativeElement as HTMLElement;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(comp.activeId()).toBe('b');
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(comp.activeId()).toBe('d');
  });

  it('renders canonical detail fields in split-detail layout', () => {
    fixture.componentRef.setInput('config', {
      layout: 'split-detail',
      tabs: [
        {
          id: 'overview',
          label: 'Overview',
          summary: 'Summary text',
          content: 'Long-form content',
          meta: '2 days',
          detailItems: ['Item A', 'Item B'],
        },
      ],
    });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Summary text');
    expect(host.textContent).toContain('Long-form content');
    expect(host.textContent).toContain('2 days');
    expect(host.textContent).toContain('Item A');
    expect(host.textContent).toContain('Item B');
  });

  it('does not render fallback detail icons when the config omits them', () => {
    fixture.componentRef.setInput('config', {
      layout: 'split-detail',
      tabs: [
        {
          id: 'overview',
          label: 'Overview',
          summary: 'Summary text',
          content: 'Long-form content',
          meta: '2 days',
          detailItems: ['Item A'],
        },
      ],
    });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('mat-icon').length).toBe(0);
  });

  it('resolves split-detail tabs from draft-native var and i18n payloads', () => {
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
    i18n.setTranslations('es', {
      process: [
        {
          title: 'Discovery',
          summary: 'Understand the business goals',
          content: 'Detailed description',
          meta: '2 days',
          detailItems: ['Item A', 'Item B'],
        },
      ],
    }, { applyIfCurrent: true });

    fixture.componentRef.setInput('config', {
      layout: 'split-detail',
      tabsSource: {
        source: 'var',
        path: 'processSection.steps',
      },
    });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(comp.tabs()[0]?.title).toBe('Discovery');
    expect(host.textContent).toContain('Understand the business goals');
    expect(host.textContent).toContain('Detailed description');
    expect(host.textContent).toContain('Item A');
  });
});
