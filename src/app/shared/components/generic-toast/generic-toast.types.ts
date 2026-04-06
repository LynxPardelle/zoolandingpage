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

export type ToastUiConfig = {
  readonly hostClasses?: string;
  readonly hostTopClasses?: string;
  readonly hostBottomClasses?: string;
  readonly hostLeftClasses?: string;
  readonly hostRightClasses?: string;
  readonly hostCenterClasses?: string;
  readonly itemClasses?: string;
  readonly hoveredItemClasses?: string;
  readonly levelSuccessClasses?: string;
  readonly levelErrorClasses?: string;
  readonly levelWarningClasses?: string;
  readonly levelInfoClasses?: string;
  readonly progressClasses?: string;
  readonly progressBarClasses?: string;
  readonly progressBarSurfaceClasses?: string;
  readonly iconSurfaceClasses?: string;
  readonly iconContainerClasses?: string;
  readonly iconSuccessClasses?: string;
  readonly iconErrorClasses?: string;
  readonly iconWarningClasses?: string;
  readonly iconInfoClasses?: string;
  readonly contentClasses?: string;
  readonly titleClasses?: string;
  readonly textClasses?: string;
  readonly actionsClasses?: string;
  readonly actionButtonClasses?: string;
  readonly actionPrimaryClasses?: string;
  readonly actionSecondaryClasses?: string;
  readonly dismissButtonClasses?: string;
};
