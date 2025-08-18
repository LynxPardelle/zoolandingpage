/**
 * WhatsAppButton Constants (keep file under ~80 lines)
 */

import { WhatsAppButtonConfig } from './whatsapp-button.types';

export const WHATSAPP_BUTTON_DEFAULT: WhatsAppButtonConfig = {
  phone: '',
  message: undefined,
  label: 'WhatsApp',
  variant: 'outline',
  colorKey: 'successColor',
  size: 'md',
  target: '_blank',
} as const;

export function buildWhatsAppUrl(phone: string, message?: string): string {
  const digits = (phone || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  const base = `https://wa.me/${digits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}
