import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  input
} from "@angular/core";
import { GenericIconComponent } from "../generic-icon/generic-icon.component";
import type { TGenericButtonConfig } from "./generic-button.types";

@Component({
  selector: "generic-button",
  imports: [CommonModule, GenericIconComponent],
  templateUrl: "./generic-button.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericButtonComponent {
  readonly config = input.required<TGenericButtonConfig>();

  readonly label = computed<string>(() => {
    const label = this.resolveMaybeThunk(this.config().label);
    return typeof label === 'string' ? label : String(label ?? '');
  });
  readonly disabled = computed<boolean>(() => Boolean(this.resolveMaybeThunk(this.config().disabled) ?? false));
  readonly loading = computed<boolean>(() => Boolean(this.resolveMaybeThunk(this.config().loading) ?? false));
  readonly icon = computed<string | undefined>(() => {
    const raw = this.resolveMaybeThunk(this.config().icon);
    return raw ? String(raw) : undefined;
  });
  readonly iconPosition = computed<"after" | "before">(
    () => (this.resolveMaybeThunk(this.config().iconPosition) as "after" | "before" | undefined) || "before"
  );
  readonly type = computed<"button" | "submit" | "reset">(
    () => (this.resolveMaybeThunk(this.config().type) as "button" | "submit" | "reset" | undefined) ?? "button"
  );
  readonly id = computed<string | undefined>(() => {
    const raw = this.resolveMaybeThunk(this.config().id);
    return raw ? String(raw) : undefined;
  });
  readonly spinnerClasses = computed<string>(
    () => String(this.resolveMaybeThunk(this.config().spinnerClasses) || "")
  );
  readonly iconClasses = computed<string>(
    () => String(this.resolveMaybeThunk(this.config().iconClasses) || "")
  );
  readonly role = computed<string | undefined>(() => {
    const raw = this.resolveMaybeThunk(this.config().role);
    return raw ? String(raw) : undefined;
  });

  readonly tabIndex = computed<number | undefined>(
    () => {
      const raw = this.resolveMaybeThunk(this.config().tabIndex);
      return typeof raw === 'number' ? raw : undefined;
    }
  );
  readonly ariaLabel = computed<string | undefined>(
    () => {
      const raw = this.resolveMaybeThunk(this.config().ariaLabel);
      return raw ? String(raw) : undefined;
    }
  );
  readonly ariaExpanded = computed<boolean | undefined>(
    () => {
      const raw = this.resolveMaybeThunk(this.config().ariaExpanded);
      return typeof raw === 'boolean' ? raw : undefined;
    }
  );
  readonly ariaHaspopup = computed<boolean | undefined>(
    () => {
      const raw = this.resolveMaybeThunk(this.config().ariaHaspopup);
      return typeof raw === 'boolean' ? raw : undefined;
    }
  );
  readonly ariaSelected = computed<boolean | undefined>(
    () => {
      const raw = this.resolveMaybeThunk(this.config().ariaSelected);
      return typeof raw === 'boolean' ? raw : undefined;
    }
  );
  readonly ariaControls = computed<string | undefined>(
    () => {
      const raw = this.resolveMaybeThunk(this.config().ariaControls);
      return raw ? String(raw) : undefined;
    }
  );
  readonly ariaActiveDescendant = computed<string | undefined>(
    () => {
      const raw = this.resolveMaybeThunk(this.config().ariaActiveDescendant);
      return raw ? String(raw) : undefined;
    }
  );
  readonly classes = computed(
    () =>
    (String(this.resolveMaybeThunk(this.config().classes) ||
      "btnBase") + (this.loading() ? " ank-cursor-wait ank-opacity-80" : ""))
  );
  readonly iconClass = computed<string>(
    () => String(this.resolveMaybeThunk(this.config().iconClasses) || "btnIcon")
  );
  readonly spinnerClass = computed<string>(
    () => String(this.resolveMaybeThunk(this.config().spinnerClasses) || "btnSpinner")
  );
  readonly components = computed<readonly string[]>(() =>
    (this.config().components ?? [])
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean)
  );
  @Output() pressed = new EventEmitter<MouseEvent>();

  private resolveMaybeThunk(value: unknown): unknown {
    if (typeof value === 'function' && (value as (...args: unknown[]) => unknown).length === 0) {
      return (value as () => unknown)();
    }

    return value;
  }

  onClick(event: MouseEvent): void {
    if (this.disabled() || this.loading()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.config().pressed?.(event);
    this.config().onPressed?.(event);
    this.pressed.emit(event);
  }
}
