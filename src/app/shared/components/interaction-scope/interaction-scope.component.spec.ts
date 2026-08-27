import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  input,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @for (componentId of componentsIds(); track componentId) { @if
    (component(componentId); as child) { @if (child.type === 'input') {
    <generic-input
      [config]="$any(child.config)"
      (valueChanged)="handleValueChanged(componentId, $event)"
    ></generic-input>
    } } }
  `,
})
class WrapperOrchestratorStubComponent {
  readonly componentsIds = input<readonly string[]>([]);
  readonly hostContext = input<unknown>();

  private readonly configurationsOrchestrator = inject(
    ConfigurationsOrchestratorService
  );

  component(id: string): TGenericComponent | undefined {
    return this.configurationsOrchestrator.getComponentById(id);
  }

  handleValueChanged(componentId: string, eventData: unknown): void {
    (
      this.hostContext() as
        | {
            autoSubmitInteractionScope?: (source: {
              componentId: string;
              eventName: string;
              eventData: unknown;
            }) => void;
          }
        | undefined
    )?.autoSubmitInteractionScope?.({
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
          useValue: {
            apply: (component: TGenericComponent) => component,
          } satisfies Partial<ValueOrchestrator>,
        },
        {
          provide: ConditionOrchestrator,
          useValue: {
            evaluate: () => true,
          } satisfies Partial<ConditionOrchestrator>,
        },
      ],
    })
      .overrideComponent(InteractionScopeComponent, {
        set: { imports: [CommonModule, WrapperOrchestratorStubComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(InteractionScopeComponent);
  });

  it('preserves native validation by default and opts into custom validation for exact decimal submissions', () => {
    componentsById = {
      price: {
        id: 'price', type: 'input', config: {
          fieldId: 'propertyValue', controlType: 'number', value: 5555555.55,
          min: 1000000, step: 1,
          validation: [{ type: 'min', value: 1000000, message: 'Enter at least 1M.' }],
        },
      },
    };
    fixture.componentRef.setInput('config', {
      scopeId: 'price-form', tag: 'form', components: ['price'], submitEventInstructions: 'focusElementById:result',
    });
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    const input = form.querySelector('input') as HTMLInputElement;
    const button = document.createElement('button');
    button.type = 'submit';
    form.appendChild(button);
    expect(form.hasAttribute('novalidate')).toBeFalse();
    expect(form.noValidate).toBeFalse();
    expect(input.validity.stepMismatch).toBeTrue();
    expect(form.checkValidity()).toBeFalse();
    button.click();
    expect(handleComponentEvent).not.toHaveBeenCalled();

    input.step = 'any';
    expect(form.checkValidity()).toBeTrue();
    button.click();
    expect(handleComponentEvent.calls.mostRecent().args[0].eventData.values.propertyValue).toBe(5555555.55);

    handleComponentEvent.calls.reset();
    input.value = '500000';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(input.validity.rangeUnderflow).toBeTrue();
    button.click();
    expect(handleComponentEvent).not.toHaveBeenCalled();

    fixture.componentRef.setInput('config', {
      scopeId: 'price-form', tag: 'form', components: ['price'], submitEventInstructions: 'focusElementById:result', noValidate: true,
    });
    fixture.detectChanges();
    expect(form.noValidate).toBeTrue();
    button.click();
    const invalid = handleComponentEvent.calls.mostRecent()?.args[0].eventData;
    expect(invalid?.valid).toBeFalse();
    expect(invalid?.fields.propertyValue.errors).toEqual(['Enter at least 1M.']);

    input.step = '1';
    input.value = '5555555.55';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(input.validity.stepMismatch).toBeTrue();
    button.click();
    const exact = handleComponentEvent.calls.mostRecent()?.args[0].eventData;
    expect(exact?.valid).toBeTrue();
    expect(exact?.values.propertyValue).toBe(5555555.55);
    fixture.componentRef.setInput('config', {
      scopeId: 'price-form', tag: 'form', components: ['price'], submitEventInstructions: 'focusElementById:result', noValidate: () => false,
    });
    fixture.detectChanges();
    expect(form.noValidate).toBeFalse();
    handleComponentEvent.calls.reset();
    button.click();
    expect(handleComponentEvent).not.toHaveBeenCalled();
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
      submitEventInstructions:
        'navigateWithScopeQuery:/,#pokemon-grid,type=values.type',
      components: ['autoSearchSwitch', 'filterTypeInput'],
    });
    fixture.detectChanges();

    const inputComponents = fixture.debugElement
      .queryAll(By.directive(GenericInputComponent))
      .map(
        (debugElement) =>
          debugElement.componentInstance as GenericInputComponent
      );
    const [autoSearchSwitch, filterTypeInput] = inputComponents;
    const submitCallCount = () =>
      handleComponentEvent.calls
        .allArgs()
        .filter(([event]) => event.eventName === 'submitScope').length;

    filterTypeInput.onDropdownSelect({
      id: 'type-1-electric',
      label: 'Electric',
      value: 'electric',
    });
    fixture.detectChanges();

    expect(submitCallCount()).toBe(1);

    autoSearchSwitch.onCheckboxInput({
      target: { checked: false },
    } as unknown as Event);
    fixture.detectChanges();
    filterTypeInput.onDropdownSelect({
      id: 'type-2-fire',
      label: 'Fire',
      value: 'fire',
    });
    fixture.detectChanges();

    expect(submitCallCount()).toBe(1);
  });
});
