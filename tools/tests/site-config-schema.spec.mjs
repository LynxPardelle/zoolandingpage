import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const schemaPath = new URL('../../docs/api-driven-config/schemas/site-config.schema.json', import.meta.url);
const zoositePilotFixturePath = new URL('./fixtures/zoosite-auth-pilot/site-config.json', import.meta.url);

const publicAuthDisallowedFields = [
    'access',
    'auth',
    'credentialRef',
    'clientSecret',
    'accessToken',
    'refreshToken',
];

async function readJson(url) {
    return JSON.parse(await readFile(url, 'utf8'));
}

async function readZoositePilotPage(pageId) {
    return readJson(new URL(`./fixtures/zoosite-auth-pilot/${pageId}/page-config.json`, import.meta.url));
}

test('site-config schema documents bounded, public WOFF2 font descriptors', async () => {
    const schema = await readJson(schemaPath);
    const fonts = schema.definitions.siteSharedConfig.properties.fonts;
    assert.equal(fonts?.type, 'array');
    assert.equal(fonts.maxItems, 8);
    assert.equal(fonts.items.$ref, '#/definitions/siteFontFace');
    const face = schema.definitions.siteFontFace;
    assert.deepEqual(face.required, ['family', 'src']);
    assert.equal(face.additionalProperties, false);
    assert.deepEqual(face.properties.style.enum, ['normal', 'italic']);
    const sourcePattern = new RegExp(face.properties.src.pattern);
    for (const valid of ['/fonts/editorial.woff2', 'https://assets.example.test/fonts/editorial.woff2']) {
        assert.equal(sourcePattern.test(valid), true, valid);
    }
    for (const invalid of [
        '//assets.example.test/font.woff2', 'http://assets.example.test/font.woff2',
        'https://user:password@assets.example.test/font.woff2', '/fonts/font.woff2?token=private',
        '/fonts/../private/font.woff2', '/fonts/%2e%2e/font.woff2',
        '/fonts/font.woff2\n', '/fonts/font.woff2#fragment',
    ]) {
        assert.equal(sourcePattern.test(invalid), false, invalid);
    }
});

test('site-config schema documents normalized optional route language', async () => {
    const schema = await readJson(schemaPath);
    const language = schema.definitions?.siteRouteEntry?.properties?.language;

    assert.equal(language.type, 'string');
    assert.equal(language.minLength, 2);
    const normalizedLocale = new RegExp(language.pattern);
    assert.equal(normalizedLocale.test('en'), true);
    assert.equal(normalizedLocale.test('zh'), true);
    assert.equal(normalizedLocale.test('pt-BR'), true);
    assert.equal(normalizedLocale.test('de-CH-1901'), true);
    assert.equal(normalizedLocale.test('sl-rozaj-biske'), true);
    assert.equal(normalizedLocale.test('en-Latn-US-oxendict'), true);
    assert.equal(normalizedLocale.test('EN'), false);
    assert.equal(normalizedLocale.test('en_us'), false);
    assert.equal(normalizedLocale.test('sl-ROZAJ'), false);
    assert.equal(normalizedLocale.test('de-CH-190A'), false);
    assert.equal(normalizedLocale.test('de-CH-abcd'), false);
    assert.equal(normalizedLocale.test(' en '), false);
});

test('site-config schema aligns HTTPS auth URL restrictions with runtime validators', async () => {
    const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
    const pattern = schema.definitions?.httpsAbsoluteUrl?.pattern;

    assert.equal(typeof pattern, 'string');

    const httpsAbsoluteUrl = new RegExp(pattern);

    assert.equal(httpsAbsoluteUrl.test('https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TEST'), true);
    assert.equal(httpsAbsoluteUrl.test('https://test-client.auth.us-east-1.amazoncognito.com'), true);
    assert.equal(httpsAbsoluteUrl.test('https://user:pass@example.com/path'), false);
    assert.equal(httpsAbsoluteUrl.test('https://user:pass@example.com'), false);
    assert.equal(httpsAbsoluteUrl.test('https://example.com\\x'), false);
    assert.equal(httpsAbsoluteUrl.test('https://example.com/path\\x'), false);
});

test('site-config schema documents remote auth as a public minimal reference', async () => {
    const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
    const runtime = schema.definitions?.runtimeConfig;
    const authRemote = schema.definitions?.authRemoteRuntime;

    assert.equal(runtime.properties.authRemote.$ref, '#/definitions/authRemoteRuntime');
    assert.deepEqual(runtime.not.required, ['auth', 'authRemote']);
    assert.deepEqual(authRemote.required, ['authProfileId', 'endpoint']);
    assert.equal(authRemote.properties.access, undefined);
    assert.equal(authRemote.properties.auth, undefined);
    assert.equal(authRemote.properties.credentialRef, undefined);
    assert.equal(authRemote.properties.clientSecret, undefined);
    assert.equal(authRemote.additionalProperties, false);
});

