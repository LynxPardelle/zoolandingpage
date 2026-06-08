import { computed, Injectable, signal } from '@angular/core';
import type { TDraftTenantProfile, TDraftTenantState } from './draft-tenant.models';

const initialDraftTenantState: TDraftTenantState = {
    active: null,
    authProfileId: null,
};

@Injectable({ providedIn: 'root' })
export class DraftTenantFacade {
    private readonly state = signal<TDraftTenantState>(initialDraftTenantState);

    readonly activeTenant = computed(() => this.state().active);
    readonly authProfileId = computed(() => this.state().authProfileId);

    setActiveTenant(tenant: TDraftTenantProfile): void {
        this.state.update((current) => ({
            ...current,
            active: tenant,
        }));
    }

    selectAuthProfile(authProfileId: string): void {
        this.state.update((current) => ({
            ...current,
            authProfileId,
        }));
    }

    clear(): void {
        this.state.set(initialDraftTenantState);
    }

    snapshot(): TDraftTenantState {
        return this.state();
    }
}
