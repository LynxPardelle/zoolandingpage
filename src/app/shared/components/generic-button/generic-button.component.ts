import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  signal,
} from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import type { GenericButtonConfig } from "./generic-button.types";

@Component({
  selector: "generic-button",
  imports: [CommonModule, MatIconModule],
  templateUrl: "./generic-button.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericButtonComponent {
  private readonly _config = signal<GenericButtonConfig>({});

  @Input()
  get config(): GenericButtonConfig {
    return this._config();
  }
  set config(value: GenericButtonConfig) {
    this._config.set(value ?? {});
  }

  readonly label = computed<string>(() => this._config().label ?? "");
  readonly disabled = computed<boolean>(() => this._config().disabled ?? false);
  readonly loading = computed<boolean>(() => this._config().loading ?? false);
  readonly icon = computed<string | undefined>(() => this._config().icon);
  readonly iconPosition = computed<"after" | "before">(
    () => this._config().iconPosition || "before"
  );
  readonly type = computed<"button" | "submit" | "reset">(
    () => this._config().type ?? "button"
  );
  readonly id = computed<string | undefined>(() => this._config().id);
  readonly spinnerClasses = computed<string>(
    () => this._config().spinnerClasses || ""
  );
  readonly iconClasses = computed<string>(
    () => this._config().iconClasses || ""
  );
  readonly role = computed<string | undefined>(() => this._config().role);

  readonly tabIndex = computed<number | undefined>(
    () => this._config().tabIndex
  );
  readonly ariaLabel = computed<string | undefined>(
    () => this._config().ariaLabel
  );
  readonly ariaExpanded = computed<boolean | undefined>(
    () => this._config().ariaExpanded
  );
  readonly ariaHaspopup = computed<boolean | undefined>(
    () => this._config().ariaHaspopup
  );
  readonly ariaSelected = computed<boolean | undefined>(
    () => this._config().ariaSelected
  );
  readonly ariaControls = computed<string | undefined>(
    () => this._config().ariaControls
  );
  readonly ariaActiveDescendant = computed<string | undefined>(
    () => this._config().ariaActiveDescendant
  );
  readonly classes = computed(
    () =>
      (this._config().classes ||
        "btnBase") + (this.loading() ? " ank-cursor-wait ank-opacity-80" : "")
  );
  readonly iconClass = computed<string>(
    () => this._config().iconClasses || "btnIcon"
  );
  readonly spinnerClass = computed<string>(
    () => this._config().spinnerClasses || "btnSpinner"
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
