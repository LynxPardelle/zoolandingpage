import { VariableStoreService } from './variable-store.service';

type RuntimeWritableVariableStore = VariableStoreService & {
    readonly setRuntimeValue?: (path: string, value: unknown) => void;
    readonly patchRuntimeValues?: (values: Record<string, unknown>) => void;
    readonly clearRuntimeValues?: () => void;
};

describe('VariableStoreService runtime overlay', () => {
    let service: RuntimeWritableVariableStore;

    beforeEach(() => {
        service = new VariableStoreService() as RuntimeWritableVariableStore;
    });

    it('reads runtime values ahead of static payload variables', () => {
        service.setPayload({
            version: 1,
            variables: {
                remote: {
                    music: {
                        releases: {
                            items: [{ title: 'Static release' }],
                        },
                    },
                },
            },
        } as any);

        service.setRuntimeValue?.('remote.music.releases.items', [{ title: 'Runtime release' }]);

        expect(service.get('remote.music.releases.items')).toEqual([{ title: 'Runtime release' }]);
        expect(service.getArray('remote.music.releases.items')).toEqual([{ title: 'Runtime release' }]);
        expect((service.snapshot()['remote'] as any).music.releases.items).toEqual([{ title: 'Runtime release' }]);
    });

    it('patches multiple runtime variable paths without removing existing runtime values', () => {
        service.setPayload({
            version: 1,
            variables: {
                remote: {
                    music: {
                        releases: {
                            items: [],
                        },
                    },
                },
            },
        } as any);

        service.setRuntimeValue?.('remote.music.releases.items', [{ title: 'Song A' }]);
        service.patchRuntimeValues?.({
            'remote.music.releases.updatedAt': '2026-05-07T21:00:00.000Z',
            'remote.blog.posts.items': [{ title: 'Post A' }],
        });

        expect(service.get('remote.music.releases.items')).toEqual([{ title: 'Song A' }]);
        expect(service.get('remote.music.releases.updatedAt')).toBe('2026-05-07T21:00:00.000Z');
        expect(service.get('remote.blog.posts.items')).toEqual([{ title: 'Post A' }]);
    });

    it('clears runtime values when a new payload is loaded', () => {
        service.setPayload({
            version: 1,
            variables: {
                brand: {
                    name: 'Before',
                },
            },
        } as any);
        service.setRuntimeValue?.('remote.music.releases.items', [{ title: 'Runtime release' }]);

        service.setPayload({
            version: 1,
            variables: {
                brand: {
                    name: 'After',
                },
            },
        } as any);

        expect(service.get('brand.name')).toBe('After');
        expect(service.get('remote.music.releases.items')).toBeUndefined();
        expect(service.snapshot()['remote']).toBeUndefined();
    });

    it('clears runtime values without removing static payload variables', () => {
        service.setPayload({
            version: 1,
            variables: {
                brand: {
                    name: 'Lynx Pardelle',
                },
            },
        } as any);
        service.setRuntimeValue?.('remoteStatus.spotify-releases.state', 'success');

        service.clearRuntimeValues?.();

        expect(service.get('brand.name')).toBe('Lynx Pardelle');
        expect(service.get('remoteStatus.spotify-releases.state')).toBeUndefined();
    });
});
