import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthFacade } from './auth.facade';
import { AuthSessionBrowserStorageService } from './auth-session-browser-storage.service';

describe('auth signal state', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        sessionStorage.clear();
    });

    it('starts anonymous and keeps token material out of state', () => {
        TestBed.configureTestingModule({});
        const auth = TestBed.inject(AuthFacade);
        const state = auth.snapshot();

        expect(auth.status()).toBe('anonymous');
        expect(auth.isAuthenticated()).toBeFalse();
        expect(Object.keys(state).join('|')).not.toContain('token');
        expect(Object.keys(state).join('|')).not.toContain('secret');
    });

    it('stores a public auth profile when a session is established', () => {
        TestBed.configureTestingModule({});
        const auth = TestBed.inject(AuthFacade);

        auth.establishSession({
            profile: {
                subject: 'user-123',
                displayName: 'Alec',
                email: 'alec@example.com',
                roles: ['owner'],
            },
            provider: 'future-cognito',
            expiresAtEpochMs: 1780000000000,
        });
        const state = auth.snapshot();

        expect(auth.status()).toBe('authenticated');
        expect(auth.isAuthenticated()).toBeTrue();
        expect(auth.profile()).toEqual({
            subject: 'user-123',
            displayName: 'Alec',
            email: 'alec@example.com',
            roles: ['owner'],
        });
        expect((state as Record<string, unknown>)['accessToken']).toBeUndefined();
        expect((state as Record<string, unknown>)['idToken']).toBeUndefined();
        expect((state as Record<string, unknown>)['clientSecret']).toBeUndefined();
    });

    it('persists only minimal non-secret session metadata in browser storage', () => {
        TestBed.configureTestingModule({});
        const storage = TestBed.inject(AuthSessionBrowserStorageService);

        storage.writeSession({
            profile: {
                subject: 'user-123',
                displayName: 'Alec',
                email: 'alec@example.com',
                roles: ['owner'],
            },
            provider: 'future-cognito',
            expiresAtEpochMs: 1780000000000,
        });

        expect(storage.readSession()).toEqual({
            profile: {
                subject: 'user-123',
                roles: ['owner'],
            },
            provider: 'future-cognito',
            expiresAtEpochMs: 1780000000000,
        });
    });

    it('does not touch browser storage on the server platform', () => {
        TestBed.configureTestingModule({
            providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
        });
        const storage = TestBed.inject(AuthSessionBrowserStorageService);

        expect(storage.readSession()).toBeNull();
        expect(() => storage.writeSession({
            profile: { subject: 'user-123' },
            provider: 'future-cognito',
            expiresAtEpochMs: 1780000000000,
        })).not.toThrow();
    });
});
