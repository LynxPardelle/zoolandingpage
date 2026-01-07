import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericLink } from './generic-link';

describe('GenericLink', () => {
  let component: GenericLink;
  let fixture: ComponentFixture<GenericLink>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericLink]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenericLink);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
