import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  computed,
  inject,
  input
} from "@angular/core";
import { composeDomId, resolveComponentRootDomId, resolveStyleRecord } from '../../utility/component-orchestrator.utility';
import { GenericIconComponent } from "../generic-icon/generic-icon.component";
import { InteractionScopeService } from "../interaction-scope/interaction-scope.service";
import type { TGenericButtonConfig } from "./generic-button.types";

@Component({
  selector: "generic-button",
  imports: [CommonModule, GenericIconComponent],
  templateUrl: "./generic-button.component.html",
  styles: [`
    button.zlp-cursor-not-allowed {
      cursor: not-allowed;
    }

    button.zlp-cursor-wait {
      cursor: wait;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericButtonComponent {
  readonly config = input.required<TGenericButtonConfig>();
  readonly componentId = input<string | undefined>(undefined);

  private readonly buttonTypes = ['button', 'submit', 'reset'] as const;
  private readonly iconPositions = ['after', 'before'] as const;
  private readonly interactionScope = inject(InteractionScopeService, { optional: true });
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly label = computed<string>(() => {
    const label = this.resolve(this.config().label);
    return typeof label === 'string' ? label : String(label ?? '');
  });
  readonly disabled = computed<boolean>(() => {
    const ownDisabled = Boolean(this.resolve(this.config().disabled) ?? false);
    const usesScopeDisabled = Boolean(this.resolve(this.config().disabledWhenInvalidScope) ?? false);
    const scopeDisabled = usesScopeDisabled
      && this.interactionScope != null
      && !this.isRenderedScopeValid();
    return ownDisabled || scopeDisabled;
  });
  readonly loading = computed<boolean>(() => Boolean(this.resolve(this.config().loading) ?? false));
  readonly icon = computed<string | undefined>(() => {
    return this.optionalString(this.config().icon);
  });
  readonly iconPosition = computed<"after" | "before">(
    () => this.enumValue(this.config().iconPosition, this.iconPositions, 'before')
  );
  readonly type = computed<"button" | "submit" | "reset">(
    () => this.enumValue(this.config().type, this.buttonTypes, 'button')
  );
  readonly id = computed<string | undefined>(() =>
    resolveComponentRootDomId(this.config().id, this.componentId(), 'button')
  );
  readonly contentId = computed<string | undefined>(() => composeDomId(this.id(), 'content'));
  readonly labelId = computed<string | undefined>(() => composeDomId(this.contentId(), 'label'));
  readonly projectedContentId = computed<string | undefined>(() => composeDomId(this.contentId(), 'projected'));
  readonly spinnerId = computed<string | undefined>(() => composeDomId(this.id(), 'spinner'));
  readonly leadingIconId = computed<string | undefined>(() => composeDomId(this.contentId(), 'icon-before'));
  readonly trailingIconId = computed<string | undefined>(() => composeDomId(this.contentId(), 'icon-after'));
  readonly role = computed<string | undefined>(() => this.optionalString(this.config().role));

  readonly tabIndex = computed<number | undefined>(
    () => this.numberValue(this.config().tabIndex)
  );
  readonly ariaLabel = computed<string | undefined>(
    () => this.optionalString(this.config().ariaLabel)
  );
  readonly ariaExpanded = computed<boolean | undefined>(
    () => this.booleanValue(this.config().ariaExpanded)
  );
  readonly ariaHaspopup = computed<boolean | undefined>(
    () => this.booleanValue(this.config().ariaHaspopup)
  );
  readonly ariaSelected = computed<boolean | undefined>(
    () => this.booleanValue(this.config().ariaSelected)
  );
  readonly ariaControls = computed<string | undefined>(
    () => this.optionalString(this.config().ariaControls)
  );
  readonly ariaActiveDescendant = computed<string | undefined>(
    () => this.optionalString(this.config().ariaActiveDescendant)
  );
  readonly classes = computed(() => {
    const baseClasses = this.stateAwareBaseClasses(String(this.resolve(this.config().classes) || "btnBase"));
    const stateClasses = [
      this.loading() ? "zlp-cursor-wait ank-opacity-0_8" : "",
      this.disabled() && !this.loading()
        ? this.optionalString(this.config().disabledClasses) || "zlp-cursor-not-allowed ank-opacity-0_45"
        : "",
    ].filter(Boolean);
    return [baseClasses, ...stateClasses].join(" ");
  });
  readonly styles = computed(() => resolveStyleRecord(this.config().styles));
  readonly iconClass = computed<string>(
    () => String(this.resolve(this.config().iconClasses) || "btnIcon")
  );
  readonly spinnerClass = computed<string>(
    () => String(this.resolve(this.config().spinnerClasses) || "btnSpinner")
  );
  @Output() pressed = new EventEmitter<MouseEvent>();

  private resolve(value: unknown): unknown {
    if (typeof value === 'function' && (value as (...args: unknown[]) => unknown).length === 0) {
      return (value as () => unknown)();
    }

    return value;
  }

  private optionalString(value: unknown): string | undefined {
    const resolved = this.resolve(value);
    return resolved == null || resolved === '' ? undefined : String(resolved);
  }

  private booleanValue(value: unknown): boolean | undefined {
    const resolved = this.resolve(value);
    return typeof resolved === 'boolean' ? resolved : undefined;
  }

  private numberValue(value: unknown): number | undefined {
    const resolved = this.resolve(value);
    return typeof resolved === 'number' ? resolved : undefined;
  }

  private enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    const resolved = this.resolve(value);
    return typeof resolved === 'string' && allowed.includes(resolved as T) ? resolved as T : fallback;
  }

  private stateAwareBaseClasses(classes: string): string {
    if (!this.disabled() && !this.loading()) {
      return classes;
    }

    return classes
      .split(/\s+/)
      .filter((className) => className !== 'ank-cursor-pointer' && className !== 'ank-cur-pointer')
      .join(' ');
  }

  private isRenderedScopeValid(): boolean {
    const snapshot = this.interactionScope?.snapshot();
    if (snapshot?.valid) {
      return true;
    }

    const form = this.host.nativeElement.closest('form');
    if (!form) {
      return false;
    }

    return !form.querySelector('generic-input[data-zlp-field-valid="false"]');
  }

  onClick(event: MouseEvent): void {
    if (this.disabled() || this.loading()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.config().pressed?.(event);
    this.pressed.emit(event);
  }
}
