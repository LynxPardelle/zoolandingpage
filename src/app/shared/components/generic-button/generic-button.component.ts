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
    const label = this.config().label;
    if (typeof label === 'function') {
      return label() ?? '';
    }
    return label ?? '';
  });
  readonly disabled = computed<boolean>(() => this.config().disabled ?? false);
  readonly loading = computed<boolean>(() => this.config().loading ?? false);
  readonly icon = computed<string | undefined>(() => this.config().icon);
  readonly iconPosition = computed<"after" | "before">(
    () => this.config().iconPosition || "before"
  );
  readonly type = computed<"button" | "submit" | "reset">(
    () => this.config().type ?? "button"
  );
  readonly id = computed<string | undefined>(() => this.config().id);
  readonly spinnerClasses = computed<string>(
    () => this.config().spinnerClasses || ""
  );
  readonly iconClasses = computed<string>(
    () => this.config().iconClasses || ""
  );
  readonly role = computed<string | undefined>(() => this.config().role);

  readonly tabIndex = computed<number | undefined>(
    () => this.config().tabIndex
  );
  readonly ariaLabel = computed<string | undefined>(
    () => {
      const raw = this.config().ariaLabel;
      if (typeof raw === 'function') return raw();
      return raw;
    }
  );
  readonly ariaExpanded = computed<boolean | undefined>(
    () => this.config().ariaExpanded
  );
  readonly ariaHaspopup = computed<boolean | undefined>(
    () => this.config().ariaHaspopup
  );
  readonly ariaSelected = computed<boolean | undefined>(
    () => this.config().ariaSelected
  );
  readonly ariaControls = computed<string | undefined>(
    () => this.config().ariaControls
  );
  readonly ariaActiveDescendant = computed<string | undefined>(
    () => this.config().ariaActiveDescendant
  );
  readonly classes = computed(
    () =>
      (this.config().classes ||
        "btnBase") + (this.loading() ? " ank-cursor-wait ank-opacity-80" : "")
  );
  readonly iconClass = computed<string>(
    () => this.config().iconClasses || "btnIcon"
  );
  readonly spinnerClass = computed<string>(
    () => this.config().spinnerClasses || "btnSpinner"
  );
  readonly components = computed<readonly string[]>(() =>
    this.config().components || []
  );
  @Output() pressed = new EventEmitter<MouseEvent>();

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
