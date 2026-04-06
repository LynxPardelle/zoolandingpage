import type { TAngoraCombosPayload } from '@/app/shared/types/config-payloads.types';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NgxAngoraService } from 'ngx-angora-css';
import { AngoraCombosService } from './angora-combos.service';
import { ConfigStoreService } from './config-store.service';

describe('AngoraCombosService', () => {
    let pushCombos: jasmine.Spy;
    let updateCombo: jasmine.Spy;
    let updateClasses: jasmine.Spy;
    let cssCreate: jasmine.Spy;
    let store: ConfigStoreService;

    const configure = (platformId: 'browser' | 'server'): AngoraCombosService => {
        pushCombos = jasmine.createSpy('pushCombos');
        updateCombo = jasmine.createSpy('updateCombo');
        updateClasses = jasmine.createSpy('updateClasses');
        cssCreate = jasmine.createSpy('cssCreate');

        TestBed.configureTestingModule({
            providers: [
                AngoraCombosService,
                ConfigStoreService,
                { provide: PLATFORM_ID, useValue: platformId },
                {
                    provide: NgxAngoraService,
                    useValue: {
                        pushCombos,
                        updateCombo,
                        updateClasses,
                        cssCreate,
                        indicatorClass: 'ank',
                        combos: {},
                        abreviationsClasses: {},
                        cssNamesParsed: {
                            d: 'display',
                            jc: 'justify-content',
                            ai: 'align-items',
                            fd: 'flex-direction',
                        },
                    },
                },
            ],
        });

        store = TestBed.inject(ConfigStoreService);
        return TestBed.inject(AngoraCombosService);
    };

    beforeEach(() => {
        TestBed.resetTestingModule();
    });

    it('pushes authored combos in the browser', () => {
        configure('browser');
        const payload: TAngoraCombosPayload = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {
                hero: ['ank-display-flex ank-justifyContent-center'],
            },
        };

        store.setCombos(payload);
        TestBed.flushEffects();

        expect(pushCombos.calls.count()).toBe(1);
        expect(pushCombos.calls.argsFor(0)).toEqual([{ hero: ['ank-d-flex ank-jc-center'] }]);
        expect(updateCombo).not.toHaveBeenCalled();
    });

    it('skips DOM-dependent combo pushes during SSR', () => {
        configure('server');

        store.setCombos({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {
                hero: ['ank-bg-primary'],
            },
        });
        TestBed.flushEffects();

        expect(pushCombos).not.toHaveBeenCalled();
        expect(updateCombo).not.toHaveBeenCalled();
    });

    it('does not inject fallback combos when payload is missing', () => {
        configure('browser');

        store.setCombos(null);
        TestBed.flushEffects();

        expect(pushCombos).not.toHaveBeenCalled();
        expect(updateCombo).not.toHaveBeenCalled();
    });

    it('does not push the same payload twice', () => {
        configure('browser');
        const payload: TAngoraCombosPayload = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {
                hero: ['ank-bg-primary'],
            },
        };

        store.setCombos(payload);
        TestBed.flushEffects();
        store.setCombos(payload);
        TestBed.flushEffects();

        expect(pushCombos.calls.count()).toBe(1);
        expect(updateCombo).not.toHaveBeenCalled();
    });

    it('clears combos removed by a later payload', () => {
        configure('browser');

        store.setCombos({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {
                base: ['ank-display-flex'],
                hero: ['ank-bg-primary'],
            },
        });
        TestBed.flushEffects();
        store.setCombos({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {
                hero: ['ank-bg-primary'],
            },
        });
        TestBed.flushEffects();

        expect(pushCombos.calls.count()).toBe(2);
        expect(pushCombos.calls.argsFor(0)).toEqual([{ base: ['ank-d-flex'], hero: ['ank-bg-primary'] }]);
        expect(pushCombos.calls.argsFor(1)).toEqual([{ hero: ['ank-bg-primary'] }]);
        expect(updateCombo).toHaveBeenCalledOnceWith('base', []);
    });

    it('merges auxiliary combos without replacing draft combos', () => {
        const service = configure('browser');

        store.setCombos({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {
                hero: ['ank-bg-primary'],
            },
        });
        TestBed.flushEffects();

        service.setAuxiliaryCombos('debug-workspace', {
            version: 1,
            pageId: 'default',
            domain: 'debug-workspace',
            combos: {
                debugBtnBase: ['ank-display-flex'],
            },
        });

        expect(pushCombos.calls.count()).toBe(2);
        expect(pushCombos.calls.argsFor(1)).toEqual([{ hero: ['ank-bg-primary'], debugBtnBase: ['ank-d-flex'] }]);
    });

    it('keeps the earliest pending cssCreate request', () => {
        jasmine.clock().install();
        try {
            const service = configure('browser');

            service.scheduleCssCreate(0);
            service.scheduleCssCreate(250);
            jasmine.clock().tick(0);

            expect(cssCreate).toHaveBeenCalledTimes(1);
        } finally {
            jasmine.clock().uninstall();
        }
    });

    it('schedules cssCreate after payload updates', () => {
        jasmine.clock().install();
        try {
            configure('browser');

            store.setCombos({
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                combos: {
                    hero: ['ank-bg-primary'],
                },
            });
            TestBed.flushEffects();
            jasmine.clock().tick(0);
            expect(cssCreate).toHaveBeenCalledTimes(1);

            store.setCombos(null);
            TestBed.flushEffects();
            jasmine.clock().tick(0);
            expect(updateCombo).toHaveBeenCalledOnceWith('hero', []);
            expect(cssCreate).toHaveBeenCalledTimes(2);
        } finally {
            jasmine.clock().uninstall();
        }
    });

    it('replays rendered classes one at a time', () => {
        const service = configure('browser');

        service.updateClasses(['ank-display-flex', 'ank-justifyContent-center', 'ank-display-flex']);

        expect(updateClasses.calls.count()).toBe(2);
        expect(updateClasses.calls.argsFor(0)).toEqual([['ank-d-flex']]);
        expect(updateClasses.calls.argsFor(1)).toEqual([['ank-jc-center']]);
    });

    it('does not replay the same normalized class twice across repeated updates', () => {
        const service = configure('browser');

        service.updateClasses(['ank-display-flex', 'ank-justifyContent-center']);
        service.updateClasses(['ank-display-flex', 'ank-justifyContent-center', 'ank-alignItems-center']);

        expect(updateClasses.calls.count()).toBe(3);
        expect(updateClasses.calls.argsFor(0)).toEqual([['ank-d-flex']]);
        expect(updateClasses.calls.argsFor(1)).toEqual([['ank-jc-center']]);
        expect(updateClasses.calls.argsFor(2)).toEqual([['ank-ai-center']]);
    });

    it('filters out classes that Angora does not manage', () => {
        const service = configure('browser');
        const angora = TestBed.inject(NgxAngoraService) as unknown as {
            abreviationsClasses: Record<string, string>;
        };

        angora.abreviationsClasses = { alIteCent: 'ank-alignItems-center' };

        service.updateClasses([
            'ank-display-flex',
            'sectionBase',
            'btnBaseVALSVL1remVL',
            'alIteCent-center',
            'ng-star-inserted',
            'modal-panel',
        ]);

        expect(updateClasses.calls.count()).toBe(2);
        expect(updateClasses.calls.argsFor(0)).toEqual([['ank-d-flex']]);
        expect(updateClasses.calls.argsFor(1)).toEqual([['alIteCent-center']]);
    });
});
