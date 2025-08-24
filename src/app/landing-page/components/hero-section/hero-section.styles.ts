import { animate, style, transition, trigger } from '@angular/animations';

// Animations specific to Hero Section (kept separate per docs)
export const HERO_ANIMATIONS = [
  trigger('fadeIn', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(16px)' }),
      animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
    ]),
  ]),
  trigger('fadeInDelay', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(12px)' }),
      animate('500ms 120ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
    ]),
  ]),
];
