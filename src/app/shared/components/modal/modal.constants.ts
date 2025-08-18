import { ModalConfig } from './modal.types';

export const DEFAULT_MODAL_CONFIG: Required<Pick<ModalConfig, 'size' | 'closeOnBackdrop'>> = {
  size: 'md',
  closeOnBackdrop: true,
};
