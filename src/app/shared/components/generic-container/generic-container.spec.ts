import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericContainer } from './generic-container';

describe('GenericContainer', () => {
  let component: GenericContainer;
  let fixture: ComponentFixture<GenericContainer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericContainer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenericContainer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
