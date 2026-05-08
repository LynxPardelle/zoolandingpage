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

    beforeEach(() => {
        proxy = jasmine.createSpyObj<RuntimeApiProxyClientService>('RuntimeApiProxyClientService', ['readSource', 'executeAction']);
        mapper = jasmine.createSpyObj<RuntimeDataSourceMapperService>('RuntimeDataSourceMapperService', ['mapResponse']);

        TestBed.configureTestingModule({
            providers: [
                RuntimeDataSourceService,
                VariableStoreService,
                { provide: RuntimeApiProxyClientService, useValue: proxy },
                { provide: RuntimeDataSourceMapperService, useValue: mapper },
            ],
        });

        service = TestBed.inject(RuntimeDataSourceService);
        variables = TestBed.inject(VariableStoreService);
    });

    afterEach(() => {
        service.stop();
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
});
