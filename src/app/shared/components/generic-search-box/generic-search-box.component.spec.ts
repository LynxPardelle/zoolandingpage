import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GenericSearchBoxComponent } from './generic-search-box.component';

describe('SearchBoxComponent', () => {
  let fixture: ComponentFixture<GenericSearchBoxComponent>;
  let comp: GenericSearchBoxComponent;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GenericSearchBoxComponent] }).compileComponents();
    fixture = TestBed.createComponent(GenericSearchBoxComponent);
    comp = fixture.componentInstance;
    comp.fetcher = (q: string) => [
      { id: '1', label: 'Alpha' },
      { id: '2', label: 'Beta' },
    ];
    comp.config = { minLength: 1, debounceMs: 0 };
    fixture.detectChanges();
  });
  it('should set combobox aria attributes', () => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
  });
  it('should show results and allow keyboard selection', async () => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'a';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    // debounceMs=0 still uses setTimeout(0); wait for results
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();
    // simulate ArrowDown and Enter
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(comp.term()).toBe('Alpha');
  });

  it('should toggle the collapsed panel from the trigger button', () => {
    comp.config = { minLength: 1, debounceMs: 0, collapsed: true, triggerIcon: 'search', closeIcon: 'arrow_back' };
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(comp.panelOpen()).toBeTrue();
    expect(fixture.nativeElement.querySelector('input')).toBeTruthy();
  });

  it('should close the collapsed panel from the back button', () => {
    comp.config = { minLength: 1, debounceMs: 0, collapsed: true, triggerIcon: 'search', closeIcon: 'arrow_back' };
    fixture.detectChanges();

    let button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(comp.panelOpen()).toBeFalse();
    expect(fixture.nativeElement.querySelector('input')).toBeFalsy();
  });
});
