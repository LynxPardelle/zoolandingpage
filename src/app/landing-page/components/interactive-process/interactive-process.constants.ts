import { ProcessStep } from './interactive-process.types';

export const INTERACTIVE_PROCESS_ID = 'process';
export const INTERACTIVE_PROCESS_TITLE = 'El Proceso de tu nueva landing page';

export function markActive(steps: readonly ProcessStep[], activeIndex: number): readonly ProcessStep[] {
  return steps.map((s, i) => ({ ...s, isActive: i === activeIndex }));
}
