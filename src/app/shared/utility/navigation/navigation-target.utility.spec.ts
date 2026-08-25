import { DRAFT_RUNTIME_STICKY_QUERY_PARAMS } from '../../services/draft-runtime.service';
import { resolveNavigationTarget } from './navigation-target.utility';

describe('navigation target utility', () => {
  it('serializes a hash-only target against the current non-root path with only allowed sticky query parameters', () => {
    const target = resolveNavigationTarget('#astra-china-services', {
      currentHref: 'https://grupoastralegal.com/soft-landing-china/eng?draftDomain=grupoastralegal.com&debugWorkspace=false&lang=en&ref=drop',
      stickyQueryParams: DRAFT_RUNTIME_STICKY_QUERY_PARAMS.filter((entry) => entry !== 'lang'),
    });

    expect(target).toEqual({
      href: '/soft-landing-china/eng?draftDomain=grupoastralegal.com&debugWorkspace=false#astra-china-services',
      internal: true,
      hashOnly: true,
      path: null,
      queryParams: null,
      fragment: 'astra-china-services',
    });
  });

  it('preserves the language on ordinary hash-only links when it remains in the sticky allowlist', () => {
    const target = resolveNavigationTarget('#main-content', {
      currentHref: 'https://grupoastralegal.com/servicios?draftDomain=grupoastralegal.com&debugWorkspace=false&lang=zh&ref=drop',
      stickyQueryParams: DRAFT_RUNTIME_STICKY_QUERY_PARAMS,
    });

    expect(target.href).toBe('/servicios?draftDomain=grupoastralegal.com&debugWorkspace=false&lang=zh#main-content');
    expect(target.hashOnly).toBeTrue();
  });
});
