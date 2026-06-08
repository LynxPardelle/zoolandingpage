import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAppState } from './app-state.providers';
import { AuthFacade } from './auth/auth.facade';

describe('provideAppState', () => {
    it('registers root signal state providers without touching browser globals', () => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                { provide: PLATFORM_ID, useValue: 'server' },
                ...provideAppState({ production: true }),
            ],
        });

        const auth = TestBed.inject(AuthFacade);
        expect(auth.status()).toBe('anonymous');
        expect(() => auth.restoreSession()).not.toThrow();
    });

    it('does not register interval-based diagnostics providers that keep Karma open', () => {
        const productionProviders = provideAppState({ production: true });
        const developmentProviders = provideAppState({ production: false });

        expect(productionProviders.length).toBe(0);
        expect(developmentProviders.length).toBe(0);
    });
});