test('site-config schema documents combo catalog as a public minimal reference', async () => {
    const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
    const runtime = schema.definitions?.runtimeConfig;
    const comboCatalog = schema.definitions?.comboCatalogRuntime;

    assert.equal(runtime.properties.comboCatalog.$ref, '#/definitions/comboCatalogRuntime');
    assert.deepEqual(comboCatalog.required, ['endpoint']);
    assert.equal(comboCatalog.properties.endpoint.anyOf[0].$ref, '#/definitions/sameOriginPath');
    assert.equal(comboCatalog.properties.endpoint.anyOf[1].$ref, '#/definitions/httpsAbsoluteUrl');
    assert.equal(comboCatalog.properties.authProfileId.$ref, '#/definitions/contentHubSafeId');
    assert.equal(comboCatalog.properties.draftDomain.$ref, '#/definitions/contentHubDomainName');
    assert.equal(comboCatalog.properties.credentialRef, undefined);
    assert.equal(comboCatalog.properties.clientSecret, undefined);
    assert.equal(comboCatalog.properties.tableName, undefined);
    assert.equal(comboCatalog.additionalProperties, false);
});

test('site-config schema caps runtime content hubs to the runtime read request budget', async () => {
    const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
    const contentHubs = schema.definitions?.runtimeConfig?.properties?.contentHubs;

    assert.equal(contentHubs.type, 'array');
    assert.equal(contentHubs.maxItems, 4);
});

test('site-config schema supports auth-admin data sources with single-item account mappers', async () => {
    const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
    const mapper = schema.definitions?.runtimeDataSourceMapper;
    const dataSource = schema.definitions?.runtimeDataSource;

    assert.equal(mapper.properties.singleItem.type, 'boolean');
    assert.deepEqual(dataSource.properties.authAdminSource.enum, ['account', 'adminUsers']);
    assert.equal(dataSource.properties.clearTargetOnLoad.type, 'boolean');
});

test('site-config schema bounds server-cookie route access cache metadata', async () => {
    const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
    const session = schema.definitions?.authSessionRuntime;

    assert.equal(session.properties.routeAccessCacheMs.type, 'integer');
    assert.equal(session.properties.routeAccessCacheMs.minimum, 0);
    assert.equal(session.properties.routeAccessCacheMs.maximum, 60000);
});

test('site-config schema exposes content hub data source and action contracts without server-only fields', async () => {
    const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
    const dataSource = schema.definitions?.runtimeDataSource;
    const apiAction = schema.definitions?.runtimeApiAction;
    const contentHubRuntime = schema.definitions?.contentHubRuntime;
    const contentHubRead = schema.definitions?.contentHubRuntimeReadBinding;
    const contentHubAction = schema.definitions?.contentHubRuntimeActionBinding;
    const safeRuntimeInputFieldName = schema.definitions?.safeRuntimeInputFieldName;

    assert.equal(contentHubRuntime.properties.publicArticles.$ref, '#/definitions/contentHubPublicArticleCollection');
    assert.equal(contentHubRuntime.properties.publicTaxonomy.$ref, '#/definitions/contentHubPublicTaxonomyCollection');
    assert.equal(schema.definitions.contentHubPublicArticleCollection.oneOf[0].items.$ref, '#/definitions/contentHubPublicArticle');
    assert.equal(schema.definitions.contentHubPublicArticleCollection.oneOf[1].properties.items.items.$ref, '#/definitions/contentHubPublicArticle');
    assert.equal(schema.definitions.contentHubPublicTaxonomyCollection.oneOf[0].items.$ref, '#/definitions/contentHubPublicTaxonomy');
    assert.equal(schema.definitions.contentHubPublicTaxonomyCollection.oneOf[1].properties.items.items.$ref, '#/definitions/contentHubPublicTaxonomy');
    assert.equal(schema.definitions.contentHubPublicArticle.properties.path.$ref, '#/definitions/sameOriginPath');
    assert.equal(schema.definitions.contentHubPublicArticle.properties.visibility.const, 'public');
    assert.equal(schema.definitions.contentHubPublicArticle.properties.articleContent.$ref, '#/definitions/contentHubPublicArticleContent');
    assert.deepEqual(
        schema.definitions.contentHubPublicArticle.properties.imageSrc.anyOf.map((entry) => entry.$ref),
        ['#/definitions/sameOriginPath', '#/definitions/httpsAbsoluteUrl'],
    );
    assert.equal(schema.definitions.contentHubPublicArticle.properties.imageAlt.type, 'string');
    assert.equal(schema.definitions.contentHubPublicArticle.properties.localizations.$ref, '#/definitions/contentHubPublicArticleLocalizations');
    assert.equal(schema.definitions.contentHubPublicArticleLocalization.properties.articleContent.$ref, '#/definitions/contentHubPublicArticleContent');
    assert.deepEqual(
        schema.definitions.contentHubPublicArticleLocalization.properties.imageSrc.anyOf.map((entry) => entry.$ref),
        ['#/definitions/sameOriginPath', '#/definitions/httpsAbsoluteUrl'],
    );
    assert.equal(schema.definitions.contentHubPublicArticleLocalization.properties.imageAlt.type, 'string');
    assert.equal(schema.definitions.contentHubPublicArticle.properties.commentPolicy.$ref, '#/definitions/contentHubPublicCommentPolicy');
    assert.equal(schema.definitions.contentHubPublicArticle.properties.contentSafety.$ref, '#/definitions/contentHubPublicContentSafety');
    assert.equal(schema.definitions.contentHubPublicArticle.properties.interactions.$ref, '#/definitions/contentHubPublicInteractionPolicies');
    assert.equal(schema.definitions.contentHubPublicArticle.properties.credentialRef, undefined);
    assert.equal(schema.definitions.contentHubPublicTaxonomy.properties.path.$ref, '#/definitions/sameOriginPath');

    assert.ok(dataSource.properties.kind.enum.includes('content-hub'));
    assert.equal(dataSource.properties.contentHub.$ref, '#/definitions/contentHubRuntimeReadBinding');
    assert.equal(dataSource.allOf[0].then.properties.proxySourceId.$ref, '#/definitions/contentHubSafeId');
    assert.deepEqual(contentHubRead.properties.read.enum, [
        'articleList',
        'articleDetail',
        'taxonomyList',
        'moderationQueue',
        'assetList',
        'revisionList',
        'scheduleList',
        'publicBundlePreview',
        'analyticsSummary',
    ]);
    assert.equal(contentHubRead.properties.credentialRef, undefined);
    assert.equal(contentHubRead.properties.serverPolicy, undefined);

    assert.ok(apiAction.properties.kind.enum.includes('content-hub'));
    assert.equal(apiAction.properties.contentHub.$ref, '#/definitions/contentHubRuntimeActionBinding');
    assert.equal(apiAction.allOf[0].then.properties.proxyActionId.$ref, '#/definitions/contentHubSafeId');
    assert.deepEqual(contentHubAction.properties.action.enum, [
        'createArticle',
        'updatePackage',
        'upsertTaxonomy',
        'uploadAsset',
        'validate',
        'submitReview',
        'approveArticle',
        'publish',
        'unpublishArticle',
        'archiveArticle',
        'schedule',
        'cancelSchedule',
        'queueComment',
        'moderateComment',
        'recordInteraction',
        'restoreRevision',
    ]);
    assert.equal(contentHubAction.properties.credentialRef, undefined);
    assert.equal(contentHubAction.properties.serverPolicy, undefined);

    assert.equal(schema.definitions.safeRuntimeInputObject.additionalProperties.$ref, '#/definitions/safeRuntimeInputValue');
    assert.ok(safeRuntimeInputFieldName.not.enum.includes('accessToken'));
    assert.ok(safeRuntimeInputFieldName.not.enum.includes('access_token'));
    assert.ok(safeRuntimeInputFieldName.not.enum.includes('X-Amz-Signature'));
    const safeFieldPattern = new RegExp(safeRuntimeInputFieldName.pattern);
    assert.equal(safeFieldPattern.test('articleId'), true);
    assert.equal(safeFieldPattern.test('accessToken'), false);
    assert.match(JSON.stringify(schema.definitions.safeRuntimeInputValue), /X-Amz-Signature/);
});

