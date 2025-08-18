export type ToastLevel = 'success' | 'error' | 'warning' | 'info';
export type ToastMessage = {
  readonly id: string;
  readonly level: ToastLevel;
  readonly text: string;
  readonly autoCloseMs?: number;
  leaving?: boolean; // runtime flag (not readonly) for exit animation
};
