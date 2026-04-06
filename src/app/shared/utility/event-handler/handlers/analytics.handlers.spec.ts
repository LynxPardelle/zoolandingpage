import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { TestBed } from '@angular/core/testing';
import type { EventExecutionContext } from '../event-handler.types';
import { trackEventHandler, trackEventWhenHandler } from './analytics.handlers';

describe('trackEventHandler', () => {
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

    it('tracks a payload-authored event with category, label, and metadata', () => {
        const handler = TestBed.runInInjectionContext(() => trackEventHandler());

        handler.handle(context, ['cta_click', 'cta', 'hero:secondary', 'location', 'hero', 'variant', 'secondary']);

        expect(analytics.track).toHaveBeenCalledOnceWith(
            'cta_click',
            jasmine.objectContaining({
                category: 'cta',
                label: 'hero:secondary',
                meta: jasmine.objectContaining({
                    location: 'hero',
                    variant: 'secondary',
                }),
            }),
        );
    });

    it('ignores empty values', () => {
        const handler = TestBed.runInInjectionContext(() => trackEventHandler());

        handler.handle(context, [null]);

        expect(analytics.track).not.toHaveBeenCalled();
    });
});

describe('trackEventWhenHandler', () => {
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
                componentId: 'faqAccordion',
                eventName: 'toggle',
            },
            host: null,
        };
    });

    it('tracks only when the predicate matches', () => {
        const handler = TestBed.runInInjectionContext(() => trackEventWhenHandler());

        handler.handle(context, [true, true, 'faq_open', 'faq', 'faq-1']);

        expect(analytics.track).toHaveBeenCalledOnceWith(
            'faq_open',
            jasmine.objectContaining({
                category: 'faq',
                label: 'faq-1',
            }),
        );
    });

    it('does not track when the predicate does not match', () => {
        const handler = TestBed.runInInjectionContext(() => trackEventWhenHandler());

        handler.handle(context, [false, true, 'faq_open', 'faq', 'faq-1']);

        expect(analytics.track).not.toHaveBeenCalled();
    });
});
