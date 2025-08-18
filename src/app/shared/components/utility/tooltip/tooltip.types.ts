// Type-only definitions for Tooltip
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
export type TooltipTrigger = 'hover' | 'focus' | 'both';
export type TooltipConfig = {
  readonly position?: TooltipPosition;
  readonly showDelayMs?: number;
  readonly hideDelayMs?: number;
  readonly trigger?: TooltipTrigger;
  readonly id?: string;
  readonly ariaDescription?: string;
};
