type SharedBlogSource = {
    readonly hubId?: string;
    readonly ownerDraftDomain?: string;
    readonly source?: string;
    readonly canonicalMode?: string;
};

export function sharedZoositeArticleCanonical(
    site: { readonly domain?: string; readonly runtime?: { readonly contentHubs?: readonly SharedBlogSource[] } } | null | undefined,
    path: string,
): string {
    if (site?.domain !== 'zooberiahsystems.com' || !/^\/blog\/[a-z0-9-]+\/[a-z0-9-]+$/.test(path)) {
        return '';
    }
    const sharesZoosite = site.runtime?.contentHubs?.some(hub =>
        hub.hubId === 'zoosite-main'
        && hub.ownerDraftDomain === 'zoositioweb.com.mx'
        && hub.source === 'authorized'
        && hub.canonicalMode === 'noindex-shared');
    return sharesZoosite ? `https://zoositioweb.com.mx${ path }` : '';
}
