import { AnalyticsCategories, AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { TestBed } from '@angular/core/testing';
import type { EventExecutionContext } from '../event-handler.types';
import { trackProcessStepChangeHandler } from './analytics.handlers';

describe('trackProcessStepChangeHandler', () => {
    let analytics: jasmine.SpyObj<AnalyticsService>;
    let context: EventExecutionContext;

    beforeEach(() => {
        analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['track']);
        analytics.track.and.returnValue(Promise.resolve());

        TestBed.configureTestingModule({
            providers: [
                { provide: AnalyticsService, useValue: analytics },
            ],
        });

        context = {
            event: {
                componentId: 'interactiveProcessDesktopTabs',
                eventName: 'selected',
            },
            host: null,
        };
    });

    it('tracks the numeric suffix from a shared item id', () => {
        const handler = TestBed.runInInjectionContext(() => trackProcessStepChangeHandler());

        handler.handle(context, ['item-4']);

        expect(analytics.track).toHaveBeenCalledOnceWith(
            AnalyticsEvents.ProcessStepChange,
            jasmine.objectContaining({
                category: AnalyticsCategories.Process,
                label: '4',
            }),
        );
    });

    it('ignores empty values', () => {
        const handler = TestBed.runInInjectionContext(() => trackProcessStepChangeHandler());

        handler.handle(context, [null]);

        expect(analytics.track).not.toHaveBeenCalled();
    });
});