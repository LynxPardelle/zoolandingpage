import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericMultiComponents } from './generic-multi-components';

describe('GenericMultiComponents', () => {
  let component: GenericMultiComponents;
  let fixture: ComponentFixture<GenericMultiComponents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericMultiComponents]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenericMultiComponents);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
