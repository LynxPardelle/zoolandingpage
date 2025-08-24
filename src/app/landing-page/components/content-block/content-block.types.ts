export type ContentBlockLayout = 'text-only' | 'media-left' | 'media-right' | 'stacked';
export type ContentBlockData = {
  readonly title?: string;
  readonly subtitle?: string;
  readonly body?: string;
  readonly mediaUrl?: string;
  readonly mediaAlt?: string;
  readonly layout?: ContentBlockLayout;
  readonly className?: string;
};
