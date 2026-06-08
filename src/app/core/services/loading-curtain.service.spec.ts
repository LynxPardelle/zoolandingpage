import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { LoadingCurtainService } from './loading-curtain.service';

describe('LoadingCurtainService', () => {
    let documentRef: Document;
    let variables: VariableStoreService;
    let service: LoadingCurtainService;

    const addCurtain = (): HTMLElement => {
        const curtain = documentRef.createElement('div');
        curtain.id = 'zlp-boot-curtain';
        curtain.innerHTML = `
            <img data-zlp-boot-logo alt="" />
            <strong data-zlp-boot-title>Zoo Landing</strong>
            <span data-zlp-boot-subtitle>Preparando experiencia</span>
        `;
        documentRef.body.appendChild(curtain);
        return curtain;
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                LoadingCurtainService,
                VariableStoreService,
            ],
        });

        documentRef = TestBed.inject(DOCUMENT);
        documentRef.getElementById('zlp-boot-curtain')?.remove();
        variables = TestBed.inject(VariableStoreService);
        service = TestBed.inject(LoadingCurtainService);
    });

    afterEach(() => {
        documentRef.getElementById('zlp-boot-curtain')?.remove();
        TestBed.resetTestingModule();
    });

    it('configures the boot curtain from draft loading settings and brand fallbacks', () => {
        const curtain = addCurtain();
        variables.setPayload({
            version: 1,
            domain: 'erosbarajas.com',
            pageId: 'default',
            variables: {
                brand: {
                    displayName: 'Eros Barajas',
                    logoUrl: 'https://assets.example.com/logo.png',
                },
                ui: {
                    loadingCurtain: {
                        subtitle: 'Alineando el espacio',
                        background: '#f7efe4',
                        foreground: '#1f130d',
                        accent: '#f97316',
                    },
                },
            },
        } as any);

        service.configureFromDraft();

        expect(curtain.querySelector('[data-zlp-boot-title]')?.textContent).toBe('Eros Barajas');
        expect(curtain.querySelector('[data-zlp-boot-subtitle]')?.textContent).toBe('Alineando el espacio');
        expect(curtain.querySelector('img')?.getAttribute('src')).toBe('https://assets.example.com/logo.png');
        expect(curtain.style.getPropertyValue('--zlp-boot-bg')).toBe('#f7efe4');
        expect(curtain.style.getPropertyValue('--zlp-boot-fg')).toBe('#1f130d');
        expect(curtain.style.getPropertyValue('--zlp-boot-accent')).toBe('#f97316');
    });

    it('does not inject unsafe markup or unsafe style values from draft settings', () => {
        const curtain = addCurtain();
        variables.setPayload({
            version: 1,
            domain: 'zoolandingpage.com.mx',
            pageId: 'default',
            variables: {
                ui: {
                    loadingCurtain: {
                        title: '<img src=x onerror=alert(1)>',
                        logoUrl: '//assets.example.com/logo.png',
                        background: 'url(https://example.com/tracker.png)',
                    },
                },
            },
        } as any);

        service.configureFromDraft();

        expect(curtain.querySelector('[data-zlp-boot-title]')?.textContent).toBe('<img src=x onerror=alert(1)>');
        expect(curtain.querySelector('[data-zlp-boot-title]')?.querySelector('img')).toBeNull();
        expect(curtain.querySelector('img')?.hidden).toBeTrue();
        expect(curtain.querySelector('img')?.getAttribute('src')).toBeNull();
        expect(curtain.style.getPropertyValue('--zlp-boot-bg')).toBe('');
    });

    it('hides and removes the boot curtain after the configured exit duration', () => {
        jasmine.clock().install();
        const curtain = addCurtain();
        try {
            variables.setPayload({
                version: 1,
                domain: 'zoolandingpage.com.mx',
                pageId: 'default',
                variables: {
                    ui: {
                        loadingCurtain: {
                            exitDurationMs: 120,
                        },
                    },
                },
            } as any);

            service.configureFromDraft();
            service.hideWhenReady('css-ready');

            expect(curtain.classList.contains('zlp-boot-curtain--leaving')).toBeTrue();
            jasmine.clock().tick(119);
            expect(documentRef.getElementById('zlp-boot-curtain')).toBe(curtain);
            jasmine.clock().tick(1);
            expect(documentRef.getElementById('zlp-boot-curtain')).toBeNull();
        } finally {
            jasmine.clock().uninstall();
        }
    });

    it('waits for critical rendered text colors before starting the exit', () => {
        jasmine.clock().install();
        const curtain = addCurtain();
        const style = documentRef.createElement('style');
        const title = documentRef.createElement('h1');
        style.textContent = `
            :root { --ank-titleColor: rgb(255, 248, 230); }
            .sectionTitle { color: var(--ank-titleColor); }
        `;
        title.className = 'sectionTitle';
        title.textContent = 'Title';
        documentRef.head.appendChild(style);
        documentRef.body.appendChild(title);

        try {
            variables.setPayload({
                version: 1,
                domain: 'erosbarajas.com',
                pageId: 'default',
                variables: {
                    theme: {
                        defaultMode: 'light',
                        palettes: {
                            light: { titleColor: '#201712' },
                            dark: { titleColor: '#fff8e6' },
                        },
                    },
                },
            } as any);

            service.configureFromDraft();
            service.hideWhenReady('css-ready');

            expect(curtain.classList.contains('zlp-boot-curtain--leaving')).toBeFalse();
            jasmine.clock().tick(50);
            expect(curtain.classList.contains('zlp-boot-curtain--leaving')).toBeFalse();

            style.sheet?.insertRule(
                '.sectionTitle { color: rgb(32, 23, 18); }',
                style.sheet.cssRules.length,
            );
            jasmine.clock().tick(50);

            expect(getComputedStyle(title).color).toBe('rgb(32, 23, 18)');
            expect(curtain.classList.contains('zlp-boot-curtain--leaving')).toBeTrue();
        } finally {
            title.remove();
            style.remove();
            jasmine.clock().uninstall();
        }
    });

    it('falls back after the short critical text color wait has elapsed', () => {
        const curtain = addCurtain();
        const style = documentRef.createElement('style');
        const title = documentRef.createElement('h1');
        style.textContent = '.sectionTitle { color: rgb(255, 248, 230); }';
        title.className = 'sectionTitle';
        title.textContent = 'Title';
        documentRef.head.appendChild(style);
        documentRef.body.appendChild(title);

        try {
            variables.setPayload({
                version: 1,
                domain: 'erosbarajas.com',
                pageId: 'default',
                variables: {
                    theme: {
                        defaultMode: 'light',
                        palettes: {
                            light: { titleColor: '#201712' },
                        },
                    },
                },
            } as any);

            window.__ZLP_BOOT_CURTAIN_STARTED_AT__ = performance.now() - 3_000;
            service.configureFromDraft();
            service.hideWhenReady('css-ready');

            expect(curtain.classList.contains('zlp-boot-curtain--leaving')).toBeTrue();
        } finally {
            delete window.__ZLP_BOOT_CURTAIN_STARTED_AT__;
            title.remove();
            style.remove();
        }
    });
});
