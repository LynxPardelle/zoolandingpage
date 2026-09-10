import type {
    TContentHubPublishedBundle,
    TContentHubPublishedComponent,
} from './content-hub.types';

describe('content hub published bundle types', () => {
    it('models the direct operational v1 bundle projection', () => {
        const bundle = {
            version: 1,
            bundleId: 'bundle:thn-main:art_001:en:rev_001',
            kind: 'content-hub-published-bundle',
            hubId: 'thn-main',
            articleId: 'art_001',
            revisionId: 'rev_001',
            ownerDraftDomain: 'thehairnarrative.com',
            renderDomain: 'thehairnarrative.com',
            locale: 'en',
            path: '/the-journal/observing-form',
            safeArticlePath: '/the-journal/observing-form',
            status: 'published',
            publishedAt: '2026-08-30T12:00:00.000Z',
            previewedAt: '',
            title: 'Observing form',
            summary: 'A public editorial summary.',
            slug: 'observing-form',
            category: { taxonomyId: 'cat_notes', slug: 'notes', label: 'Notes' },
            tags: [{ taxonomyId: 'tag_form', slug: 'form', label: 'Form' }],
            commentPolicy: 'disabled',
            contentSafety: { rating: 'general', warnings: [] },
            interactions: {
                ctas: { enabled: true, moderation: 'spam-check' },
                shares: { enabled: true },
            },
            seo: {
                title: 'Observing form | The Hair Narrative',
                description: 'A public editorial summary.',
                canonical: '/the-journal/observing-form',
                canonicalMode: 'self',
                robots: 'index,nofollow',
            },
            structuredData: [{
                type: 'BlogPosting',
                json: { headline: 'Observing form', keywords: ['hair', 'form'] },
            }],
            components: [{
                id: 'article-heading',
                type: 'text',
                config: { tag: 'h1', text: 'Observing form' },
                condition: true,
                order: 1,
            }],
            variables: {
                articleContent: { paragraphs: ['A public editorial paragraph.'] },
            },
            i18n: {
                article: { title: 'Observing form' },
            },
            analytics: {
                contentGroup: 'journal',
                eventPrefix: 'article',
                piiPolicy: 'no-pii',
            },
        } as const satisfies TContentHubPublishedBundle;

        expect(bundle.components[0].id).toBe('article-heading');
        expect(bundle.seo.robots).toBe('index,nofollow');
        expect(bundle.variables.articleContent.paragraphs).toEqual(['A public editorial paragraph.']);
    });

    it('excludes aliases that must be normalized by the publisher', () => {
        const legacyAlias = {
            id: 'legacy-heading',
            type: 'generic-text',
            config: { text: 'Legacy heading' },
        } as const;

        // @ts-expect-error Published bundles use renderer-backed canonical types only.
        const invalidComponent: TContentHubPublishedComponent = legacyAlias;
        expect(invalidComponent.type).toBe('generic-text');
    });

    it('exposes only the four closed public component configs', () => {
        const publicComponents = [
            {
                id: 'article-root',
                type: 'container',
                config: { tag: 'article', components: ['article-title'] },
            },
            {
                id: 'article-cover',
                type: 'media',
                config: {
                    tag: 'image',
                    src: 'https://assets.example.com/cover.webp',
                    alt: 'Editorial cover',
                },
            },
            {
                id: 'article-title',
                type: 'text',
                config: { tag: 'h1', text: 'Observing form' },
            },
            {
                id: 'article-link',
                type: 'link',
                config: { href: '/the-journal/observing-form', text: 'Read', target: '_self' },
            },
        ] as const satisfies readonly TContentHubPublishedComponent[];

        expect(publicComponents.map((component) => component.type)).toEqual([
            'container',
            'media',
            'text',
            'link',
        ]);

        const richText = {
            id: 'article-body',
            // @ts-expect-error The public writer does not expose private rich-text editor bindings.
            type: 'generic-rich-text',
            config: { tag: 'p', text: 'Private editor content' },
        } satisfies TContentHubPublishedComponent;
        const badTarget = {
            id: 'article-link',
            type: 'link',
            config: {
                href: '/the-journal/observing-form',
                // @ts-expect-error Public link targets are restricted to the Angular navigation allowlist.
                target: '_new',
            },
        } satisfies TContentHubPublishedComponent;
        const badContainer = {
            id: 'article-dialog',
            type: 'container',
            config: {
                // @ts-expect-error Public container tags are restricted to renderer-backed semantic tags.
                tag: 'dialog',
                components: [],
            },
        } satisfies TContentHubPublishedComponent;
        const missingContainerChildren = {
            id: 'article-shell',
            type: 'container',
            // @ts-expect-error Canonical published containers always materialize a child-id list.
            config: { tag: 'article' },
        } satisfies TContentHubPublishedComponent;
        const editorOnlyLinkConfig = {
            id: 'editor-only-link',
            type: 'link',
            config: {
                href: '/the-journal/observing-form',
                // @ts-expect-error Private editor navigation flags are not public bundle config fields.
                preserveLanguageQueryParam: false,
            },
        } satisfies TContentHubPublishedComponent;
        const runtimeOnlyContainerConfig = {
            id: 'runtime-only-container',
            type: 'container',
            config: {
                components: [],
                // @ts-expect-error Runtime-only ARIA and role fields are not emitted by the public writer.
                role: 'main',
            },
        } satisfies TContentHubPublishedComponent;

        expect([
            richText.type,
            badTarget.type,
            badContainer.type,
            missingContainerChildren.type,
            editorOnlyLinkConfig.type,
            runtimeOnlyContainerConfig.type,
        ]).toEqual([
            'generic-rich-text',
            'link',
            'container',
            'container',
            'link',
            'container',
        ]);
    });

    it('types articleContent as renderer-supported container content', () => {
        const validArticleContent = {
            articleContent: { blocks: [{ type: 'paragraph', text: 'Visible copy' }] },
        } as const satisfies NonNullable<TContentHubPublishedBundle['variables']>;

        const primitiveArticleContent = {
            // @ts-expect-error Published articleContent cannot be a primitive JSON value.
            articleContent: 42,
        } satisfies NonNullable<TContentHubPublishedBundle['variables']>;

        expect(validArticleContent.articleContent.blocks[0].type).toBe('paragraph');
        expect(primitiveArticleContent.articleContent).toBe(42);
    });
});
