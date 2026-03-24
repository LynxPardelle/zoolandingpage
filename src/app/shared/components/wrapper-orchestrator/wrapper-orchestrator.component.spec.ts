import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigurationsOrchestratorService } from '../../services/configurations-orchestrator';
import { InteractiveProcessStoreService } from '../../services/interactive-process-store.service';
import { ValueOrchestrator } from '../../services/value-orchestrator';
import { WrapperOrchestrator } from './wrapper-orchestrator.component';

describe('WrapperOrchestrator', () => {
  let component: WrapperOrchestrator;
  let fixture: ComponentFixture<WrapperOrchestrator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WrapperOrchestrator],
      providers: [
        {
          provide: ConfigurationsOrchestratorService,
          useValue: {
            getComponentById: () => undefined,
            markComponentRendered: () => { },
            handleComponentEvent: () => { },
          } satisfies Partial<ConfigurationsOrchestratorService>,
        },
        {
          provide: ValueOrchestrator,
          useValue: { apply: (c: any) => c } satisfies Partial<ValueOrchestrator>,
        },
        {
          provide: InteractiveProcessStoreService,
          useValue: { currentStep: signal(2) } satisfies Partial<InteractiveProcessStoreService>,
        },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(WrapperOrchestrator);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('componentsIds', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('resolves interactive-process arrays from draft JSON config', () => {
    expect(component.resolveInteractiveProcessProcess({ process: [{ step: 1, title: 'A' }] } as any)).toEqual([
      { step: 1, title: 'A' },
    ]);
  });

  it('falls back to the interactive process store when currentStep is not a function', () => {
    expect(component.resolveInteractiveProcessCurrentStep({})).toBe(2);
    expect(component.resolveInteractiveProcessCurrentStep({ currentStep: 4 })).toBe(4);
  });
});
