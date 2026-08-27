import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ConfigurationsOrchestratorService } from '../../services/configurations-orchestrator';
import { EVENT_HANDLERS } from '../../utility/event-handler/event-handlers.token';
import { setScopeValueHandler } from '../../utility/event-handler/handlers/interaction-scope.handlers';
import { InteractionScopeComponent } from '../interaction-scope/interaction-scope.component';
import { InteractionScopeService } from '../interaction-scope/interaction-scope.service';
import { WrapperOrchestrator } from '../wrapper-orchestrator/wrapper-orchestrator.component';
import type { TGenericComponent } from '../wrapper-orchestrator/wrapper-orchestrator.types';

describe('Range through nested wrapper and interaction scope', () => {
  it('retains successive synthetic input values through the real event dispatcher', async () => {
    await TestBed.configureTestingModule({
      imports: [WrapperOrchestrator],
      providers: [{ provide: EVENT_HANDLERS, multi: true, useFactory: setScopeValueHandler }],
    }).compileComponents();
    const components: Record<string, TGenericComponent> = {
      form: { id: 'form', type: 'interaction-scope', config: {
        scopeId: 'price-form', tag: 'form', noValidate: true,
        initialValues: { propertyValue: null, propertyValueSlider: null, hasCalculated: false }, components: ['number', 'range'],
      } },
      number: { id: 'number', type: 'input', config: {
        fieldId: 'propertyValue', controlType: 'number', value: null, min: 1000000, step: 1,
      }, eventInstructions: 'setScopeValue:propertyValueSlider,event.eventData.value,event.eventName,valueChanged;setScopeValue:hasCalculated,false,event.eventName,valueChanged' },
      range: { id: 'range', type: 'input', config: {
        fieldId: 'propertyValueSlider', controlType: 'range', value: null, min: 1000000, max: 20000000, step: 100000,
      }, eventInstructions: 'setScopeValue:propertyValue,event.eventData.value,event.eventName,valueChanged;setScopeValue:hasCalculated,false,event.eventName,valueChanged' },
    };
    spyOn(TestBed.inject(ConfigurationsOrchestratorService), 'getComponentById').and.callFake(id => components[id]);
    const fixture = TestBed.createComponent(WrapperOrchestrator);
    fixture.componentRef.setInput('componentsIds', ['form']);
    fixture.detectChanges();
    await fixture.whenStable();
    const scope = fixture.debugElement.query(By.directive(InteractionScopeComponent)).injector.get(InteractionScopeService);
    const range = fixture.nativeElement.querySelector('input[type=range]') as HTMLInputElement;
    const number = fixture.nativeElement.querySelector('input[type=number]') as HTMLInputElement;
    range.click();
    fixture.detectChanges();
    expect(number.valueAsNumber).toBe(1000000);
    // Synthetic input verifies dispatch/state feedback, not native pointer or keyboard behavior.
    for (const value of [1100000, 10500000, 15000000, 20000000]) {
      scope.setFieldValue('hasCalculated', true);
      range.value = String(value);
      range.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(scope.snapshot().values['propertyValue']).toBe(value);
      expect(scope.snapshot().values['hasCalculated']).toBeFalse();
      expect(range.valueAsNumber).toBe(value);
      expect(number.valueAsNumber).toBe(value);
      expect(fixture.nativeElement.querySelector('input[type=range]')).toBe(range);
    }
    scope.setFieldValue('hasCalculated', true);
    range.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(scope.snapshot().values['propertyValue']).toBe(20000000);
    expect(scope.snapshot().values['hasCalculated']).toBeTrue();
  });
});
