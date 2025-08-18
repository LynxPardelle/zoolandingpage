/**
 * WhatsAppButton Types
 * Lightweight type-only definitions (no interfaces/enums) per atomic guidelines.
 */

export type WhatsAppButtonConfig = {
  readonly phone: string; // Raw phone (may include symbols/spaces, will be cleaned)
  readonly message?: string; // Optional pre-filled message
  readonly label?: string; // Visual label (defaults to 'WhatsApp')
  readonly variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  readonly colorKey?: string; // Theme token forwarded to generic-button
  readonly size?: 'sm' | 'md' | 'lg';
  readonly target?: '_blank' | '_self';
};
