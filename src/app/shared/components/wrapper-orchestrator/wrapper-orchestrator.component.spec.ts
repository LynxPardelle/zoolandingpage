import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigurationsOrchestratorService } from '../../services/configurations-orchestrator';
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
});
