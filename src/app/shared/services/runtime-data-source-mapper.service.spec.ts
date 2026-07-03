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

    it('can transform the last numeric URL segment before applying prefix and suffix', () => {
        const result = service.mapResponse({
            results: [
                {
                    name: 'bulbasaur',
                    url: 'https://pokeapi.co/api/v2/pokemon/1/',
                },
            ],
        }, {
            itemsPath: 'results',
            fields: {
                id: {
                    path: 'url',
                    transform: 'lastPathSegmentNumber',
                },
                number: {
                    path: 'url',
                    transform: 'lastPathSegmentNumber',
                    prefix: '#',
                },
                image: {
                    path: 'url',
                    transform: 'lastPathSegmentNumber',
                    prefix: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/',
                    suffix: '.png',
                },
            },
        });

        expect(result).toEqual({
            items: [
                {
                    id: 1,
                    number: '#1',
                    image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
                },
            ],
        });
    });

    it('can join primitive and taxonomy-like lists into editable text', () => {
        const result = service.mapResponse({
            items: [
                {
                    title: 'Blog builder',
                    tags: [
                        'seo',
                        { taxonomyId: 'blog-builder', label: 'Blog builder' },
                        { slug: 'sitios-web' },
                    ],
                },
            ],
        }, {
            itemsPath: 'items',
            fields: {
                title: 'title',
                tagsText: {
                    path: 'tags',
                    transform: 'joinList',
                },
            },
        });

        expect(result).toEqual({
            items: [
                {
                    title: 'Blog builder',
                    tagsText: 'seo, Blog builder, sitios-web',
                },
            ],
        });
    });

    it('can map array length through a path segment', () => {
        const result = service.mapResponse({
            items: [
                {
                    name: 'charizard',
                    moves: [
                        { move: { name: 'flamethrower' } },
                        { move: { name: 'slash' } },
                    ],
                },
            ],
        }, {
            itemsPath: 'items',
            fields: {
                name: 'name',
                moveCount: 'moves.length',
            },
        });

        expect(result).toEqual({
            items: [
                {
                    name: 'charizard',
                    moveCount: 2,
                },
            ],
        });
    });

    it('can lookup a mapped value into a reusable style object', () => {
        const result = service.mapResponse({
            items: [
                { category: 'Featured' },
            ],
        }, {
            itemsPath: 'items',
            fields: {
                categoryTheme: {
                    path: 'category',
                    lookup: {
                        featured: {
                            '--card-accent': '#f7b731',
                            '--card-ink': '#1d1605',
                        },
                    },
                    fallback: {
                        '--card-accent': '#6c7a89',
                        '--card-ink': '#ffffff',
                    },
                },
            },
        });

        expect(result).toEqual({
            items: [
                {
                    categoryTheme: {
                        '--card-accent': '#f7b731',
                        '--card-ink': '#1d1605',
                    },
                },
            ],
        });
    });

    it('uses lookup fallback when the mapped value has no configured entry', () => {
        const result = service.mapResponse({
            items: [
                { category: 'archived' },
            ],
        }, {
            itemsPath: 'items',
            fields: {
                categoryTheme: {
                    path: 'category',
                    lookup: {
                        active: {
                            '--card-accent': '#2ecc71',
                        },
                    },
                    fallback: {
                        '--card-accent': '#6c7a89',
                    },
                },
            },
        });

        expect(result).toEqual({
            items: [
                {
                    categoryTheme: {
                        '--card-accent': '#6c7a89',
                    },
                },
            ],
        });
    });

    it('maps root metadata next to mapped items', () => {
        const result = service.mapResponse({
            count: 1350,
            results: [
                {
                    name: 'bulbasaur',
                    url: 'https://pokeapi.co/api/v2/pokemon/1/',
                },
            ],
        }, {
            itemsPath: 'results',
            metaFields: {
                count: 'count',
            },
            fields: {
                id: {
                    path: 'url',
                    transform: 'lastPathSegmentNumber',
                },
                name: 'name',
            },
        });

        expect(result).toEqual({
            count: 1350,
            items: [
                {
                    id: 1,
                    name: 'bulbasaur',
                },
            ],
        });
    });

    it('prepends static mapped items and title-cases API labels', () => {
        const result = service.mapResponse({
            results: [
                { name: 'electric' },
                { name: 'stellar' },
                { name: 'shadow' },
                { name: 'mega-punch' },
            ],
        }, {
            itemsPath: 'results',
            prependItems: [
                { value: 'all', label: 'Todos' },
            ],
            fields: {
                value: 'name',
                label: {
                    path: 'name',
                    transform: 'titleCase',
                },
            },
        });

        expect(result).toEqual({
            items: [
                { value: 'all', label: 'Todos' },
                { value: 'electric', label: 'Electric' },
                { value: 'stellar', label: 'Stellar' },
                { value: 'shadow', label: 'Shadow' },
                { value: 'mega-punch', label: 'Mega Punch' },
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
