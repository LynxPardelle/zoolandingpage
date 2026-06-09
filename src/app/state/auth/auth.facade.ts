import { computed, Injectable, inject, signal } from '@angular/core';
import { AuthSessionBrowserStorageService } from './auth-session-browser-storage.service';
import type { TAuthProfile, TAuthSessionState, TStoredAuthSession } from './auth.models';

const initialAuthState: TAuthSessionState = {
    status: 'anonymous',
    profile: null,
    provider: null,
    expiresAtEpochMs: null,
    error: null,
};

@Injectable({ providedIn: 'root' })
export class AuthFacade {
    private readonly storage = inject(AuthSessionBrowserStorageService);
    private readonly state = signal<TAuthSessionState>(initialAuthState);

    readonly status = computed(() => this.state().status);
    readonly profile = computed(() => this.state().profile);
    readonly isAuthenticated = computed(() => this.state().status === 'authenticated');
    readonly error = computed(() => this.state().error);

    restoreSession(): void {
        this.state.update((current) => ({ ...current, status: 'restoring', error: null }));
        const session = this.storage.readSession();
        if (!session) {
            this.state.set(initialAuthState);
            return;
        }

        if (session.expiresAtEpochMs <= Date.now()) {
            this.storage.clearSession();
            this.state.set({
                ...initialAuthState,
                status: 'expired',
            });
            return;
        }

        this.establishSession(session);
    }

    establishSession(session: TStoredAuthSession): void {
        this.state.set({
            status: 'authenticated',
            profile: session.profile,
            provider: session.provider,
            expiresAtEpochMs: session.expiresAtEpochMs,
            error: null,
        });
        this.storage.writeSession(session);
    }

    requestSignIn(provider?: string): void {
        this.state.update((current) => ({
            ...current,
            status: 'restoring',
            provider: provider ?? current.provider,
            error: null,
        }));
    }

    requestSignOut(): void {
        this.storage.clearSession();
        this.state.set(initialAuthState);
    }

    fail(error: string): void {
        this.state.update((current) => ({
            ...current,
            status: 'error',
            error,
        }));
    }

    snapshot(): TAuthSessionState {
        return this.state();
    }

    publicProfile(): TAuthProfile | null {
        return this.profile();
    }
}
