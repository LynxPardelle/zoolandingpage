import type { TGenericComponentType } from '../wrapper-orchestrator/wrapper-orchestrator.types';

export type TGenericComponentPreviewSource =
  | {
      readonly type: 'scope';
      readonly path: string;
      readonly fallback?: unknown;
    }
  | {
      readonly type: 'var';
      readonly path: string;
      readonly fallback?: unknown;
    }
  | {
      readonly type: 'literal';
      readonly value?: unknown;
      readonly fallback?: unknown;
    };

export type TGenericComponentPreviewConfig = {
  readonly id?: string;
  readonly label?: string;
  readonly description?: string;
  readonly source?: TGenericComponentPreviewSource;
  readonly value?: unknown;
  readonly allowedTypes?: readonly TGenericComponentType[];
  readonly maxComponents?: number;
  readonly emptyText?: string;
  readonly invalidText?: string;
  readonly classes?: string;
  readonly labelClasses?: string;
  readonly descriptionClasses?: string;
  readonly stateClasses?: string;
  readonly previewClasses?: string;
};
