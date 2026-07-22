import { Injectable, inject } from '@angular/core';
import type { TCommerceBrowserResponse } from '@/app/shared/types/commerce.types';
import type {
    TRuntimeApiProxyActionRequest,
    TRuntimeApiProxyReadRequest,
} from './runtime-api-proxy-client.service';
import { ServerFeatureHttpService } from './server-feature-http';
import { buildCommerceRuntimeInput, serverFeatureRecord } from './server-feature-runtime-request';

const CATALOG_ACTIONS = new Set([
    'createItem', 'createOfferVersion', 'createDiscountVersion',
    'advanceOfferLifecycle', 'updateOfferPresentation',
    'advanceDiscountLifecycle', 'updateDiscountPresentation',
]);
const SUBSCRIPTION_ACTIONS = new Set([
    'changePlan', 'applyDiscount', 'removeDiscount', 'pause', 'resume', 'openPortal',
    'migrationPreview', 'migrationExecute', 'migrationPause', 'migrationResume',
    'migrationCancel', 'migrationStatus',
]);
const PUBLIC_READS = new Set(['offerList', 'offerDetail']);

export const commercePublicCheckoutPath = (
    domain: string,
    hostname = typeof location === 'undefined' ? '' : location.hostname,
): string => hostname.toLowerCase() === 'test.zoolandingpage.com.mx'
    ? `/features/commerce/public-action?draftDomain=${ encodeURIComponent(domain) }`
    : '/features/commerce/public-action';

@Injectable({ providedIn: 'root' })
export class CommerceClientService {
    private readonly http = inject(ServerFeatureHttpService);

    readSource<T = unknown>(request: TRuntimeApiProxyReadRequest): Promise<TCommerceBrowserResponse<T>> {
        const rawInput = serverFeatureRecord(request.input);
        const built = buildCommerceRuntimeInput(serverFeatureRecord(rawInput['commerce']), rawInput, 'read');
        if (!built) return this.http.invalidRequest();
        const input = serverFeatureRecord(built);
        const binding = serverFeatureRecord(input['commerce']);
        const operation = String(binding['read'] ?? '');
        const isPublic = binding['access'] === 'public' && PUBLIC_READS.has(operation);
        return this.send<T>(
            isPublic ? '/features/commerce/public-read' : '/features/commerce/read',
            request.domain,
            { operation, input: this.withoutBinding(input) },
            !isPublic,
            false,
            false,
        );
    }

    executeAction<T = unknown>(request: TRuntimeApiProxyActionRequest): Promise<TCommerceBrowserResponse<T>> {
        const rawInput = serverFeatureRecord(request.input);
        const built = buildCommerceRuntimeInput(serverFeatureRecord(rawInput['commerce']), rawInput, 'action');
        if (!built) return this.http.invalidRequest();
        const input = serverFeatureRecord(built);
        const binding = serverFeatureRecord(input['commerce']);
        const operation = String(binding['action'] ?? '');
        const isCheckout = operation === 'admitCheckout';
        if (!isCheckout && !CATALOG_ACTIONS.has(operation) && operation !== 'adjustStock' && !SUBSCRIPTION_ACTIONS.has(operation)) {
            return this.http.invalidRequest();
        }
        const path = isCheckout
            ? commercePublicCheckoutPath(request.domain)
            : operation === 'adjustStock'
                ? '/features/commerce/inventory/action'
                : SUBSCRIPTION_ACTIONS.has(operation)
                    ? '/features/commerce/subscription/action'
                    : '/features/commerce/catalog/action';
        const readLike = operation === 'migrationStatus';
        return this.send<T>(path, request.domain, {
            operation,
            input: this.withoutBinding(input),
        }, !isCheckout, !isCheckout && !readLike, !readLike);
    }

    private send<T>(
        path: string,
        domain: string,
        payload: Readonly<Record<string, unknown>>,
        protectedRequest: boolean,
        csrf: boolean,
        idempotency: boolean,
    ): Promise<TCommerceBrowserResponse<T>> {
        return this.http.request<TCommerceBrowserResponse<T>>({
            path, domain, payload, protectedRequest, csrf, idempotency,
        });
    }

    private withoutBinding(input: Record<string, unknown>): Record<string, unknown> {
        const { commerce: _binding, ...safeInput } = input;
        return safeInput;
    }
}
