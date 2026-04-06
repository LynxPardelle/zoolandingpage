import { InjectionToken } from '@angular/core';
import type { ConditionHandler } from './condition-handler.types';

export const CONDITION_HANDLERS = new InjectionToken<ReadonlyArray<ConditionHandler>>('CONDITION_HANDLERS');
