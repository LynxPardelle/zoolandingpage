export type ModalSize = 'sm' | 'md' | 'lg' | 'full';

export type ModalConfig = {
  readonly id?: string;
  readonly size?: ModalSize;
  readonly closeOnBackdrop?: boolean;
  readonly ariaLabel?: string;
  readonly ariaDescribedBy?: string;
};

export type ModalRef = {
  readonly id: string;
  close: (result?: unknown) => void;
};