test('Zoosite auth pilot fixture uses public authRemote and protected account routing without server-only fields', async () => {
    const siteConfig = await readJson(zoositePilotFixturePath);
    const routes = new Map(siteConfig.routes.map(route => [route.path, route]));

    assert.equal(siteConfig.domain, 'zoositioweb.com.mx');
    assert.equal(siteConfig.runtime?.auth, undefined);
    assert.deepEqual(siteConfig.runtime?.authRemote, {
        enabled: true,
        authProfileId: 'staff',
        endpoint: '/auth/runtime-config',
    });

    for (const field of publicAuthDisallowedFields) {
        assert.equal(siteConfig.runtime.authRemote[field], undefined, `runtime.authRemote.${field} must stay out of the browser config`);
        assert.equal(JSON.stringify(siteConfig.runtime.authRemote).includes(`ssm:/`), false);
        assert.equal(JSON.stringify(siteConfig.runtime.authRemote).includes(`secretsmanager:/`), false);
    }

    assert.deepEqual(routes.get('/acceso'), {
        path: '/acceso',
        pageId: 'acceso',
        label: 'Acceso',
    });
    assert.deepEqual(routes.get('/auth/callback'), {
        path: '/auth/callback',
        pageId: 'auth-callback',
        label: 'Auth callback',
    });
    assert.deepEqual(routes.get('/mi-cuenta'), {
        path: '/mi-cuenta',
        pageId: 'mi-cuenta',
        label: 'Mi cuenta',
        auth: {
            required: true,
            redirectTo: '/acceso',
            allowedGroups: ['zoosite-client', 'zoosite-admin'],
        },
    });

    const expectedPilotCanonicals = new Map([
        ['acceso', 'https://zoositioweb.com.mx/acceso'],
        ['auth-callback', 'https://zoositioweb.com.mx/auth/callback'],
        ['mi-cuenta', 'https://zoositioweb.com.mx/mi-cuenta'],
    ]);
    for (const [pageId, canonical] of expectedPilotCanonicals) {
        const page = await readZoositePilotPage(pageId);
        assert.equal(page.seo?.robots?.default, 'noindex,nofollow');
        assert.equal(page.seo?.canonical, canonical);
    }
});
