import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccordionComponent } from './accordion.component';

describe('AccordionComponent', () => {
  let fixture: ComponentFixture<AccordionComponent>;
  let comp: AccordionComponent;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AccordionComponent] }).compileComponents();
    fixture = TestBed.createComponent(AccordionComponent);
    comp = fixture.componentInstance;
    comp.itemsSource = [
      { id: 'a', title: 'A', content: 'aa' },
      { id: 'b', title: 'B', content: 'bb' },
    ];
    fixture.detectChanges();
  });
  it('should render two items', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('[role="button"]').length).toBe(2);
  });
});
