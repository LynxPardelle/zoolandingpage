import { CommonModule } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ConditionOrchestrator } from '../../services/condition-orchestrator';
import { ConfigurationsOrchestratorService } from '../../services/configurations-orchestrator';
import { ValueOrchestrator } from '../../services/value-orchestrator';
import { GenericInputComponent } from '../generic-input/generic-input.component';
import type { TGenericComponent } from '../wrapper-orchestrator/wrapper-orchestrator.types';
import { InteractionScopeComponent } from './interaction-scope.component';

@Component({
    selector: 'wrapper-orchestrator',
    standalone: true,
    imports: [GenericInputComponent],
    template: `
        @for (componentId of componentsIds(); track componentId) {
            @if (component(componentId); as child) {
                @if (child.type === 'input') {
                    <generic-input
                        [config]="$any(child.config)"
                        (valueChanged)="handleValueChanged(componentId, $event)"
                    ></generic-input>
                }
            }
        }
    `,
})
class WrapperOrchestratorStubComponent {
    readonly componentsIds = input<readonly string[]>([]);
    readonly hostContext = input<unknown>();

    private readonly configurationsOrchestrator = inject(ConfigurationsOrchestratorService);

    component(id: string): TGenericComponent | undefined {
        return this.configurationsOrchestrator.getComponentById(id);
    }

    handleValueChanged(componentId: string, eventData: unknown): void {
        (this.hostContext() as { autoSubmitInteractionScope?: (source: { componentId: string; eventName: string; eventData: unknown }) => void } | undefined)
            ?.autoSubmitInteractionScope?.({
                componentId,
                eventName: 'valueChanged',
                eventData,
            });
    }
}

describe('InteractionScopeComponent', () => {
    let fixture: ComponentFixture<InteractionScopeComponent>;
    let componentsById: Record<string, TGenericComponent>;
    let handleComponentEvent: jasmine.Spy;
    let componentsRevision: ReturnType<typeof signal<number>>;

    beforeEach(async () => {
        componentsById = {};
        handleComponentEvent = jasmine.createSpy('handleComponentEvent');
        componentsRevision = signal(0);

        await TestBed.configureTestingModule({
            providers: [
                {
                    provide: ConfigurationsOrchestratorService,
                    useValue: {
                        getComponentById: (id: string) => componentsById[id],
                        handleComponentEvent,
                        componentsRevision,
                    } satisfies Partial<ConfigurationsOrchestratorService>,
                },
                {
                    provide: ValueOrchestrator,
                    useValue: { apply: (component: TGenericComponent) => component } satisfies Partial<ValueOrchestrator>,
                },
                {
                    provide: ConditionOrchestrator,
                    useValue: { evaluate: () => true } satisfies Partial<ConditionOrchestrator>,
                },
            ],
        })
            .overrideComponent(InteractionScopeComponent, {
                set: { imports: [CommonModule, WrapperOrchestratorStubComponent] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(InteractionScopeComponent);
    });

    it('can gate field auto-submit from a switch field inside the same scope', () => {
        componentsById = {
            autoSearchSwitch: {
                id: 'autoSearchSwitch',
                type: 'input',
                config: {
                    fieldId: 'autoSearch',
                    controlType: 'switch',
                    value: true,
                    label: 'Auto search',
                },
            },
            filterTypeInput: {
                id: 'filterTypeInput',
                type: 'input',
                config: {
                    fieldId: 'type',
                    controlType: 'select',
                    value: 'all',
                    options: [
                        { value: 'all', label: 'All' },
                        { value: 'electric', label: 'Electric' },
                        { value: 'fire', label: 'Fire' },
                    ],
                },
            },
        };

        fixture.componentRef.setInput('config', {
            scopeId: 'pokemonCatalogView',
            tag: 'form',
            initialValues: {
                autoSearch: true,
                type: 'all',
            },
            autoSubmit: {
                enabled: true,
                enabledFieldId: 'autoSearch',
                eventNames: ['valueChanged'],
                fieldIds: ['type'],
            },
            submitEventInstructions: 'navigateWithScopeQuery:/,#pokemon-grid,type=values.type',
            components: ['autoSearchSwitch', 'filterTypeInput'],
        });
        fixture.detectChanges();

        const inputComponents = fixture.debugElement
            .queryAll(By.directive(GenericInputComponent))
            .map((debugElement) => debugElement.componentInstance as GenericInputComponent);
        const [autoSearchSwitch, filterTypeInput] = inputComponents;
        const submitCallCount = () => handleComponentEvent.calls.allArgs()
            .filter(([event]) => event.eventName === 'submitScope')
            .length;

        filterTypeInput.onDropdownSelect({ id: 'type-1-electric', label: 'Electric', value: 'electric' });
        fixture.detectChanges();

        expect(submitCallCount()).toBe(1);

        autoSearchSwitch.onCheckboxInput({ target: { checked: false } } as unknown as Event);
        fixture.detectChanges();
        filterTypeInput.onDropdownSelect({ id: 'type-2-fire', label: 'Fire', value: 'fire' });
        fixture.detectChanges();

        expect(submitCallCount()).toBe(1);
    });
});
