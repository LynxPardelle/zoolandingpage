import { InjectionToken } from '@angular/core';
import type { ValueHandler } from './value-handler.types';

export const VALUE_HANDLERS = new InjectionToken<ReadonlyArray<ValueHandler>>('VALUE_HANDLERS');
