import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericComponentWrapperComponent } from './generic-component-wrapper.component';

describe('GenericComponentWrapperComponent', () => {
  let component: GenericComponentWrapperComponent;
  let fixture: ComponentFixture<GenericComponentWrapperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericComponentWrapperComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenericComponentWrapperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
