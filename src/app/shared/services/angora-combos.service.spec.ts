import type { TAngoraCombosPayload } from '@/app/shared/types/config-payloads.types';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NgxAngoraService } from 'ngx-angora-css';
import { AngoraCombosService } from './angora-combos.service';
import { ConfigStoreService } from './config-store.service';

describe('AngoraCombosService', () => {
    let pushCombos: jasmine.Spy;
    let pushBPS: jasmine.Spy;
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
        pushBPS = jasmine.createSpy('pushBPS');
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
                        pushBPS,
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

    it('lets draft combos override combo catalog combos', () => {
        const service = configure('browser');

        service.setAuxiliaryCombos('combo-catalog', {
            version: 1,
            pageId: 'default',
            domain: 'catalog',
            combos: {
                card: ['ank-bg-catalog'],
                remoteOnly: ['ank-d-flex'],
            },
        });

        store.setCombos({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {
                card: ['ank-bg-local'],
            },
        });
        TestBed.flushEffects();

        expect(pushCombos.calls.mostRecent().args).toEqual([{
            card: ['ank-bg-local'],
            remoteOnly: ['ank-d-flex'],
        }]);
    });

    it('lets temporary auxiliary combos override draft combos', () => {
        const service = configure('browser');

        store.setCombos({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: {
                card: ['ank-bg-local'],
            },
        });
        TestBed.flushEffects();

        service.setAuxiliaryCombos('debug-workspace', {
            version: 1,
            pageId: 'default',
            domain: 'debug-workspace',
            combos: {
                card: ['ank-bg-preview'],
            },
        });

        expect(pushCombos.calls.mostRecent().args).toEqual([{ card: ['ank-bg-preview'] }]);
    });

    it('registers canonical numeric breakpoints before creating normalized utilities, once across navigation', () => {
        const service = configure('browser');
        service.updateClasses(['ank-display-px561-flex', 'ank-d-px641-grid', 'ank-d-px821-block', 'ank-d-px901-none']);
        expect(pushBPS).toHaveBeenCalledOnceWith([
            { bp: 'px561', value: '561px', class2Create: '' },
            { bp: 'px641', value: '641px', class2Create: '' },
            { bp: 'px821', value: '821px', class2Create: '' },
            { bp: 'px901', value: '901px', class2Create: '' },
        ]);
        expect(pushBPS).toHaveBeenCalledBefore(cssCreate);
        service.stopCssRuntime();
        service.updateClasses(['ank-d-px561-flex']);
        expect(pushBPS).toHaveBeenCalledTimes(1);
    });

    it('registers combo breakpoints before pushing combos in the same batch', () => {
        const service = configure('browser');
        service.setAuxiliaryCombos('preview', {
            version: 1, pageId: 'page', domain: 'example.test',
            combos: { card: ['ank-display-px901-grid ank-display-px561-flex'] },
        });
        expect(pushBPS).toHaveBeenCalledBefore(pushCombos);
        expect(pushBPS.calls.mostRecent()?.args[0]).toEqual([
            { bp: 'px901', value: '901px', class2Create: '' },
            { bp: 'px561', value: '561px', class2Create: '' },
        ]);
        expect(runInCssCreateBatch).toHaveBeenCalledTimes(1);
    });

    it('accepts bounded canonical integers only in the breakpoint position and leaves named defaults alone', () => {
        const service = configure('browser');
        service.updateClasses(['ank-d-sm-flex', 'ank-d-md-grid', 'ank-d-px0-flex', 'ank-d-px0561-flex',
            'ank-d-px8193-flex', 'ank-d-px1.5-flex', 'ank-d-px-1-flex', 'other-d-px561-flex', 'ank-w-px561']);
        expect(pushBPS).not.toHaveBeenCalled();
        service.updateClasses(['ank-d-px1-flex', 'ank-d-px8192-flex']);
        expect(pushBPS).toHaveBeenCalledOnceWith([
            { bp: 'px1', value: '1px', class2Create: '' },
            { bp: 'px8192', value: '8192px', class2Create: '' },
        ]);
    });

    it('registers rendered numeric aliases before a scheduled full CSS scan', () => {
        jasmine.clock().install();
        try {
            const service = configure('browser');
            collectRenderedDomClasses.and.returnValue(['ank-display-px821-grid']);
            service.scheduleCssCreate();
            jasmine.clock().tick(0);
            expect(pushBPS).toHaveBeenCalledOnceWith([{ bp: 'px821', value: '821px', class2Create: '' }]);
            expect(pushBPS).toHaveBeenCalledBefore(cssCreate);
        } finally {
            jasmine.clock().uninstall();
        }
    });

    it('does not register breakpoints or generate CSS during SSR', () => {
        const service = configure('server');
        service.updateClasses(['ank-d-px901-flex']);
        service.setAuxiliaryCombos('preview', {
            version: 1, pageId: 'page', domain: 'example.test', combos: { card: ['ank-d-px901-flex'] },
        });
        service.scheduleCssCreate();
        expect(pushBPS).not.toHaveBeenCalled();
        expect(cssCreate).not.toHaveBeenCalled();
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

    it('stops required-rule CSSOM work immediately when readiness is aborted', async () => {
        const service = configure('browser') as unknown as {
            waitForCssReady: (
                timeoutMs: number,
                requiredClasses: readonly string[],
                signal?: AbortSignal,
            ) => Promise<boolean>;
        };
        const controller = new AbortController();
        cssCreate.and.callFake((classes?: string[], primordial?: boolean) => {
            if (classes === undefined && primordial === true) {
                controller.abort();
            }
        });

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

        await expectAsync(service.waitForCssReady(750, ['qaCombo'], controller.signal))
            .toBeResolvedTo(false);

        expect(controller.signal.aborted).toBeTrue();
        expect(cssCreate.calls.allArgs()).toEqual([
            [['qaCombo']],
            [['qaCombo']],
            [undefined, true],
        ]);
    });

    it('keeps critical text combo CSS pending when the marker exists but the rendered color is stale', async () => {
        const service = configure('browser');
        const style = document.createElement('style');
        const element = document.createElement('h1');
        const rootStyle = document.documentElement.style;
        const previousTitleColor = rootStyle.getPropertyValue('--ank-titleColor');
        style.textContent = `
            :root { --ank-titleColor: rgb(32, 23, 18); }
            .ank-colorSEL__COM_sectionTitle-titleColor, .sectionTitle { color: rgb(250, 250, 250); }
        `;
        rootStyle.setProperty('--ank-titleColor', 'rgb(32, 23, 18)');
        element.className = 'sectionTitle';
        element.textContent = 'Title';
        document.head.appendChild(style);
        document.body.appendChild(element);

        cssCreate.and.callFake((classes?: string[], primordial?: boolean) => {
            if (classes === undefined && primordial === true) {
                style.sheet?.insertRule(
                    '.ank-colorSEL__COM_sectionTitle-titleColor, .sectionTitle { color: var(--ank-titleColor); }',
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
                    sectionTitle: ['ank-color-titleColor'],
                },
            });
            TestBed.flushEffects();
            cssCreate.calls.reset();

            await expectAsync(service.waitForCssReady(250, ['sectionTitle'])).toBeResolvedTo(true);

            expect(getComputedStyle(element).color).toBe('rgb(32, 23, 18)');
            expect(cssCreate).toHaveBeenCalledWith(['sectionTitle']);
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

    it('does not block CSS readiness on color combos that are not rendered in the current DOM', async () => {
        const service = configure('browser');
        const style = document.createElement('style');
        style.textContent = '.ank-colorSEL__COM_qaCombo-titleColor, .qaCombo { color: var(--ank-titleColor); }';
        document.head.appendChild(style);

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

            expect(document.querySelector('.qaCombo')).toBeNull();
            expect(cssCreate).toHaveBeenCalledWith(['qaCombo']);
        } finally {
            style.remove();
        }
    });

    it('accepts generated CSS markers for rendered combo value variants', async () => {
        const service = configure('browser');
        const style = document.createElement('style');
        const variant = 'qaButtonVALSVLaccentColorVLtextColorVL';
        style.textContent = `
            .ank-bgSEL__COM_${ variant }-accentColor, .${ variant } { background-color: rgb(200, 191, 180); }
            .ank-textSEL__COM_${ variant }-textColor, .${ variant } { color: rgb(47, 45, 43); }
        `;
        document.head.appendChild(style);

        try {
            store.setCombos({
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                combos: {
                    qaButton: ['ank-bg-VAL0 ank-text-VAL1'],
                },
            });
            TestBed.flushEffects();
            cssCreate.calls.reset();

            await expectAsync(service.waitForCssReady(250, [variant])).toBeResolvedTo(true);

            expect(cssCreate).toHaveBeenCalledWith([variant]);
        } finally {
            style.remove();
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

    it('builds a stable ordered readiness signature from normalized effective classes and combo revision', () => {
        const service = configure('browser');
        const readiness = service as unknown as {
            cssReadinessSignature: (classes: readonly string[]) => string;
        };

        store.setCombos({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: { hero: ['ank-display-flex'] },
        });
        TestBed.flushEffects();

        const first = readiness.cssReadinessSignature([
            'ank-justifyContent-center hero',
            'ank-display-flex',
        ]);
        const equivalent = readiness.cssReadinessSignature([
            'ank-d-flex',
            'hero ank-jc-center',
            'ank-display-flex',
        ]);
        expect(equivalent).toBe(first);

        store.setCombos({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: { hero: ['ank-display-flex ank-alignItems-center'] },
        });
        TestBed.flushEffects();

        expect(readiness.cssReadinessSignature(['hero', 'ank-d-flex', 'ank-jc-center']))
            .not.toBe(first);
    });

    it('fingerprints a pending combo revision without touching CSSOM before the runtime cancels stale work', () => {
        const service = configure('browser');

        store.setCombos({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: { hero: ['ank-display-flex'] },
        });

        const signature = service.cssReadinessSignature(['hero']);

        expect(signature).toContain('hero=ank-d-flex');
        expect(pushCombos).not.toHaveBeenCalled();
        expect(cssCreate).not.toHaveBeenCalled();

        TestBed.flushEffects();
        expect(pushCombos).toHaveBeenCalledTimes(1);
    });

    it('keeps readiness signature collection DOM-independent during SSR', () => {
        const service = configure('server') as unknown as {
            cssReadinessSignature: (classes: readonly string[]) => string;
        };

        expect(() => service.cssReadinessSignature(['ank-display-flex']))
            .not.toThrow();
        expect(cssCreate).not.toHaveBeenCalled();
        expect(pushCombos).not.toHaveBeenCalled();
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
