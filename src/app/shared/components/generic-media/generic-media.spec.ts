import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericMedia } from './generic-media';

describe('GenericMedia', () => {
  let component: GenericMedia;
  let fixture: ComponentFixture<GenericMedia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericMedia]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenericMedia);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
