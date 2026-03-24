import type { TAngoraCombosPayload } from '@/app/shared/types/config-payloads.types';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NgxAngoraService } from 'ngx-angora-css';
import { AngoraCombosService } from './angora-combos.service';

describe('AngoraCombosService', () => {
    let pushCombos: jasmine.Spy;

    const configure = (platformId: 'browser' | 'server'): AngoraCombosService => {
        pushCombos = jasmine.createSpy('pushCombos');

        TestBed.configureTestingModule({
            providers: [
                AngoraCombosService,
                { provide: PLATFORM_ID, useValue: platformId },
                { provide: NgxAngoraService, useValue: { pushCombos } },
            ],
        });

        return TestBed.inject(AngoraCombosService);
    };

    beforeEach(() => {
        TestBed.resetTestingModule();
    });

    it('pushes base and draft combos in the browser', () => {
        const service = configure('browser');
        const payload: TAngoraCombosPayload = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {
                hero: ['ank-bg-primary'],
            },
        };

        service.setBaseCombos({
            base: ['ank-display-flex'],
        });
        service.applyPayload(payload);

        expect(pushCombos.calls.count()).toBe(2);
        expect(pushCombos.calls.argsFor(0)).toEqual([{ base: ['ank-display-flex'] }]);
        expect(pushCombos.calls.argsFor(1)).toEqual([{ base: ['ank-display-flex'], hero: ['ank-bg-primary'] }]);
    });

    it('skips DOM-dependent combo pushes during SSR', () => {
        const service = configure('server');

        service.setBaseCombos({
            base: ['ank-display-flex'],
        });
        service.applyPayload({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {
                hero: ['ank-bg-primary'],
            },
        });

        expect(pushCombos).not.toHaveBeenCalled();
    });

    it('does not push the same merged combos twice', () => {
        const service = configure('browser');

        service.setBaseCombos({
            base: ['ank-display-flex'],
        });
        service.applyPayload({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {
                base: ['ank-display-flex'],
            },
        });

        expect(pushCombos.calls.count()).toBe(1);
        expect(pushCombos.calls.argsFor(0)).toEqual([{ base: ['ank-display-flex'] }]);
    });

    it('waits for base combos before pushing a draft payload', () => {
        const service = configure('browser');

        service.applyPayload({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {
                hero: ['ank-bg-primary'],
            },
        });

        expect(pushCombos).not.toHaveBeenCalled();

        service.setBaseCombos({
            base: ['ank-display-flex'],
        });

        expect(pushCombos.calls.count()).toBe(2);
        expect(pushCombos.calls.argsFor(0)).toEqual([{ base: ['ank-display-flex'] }]);
        expect(pushCombos.calls.argsFor(1)).toEqual([{ base: ['ank-display-flex'], hero: ['ank-bg-primary'] }]);
    });
});
