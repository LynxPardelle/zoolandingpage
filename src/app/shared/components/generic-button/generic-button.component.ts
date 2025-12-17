import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  signal
} from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import {
  GENERIC_BUTTON_ICON_CLASS,
  GENERIC_BUTTON_SPINNER_CLASS,
} from "./generic-button.constants";
import type {
  GenericButtonConfig
} from "./generic-button.types";

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
  readonly type = computed<"button" | "submit" | "reset">(
    () => this._config().type ?? "button"
  );
  @Output() pressed = new EventEmitter<MouseEvent>();

  readonly classes = computed(() =>
    this._config().classes || "btnBase" + " " + (this.loading()
      ? "ank-cursor-wait ank-opacity-80"
      : "")
  );

  readonly iconClass = GENERIC_BUTTON_ICON_CLASS;
  readonly spinnerClass = GENERIC_BUTTON_SPINNER_CLASS;

  onClick(event: MouseEvent): void {
    if (this.disabled() || this.loading()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.pressed.emit(event);
  }
}
