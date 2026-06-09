import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import type { TStoredAuthSession } from './auth.models';

const AUTH_SESSION_STORAGE_KEY = 'zlp.auth.publicSession.v1';

@Injectable({ providedIn: 'root' })
export class AuthSessionBrowserStorageService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);

    readSession(): TStoredAuthSession | null {
        if (!this.isBrowser || typeof sessionStorage === 'undefined') {
            return null;
        }

        try {
            const raw = sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
            if (!raw) return null;

            const parsed = JSON.parse(raw) as Partial<TStoredAuthSession>;
            const expiresAtEpochMs = Number(parsed.expiresAtEpochMs);
            if (!parsed.profile?.subject || !parsed.provider || !Number.isFinite(expiresAtEpochMs)) {
                return null;
            }

            return this.toStoredSession({
                profile: parsed.profile,
                provider: parsed.provider,
                expiresAtEpochMs,
            });
        } catch {
            return null;
        }
    }

    writeSession(session: TStoredAuthSession): void {
        if (!this.isBrowser || typeof sessionStorage === 'undefined') {
            return;
        }

        try {
            sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(this.toStoredSession(session)));
        } catch {
            // Storage can be unavailable in private browsing or locked-down embedded contexts.
        }
    }

    clearSession(): void {
        if (!this.isBrowser || typeof sessionStorage === 'undefined') {
            return;
        }

        try {
            sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
        } catch {
            // Storage can be unavailable in private browsing or locked-down embedded contexts.
        }
    }

    private toStoredSession(session: TStoredAuthSession): TStoredAuthSession {
        return {
            profile: {
                subject: session.profile.subject,
                roles: session.profile.roles ?? [],
            },
            provider: session.provider,
            expiresAtEpochMs: session.expiresAtEpochMs,
        };
    }
}
