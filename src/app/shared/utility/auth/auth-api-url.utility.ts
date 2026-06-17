import { environment } from '@/environments/environment';

const TEST_PREVIEW_HOST = 'test.zoolandingpage.com.mx';

type TAuthEndpointOptions = {
    readonly preserveRelativeOutsideTesting?: boolean;
};

export function buildAuthEndpointUrl(
    endpoint: string,
    requestUrl?: string | null,
    options: TAuthEndpointOptions = {},
): string {
    const normalizedEndpoint = clean(endpoint);
    if (!normalizedEndpoint) {
        return normalizedEndpoint;
    }
    if (/^https:\/\//i.test(normalizedEndpoint)) {
        return normalizedEndpoint;
    }

    const testingHost = currentHost(requestUrl) === TEST_PREVIEW_HOST;
    if (options.preserveRelativeOutsideTesting === true && !testingHost) {
        return normalizedEndpoint;
    }

    const configuredBase = testingHost
        ? clean(environment.apiProxyTestUrl) || clean(environment.apiProxyUrl) || clean(environment.apiUrl)
        : clean(environment.apiUrl) || clean(environment.apiProxyUrl);
    if (configuredBase) {
        return new URL(normalizedEndpoint.replace(/^\//, ''), `${ configuredBase.replace(/\/$/, '') }/`).toString();
    }

    return new URL(normalizedEndpoint, currentOrigin(requestUrl)).toString();
}

function currentHost(requestUrl?: string | null): string {
    const fromRequest = clean(requestUrl);
    if (fromRequest) {
        try {
            return new URL(fromRequest, 'http://localhost').hostname.toLowerCase();
        } catch {
            // Fall through to browser location.
        }
    }

    if (typeof window !== 'undefined' && window.location?.hostname) {
        return window.location.hostname.toLowerCase();
    }

    return '';
}

function currentOrigin(requestUrl?: string | null): string {
    const fromRequest = clean(requestUrl);
    if (fromRequest) {
        try {
            return new URL(fromRequest, 'http://localhost').origin;
        } catch {
            // Fall through to browser location.
        }
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }

    return 'http://localhost';
}

function clean(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}
