import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { siFacebook, siInstagram } from 'simple-icons';
import { resolveComponentRootDomId, resolveDynamicValue } from '../../utility/component-orchestrator.utility';
import { TGenericIconConfig } from './generic-icon.types';

@Component({
  selector: 'generic-icon',
  imports: [
    MatIconModule,],
  templateUrl: './generic-icon.component.html',
})
export class GenericIconComponent {
  readonly config = input.required<TGenericIconConfig>();
  readonly componentId = input<string | undefined>(undefined);
  private readonly brandIcons = new Map<string, string>([
    ['simple:instagram', siInstagram.path],
    ['simple:facebook', siFacebook.path],
  ]);

  readonly id = computed(() => resolveComponentRootDomId(this.config().id, this.componentId(), 'icon') ?? null);
  readonly title = computed(() => this.optionalString(this.config().title));
  readonly classes = computed(() => this.stringValue(this.config().classes));
  readonly ariaLabel = computed(() => this.optionalString(this.config().ariaLabel) ?? this.title() ?? null);
  readonly ariaHidden = computed(() => this.booleanValue(this.config().ariaHidden) ? 'true' : null);
  readonly iconName = computed(() => this.stringValue(this.config().iconName));
  readonly brandPath = computed(() => this.brandIcons.get(this.iconName()) ?? null);
  readonly isBrandIcon = computed(() => this.brandPath() !== null);

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
