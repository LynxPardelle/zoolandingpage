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
});
