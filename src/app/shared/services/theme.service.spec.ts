import { TestBed } from '@angular/core/testing';
import { NgxAngoraService } from 'ngx-angora-css';
import { ThemeService } from './theme.service';
import { VariableStoreService } from './variable-store.service';

describe('ThemeService', () => {
    let service: ThemeService;
    let variables: VariableStoreService;
    let angora: jasmine.SpyObj<NgxAngoraService>;
    let setItemSpy: jasmine.Spy;

    const latestAppliedColors = (): Record<string, string> => {
        if (angora.updateColors.calls.any()) {
            return angora.updateColors.calls.mostRecent().args[0] as Record<string, string>;
        }

        return angora.pushColors.calls.mostRecent().args[0] as Record<string, string>;
    };

    const createThemePayload = (defaultMode: 'light' | 'dark' | 'auto' = 'dark') => ({
        version: 1,
        pageId: 'default',
        domain: 'zoolandingpage.com.mx',
        variables: {
            theme: {
                defaultMode,
                palettes: {
                    light: {
                        bgColor: '#f9f5ef',
                        textColor: '#171717',
                        titleColor: '#202020',
                        linkColor: '#7a5400',
                        accentColor: '#b28000',
                        secondaryBgColor: '#efe2cf',
                        secondaryTextColor: '#2b2420',
                        secondaryTitleColor: '#312923',
                        secondaryLinkColor: '#8f1f3a',
                        secondaryAccentColor: '#176d68',
                    },
                    dark: {
                        bgColor: '#090909',
                        textColor: '#f5efe7',
                        titleColor: '#fff6dd',
                        linkColor: '#e0bc42',
                        accentColor: '#c7a900',
                        secondaryBgColor: '#17110d',
                        secondaryTextColor: '#f5efe7',
                        secondaryTitleColor: '#f6d98b',
                        secondaryLinkColor: '#e44970',
                        secondaryAccentColor: '#900c3f',
                    },
                },
                ui: {
                    modalAccentColor: 'secondaryAccentColor',
                    legalModalAccentColor: 'secondaryAccentColor',
                    demoModalAccentColor: 'accentColor',
                },
            },
        },
    });

    const setup = (storedTheme: string | null = null) => {
        angora = jasmine.createSpyObj<NgxAngoraService>('NgxAngoraService', ['pushColors', 'updateColors']);
        spyOn(window.localStorage, 'getItem').and.returnValue(storedTheme);
        setItemSpy = spyOn(window.localStorage, 'setItem');

        TestBed.configureTestingModule({
            providers: [
                ThemeService,
                VariableStoreService,
                { provide: NgxAngoraService, useValue: angora },
            ],
        });

        variables = TestBed.inject(VariableStoreService);
        service = TestBed.inject(ThemeService);
    };

    beforeEach(() => {
        TestBed.resetTestingModule();
    });

    it('applies draft palettes and default mode when there is no saved preference', () => {
        setup();
        variables.setPayload(createThemePayload('dark') as any);
        TestBed.flushEffects();

        expect(service.getCurrentTheme()).toBe('dark');
        expect(angora.pushColors.calls.any() || angora.updateColors.calls.any()).toBeTrue();

        const applied = latestAppliedColors();
        expect(applied['bgColor']).toBe('#090909');
        expect(applied['accentColor']).toBe('#c7a900');
        expect(applied['altBgColor']).toBe('#f9f5ef');
        expect(service.getUiAccentColor('legalModalAccentColor', 'accentColor')).toBe('secondaryAccentColor');
        expect(setItemSpy).not.toHaveBeenCalled();
    });

    it('preserves saved theme preference over draft defaultMode', () => {
        setup('light');
        variables.setPayload(createThemePayload('dark') as any);
        TestBed.flushEffects();

        expect(service.getCurrentTheme()).toBe('light');
        const applied = latestAppliedColors();
        expect(applied['bgColor']).toBe('#f9f5ef');
        expect(applied['altBgColor']).toBe('#090909');
    });
});
