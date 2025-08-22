import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';

describe('ModalComponent', () => {
  let fixture: ComponentFixture<ModalComponent>;
  let comp: ModalComponent;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ModalComponent] }).compileComponents();
    fixture = TestBed.createComponent(ModalComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(comp).toBeTruthy();
  });
});
