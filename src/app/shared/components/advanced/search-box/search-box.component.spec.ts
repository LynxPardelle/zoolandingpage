import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchBoxComponent } from './search-box.component';

describe('SearchBoxComponent', () => {
  let fixture: ComponentFixture<SearchBoxComponent>;
  let comp: SearchBoxComponent;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SearchBoxComponent] }).compileComponents();
    fixture = TestBed.createComponent(SearchBoxComponent);
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
    // simulate ArrowDown and Enter
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(comp.term()).toBe('Alpha');
  });
});
