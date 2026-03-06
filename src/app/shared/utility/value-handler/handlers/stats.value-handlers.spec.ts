import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { TestBed } from '@angular/core/testing';
import { numberClampValueHandler, statsFormatVarValueHandler } from './stats.value-handlers';

describe('stats.value-handlers', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [VariableStoreService],
        });
    });

    it('numberClamp clamps values within bounds', () => {
        const handler = numberClampValueHandler();
        expect(handler.resolve({} as never, [20, 10, 15])).toBe(15);
        expect(handler.resolve({} as never, [5, 10, 15])).toBe(10);
        expect(handler.resolve({} as never, [12, 10, 15])).toBe(12);
    });

    it('numberClamp returns original value when bounds are inverted', () => {
        const handler = numberClampValueHandler();
        expect(handler.resolve({} as never, [12, 20, 10])).toBe(12);
    });

    it('statsFormatVar resolves suffix mode from variables payload', () => {
        const store = TestBed.inject(VariableStoreService);
        store.setPayload({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                statsCounters: {
                    avgTime: {
                        formatMode: 'suffix',
                        formatSuffix: 's',
                    },
                },
            },
            computed: {},
        });

        const handler = TestBed.runInInjectionContext(() => statsFormatVarValueHandler());
        const formatter = handler.resolve({} as never, [
            'statsCounters.avgTime.formatMode',
            'number',
            'statsCounters.avgTime.formatSuffix',
            '',
        ]) as (value: number) => string;

        expect(formatter(312.4)).toBe('312s');
    });

    it('statsFormatVar appends suffix in number mode', () => {
        const store = TestBed.inject(VariableStoreService);
        store.setPayload({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                statsCounters: {
                    cta: {
                        formatMode: 'number',
                        formatSuffix: '%',
                    },
                },
            },
            computed: {},
        });

        const handler = TestBed.runInInjectionContext(() => statsFormatVarValueHandler());
        const formatter = handler.resolve({} as never, [
            'statsCounters.cta.formatMode',
            'number',
            'statsCounters.cta.formatSuffix',
            '',
        ]) as (value: number) => string;

        expect(formatter(35)).toBe('35%');
    });

    it('statsFormatVar decodes numeric HTML entities in suffix', () => {
        const store = TestBed.inject(VariableStoreService);
        store.setPayload({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                statsCounters: {
                    visits: {
                        formatMode: 'number',
                        formatSuffix: '&#43;',
                    },
                },
            },
            computed: {},
        });

        const handler = TestBed.runInInjectionContext(() => statsFormatVarValueHandler());
        const formatter = handler.resolve({} as never, [
            'statsCounters.visits.formatMode',
            'number',
            'statsCounters.visits.formatSuffix',
            '',
        ]) as (value: number) => string;

        expect(formatter(1240)).toBe('1,240+');
    });

    it('statsFormatVar supports prefix mode with decoded prefix', () => {
        const store = TestBed.inject(VariableStoreService);
        store.setPayload({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                statsCounters: {
                    visits: {
                        formatMode: 'prefix',
                        formatPrefix: '&#43;',
                    },
                },
            },
            computed: {},
        });

        const handler = TestBed.runInInjectionContext(() => statsFormatVarValueHandler());
        const formatter = handler.resolve({} as never, [
            'statsCounters.visits.formatMode',
            'number',
            'statsCounters.visits.formatSuffix',
            '',
            'statsCounters.visits.formatPrefix',
            '',
        ]) as (value: number) => string;

        expect(formatter(1240)).toBe('+1,240');
    });

    it('statsFormatVar supports explicit prefixSuffix mode', () => {
        const store = TestBed.inject(VariableStoreService);
        store.setPayload({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                statsCounters: {
                    visits: {
                        formatMode: 'prefixSuffix',
                        formatPrefix: '&#43;',
                        formatSuffix: '%',
                    },
                },
            },
            computed: {},
        });

        const handler = TestBed.runInInjectionContext(() => statsFormatVarValueHandler());
        const formatter = handler.resolve({} as never, [
            'statsCounters.visits.formatMode',
            'number',
            'statsCounters.visits.formatSuffix',
            '',
            'statsCounters.visits.formatPrefix',
            '',
        ]) as (value: number) => string;

        expect(formatter(1240)).toBe('+1,240%');
    });

    it('statsFormatVar uses fallback percent mode when variable path is missing', () => {
        const store = TestBed.inject(VariableStoreService);
        store.setPayload({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {},
            computed: {},
        });

        const handler = TestBed.runInInjectionContext(() => statsFormatVarValueHandler());
        const formatter = handler.resolve({} as never, [
            'statsCounters.missing.formatMode',
            'percent',
            'statsCounters.missing.formatSuffix',
            '',
        ]) as (value: number) => string;

        expect(formatter(49.6)).toBe('50%');
    });

    it('statsFormatVar defaults to localized number output', () => {
        const store = TestBed.inject(VariableStoreService);
        store.setPayload({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {},
            computed: {},
        });

        const handler = TestBed.runInInjectionContext(() => statsFormatVarValueHandler());
        const formatter = handler.resolve({} as never, [
            '',
            'number',
            '',
            '',
        ]) as (value: number) => string;

        expect(formatter(12345)).toBe('12,345');
    });
});
