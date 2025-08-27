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
  readonly accentColor?: 'accentColor' | 'secondaryAccentColor';
  /** Visual presentation: centered dialog (default) or bottom sheet */
  readonly variant?: 'dialog' | 'sheet';
};

export type ModalRef = {
  readonly id: string;
  close: (result?: unknown) => void;
};
