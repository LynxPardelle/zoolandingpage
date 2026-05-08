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
