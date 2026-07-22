import { Injectable, inject } from '@angular/core';
import type { TIntegrationPlatformBrowserResponse } from '@/app/shared/types/integration-platform.types';
import type {
    TRuntimeApiProxyActionRequest,
    TRuntimeApiProxyReadRequest,
} from './runtime-api-proxy-client.service';
import { ServerFeatureHttpService } from './server-feature-http';
import { buildIntegrationPlatformRuntimeInput, serverFeatureRecord } from './server-feature-runtime-request';

const ONBOARDING_OPERATIONS: Record<string, string> = {
    stripeOnboardingStart: 'start',
    stripeOnboardingReturn: 'return',
    stripeOnboardingDeauthorize: 'deauthorize',
};

@Injectable({ providedIn: 'root' })
export class IntegrationPlatformClientService {
    private readonly http = inject(ServerFeatureHttpService);

    readSource<T = unknown>(request: TRuntimeApiProxyReadRequest): Promise<TIntegrationPlatformBrowserResponse<T>> {
        const rawInput = serverFeatureRecord(request.input);
        if (!buildIntegrationPlatformRuntimeInput(serverFeatureRecord(rawInput['integrations']), rawInput)) {
            return this.http.invalidRequest();
        }
        return this.http.request<TIntegrationPlatformBrowserResponse<T>>({
            path: '/features/integrations/read',
            domain: request.domain,
            payload: { operation: 'list' },
            protectedRequest: true,
            csrf: false,
            idempotency: false,
        });
    }

    executeAction<T = unknown>(request: TRuntimeApiProxyActionRequest): Promise<TIntegrationPlatformBrowserResponse<T>> {
        const rawInput = serverFeatureRecord(request.input);
        const built = buildIntegrationPlatformRuntimeInput(serverFeatureRecord(rawInput['integrations']), rawInput);
        if (!built) return this.http.invalidRequest();
        const input = serverFeatureRecord(built);
        const binding = serverFeatureRecord(input['integrations']);
        const action = String(binding['action'] ?? '');
        const onboardingOperation = ONBOARDING_OPERATIONS[action];
        if (!onboardingOperation && !['disable', 'requestReconnect'].includes(action)) {
            return this.http.invalidRequest();
        }
        const { integrations: _binding, ...safeInput } = input;
        return this.http.request<TIntegrationPlatformBrowserResponse<T>>({
            path: onboardingOperation
                ? '/features/integrations/stripe/onboarding'
                : '/features/integrations/action',
            domain: request.domain,
            payload: {
                operation: onboardingOperation || action,
                input: safeInput,
            },
            protectedRequest: true,
            csrf: true,
            idempotency: false,
        });
    }

}
