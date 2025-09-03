export type ToastLevel = 'success' | 'error' | 'warning' | 'info';

export type ToastAction = {
  readonly label: string;
  readonly action: () => void;
  readonly style?: 'primary' | 'secondary';
};

export type ToastMessage = {
  readonly id: string;
  readonly level: ToastLevel;
  readonly title?: string;
  readonly text: string;
  // Source trigger identifier (e.g., which UI button created the toast) for analytics labeling
  readonly source?: string;
  readonly autoCloseMs?: number;
  readonly persistOnHover?: boolean;
  readonly showProgress?: boolean;
  readonly actions?: ToastAction[];
  readonly dismissible?: boolean;
  // Runtime flags for animations
  leaving?: boolean;
  entering?: boolean;
};

export type ToastPosition = {
  readonly vertical: 'top' | 'bottom';
  readonly horizontal: 'left' | 'right' | 'center';
};

export type ToastConfig = {
  readonly position: ToastPosition;
  readonly maxVisible: number;
  readonly defaultAutoCloseMs: number;
  readonly animationDuration: number;
};
