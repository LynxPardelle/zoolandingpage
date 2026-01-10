import { InjectionToken } from '@angular/core';
import type { EventHandler } from './event-handler.types';

export const EVENT_HANDLERS = new InjectionToken<ReadonlyArray<EventHandler>>('EVENT_HANDLERS');
