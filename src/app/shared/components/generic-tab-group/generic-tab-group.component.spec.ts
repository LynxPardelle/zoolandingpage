import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GenericTabGroupComponent } from './generic-tab-group.component';

describe('GenericTabGroupComponent', () => {
  let fixture: ComponentFixture<GenericTabGroupComponent>;
  let comp: GenericTabGroupComponent;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GenericTabGroupComponent] }).compileComponents();
    fixture = TestBed.createComponent(GenericTabGroupComponent);
    comp = fixture.componentInstance;
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
});
