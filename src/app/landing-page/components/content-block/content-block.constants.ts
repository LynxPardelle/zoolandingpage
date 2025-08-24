import { ContentBlockData } from './content-block.types';

export const CONTENT_BLOCK_DEFAULT: ContentBlockData = {
  title: '',
  subtitle: '',
  body: '',
  mediaUrl: undefined,
  mediaAlt: '',
  layout: 'text-only',
  className: '',
} as const;

export const CONTENT_BLOCK_BASE_CLASSES: string[] = ['ank-display-flex', 'ank-flexDirection-column', 'ank-gap-1_5rem'];
