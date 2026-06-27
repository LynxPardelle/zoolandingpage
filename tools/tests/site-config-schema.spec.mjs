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

test('site-config schema supports auth-admin data sources with single-item account mappers', async () => {
    const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
    const mapper = schema.definitions?.runtimeDataSourceMapper;
    const dataSource = schema.definitions?.runtimeDataSource;

    assert.equal(mapper.properties.singleItem.type, 'boolean');
    assert.deepEqual(dataSource.properties.authAdminSource.enum, ['account', 'adminUsers']);
    assert.equal(dataSource.properties.clearTargetOnLoad.type, 'boolean');
});

test('site-config schema exposes content hub data source and action contracts without server-only fields', async () => {
    const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
    const dataSource = schema.definitions?.runtimeDataSource;
    const apiAction = schema.definitions?.runtimeApiAction;
    const contentHubRuntime = schema.definitions?.contentHubRuntime;
    const contentHubRead = schema.definitions?.contentHubRuntimeReadBinding;
    const contentHubAction = schema.definitions?.contentHubRuntimeActionBinding;
    const safeRuntimeInputFieldName = schema.definitions?.safeRuntimeInputFieldName;

    assert.equal(contentHubRuntime.properties.publicArticles.items.$ref, '#/definitions/contentHubPublicArticle');
    assert.equal(contentHubRuntime.properties.publicTaxonomy.items.$ref, '#/definitions/contentHubPublicTaxonomy');
    assert.equal(schema.definitions.contentHubPublicArticle.properties.path.$ref, '#/definitions/sameOriginPath');
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
        'publicBundlePreview',
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
        'publish',
        'schedule',
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
