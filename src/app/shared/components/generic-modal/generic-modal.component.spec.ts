import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GenericModalComponent } from './generic-modal.component';

describe('GenericModalComponent', () => {
  let fixture: ComponentFixture<GenericModalComponent>;
  let comp: GenericModalComponent;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GenericModalComponent] }).compileComponents();
    fixture = TestBed.createComponent(GenericModalComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(comp).toBeTruthy();
  });
});
