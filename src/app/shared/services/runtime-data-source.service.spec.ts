import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RuntimeApiProxyClientService } from './runtime-api-proxy-client.service';
import { RuntimeDataSourceMapperService } from './runtime-data-source-mapper.service';
import { RuntimeDataSourceService } from './runtime-data-source.service';
import { VariableStoreService } from './variable-store.service';

describe('RuntimeDataSourceService', () => {
    let service: RuntimeDataSourceService;
    let variables: VariableStoreService;
    let proxy: jasmine.SpyObj<RuntimeApiProxyClientService>;
    let mapper: jasmine.SpyObj<RuntimeDataSourceMapperService>;
    let runtimeSearchParams: URLSearchParams;
    const nativeHistoryReplaceState = History.prototype.replaceState;

    const setRuntimeUrl = (href: string): void => {
        const url = new URL(href, 'http://localhost');
        runtimeSearchParams = new URLSearchParams(url.search);
        nativeHistoryReplaceState.call(window.history, {}, '', `${ url.pathname }${ url.search }${ url.hash }`);
    };

    beforeEach(() => {
        proxy = jasmine.createSpyObj<RuntimeApiProxyClientService>('RuntimeApiProxyClientService', ['readSource', 'executeAction']);
        mapper = jasmine.createSpyObj<RuntimeDataSourceMapperService>('RuntimeDataSourceMapperService', ['mapResponse']);
        runtimeSearchParams = new URLSearchParams();

        TestBed.configureTestingModule({
            providers: [
                RuntimeDataSourceService,
                VariableStoreService,
                { provide: PLATFORM_ID, useValue: 'browser' },
                { provide: RuntimeApiProxyClientService, useValue: proxy },
                { provide: RuntimeDataSourceMapperService, useValue: mapper },
            ],
        });

        service = TestBed.inject(RuntimeDataSourceService);
        variables = TestBed.inject(VariableStoreService);
        spyOn<any>(service, 'currentSearchParams').and.callFake(() => new URLSearchParams(runtimeSearchParams.toString()));
    });

    afterEach(() => {
        service.stop();
        setRuntimeUrl('/context.html');
        TestBed.resetTestingModule();
    });

    it('loads multiple data sources and writes mapped results to their configured targets', async () => {
        proxy.readSource.and.callFake((request) => Promise.resolve({
            ok: true,
            data: { upstream: request.sourceId },
        }) as any);
        mapper.mapResponse.and.callFake((response) => ({
            items: [{ title: `mapped:${ (response as any).upstream }` }],
        }));

        await service.start({
            domain: 'music.lynxpardelle.com',
            pageId: 'default',
            dataSources: [
                {
                    id: 'spotify-releases',
                    proxySourceId: 'spotifyArtistAlbums',
                    target: 'remote.music.releases',
                    mapper: { itemsPath: 'items' },
                },
                {
                    id: 'blog-posts',
                    proxySourceId: 'cmsRecentPosts',
                    target: 'remote.blog.posts',
                    mapper: { itemsPath: 'posts' },
                },
            ],
        });

        expect(proxy.readSource.calls.count()).toBe(2);
        expect(proxy.readSource.calls.argsFor(0)[0]).toEqual({
            domain: 'music.lynxpardelle.com',
            pageId: 'default',
            sourceId: 'spotifyArtistAlbums',
            input: undefined,
        });
        expect(variables.get('remote.music.releases.items')).toEqual([{ title: 'mapped:spotifyArtistAlbums' }]);
        expect(variables.get('remote.blog.posts.items')).toEqual([{ title: 'mapped:cmsRecentPosts' }]);
        expect(variables.get('remoteStatus.spotify-releases.state')).toBe('success');
        expect(variables.get('remoteStatus.blog-posts.state')).toBe('success');
    });

    it('loads initial data sources in order to avoid browser proxy request bursts', async () => {
        let resolveFirst!: (value: { ok: true; data: { upstream: string } }) => void;
        const firstResponse = new Promise<{ ok: true; data: { upstream: string } }>((resolve) => {
            resolveFirst = resolve;
        });

        proxy.readSource.and.callFake((request) => {
            if (request.sourceId === 'firstSource') {
                return firstResponse as any;
            }

            return Promise.resolve({
                ok: true,
                data: { upstream: request.sourceId },
            }) as any;
        });
        mapper.mapResponse.and.callFake((response) => ({
            items: [{ title: `mapped:${ (response as any).upstream }` }],
        }));

        const startPromise = service.start({
            domain: 'pokeapi-demo.zoolandingpage.com.mx',
            pageId: 'default',
            dataSources: [
                {
                    id: 'first',
                    proxySourceId: 'firstSource',
                    target: 'remote.first',
                },
                {
                    id: 'second',
                    proxySourceId: 'secondSource',
                    target: 'remote.second',
                },
            ],
        });

        await Promise.resolve();

        expect(proxy.readSource.calls.count()).toBe(1);
        expect(proxy.readSource.calls.mostRecent().args[0].sourceId).toBe('firstSource');
        expect(variables.get('remoteStatus.first.state')).toBe('loading');
        expect(variables.get('remoteStatus.second.state')).toBe('loading');

        resolveFirst({ ok: true, data: { upstream: 'firstSource' } });
        await startPromise;

        expect(proxy.readSource.calls.count()).toBe(2);
        expect(proxy.readSource.calls.mostRecent().args[0].sourceId).toBe('secondSource');
        expect(variables.get('remote.first.items')).toEqual([{ title: 'mapped:firstSource' }]);
        expect(variables.get('remote.second.items')).toEqual([{ title: 'mapped:secondSource' }]);
    });

    it('marks active navigation data sources as loading without sending proxy requests', () => {
        setRuntimeUrl('/?type=electric');
        variables.setRuntimeValue('remote.pokemon.catalog', {
            items: [{ name: 'bulbasaur' }],
            count: 1,
        });

        service.markInitialSourcesLoading({
            pageId: 'default',
            dataSources: [
                {
                    id: 'catalog-index',
                    proxySourceId: 'pokeapiPokemonIndex',
                    target: 'remote.pokemon.catalog',
                    statusTarget: 'remoteStatus.pokemon.catalog.index',
                    skipWhenQueryParams: ['type'],
                },
                {
                    id: 'catalog-type',
                    proxySourceId: 'pokeapiTypePokemon',
                    target: 'remote.pokemon.catalog',
                    statusTarget: 'remoteStatus.pokemon.catalog.type',
                    pageIds: ['default'],
                    clearTargetOnLoad: true,
                    requiredInputKeys: ['type'],
                    input: {
                        type: {
                            source: 'queryParam',
                            key: 'type',
                            transforms: ['trim', 'lowercase'],
                        },
                    },
                },
            ],
        });

        expect(proxy.readSource).not.toHaveBeenCalled();
        expect(variables.get('remoteStatus.pokemon.catalog.index.state')).toBeUndefined();
        expect(variables.get('remoteStatus.pokemon.catalog.type.state')).toBe('loading');
        expect(variables.get('remote.pokemon.catalog.items')).toEqual([]);
        expect(variables.get('remote.pokemon.catalog.count')).toBeUndefined();
    });

    it('skips data sources scoped to a different page id', async () => {
        proxy.readSource.and.resolveTo({ ok: true, data: { items: [{ name: 'pikachu' }] } });
        mapper.mapResponse.and.returnValue({ items: [{ name: 'pikachu' }] });

        await service.start({
            domain: 'pokeapi-demo.zoolandingpage.com.mx',
            pageId: 'default',
            dataSources: [
                {
                    id: 'pokeapi-selected-pokemon',
                    proxySourceId: 'pokeapiPokemonDetail',
                    target: 'remote.pokemon.selected',
                    pageIds: ['pokemon-detail'],
                } as any,
            ],
        });

        expect(proxy.readSource).not.toHaveBeenCalled();
        expect(variables.get('remote.pokemon.selected')).toBeUndefined();
        expect(variables.get('remoteStatus.pokeapi-selected-pokemon')).toBeUndefined();
    });

    it('resolves query-param input values before calling the proxy', async () => {
        proxy.readSource.and.resolveTo({ ok: true, data: { items: [{ name: 'charizard' }] } });
        mapper.mapResponse.and.returnValue({ items: [{ name: 'charizard' }] });
        setRuntimeUrl('/pokemon?name=Charizard%20');

        await service.start({
            domain: 'pokeapi-demo.zoolandingpage.com.mx',
            pageId: 'pokemon-detail',
            dataSources: [
                {
                    id: 'pokeapi-selected-pokemon',
                    proxySourceId: 'pokeapiPokemonDetail',
                    target: 'remote.pokemon.selected',
                    input: {
                        pokemonName: {
                            source: 'queryParam',
                            key: 'name',
                            fallback: 'pikachu',
                            transforms: ['trim', 'lowercase'],
                        },
                    },
                },
            ],
        });

        expect(proxy.readSource.calls.mostRecent().args[0].input).toEqual({
            pokemonName: 'charizard',
        });
    });

    it('resolves query-param page offsets before calling the proxy', async () => {
        proxy.readSource.and.resolveTo({ ok: true, data: { results: [] } });
        mapper.mapResponse.and.returnValue({ items: [] });
        setRuntimeUrl('/?page=3&pageSize=8');

        await service.start({
            domain: 'pokeapi-demo.zoolandingpage.com.mx',
            pageId: 'default',
            dataSources: [
                {
                    id: 'pokeapi-catalog-index',
                    proxySourceId: 'pokeapiPokemonIndex',
                    target: 'remote.pokemon.catalog',
                    input: {
                        limit: {
                            source: 'queryParam',
                            key: 'pageSize',
                            fallback: 4,
                        },
                        offset: {
                            source: 'queryParamPageOffset',
                            pageKey: 'page',
                            pageSizeKey: 'pageSize',
                            pageFallback: 1,
                            pageSizeFallback: 4,
                        },
                    },
                },
            ],
        });

        expect(proxy.readSource.calls.mostRecent().args[0].input).toEqual({
            limit: '8',
            offset: 16,
        });
    });

    it('skips runtime data sources when a required input resolves empty', async () => {
        setRuntimeUrl('/?draftDomain=pokeapi-demo.zoolandingpage.com.mx');

        await service.start({
            domain: 'pokeapi-demo.zoolandingpage.com.mx',
            pageId: 'default',
            dataSources: [
                {
                    id: 'pokeapi-catalog-search-pokemon',
                    proxySourceId: 'pokeapiPokemonDetail',
                    target: 'remote.pokemon.catalog',
                    statusTarget: 'remoteStatus.pokemon.catalog.search',
                    requiredInputKeys: ['pokemonName'],
                    input: {
                        pokemonName: {
                            source: 'queryParam',
                            key: 'pokemon',
                            transforms: ['trim', 'lowercase'],
                        },
                    },
                },
            ],
        });

        expect(proxy.readSource).not.toHaveBeenCalled();
        expect(variables.get('remote.pokemon.catalog')).toBeUndefined();
        expect(variables.get('remoteStatus.pokemon.catalog.search')).toBeUndefined();
    });

    it('skips data sources when a configured query param is active', async () => {
        setRuntimeUrl('/?draftDomain=pokeapi-demo.zoolandingpage.com.mx&move=mega-punch');

        await service.start({
            domain: 'pokeapi-demo.zoolandingpage.com.mx',
            pageId: 'default',
            dataSources: [
                {
                    id: 'pokeapi-catalog-index',
                    proxySourceId: 'pokeapiPokemonIndex',
                    target: 'remote.pokemon.catalog',
                    skipWhenQueryParams: ['pokemon', 'type', 'move'],
                    input: {
                        limit: 1500,
                        offset: 0,
                    },
                },
            ],
        });

        expect(proxy.readSource).not.toHaveBeenCalled();
        expect(variables.get('remote.pokemon.catalog')).toBeUndefined();
        expect(variables.get('remoteStatus.pokeapi-catalog-index')).toBeUndefined();
    });

    it('does not skip configured query params when they resolve empty or all', async () => {
        proxy.readSource.and.resolveTo({ ok: true, data: { results: [{ name: 'bulbasaur' }] } });
        mapper.mapResponse.and.returnValue({ items: [{ name: 'bulbasaur' }] });
        setRuntimeUrl('/?draftDomain=pokeapi-demo.zoolandingpage.com.mx&move=all');

        await service.start({
            domain: 'pokeapi-demo.zoolandingpage.com.mx',
            pageId: 'default',
            dataSources: [
                {
                    id: 'pokeapi-catalog-index',
                    proxySourceId: 'pokeapiPokemonIndex',
                    target: 'remote.pokemon.catalog',
                    skipWhenQueryParams: ['move'],
                },
            ],
        });

        expect(proxy.readSource).toHaveBeenCalledTimes(1);
        expect(variables.get('remote.pokemon.catalog.items')).toEqual([{ name: 'bulbasaur' }]);
    });

    it('runs required-input data sources when the required query param is present', async () => {
        proxy.readSource.and.resolveTo({ ok: true, data: { items: [{ name: 'snorlax' }] } });
        mapper.mapResponse.and.returnValue({ items: [{ name: 'snorlax' }] });
        setRuntimeUrl('/?pokemon=Snorlax%20');

        await service.start({
            domain: 'pokeapi-demo.zoolandingpage.com.mx',
            pageId: 'default',
            dataSources: [
                {
                    id: 'pokeapi-catalog-search-pokemon',
                    proxySourceId: 'pokeapiPokemonDetail',
                    target: 'remote.pokemon.catalog',
                    requiredInputKeys: ['pokemonName'],
                    input: {
                        pokemonName: {
                            source: 'queryParam',
                            key: 'pokemon',
                            transforms: ['trim', 'lowercase'],
                        },
                    },
                },
            ],
        });

        expect(proxy.readSource.calls.mostRecent().args[0].input).toEqual({
            pokemonName: 'snorlax',
        });
        expect(variables.get('remote.pokemon.catalog.items')).toEqual([{ name: 'snorlax' }]);
    });

    it('resolves literal and variable input values while preserving raw literal fields', async () => {
        variables.setRuntimeValue('pokemon.selectedName', 'Pikachu');
        proxy.readSource.and.resolveTo({ ok: true, data: { items: [{ name: 'pikachu' }] } });
        mapper.mapResponse.and.returnValue({ items: [{ name: 'pikachu' }] });

        await service.start({
            domain: 'pokeapi-demo.zoolandingpage.com.mx',
            pageId: 'pokemon-detail',
            dataSources: [
                {
                    id: 'pokeapi-selected-pokemon',
                    proxySourceId: 'pokeapiPokemonDetail',
                    target: 'remote.pokemon.selected',
                    input: {
                        pokemonName: {
                            source: 'var',
                            path: 'pokemon.selectedName',
                            transforms: ['trim', 'lowercase'],
                        },
                        countryCode: {
                            source: 'literal',
                            value: 'MX',
                        },
                        includeArtwork: true,
                    },
                },
            ],
        });

        expect(proxy.readSource.calls.mostRecent().args[0].input).toEqual({
            pokemonName: 'pikachu',
            countryCode: 'MX',
            includeArtwork: true,
        });
    });

    it('writes an empty status when mapped source items are empty', async () => {
        proxy.readSource.and.resolveTo({ ok: true, data: { items: [] } });
        mapper.mapResponse.and.returnValue({ items: [] });

        await service.start({
            domain: 'music.lynxpardelle.com',
            dataSources: [
                {
                    id: 'empty-source',
                    proxySourceId: 'emptyUpstream',
                    target: 'remote.empty',
                },
            ],
        });

        expect(variables.get('remote.empty.items')).toEqual([]);
        expect(variables.get('remoteStatus.empty-source.state')).toBe('empty');
        expect(variables.get('remoteStatus.empty-source.error')).toBeNull();
    });

    it('retries transient read failures before falling back to static values', async () => {
        proxy.readSource.and.returnValues(
            Promise.reject(new Error('Failed to fetch')),
            Promise.resolve({ ok: true, data: { results: [{ trackName: 'My Soul' }] } }),
        );
        mapper.mapResponse.and.returnValue({ items: [{ title: 'My Soul' }] });

        await service.start({
            domain: 'music.lynxpardelle.com',
            pageId: 'default',
            dataSources: [
                {
                    id: 'itunes-songs',
                    proxySourceId: 'itunesSongSearch',
                    target: 'remote.music.releases',
                    mapper: { itemsPath: 'results' },
                },
            ],
        });

        expect(proxy.readSource.calls.count()).toBe(2);
        expect(variables.get('remote.music.releases.items')).toEqual([{ title: 'My Soul' }]);
        expect(variables.get('remoteStatus.itunes-songs.state')).toBe('success');
    });

    it('writes a safe error status without replacing previous target data', async () => {
        variables.setRuntimeValue('remote.music.releases', {
            items: [{ title: 'Existing' }],
        });
        proxy.readSource.and.rejectWith(new Error('Proxy unavailable'));

        await service.start({
            domain: 'music.lynxpardelle.com',
            dataSources: [
                {
                    id: 'spotify-releases',
                    proxySourceId: 'spotifyArtistAlbums',
                    target: 'remote.music.releases',
                },
            ],
        });

        expect(variables.get('remote.music.releases.items')).toEqual([{ title: 'Existing' }]);
        expect(variables.get('remoteStatus.spotify-releases.state')).toBe('error');
        expect(variables.get('remoteStatus.spotify-releases.error')).toBe('Proxy unavailable');
    });

    it('can append mapped API items into one catalog target while preserving fallback fields', async () => {
        variables.setPayload({
            version: 1,
            domain: 'pokeapi-demo.zoolandingpage.com.mx',
            pageId: 'default',
            variables: {
                remote: {
                    pokemon: {
                        catalog: {
                            items: [
                                {
                                    name: 'pikachu',
                                    isEvolution: true,
                                    evolvesFrom: 'pichu',
                                },
                            ],
                        },
                    },
                },
            },
        } as any);
        proxy.readSource.and.callFake((request) => Promise.resolve({
            ok: true,
            data: { upstream: request.sourceId },
        }) as any);
        mapper.mapResponse.and.callFake((response) => {
            const upstream = (response as any).upstream;
            return {
                items: upstream === 'pokeapiPikachu'
                    ? [{ id: 25, name: 'pikachu', types: ['electric'], moves: [{ move: { name: 'thunder-shock' } }] }]
                    : [{ id: 6, name: 'charizard', types: ['fire'], moves: [{ move: { name: 'flamethrower' } }] }],
            };
        });

        await service.start({
            domain: 'pokeapi-demo.zoolandingpage.com.mx',
            pageId: 'default',
            dataSources: [
                {
                    id: 'pokeapi-pikachu',
                    proxySourceId: 'pokeapiPikachu',
                    target: 'remote.pokemon.catalog',
                    mergeMode: 'appendItems',
                } as any,
                {
                    id: 'pokeapi-charizard',
                    proxySourceId: 'pokeapiCharizard',
                    target: 'remote.pokemon.catalog',
                    mergeMode: 'appendItems',
                } as any,
            ],
        });

        expect(variables.get('remote.pokemon.catalog.items')).toEqual([
            jasmine.objectContaining({
                id: 25,
                name: 'pikachu',
                isEvolution: true,
                evolvesFrom: 'pichu',
                types: ['electric'],
            }),
            jasmine.objectContaining({
                id: 6,
                name: 'charizard',
                types: ['fire'],
            }),
        ]);
    });

    it('loads only data sources explicitly enabled for SSR mode', async () => {
        proxy.readSource.and.callFake((request) => Promise.resolve({
            ok: true,
            data: { upstream: request.sourceId },
        }) as any);
        mapper.mapResponse.and.callFake((response) => ({
            items: [{ title: `mapped:${ (response as any).upstream }` }],
        }));

        await service.start({
            domain: 'pokeapi-demo.zoolandingpage.com.mx',
            pageId: 'pokemon-detail',
            mode: 'ssr',
            dataSources: [
                {
                    id: 'selected',
                    proxySourceId: 'pokeapiPokemonDetail',
                    target: 'remote.pokemon.selected',
                    pageIds: ['pokemon-detail'],
                    ssr: true,
                },
                {
                    id: 'autocomplete-index',
                    proxySourceId: 'pokeapiPokemonIndex',
                    target: 'remote.pokemon.index',
                    pageIds: ['pokemon-detail'],
                },
            ],
        });

        expect(proxy.readSource.calls.count()).toBe(1);
        expect(proxy.readSource.calls.mostRecent().args[0].sourceId).toBe('pokeapiPokemonDetail');
        expect(variables.get('remote.pokemon.selected.items')).toEqual([{ title: 'mapped:pokeapiPokemonDetail' }]);
        expect(variables.get('remote.pokemon.index.items')).toBeUndefined();
    });
});
