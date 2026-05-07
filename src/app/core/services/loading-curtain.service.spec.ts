import { DOCUMENT } from '@angular/common';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
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

    it('hides and removes the boot curtain after the configured exit duration', fakeAsync(() => {
        const curtain = addCurtain();
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
        tick(119);
        expect(documentRef.getElementById('zlp-boot-curtain')).toBe(curtain);
        tick(1);
        expect(documentRef.getElementById('zlp-boot-curtain')).toBeNull();
    }));
});
