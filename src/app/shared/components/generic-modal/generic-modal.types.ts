import type { TThemeAccentColorToken } from '../../types/theme.types';

export type ModalSize = 'sm' | 'md' | 'lg' | 'full';

export type ModalConfig = {
  readonly id?: string;
  readonly size?: ModalSize;
  readonly closeOnBackdrop?: boolean;
  readonly ariaLabel?: string;
  readonly ariaDescribedBy?: string;
  readonly showCloseButton?: boolean;
  /** Shows a thin accent bar at the top of the modal panel for branding emphasis */
  readonly showAccentBar?: boolean;
  /** Theme accent key to use for the accent bar background */
  readonly accentColor?: TThemeAccentColorToken; // deprecate in future
  /** Visual presentation: centered dialog (default) or bottom sheet */
  readonly variant?: 'dialog' | 'sheet';
  /* Classes */
  readonly containerClasses?: string;
  readonly containerDialogClasses?: string;
  readonly containerSheetClasses?: string;
  readonly panelClasses?: string;
  readonly panelDialogClasses?: string;
  readonly panelSheetClasses?: string;
  readonly panelMotionClasses?: string;
  readonly panelNoMotionClasses?: string;
  readonly panelSMClasses?: string;
  readonly panelMDClasses?: string;
  readonly panelLGClasses?: string;
  readonly accentBarClasses?: string;
  readonly closeButtonClasses?: string;
};

export type ModalRef = {
  readonly id: string;
  close: (result?: unknown) => void;
};
