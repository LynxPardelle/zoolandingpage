import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericIconComponent } from './generic-icon.component';

describe('GenericIconComponent', () => {
  let component: GenericIconComponent;
  let fixture: ComponentFixture<GenericIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericIconComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenericIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
