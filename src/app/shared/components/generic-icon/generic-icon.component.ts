import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { resolveDynamicValue } from '../../utility/component-orchestrator.utility';
import { TGenericIconConfig } from './generic-icon.types';

@Component({
  selector: 'generic-icon',
  imports: [
    MatIconModule,],
  templateUrl: './generic-icon.component.html',
})
export class GenericIconComponent {
  readonly config = input.required<TGenericIconConfig>();

  readonly title = computed(() => this.optionalString(this.config().title));
  readonly classes = computed(() => this.stringValue(this.config().classes));
  readonly ariaLabel = computed(() => this.optionalString(this.config().ariaLabel) ?? this.title() ?? null);
  readonly ariaHidden = computed(() => this.booleanValue(this.config().ariaHidden) ? 'true' : null);
  readonly iconName = computed(() => this.stringValue(this.config().iconName));

  private stringValue(value: unknown): string {
    return String(resolveDynamicValue(value) ?? '');
  }

  private optionalString(value: unknown): string | undefined {
    const resolved = resolveDynamicValue(value);
    if (resolved == null) {
      return undefined;
    }

    const normalized = String(resolved);
    return normalized.length > 0 ? normalized : undefined;
  }

  private booleanValue(value: unknown): boolean {
    return resolveDynamicValue(value) === true;
  }
}
