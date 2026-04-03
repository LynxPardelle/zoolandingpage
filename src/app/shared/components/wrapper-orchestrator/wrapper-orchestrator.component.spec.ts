import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConditionOrchestrator } from '../../services/condition-orchestrator';
import { ConfigurationsOrchestratorService } from '../../services/configurations-orchestrator';
import { ValueOrchestrator } from '../../services/value-orchestrator';
import { WrapperOrchestrator } from './wrapper-orchestrator.component';
import type { TGenericComponent } from './wrapper-orchestrator.types';

describe('WrapperOrchestrator', () => {
  let component: WrapperOrchestrator;
  let fixture: ComponentFixture<WrapperOrchestrator>;
  let componentsRevision: ReturnType<typeof signal<number>>;
  let componentsById: Record<string, TGenericComponent>;
  let evaluateCondition: jasmine.Spy;

  beforeEach(async () => {
    componentsRevision = signal(0);
    componentsById = {};
    evaluateCondition = jasmine.createSpy('evaluateCondition').and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [WrapperOrchestrator],
      providers: [
        {
          provide: ConfigurationsOrchestratorService,
          useValue: {
            getComponentById: (id: string) => componentsById[id],
            markComponentRendered: () => { },
            handleComponentEvent: () => { },
            componentsRevision,
          } satisfies Partial<ConfigurationsOrchestratorService>,
        },
        {
          provide: ValueOrchestrator,
          useValue: { apply: (c: any) => c } satisfies Partial<ValueOrchestrator>,
        },
        {
          provide: ConditionOrchestrator,
          useValue: { evaluate: evaluateCondition } satisfies Partial<ConditionOrchestrator>,
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

  it('re-resolves component ids when the orchestrator payload revision changes', () => {
    componentsById = {
      pageRoot: {
        id: 'pageRoot',
        type: 'text',
        config: { tag: 'p', text: 'First page' },
      },
    };

    fixture.componentRef.setInput('componentsIds', ['pageRoot']);
    fixture.detectChanges();

    const firstComponent = component.components()[0] as Extract<TGenericComponent, { type: 'text' }> | undefined;
    expect(firstComponent?.config.text).toBe('First page');

    componentsById = {
      pageRoot: {
        id: 'pageRoot',
        type: 'text',
        config: { tag: 'p', text: 'Second page' },
      },
    };
    componentsRevision.update((value: number) => value + 1);
    fixture.detectChanges();

    const secondComponent = component.components()[0] as Extract<TGenericComponent, { type: 'text' }> | undefined;
    expect(secondComponent?.config.text).toBe('Second page');
  });

  it('evaluates string conditions against the provided host context', () => {
    const hostContext = { draftPanelCollapsed: true };
    componentsById = {
      debugDraftPanelToggleButton: {
        id: 'debugDraftPanelToggleButton',
        type: 'button',
        condition: 'all:hostEq,draftPanelCollapsed,true',
        config: { label: 'Show' },
      },
    };
    evaluateCondition.and.callFake((_component: TGenericComponent, ctx: { host: unknown }) => ctx.host === hostContext);

    fixture.componentRef.setInput('hostContext', hostContext);
    fixture.componentRef.setInput('componentsIds', ['debugDraftPanelToggleButton']);
    fixture.detectChanges();

    expect(evaluateCondition).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 'debugDraftPanelToggleButton',
      condition: 'all:hostEq,draftPanelCollapsed,true',
    }), { host: hostContext });
    expect(component.components().map((entry) => entry.id)).toEqual(['debugDraftPanelToggleButton']);
  });

  it('replaces invalid authored ids with generated root ids in the rendered generic component', () => {
    componentsById = {
      debugDraftPanelToggleButton: {
        id: 'debugDraftPanelToggleButton',
        type: 'button',
        config: {
          id: 'undefined',
          label: 'Show',
          icon: 'expand_more',
        },
      },
    };

    fixture.componentRef.setInput('componentsIds', ['debugDraftPanelToggleButton']);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.id).toBe('debugDraftPanelToggleButton-button');
    expect(button.querySelector('#debugDraftPanelToggleButton-button-content')).toBeTruthy();
    expect(button.querySelector('#debugDraftPanelToggleButton-button-content-icon-before')).toBeTruthy();
  });
});
