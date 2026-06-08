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
    let runInCssCreateBatch: jasmine.Spy;
    let auditManagedStylesheets: jasmine.Spy;
    let getCssCreateDebugSummary: jasmine.Spy;
    let collectRenderedDomClasses: jasmine.Spy;
    let hasGeneratedCssRules: jasmine.Spy;
    let waitForCssReady: jasmine.Spy;
    let store: ConfigStoreService;

    const configure = (platformId: 'browser' | 'server'): AngoraCombosService => {
        const combos: Record<string, string[]> = {};
        pushCombos = jasmine.createSpy('pushCombos').and.callFake((nextCombos: Record<string, string[]>) => {
            Object.assign(combos, nextCombos);
        });
        updateCombo = jasmine.createSpy('updateCombo');
        updateClasses = jasmine.createSpy('updateClasses');
        cssCreate = jasmine.createSpy('cssCreate');
        auditManagedStylesheets = jasmine.createSpy('auditManagedStylesheets').and.returnValue({ totalRules: 0 });
        getCssCreateDebugSummary = jasmine.createSpy('getCssCreateDebugSummary').and.returnValue({ totalCreatedClasses: 0 });
        collectRenderedDomClasses = jasmine.createSpy('collectRenderedDomClasses').and.callFake((root?: ParentNode) => {
            const scope = root ?? document;
            const classes = new Set<string>();
            if (scope instanceof Element) {
                scope.classList.forEach((className) => classes.add(className));
            }
            scope.querySelectorAll?.('[class]').forEach((element) => {
                element.classList.forEach((className) => classes.add(className));
            });
            return Array.from(classes);
        });
        hasGeneratedCssRules = jasmine.createSpy('hasGeneratedCssRules').and.returnValue(false);
        waitForCssReady = jasmine.createSpy('waitForCssReady').and.resolveTo(false);
        runInCssCreateBatch = jasmine
            .createSpy('runInCssCreateBatch')
            .and.callFake((callback: () => void) => callback());

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
                        auditManagedStylesheets,
                        getCssCreateDebugSummary,
                        collectRenderedDomClasses,
                        hasGeneratedCssRules,
                        waitForCssReady,
                        runInCssCreateBatch,
                        getCombos: () => combos,
                        indicatorClass: 'ank',
                        combos,
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
        delete window.__zlpAngoraDebug;
    });

    afterEach(() => {
        delete window.__zlpAngoraDebug;
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
        expect(runInCssCreateBatch).toHaveBeenCalledTimes(1);
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
        const angora = TestBed.inject(NgxAngoraService) as unknown as {
            combos: Record<string, string[]>;
        };

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
        expect(angora.combos['base']).toEqual([]);
        expect(updateCombo).not.toHaveBeenCalled();
        expect(runInCssCreateBatch).toHaveBeenCalledTimes(2);
    });

    it('skips clearing combos that are no longer registered in Angora', () => {
        configure('browser');
        const angora = TestBed.inject(NgxAngoraService) as unknown as {
            combos: Record<string, string[]>;
        };

        store.setCombos({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {
                base: ['ank-display-flex'],
            },
        });
        TestBed.flushEffects();
        updateCombo.calls.reset();
        delete angora.combos['base'];

        store.setCombos({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {},
        });
        TestBed.flushEffects();

        expect(updateCombo).not.toHaveBeenCalled();
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

    it('leaves render-timed cssCreate scheduling to the runtime after combo payload updates', () => {
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
            expect(cssCreate).not.toHaveBeenCalled();

            store.setCombos(null);
            TestBed.flushEffects();
            jasmine.clock().tick(0);
            expect(updateCombo).not.toHaveBeenCalled();
            expect(cssCreate).not.toHaveBeenCalled();
        } finally {
            jasmine.clock().uninstall();
        }
    });

    it('creates rendered classes in one explicit cssCreate pass', () => {
        const service = configure('browser');

        service.updateClasses(['ank-display-flex', 'ank-justifyContent-center', 'ank-display-flex']);

        expect(updateClasses).not.toHaveBeenCalled();
        expect(cssCreate).toHaveBeenCalledOnceWith(['ank-d-flex', 'ank-jc-center']);
    });

    it('collects rendered DOM classes without creating a second cssCreate pass', () => {
        const service = configure('browser');
        const root = document.createElement('section');
        root.className = 'ank-display-grid shell';
        const child = document.createElement('div');
        child.className = 'ank-display-flex btnBase';
        root.appendChild(child);

        expect(service.collectRenderedDomClasses(root)).toEqual([
            'ank-display-grid',
            'shell',
            'ank-display-flex',
            'btnBase',
        ]);
        expect(collectRenderedDomClasses).toHaveBeenCalledOnceWith(root);
        expect(cssCreate).not.toHaveBeenCalled();
    });

    it('reports generated CSS as ready from managed stylesheet diagnostics', () => {
        const service = configure('browser');
        hasGeneratedCssRules.and.returnValue(true);

        expect(service.hasGeneratedCssRules()).toBeTrue();
        expect(hasGeneratedCssRules).toHaveBeenCalled();
    });

    it('passes registered combo class names to explicit cssCreate updates', () => {
        const service = configure('browser');

        store.setCombos({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {
                btnBase: ['ank-display-flex ank-alignItems-center'],
            },
        });
        TestBed.flushEffects();
        cssCreate.calls.reset();

        service.updateClasses(['btnBase', 'ank-display-flex']);

        expect(updateClasses).not.toHaveBeenCalled();
        expect(cssCreate).toHaveBeenCalledOnceWith(['btnBase', 'ank-d-flex']);
    });

    it('splits authored class strings before explicit cssCreate updates', () => {
        const service = configure('browser');

        store.setCombos({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {
                btnBase: ['ank-display-flex ank-alignItems-center'],
            },
        });
        TestBed.flushEffects();
        cssCreate.calls.reset();

        service.updateClasses(['btnBase ank-display-flex']);

        expect(cssCreate).toHaveBeenCalledOnceWith(['btnBase', 'ank-d-flex']);
    });

    it('applies pending store combos before explicit cssCreate updates', () => {
        const service = configure('browser');

        store.setCombos({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {
                btnBase: ['ank-display-flex ank-alignItems-center'],
            },
        });

        service.updateClasses(['btnBase']);

        expect(pushCombos).toHaveBeenCalledOnceWith({ btnBase: ['ank-d-flex ank-ai-center'] });
        expect(updateClasses).not.toHaveBeenCalled();
        expect(cssCreate).toHaveBeenCalledOnceWith(['btnBase']);
    });

    it('forces an immediate full scan when a required combo class rule is still missing', async () => {
        const service = configure('browser');
        const style = document.createElement('style');
        document.head.appendChild(style);
        cssCreate.and.callFake((classes?: string[], primordial?: boolean) => {
            if (classes === undefined && primordial === true) {
                style.sheet?.insertRule('.ank-dSEL__COM_qaCombo-flex, .qaCombo { display: flex; }');
            }
        });

        try {
            store.setCombos({
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                combos: {
                    qaCombo: ['ank-display-flex'],
                },
            });
            TestBed.flushEffects();
            cssCreate.calls.reset();

            await expectAsync(service.waitForCssReady(250, ['qaCombo'])).toBeResolvedTo(true);

            expect(waitForCssReady).not.toHaveBeenCalled();
            expect(cssCreate).toHaveBeenCalledWith(['qaCombo']);
            expect(cssCreate).toHaveBeenCalledWith(undefined, true);
        } finally {
            style.remove();
        }
    });

    it('keeps combo CSS pending when the marker exists but the rendered color is stale', async () => {
        const service = configure('browser');
        const style = document.createElement('style');
        const element = document.createElement('h1');
        const rootStyle = document.documentElement.style;
        const previousTitleColor = rootStyle.getPropertyValue('--ank-titleColor');
        style.textContent = `
            :root { --ank-titleColor: rgb(32, 23, 18); }
            .ank-colorSEL__COM_qaCombo-titleColor, .qaCombo { color: rgb(250, 250, 250); }
        `;
        rootStyle.setProperty('--ank-titleColor', 'rgb(32, 23, 18)');
        element.className = 'qaCombo';
        element.textContent = 'Title';
        document.head.appendChild(style);
        document.body.appendChild(element);

        cssCreate.and.callFake((classes?: string[], primordial?: boolean) => {
            if (classes === undefined && primordial === true) {
                style.sheet?.insertRule(
                    '.ank-colorSEL__COM_qaCombo-titleColor, .qaCombo { color: var(--ank-titleColor); }',
                    style.sheet.cssRules.length,
                );
            }
        });

        try {
            store.setCombos({
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                combos: {
                    qaCombo: ['ank-color-titleColor'],
                },
            });
            TestBed.flushEffects();
            cssCreate.calls.reset();

            await expectAsync(service.waitForCssReady(250, ['qaCombo'])).toBeResolvedTo(true);

            expect(getComputedStyle(element).color).toBe('rgb(32, 23, 18)');
            expect(cssCreate).toHaveBeenCalledWith(['qaCombo']);
            expect(cssCreate).toHaveBeenCalledWith(undefined, true);
        } finally {
            element.remove();
            style.remove();
            if (previousTitleColor) {
                rootStyle.setProperty('--ank-titleColor', previousTitleColor);
            } else {
                rootStyle.removeProperty('--ank-titleColor');
            }
        }
    });

    it('does not treat unrelated classes that only share a combo prefix as combo classes', () => {
        const service = configure('browser');

        store.setCombos({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {
                btn: ['ank-display-flex ank-alignItems-center'],
            },
        });
        TestBed.flushEffects();
        cssCreate.calls.reset();

        service.updateClasses(['btnBase', 'ank-display-flex']);

        expect(updateClasses).not.toHaveBeenCalled();
        expect(cssCreate).toHaveBeenCalledOnceWith(['ank-d-flex']);
    });

    it('does not replay the same normalized class twice across repeated updates', () => {
        const service = configure('browser');

        service.updateClasses(['ank-display-flex', 'ank-justifyContent-center']);
        service.updateClasses(['ank-display-flex', 'ank-justifyContent-center', 'ank-alignItems-center']);

        expect(updateClasses).not.toHaveBeenCalled();
        expect(cssCreate.calls.count()).toBe(2);
        expect(cssCreate.calls.argsFor(0)).toEqual([['ank-d-flex', 'ank-jc-center']]);
        expect(cssCreate.calls.argsFor(1)).toEqual([['ank-ai-center']]);
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

        expect(updateClasses).not.toHaveBeenCalled();
        expect(cssCreate).toHaveBeenCalledOnceWith(['ank-d-flex', 'alIteCent-center']);
    });

    it('uses the library classifier when available for managed class filtering', () => {
        const service = configure('browser');
        const angora = TestBed.inject(NgxAngoraService) as unknown as {
            classifyClass: jasmine.Spy;
            isComboClass: jasmine.Spy;
        };
        angora.classifyClass = jasmine.createSpy('classifyClass').and.callFake((className: string) => ({
            kind: className === 'btnBase' ? 'combo' : 'utility',
            managed: className === 'btnBase' || className === 'customManagedClass',
            comboKey: className === 'btnBase' ? 'btnBase' : undefined,
        }));
        angora.isComboClass = jasmine.createSpy('isComboClass').and.callFake((className: string) => className === 'btnBase');

        service.updateClasses(['customManagedClass', 'btnBase', 'unmanagedClass']);

        expect(angora.classifyClass).toHaveBeenCalledWith('customManagedClass');
        expect(angora.classifyClass).toHaveBeenCalledWith('btnBase');
        expect(cssCreate).toHaveBeenCalledOnceWith(['customManagedClass', 'btnBase']);
    });

    it('exposes library diagnostics through the local debug bridge', () => {
        configure('browser');
        const angora = TestBed.inject(NgxAngoraService) as unknown as {
            classifyClass: jasmine.Spy;
            auditManagedStylesheets: jasmine.Spy;
        };
        const classification = { kind: 'utility', managed: true, prefix: 'ank' };
        const audit = { totalRules: 7, totalDuplicateExactGroups: 0 };
        angora.classifyClass = jasmine.createSpy('classifyClass').and.returnValue(classification);
        angora.auditManagedStylesheets = jasmine.createSpy('auditManagedStylesheets').and.returnValue(audit);

        expect(window.__zlpAngoraDebug?.classifyClass('ank-d-flex')).toBe(classification);
        expect(window.__zlpAngoraDebug?.stylesheetAudit(5)).toBe(audit);
        expect(angora.auditManagedStylesheets).toHaveBeenCalledOnceWith(5);
    });

    it('lets the local debug bridge run a full cssCreate when no class list is provided', () => {
        configure('browser');

        window.__zlpAngoraDebug?.updateRenderedClasses();

        expect(cssCreate).toHaveBeenCalledOnceWith();
    });
});
