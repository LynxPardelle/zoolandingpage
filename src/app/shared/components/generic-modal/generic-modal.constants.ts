import { ModalConfig, ModalSize } from './generic-modal.types';

export const DEFAULT_MODAL_CONFIG: Readonly<Required<Pick<ModalConfig,
  'size'
  | 'closeOnBackdrop'
  | 'showCloseButton'
  | 'showAccentBar'
  | 'accentColor'
  | 'variant'>>> = {
  size: 'sm',
  closeOnBackdrop: true,
  showCloseButton: true,
  showAccentBar: true,
  accentColor: 'secondaryAccentColor',
  variant: 'dialog',
};

export const DEFAULT_MODAL_CONTAINER_CLASSES =
  'ank-position-fixed ank-inset-0 ank-display-flex ank-pointerEvents-none ank-zIndex-1000';

export const DEFAULT_MODAL_CONTAINER_DIALOG_CLASSES = 'ank-alignItems-center ank-justifyContent-center';

export const DEFAULT_MODAL_CONTAINER_SHEET_CLASSES = 'ank-alignItems-flexEnd ank-justifyContent-center';

export const DEFAULT_MODAL_PANEL_CLASSES =
  'modal-panel ank-pointerEvents-auto ank-display-flex ank-flexDirection-column ank-minWidth-280px ank-maxHeight-80vh ank-overflow-auto ank-p-1_25rem ank-bg-secondaryBgColor ank-color-textColor ank-border-1px ank-borderColor-border ank-boxShadow-0__0_5rem__2rem__MIN0_25rem__bgColor__OPA__0_35';

export const DEFAULT_MODAL_PANEL_DIALOG_CLASSES =
  'ank-position-absolute ank-top-50per ank-left-50per ank-transform-translateSDMIN50perCOM__MIN50perED ank-borderRadius-0_75rem';

export const DEFAULT_MODAL_PANEL_SHEET_CLASSES =
  'ank-position-relative ank-width-100per ank-borderRadius-1rem__1rem__0__0 ank-pb-1_5rem';

export const DEFAULT_MODAL_PANEL_MOTION_CLASSES = 'modal-anim-scaleIn';

export const DEFAULT_MODAL_PANEL_SIZE_CLASSES: Readonly<Record<ModalSize, string>> = {
  sm: 'ank-width-clampSD300px__COM__25vw__COM__320pxED',
  md: 'ank-width-clampSD300px__COM__50vw__COM__480pxED',
  lg: 'ank-width-clampSD300px__COM__75vw__COM__720pxED',
  full: 'ank-width-100per ank-height-100per ank-borderRadius-0',
};

export const DEFAULT_MODAL_ACCENT_BAR_CLASSES =
  'ank-position-absolute ank-top-0 ank-left-0 ank-right-0 ank-height-4px ank-borderRadius-0_75rem__0_75rem__0__0';

export const DEFAULT_MODAL_CLOSE_BUTTON_CLASSES =
  'modal-close ank-bg-transparent ank-border-0 ank-color-inherit ank-fontSize-1_25rem ank-cursor-pointer ank-position-absolute ank-top-0_5rem ank-right-0_5rem';
