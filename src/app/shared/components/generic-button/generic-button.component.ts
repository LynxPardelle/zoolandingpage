import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  input
} from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { GenericMultiComponents } from "../generic-multi-components/generic-multi-components";
import type { TGenericButtonConfig } from "./generic-button.types";

@Component({
  selector: "generic-button",
  imports: [CommonModule, MatIconModule, GenericMultiComponents],
  templateUrl: "./generic-button.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericButtonComponent {
  readonly config = input.required<TGenericButtonConfig>();

  readonly label = computed<string>(() => this.config().label ?? "");
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
    () => this.config().ariaLabel
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
    this.pressed.emit(event);
  }
}
