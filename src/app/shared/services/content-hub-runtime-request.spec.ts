import {
    buildContentHubRuntimeInput,
    sanitizeContentHubRuntimeInput,
} from './content-hub-runtime-request';

describe('content hub runtime request helpers', () => {
    it('keeps only safe read inputs and removes forbidden keys recursively', () => {
        const result = buildContentHubRuntimeInput({
            read: 'articleList',
            hubId: 'zoosite-main',
            language: 'es',
        }, {
            limit: 20,
            status: 'draft',
            credentialRef: 'ssm:/must-not-travel',
            nested: {
                token: 'must-not-travel',
            },
        });

        expect(result).toEqual({
            contentHub: {
                read: 'articleList',
                hubId: 'zoosite-main',
                language: 'es',
            },
            limit: 20,
            status: 'draft',
        });
    });

    it('uses explicit action allowlists while still removing forbidden nested keys', () => {
        const result = sanitizeContentHubRuntimeInput({
            articleId: 'intro',
            package: {
                components: [],
                previewUrl: 'https://cdn.example.test/asset.png?X-Amz-Signature=must-not-travel',
                blocks: [
                    {
                        type: 'generic-text',
                        text: 'safe',
                        secretStoreRef: 'secretsmanager:/must-not-travel',
                    },
                ],
                serverPolicy: { allow: true },
            },
            accessToken: 'must-not-travel',
            access_token: 'must-not-travel',
            tenantId: 'must-not-travel',
        }, ['articleId', 'package', 'tenantId', 'accessToken', 'access_token']);

        expect(result).toEqual({
            articleId: 'intro',
            package: {
                components: [],
                blocks: [
                    {
                        type: 'generic-text',
                        text: 'safe',
                    },
                ],
            },
        });
    });

    it('preserves allowlisted browser files for the upload action bridge', () => {
        const file = new File(['asset'], 'cover.png', { type: 'image/png' });

        const result = sanitizeContentHubRuntimeInput({
            articleId: 'intro',
            files: [file],
            credentialRef: 'ssm:/must-not-travel',
        }, ['articleId', 'files', 'credentialRef']);

        expect(result).toEqual({
            articleId: 'intro',
            files: [file],
        });
    });

    it('drops allowlisted content hub id fields when they are unresolved, placeholder, or unsafe', () => {
        const result = sanitizeContentHubRuntimeInput({
            articleId: '{articleId}',
            revisionId: 'rev_ok',
            scheduleId: 'bad/id',
            commentId: 'unknown',
            assetId: 'null',
            status: 'draft',
        }, ['articleId', 'revisionId', 'scheduleId', 'commentId', 'assetId', 'status']);

        expect(result).toEqual({
            revisionId: 'rev_ok',
            status: 'draft',
        });
    });

    it('maps advanced editor componentTreeJson into sanitized updatePackage components', () => {
        const result = buildContentHubRuntimeInput({
            action: 'updatePackage',
            hubId: 'zoosite-main',
        }, {
            articleId: 'art_intro',
            advancedMode: true,
            componentTreeJson: JSON.stringify({
                type: 'container',
                config: {
                    classes: 'ank-p-16px',
                    credentialRef: 'ssm:/must-not-travel',
                },
                components: [
                    {
                        type: 'text',
                        config: {
                            text: 'Contenido',
                            signedUrl: 'https://cdn.example.test/file.png?X-Amz-Signature=abc',
                        },
                    },
                ],
            }),
        }, ['articleId', 'advancedMode', 'componentTreeJson']);

        expect(result).toEqual({
            contentHub: {
                action: 'updatePackage',
                hubId: 'zoosite-main',
            },
            articleId: 'art_intro',
            advancedMode: true,
            components: [
                {
                    type: 'container',
                    config: {
                        classes: 'ank-p-16px',
                    },
                    components: [
                        {
                            type: 'text',
                            config: {
                                text: 'Contenido',
                            },
                        },
                    ],
                },
            ],
        });
    });

    it('fails closed when advanced editor componentTreeJson is malformed', () => {
        expect(() => buildContentHubRuntimeInput({
            action: 'updatePackage',
            hubId: 'zoosite-main',
        }, {
            articleId: 'art_intro',
            advancedMode: true,
            componentTreeJson: '{"type":',
        }, ['articleId', 'advancedMode', 'componentTreeJson'])).toThrowError('El JSON avanzado del articulo debe ser valido antes de guardar.');
    });
});
