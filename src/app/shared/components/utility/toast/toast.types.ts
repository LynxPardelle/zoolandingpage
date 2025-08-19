export type ToastLevel = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  readonly label: string;
  readonly action: () => void;
  readonly style?: 'primary' | 'secondary';
}

export interface ToastMessage {
  readonly id: string;
  readonly level: ToastLevel;
  readonly title?: string;
  readonly text: string;
  readonly autoCloseMs?: number;
  readonly persistOnHover?: boolean;
  readonly showProgress?: boolean;
  readonly actions?: ToastAction[];
  readonly dismissible?: boolean;
  // Runtime flags for animations
  leaving?: boolean;
  entering?: boolean;
}

export interface ToastPosition {
  readonly vertical: 'top' | 'bottom';
  readonly horizontal: 'left' | 'right' | 'center';
}

export interface ToastConfig {
  readonly position: ToastPosition;
  readonly maxVisible: number;
  readonly defaultAutoCloseMs: number;
  readonly animationDuration: number;
}
