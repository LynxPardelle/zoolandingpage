import type { TGenericComponent } from '../components/wrapper-orchestrator/wrapper-orchestrator.types';
import { collectAllClassesFromComponents, materializeLoopComponents } from './component-orchestrator.utility';

describe('collectAllClassesFromComponents', () => {
    it('includes Angora classes declared in dynamic value instruction branches', () => {
        const components = [
            {
                id: 'siteHeader',
                type: 'container',
                config: {
                    classes: 'ank-bg-bgColor ank-color-textColor',
                },
                valueInstructions: 'set:config.classes,when,"all:hostGt,runtimeState.viewport.scrollY,16","ank-bg-HASH1C1C1C ank-color-white","ank-bg-bgColor ank-color-textColor"',
            },
        ] as unknown as TGenericComponent[];

        const classes = collectAllClassesFromComponents(components);

        expect(classes).toContain('ank-bg-bgColor');
        expect(classes).toContain('ank-color-textColor');
        expect(classes).toContain('ank-bg-HASH1C1C1C');
        expect(classes).toContain('ank-color-white');
    });
});

describe('materializeLoopComponents collection view', () => {
    const buildResolvedComponents = (
        components: readonly TGenericComponent[],
        variables: Record<string, unknown>,
        host: unknown,
    ): Map<string, TGenericComponent> => materializeLoopComponents({
        sourceComponents: components,
        warnOnMissingSource: true,
        host,
        getVariable: (path) => variables[path],
        getI18n: () => undefined,
        getQueryParam: (key) => ({ pokemon: 'snorlax' } as Record<string, unknown>)[key],
        getCurrentLanguage: () => 'es',
        resolveI18nKey: () => undefined,
    });

    it('filters, sorts, and paginates loop items from interaction scope values', () => {
        const host = {
            interactionScope: {
                resolvePath: (path: string) => ({
                    'values.type': 'fire',
                    'values.sort': 'number-desc',
                    'values.page': 1,
                    'values.pageSize': 2,
                } as Record<string, unknown>)[path],
            },
        };
        const components = [
            {
                id: 'pokemonGrid',
                type: 'container',
                loopConfig: {
                    source: 'var',
                    path: 'remote.pokemon.catalog.items',
                    templateId: 'pokemonCardTemplate',
                    idPrefix: 'pokemonCard',
                    view: {
                        filters: [
                            {
                                path: 'types',
                                op: 'includes',
                                value: { source: 'scope', path: 'values.type' },
                                ignoreValues: ['', 'all'],
                            },
                        ],
                        sort: {
                            by: { source: 'scope', path: 'values.sort' },
                            options: {
                                'number-desc': { path: 'id', direction: 'desc', type: 'number' },
                            },
                        },
                        pagination: {
                            page: { source: 'scope', path: 'values.page' },
                            pageSize: { source: 'scope', path: 'values.pageSize' },
                        },
                    },
                    bindings: [{ to: 'config.text', sources: ['name'] }],
                },
                config: { components: [], tag: 'div' },
            },
            {
                id: 'pokemonCardTemplate',
                type: 'text',
                config: { tag: 'p', text: 'fallback' },
            },
        ] as unknown as TGenericComponent[];

        const resolved = buildResolvedComponents(components, {
            'remote.pokemon.catalog.items': [
                { id: 1, name: 'bulbasaur', types: ['grass'] },
                { id: 4, name: 'charmander', types: ['fire'] },
                { id: 6, name: 'charizard', types: ['fire'] },
                { id: 37, name: 'vulpix', types: ['fire'] },
            ],
        }, host);

        expect((resolved.get('pokemonGrid') as any).config.components).toEqual(['pokemonCard__1', 'pokemonCard__2']);
        expect((resolved.get('pokemonCard__1') as any).config.text).toBe('vulpix');
        expect((resolved.get('pokemonCard__2') as any).config.text).toBe('charizard');
    });

    it('can filter nested array values such as available moves', () => {
        const host = {
            interactionScope: {
                resolvePath: (path: string) => path === 'values.move' ? 'flamethrower' : undefined,
            },
        };
        const components = [
            {
                id: 'pokemonGrid',
                type: 'container',
                loopConfig: {
                    source: 'var',
                    path: 'remote.pokemon.catalog.items',
                    templateId: 'pokemonCardTemplate',
                    idPrefix: 'pokemonCard',
                    view: {
                        filters: [
                            {
                                path: 'moves.move.name',
                                op: 'includes',
                                value: { source: 'scope', path: 'values.move' },
                                ignoreValues: ['', 'all'],
                            },
                        ],
                    },
                    bindings: [{ to: 'config.text', sources: ['name'] }],
                },
                config: { components: [], tag: 'div' },
            },
            {
                id: 'pokemonCardTemplate',
                type: 'text',
                config: { tag: 'p', text: 'fallback' },
            },
        ] as unknown as TGenericComponent[];

        const resolved = buildResolvedComponents(components, {
            'remote.pokemon.catalog.items': [
                { name: 'pikachu', moves: [{ move: { name: 'thunder-shock' } }] },
                { name: 'charizard', moves: [{ move: { name: 'flamethrower' } }] },
            ],
        }, host);

        expect((resolved.get('pokemonGrid') as any).config.components).toEqual(['pokemonCard__1']);
        expect((resolved.get('pokemonCard__1') as any).config.text).toBe('charizard');
    });

    it('can compose generated link hrefs from item values and binding affixes', () => {
        const components = [
            {
                id: 'moveLinks',
                type: 'container',
                loopConfig: {
                    source: 'var',
                    path: 'remote.pokemon.selected.items.0.moves',
                    templateId: 'moveLinkTemplate',
                    idPrefix: 'moveLink',
                    bindings: [
                        {
                            to: 'config.text',
                            sources: ['move.name'],
                        },
                        {
                            to: 'config.href',
                            sources: [{ from: 'move.name', transform: 'uriComponent' }],
                            prefix: '/?move=',
                            suffix: '#pokemon-grid',
                        },
                    ],
                },
                config: { components: [], tag: 'div' },
            },
            {
                id: 'moveLinkTemplate',
                type: 'link',
                config: { href: '#', text: 'move' },
            },
        ] as unknown as TGenericComponent[];

        const resolved = buildResolvedComponents(components, {
            'remote.pokemon.selected.items.0.moves': [
                { move: { name: 'mega punch' } },
            ],
        }, {});

        expect((resolved.get('moveLinks') as any).config.components).toEqual(['moveLink__1']);
        expect((resolved.get('moveLink__1') as any).config.text).toBe('mega punch');
        expect((resolved.get('moveLink__1') as any).config.href).toBe('/?move=mega%20punch#pokemon-grid');
    });

    it('can filter loop items from query-param values', () => {
        const components = [
            {
                id: 'pokemonGrid',
                type: 'container',
                loopConfig: {
                    source: 'var',
                    path: 'remote.pokemon.catalog.items',
                    templateId: 'pokemonCardTemplate',
                    idPrefix: 'pokemonCard',
                    view: {
                        filters: [
                            {
                                path: 'name',
                                op: 'equals',
                                value: { source: 'queryParam', key: 'pokemon' },
                                ignoreValues: [''],
                            },
                        ],
                    },
                    bindings: [{ to: 'config.text', sources: ['name'] }],
                },
                config: { components: [], tag: 'div' },
            },
            {
                id: 'pokemonCardTemplate',
                type: 'text',
                config: { tag: 'p', text: 'fallback' },
            },
        ] as unknown as TGenericComponent[];

        const resolved = buildResolvedComponents(components, {
            'remote.pokemon.catalog.items': [
                { name: 'pikachu' },
                { name: 'snorlax' },
            ],
        }, {});

        expect((resolved.get('pokemonGrid') as any).config.components).toEqual(['pokemonCard__1']);
        expect((resolved.get('pokemonCard__1') as any).config.text).toBe('snorlax');
    });
});
