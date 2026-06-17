import { buildAuthEndpointUrl } from './auth-api-url.utility';

describe('buildAuthEndpointUrl', () => {
    it('routes auth endpoints on the shared testing host to the testing API proxy stack', () => {
        expect(buildAuthEndpointUrl(
            '/auth/signup',
            'https://test.zoolandingpage.com.mx/acceso?draftDomain=zoositioweb.com.mx',
        )).toBe('https://11zpm6wug2.execute-api.us-east-1.amazonaws.com/Prod/auth/signup');
    });

    it('keeps remote auth paths relative outside testing when requested', () => {
        expect(buildAuthEndpointUrl(
            '/auth/runtime-config',
            'https://zoositioweb.com.mx/acceso',
            { preserveRelativeOutsideTesting: true },
        )).toBe('/auth/runtime-config');
    });

    it('routes production custom auth forms to the stable API domain', () => {
        expect(buildAuthEndpointUrl(
            '/auth/signin',
            'https://zoositioweb.com.mx/acceso',
        )).toBe('https://api.zoolandingpage.com.mx/auth/signin');
    });
});
