/**
 * WhatsAppButton Types
 * Lightweight type-only definitions (no interfaces/enums) per atomic guidelines.
 */

import { ButtonSize, ButtonVariant } from "../generic-button";

export type WhatsAppButtonConfig = {
  readonly phone: string; // Raw phone (may include symbols/spaces, will be cleaned)
  readonly message?: string; // Optional pre-filled message
  readonly label?: string; // Visual label (defaults to 'WhatsApp')
  readonly variant?: ButtonVariant;
  readonly colorKey?: string; // Theme token forwarded to generic-button
  readonly size?: ButtonSize;
  readonly target?: '_blank' | '_self';
};
