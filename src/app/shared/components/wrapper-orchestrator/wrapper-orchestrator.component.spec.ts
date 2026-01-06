import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WrapperOrchestrator } from './wrapper-orchestrator.component';

describe('WrapperOrchestrator', () => {
  let component: WrapperOrchestrator;
  let fixture: ComponentFixture<WrapperOrchestrator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WrapperOrchestrator]
    })
      .compileComponents();

    fixture = TestBed.createComponent(WrapperOrchestrator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
