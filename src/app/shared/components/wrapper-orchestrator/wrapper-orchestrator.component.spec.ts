import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigurationsOrchestratorService } from '../../services/configurations-orchestrator';
import { ValueOrchestrator } from '../../services/value-orchestrator';
import { WrapperOrchestrator } from './wrapper-orchestrator.component';
import type { TGenericComponent } from './wrapper-orchestrator.types';

describe('WrapperOrchestrator', () => {
  let component: WrapperOrchestrator;
  let fixture: ComponentFixture<WrapperOrchestrator>;
  let componentsRevision: ReturnType<typeof signal<number>>;
  let componentsById: Record<string, TGenericComponent>;

  beforeEach(async () => {
    componentsRevision = signal(0);
    componentsById = {};

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
});
