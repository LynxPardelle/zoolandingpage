import { isPublicRouteRedirects, resolvePublicRouteRedirect } from './public-route-redirect';

describe('public route redirects', () => {
    const site = (redirects: unknown = [{ from: '/landingpages', to: '/sitios-web', preserveQueryParams: ['q', 'categoria', 'lang'] }]) => ({
        domain: 'example.test', routes: [{ path: '/sitios-web', pageId: 'web' }], site: { seo: { redirects } },
    });
    it('redirects only the exact opt-in path, allowing a trailing slash and preserving approved filters', () => {
        expect(resolvePublicRouteRedirect(site(), '/landingpages/?q=guitarra&categoria=cursos&lang=es&discard=1#catalogo'))
            .toBe('/sitios-web?q=guitarra&categoria=cursos&lang=es#catalogo');
        for (const path of ['/landingpages-extra', '/other/landingpages', '/%6candingpages', '//outside.test/landingpages', '/other/../landingpages', '/sitios-web'])
            expect(resolvePublicRouteRedirect(site(), path)).toBeNull();
        expect(resolvePublicRouteRedirect({ routes: [] }, '/landingpages')).toBeNull();
    });
    it('retains only validated preview context when the caller permits it, never an obsolete page override', () => {
        const url = '/landingpages?draftDomain=example.test&debugWorkspace=false&draftPageId=old&lang=es';
        expect(resolvePublicRouteRedirect(site(), url, { allowDraftPreview: true }))
            .toBe('/sitios-web?lang=es&draftDomain=example.test&debugWorkspace=false');
        expect(resolvePublicRouteRedirect(site(), url)).toBe('/sitios-web?lang=es');
        expect(resolvePublicRouteRedirect(site(), url.replace('example.test', 'other.test'), { allowDraftPreview: true }))
            .toBe('/sitios-web?lang=es');
        expect(resolvePublicRouteRedirect(site(), '/landingpages?draftDomain=example.test&draftDomain=example.test&debugWorkspace=true', { allowDraftPreview: true }))
            .toBe('/sitios-web');
        expect(resolvePublicRouteRedirect({ ...site(), aliases: ['www.example.test'] }, '/landingpages?draftDomain=www.example.test&debugWorkspace=false', { allowDraftPreview: true }))
            .toBe('/sitios-web?draftDomain=example.test&debugWorkspace=false');
    });
    it('rejects redirects with external destinations, traversal, unknown targets, chains, loops or extra properties', () => {
        for (const bad of ['//outside.test', 'https://outside.test', '/../sitios-web', '/./sitios-web', '/a/../sitios-web', '/%2e%2e/sitios-web', '/a\\b', '/sitios-web?x=1', '/sitios-web#top', '/missing'])
            expect(resolvePublicRouteRedirect(site([{ from: '/landingpages', to: bad }]), '/landingpages')).withContext(bad).toBeNull();
        for (const rules of [
            [{ from: '/landingpages', to: '/landingpages/' }],
            [{ from: '/landingpages', to: '/other' }, { from: '/other', to: '/sitios-web' }],
            [{ from: '/landingpages', to: '/sitios-web' }, { from: '/landingpages/', to: '/sitios-web' }],
            [{ from: '/landingpages', to: '/sitios-web', statusCode: 302 }],
            [{ from: '/landingpages', to: '/sitios-web', preserveQueryParams: ['draftPageId'] }],
        ]) expect(resolvePublicRouteRedirect(site(rules), '/landingpages')).toBeNull();
        expect(isPublicRouteRedirects(Array.from({ length: 33 }, (_, n) => ({ from: `/old-${n}`, to: '/sitios-web' })))).toBeFalse();
    });
});
