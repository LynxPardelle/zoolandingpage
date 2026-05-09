import { RuntimeDataSourceMapperService } from './runtime-data-source-mapper.service';

describe('RuntimeDataSourceMapperService', () => {
    let service: RuntimeDataSourceMapperService;

    beforeEach(() => {
        service = new RuntimeDataSourceMapperService();
    });

    it('maps response items with nested field paths and fallbacks', () => {
        const result = service.mapResponse({
            data: {
                tracks: [
                    {
                        name: 'Nocturnal Circuit',
                        external: { url: 'https://example.test/track' },
                        images: [{ url: 'https://example.test/cover.webp' }],
                    },
                ],
            },
        }, {
            itemsPath: 'data.tracks',
            fields: {
                title: 'name',
                href: 'external.url',
                imageUrl: 'images.0.url',
                genre: { path: 'metadata.genre', fallback: 'unknown' },
            },
        });

        expect(result).toEqual({
            items: [
                {
                    title: 'Nocturnal Circuit',
                    href: 'https://example.test/track',
                    imageUrl: 'https://example.test/cover.webp',
                    genre: 'unknown',
                },
            ],
        });
    });

    it('returns empty items when the configured items path is missing or not an array', () => {
        expect(service.mapResponse({ data: { tracks: null } }, {
            itemsPath: 'data.tracks',
            fields: {
                title: 'name',
            },
        })).toEqual({ items: [] });
    });

    it('can compose mapped string values with configured prefix and suffix', () => {
        const result = service.mapResponse({
            albums: [
                { id: '500', title: 'Void Techno' },
            ],
        }, {
            itemsPath: 'albums',
            fields: {
                title: 'title',
                href: {
                    path: 'id',
                    prefix: 'https://tidal.com/browse/album/',
                    suffix: '?utm_source=zoolandingpage',
                },
            },
        });

        expect(result).toEqual({
            items: [
                {
                    title: 'Void Techno',
                    href: 'https://tidal.com/browse/album/500?utm_source=zoolandingpage',
                },
            ],
        });
    });

    it('maps a root array when itemsPath is not configured', () => {
        const result = service.mapResponse([
            { title: 'One', href: '/one' },
            { title: 'Two', href: '/two' },
        ], {
            fields: {
                title: 'title',
                href: 'href',
            },
        });

        expect(result).toEqual({
            items: [
                { title: 'One', href: '/one' },
                { title: 'Two', href: '/two' },
            ],
        });
    });

    it('maps a root object as one item when singleItem is enabled', () => {
        const result = service.mapResponse({
            id: 25,
            name: 'pikachu',
            sprites: {
                other: {
                    'official-artwork': {
                        front_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
                    },
                },
            },
        }, {
            singleItem: true,
            fields: {
                id: 'id',
                title: 'name',
                image: 'sprites.other.official-artwork.front_default',
            },
        });

        expect(result).toEqual({
            items: [
                {
                    id: 25,
                    title: 'pikachu',
                    image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
                },
            ],
        });
    });

    it('returns raw item copies when no field mapping is configured', () => {
        const result = service.mapResponse({
            items: [
                { id: 'a', title: 'A' },
            ],
        }, {
            itemsPath: 'items',
        });

        expect(result).toEqual({
            items: [
                { id: 'a', title: 'A' },
            ],
        });
    });
});
