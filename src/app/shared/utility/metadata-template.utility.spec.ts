import { resolveMetadataTemplates } from './metadata-template.utility';

describe('metadata-template.utility', () => {
    it('resolves variable and query tokens with transforms', () => {
        const resolved = resolveMetadataTemplates({
            title: '{{var:pokemon.name|titleCase}}',
            canonical: 'https://example.com/pokemon?name={{query:name|uriComponent}}',
            untouched: 25,
        }, {
            getVariable: (path) => path === 'pokemon.name' ? 'mr-mime' : undefined,
            getQueryParam: (key) => key === 'name' ? 'mr mime' : undefined,
        });

        expect(resolved).toEqual({
            title: 'Mr Mime',
            canonical: 'https://example.com/pokemon?name=mr%20mime',
            untouched: 25,
        });
    });
});
