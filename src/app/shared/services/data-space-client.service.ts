import { Injectable, inject } from '@angular/core';
import type { TDataSpaceBrowserResponse } from '@/app/shared/types/data-space.types';
import type {
    TRuntimeApiProxyActionRequest,
    TRuntimeApiProxyReadRequest,
} from './runtime-api-proxy-client.service';
import { ServerFeatureHttpService } from './server-feature-http';
import { buildDataSpaceRuntimeInput, serverFeatureRecord } from './server-feature-runtime-request';

@Injectable({ providedIn: 'root' })
export class DataSpaceClientService {
    private readonly http = inject(ServerFeatureHttpService);

    readSource<T = unknown>(request: TRuntimeApiProxyReadRequest): Promise<TDataSpaceBrowserResponse<T>> {
        const rawInput = serverFeatureRecord(request.input);
        const rawBinding = serverFeatureRecord(rawInput['dataSpace']);
        const built = buildDataSpaceRuntimeInput(rawBinding, rawInput);
        if (!built) return this.http.invalidRequest();
        const input = serverFeatureRecord(built);
        const binding = serverFeatureRecord(input['dataSpace']);
        const access = binding['access'] === 'public' ? 'public' : 'protected';
        return this.send<T>(
            access === 'public' ? '/features/data-spaces/public-read' : '/features/data-spaces/read',
            request.domain,
            {
                operation: String(binding['read'] ?? ''),
                spaceId: String(binding['spaceId'] ?? ''),
                input: this.withoutBinding(input),
            },
            access === 'protected',
            false,
            false,
        );
    }

    executeAction<T = unknown>(request: TRuntimeApiProxyActionRequest): Promise<TDataSpaceBrowserResponse<T>> {
        const rawInput = serverFeatureRecord(request.input);
        const built = buildDataSpaceRuntimeInput(serverFeatureRecord(rawInput['dataSpace']), rawInput);
        if (!built) return this.http.invalidRequest();
        const input = serverFeatureRecord(built);
        const binding = serverFeatureRecord(input['dataSpace']);
        return this.send<T>('/features/data-spaces/action', request.domain, {
            operation: String(binding['action'] ?? ''),
            spaceId: String(binding['spaceId'] ?? ''),
            input: this.withoutBinding(input),
        }, true, true, true);
    }

    private send<T>(
        path: string,
        domain: string,
        payload: Readonly<Record<string, unknown>>,
        protectedRequest: boolean,
        csrf: boolean,
        idempotency: boolean,
    ): Promise<TDataSpaceBrowserResponse<T>> {
        return this.http.request<TDataSpaceBrowserResponse<T>>({
            path, domain, payload, protectedRequest, csrf, idempotency,
        });
    }

    private withoutBinding(input: Record<string, unknown>): Record<string, unknown> {
        const { dataSpace: _binding, ...safeInput } = input;
        return safeInput;
    }
}
