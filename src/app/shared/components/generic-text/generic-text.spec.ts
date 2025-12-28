import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericText } from './generic-text';

describe('GenericText', () => {
  let component: GenericText;
  let fixture: ComponentFixture<GenericText>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericText]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenericText);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
