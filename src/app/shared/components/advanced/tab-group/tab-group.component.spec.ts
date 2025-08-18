import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabGroupComponent } from './tab-group.component';

describe('TabGroupComponent', () => {
  let fixture: ComponentFixture<TabGroupComponent>;
  let comp: TabGroupComponent;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TabGroupComponent] }).compileComponents();
    fixture = TestBed.createComponent(TabGroupComponent);
    comp = fixture.componentInstance;
    comp.tabsSource = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C', disabled: true },
      { id: 'd', label: 'D' },
    ];
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
});
