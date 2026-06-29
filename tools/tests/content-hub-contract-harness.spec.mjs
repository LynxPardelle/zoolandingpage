import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildContentHubLocalContractPlan,
  CONTENT_HUB_REQUIRED_ITEM_FAMILIES,
  loadZoositeSeedArticleFixture,
  publishZoositeSeedArticleFixture,
  readPublishedSeedArticleBundle,
  validateContentHubLocalContractPlan,
  validateZoositeSeedArticleFixture,
} from '../content-hub-contract-harness.mjs';

test('content hub local contract harness includes every required DynamoDB item family', () => {
  const plan = buildContentHubLocalContractPlan();
  const families = new Set(plan.dynamoLayout.map((item) => item.itemFamily));

  assert.deepEqual(validateContentHubLocalContractPlan(plan), { ok: true, errors: [] });
  for (const family of CONTENT_HUB_REQUIRED_ITEM_FAMILIES) {
    assert.equal(families.has(family), true, `${family} must be present`);
  }
});

test('content hub S3 layouts are deterministic and environment scoped', () => {
  const plan = buildContentHubLocalContractPlan({
    environment: 'prod',
    hubId: 'zoosite-main',
    articleId: 'art_seo_001',
    locale: 'es',
    revisionId: 'rev_042',
    renderDomain: 'zoositioweb.com.mx',
  });
  const byKind = new Map(plan.s3Layouts.map((layout) => [layout.kind, layout.renderedKey]));

  for (const key of byKind.values()) {
    assert.equal(key.startsWith('content-hubs/prod/zoosite-main/'), true, key);
  }
  assert.equal(
    byKind.get('articlePackage'),
    'content-hubs/prod/zoosite-main/articles/art_seo_001/lang/es/revisions/rev_042/package.json',
  );
  assert.equal(
    byKind.get('revisionSnapshot'),
    'content-hubs/prod/zoosite-main/articles/art_seo_001/lang/es/revisions/rev_042/snapshot.json',
  );
  assert.equal(
    byKind.get('revisionDelta'),
    'content-hubs/prod/zoosite-main/articles/art_seo_001/lang/es/revisions/rev_042/delta.json',
  );
  assert.equal(
    byKind.get('publishedBundle'),
    'content-hubs/prod/zoosite-main/published/zoositioweb.com.mx/es/art_seo_001/rev_042/bundle.json',
  );
  assert.equal(
    byKind.get('validationReport'),
    'content-hubs/prod/zoosite-main/articles/art_seo_001/lang/es/revisions/rev_042/validation-report.json',
  );
  assert.equal(byKind.get('sitemap'), 'content-hubs/prod/zoosite-main/published/zoositioweb.com.mx/es/sitemap.xml');
  assert.equal(byKind.get('feedXml'), 'content-hubs/prod/zoosite-main/published/zoositioweb.com.mx/es/feeds/feed.xml');
});

test('content hub IAM boundaries stay least-privilege and secret-free', () => {
  const plan = buildContentHubLocalContractPlan();

  for (const boundary of plan.iamBoundaries) {
    assert.equal(boundary.noSecrets, true, `${boundary.capability} must reject secrets`);
    assert.equal(boundary.allowedActions.some((action) => action.includes('*')), false, boundary.capability);
    assert.equal(boundary.allowedActions.some((action) => action.startsWith('secretsmanager:')), false);
    assert.equal(boundary.allowedActions.some((action) => action.startsWith('ssm:')), false);
    assert.ok(boundary.resourceScopes.length > 0, `${boundary.capability} must document resource scopes`);
  }
});

test('content hub repository decisions keep services generic and bounded', () => {
  const plan = buildContentHubLocalContractPlan();
  const decisions = new Map(plan.repositoryDecisions.map((item) => [item.capability, item]));

  assert.equal(decisions.get('content-package-authoring')?.owner, 'zoolanding-config-authoring');
  assert.equal(decisions.get('published-runtime-read')?.owner, 'zoolanding-config-runtime-read');
  assert.equal(decisions.get('grant-protected-public-image-upload')?.owner, 'zoolanding-image-upload');
  assert.equal(decisions.get('media-lifecycle')?.owner, 'zoolanding-feature-media');
  assert.equal(decisions.get('public-interactions-moderation')?.owner, 'zoolanding-feature-interactions');
  assert.equal(decisions.get('analytics-ingestion')?.owner, 'zoolanding-data-dropper-lambda');
});

test('content hub analytics events are blog-prefixed and forbid raw user payload fields', () => {
  const plan = buildContentHubLocalContractPlan();
  const events = new Map(plan.analyticsEvents.map((event) => [event.eventName, event]));

  for (const event of plan.analyticsEvents) {
    assert.equal(event.eventName.startsWith('blog_'), true, event.eventName);
    assert.equal(event.requiredFields.includes('appName'), true, event.eventName);
    assert.equal(event.requiredFields.includes('timestamp'), true, event.eventName);
  }
  assert.deepEqual(events.get('blog_form_submit')?.forbiddenFields, [
    'email',
    'name',
    'phone',
    'commentText',
    'formBody',
  ]);
  assert.deepEqual(events.get('blog_comment_intent')?.forbiddenFields, [
    'email',
    'name',
    'commentText',
    'commentBody',
  ]);
});

test('content hub role policies cover product blog roles and action-scoped permissions', () => {
  const plan = buildContentHubLocalContractPlan();
  const policies = new Map((plan.rolePolicies ?? []).map((policy) => [policy.roleId, policy]));

  for (const roleId of [
    'hub-admin',
    'blog-admin',
    'blog-editor',
    'blog-publisher',
    'blog-reviewer',
    'blog-moderator',
    'blog-media-manager',
    'blog-analyst',
  ]) {
    assert.ok(policies.has(roleId), `missing blog role policy ${roleId}`);
    assert.ok(policies.get(roleId).groups.length > 0, `${roleId} must map to at least one auth group`);
    assert.ok(policies.get(roleId).permissions.length > 0, `${roleId} must have action-scoped permissions`);
  }

  assert.ok(policies.get('blog-editor').permissions.includes('blog:article:update'));
  assert.ok(policies.get('blog-publisher').permissions.includes('blog:article:publish'));
  assert.ok(policies.get('blog-admin').permissions.includes('blog:taxonomy:read'));
  assert.ok(policies.get('blog-admin').permissions.includes('blog:media:read'));
  assert.ok(policies.get('blog-admin').permissions.includes('blog:moderation:read'));
  assert.ok(policies.get('blog-editor').permissions.includes('blog:taxonomy:read'));
  assert.ok(policies.get('blog-editor').permissions.includes('blog:media:read'));
  assert.ok(policies.get('blog-moderator').permissions.includes('blog:moderation:moderate'));
  assert.ok(policies.get('blog-moderator').permissions.includes('blog:moderation:read'));
  assert.ok(policies.get('blog-media-manager').permissions.includes('blog:media:manage'));
  assert.ok(policies.get('blog-media-manager').permissions.includes('blog:media:read'));
  assert.ok(policies.get('blog-analyst').permissions.includes('blog:analytics:read'));
  assert.deepEqual(policies.get('blog-editor').groups, ['zoosite-admin', 'zoosite-blog-editor']);
  assert.deepEqual(policies.get('blog-publisher').groups, ['zoosite-admin', 'zoosite-blog-publisher']);
  assert.deepEqual(policies.get('blog-moderator').groups, ['zoosite-admin', 'zoosite-blog-moderator']);
  assert.deepEqual(policies.get('blog-media-manager').groups, ['zoosite-admin', 'zoosite-blog-media']);
  assert.deepEqual(policies.get('blog-analyst').groups, ['zoosite-admin', 'zoosite-blog-analyst']);

  for (const policy of policies.values()) {
    assert.equal(policy.permissions.some((permission) => permission.includes('*')), false, `${policy.roleId} must not use wildcard permissions`);
    assert.equal(policy.groups.includes('zoosite-client'), false, `${policy.roleId} must not grant blog admin permissions to client users`);
  }
});

test('content hub harness rejects unsafe IDs before building a plan', () => {
  assert.throws(() => buildContentHubLocalContractPlan({ hubId: '../bad' }), /hubId/);
  assert.throws(() => buildContentHubLocalContractPlan({ renderDomain: '../bad' }), /renderDomain/);
  assert.throws(() => buildContentHubLocalContractPlan({ path: 'https://evil.example/blog' }), /path/);
  assert.throws(() => buildContentHubLocalContractPlan({ path: '/blog\\bad' }), /path/);
});

test('content hub validator catches missing families and unsafe IAM changes', () => {
  const plan = buildContentHubLocalContractPlan();
  const broken = {
    ...plan,
    dynamoLayout: plan.dynamoLayout.filter((item) => item.itemFamily !== 'LOCK'),
    rolePolicies: [
      ...plan.rolePolicies.filter((policy) => policy.roleId !== 'blog-editor'),
      {
        roleId: 'bad-role',
        groups: ['outside-group'],
        permissions: ['blog:article:*'],
      },
    ],
    iamBoundaries: [
      ...plan.iamBoundaries,
      {
        capability: 'bad-capability',
        repository: 'bad-repo',
        allowedActions: ['dynamodb:*', 'secretsmanager:GetSecretValue'],
        resourceScopes: ['*'],
        noSecrets: false,
      },
    ],
  };
  const validation = validateContentHubLocalContractPlan(broken);

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /LOCK/);
  assert.match(validation.errors.join('\n'), /Wildcard IAM action/);
  assert.match(validation.errors.join('\n'), /Secret store IAM action/);
  assert.match(validation.errors.join('\n'), /reject secrets/);
  assert.match(validation.errors.join('\n'), /blog-editor/);
  assert.match(validation.errors.join('\n'), /wildcards/);
  assert.match(validation.errors.join('\n'), /Role policy group is not allowed/);
});

test('zoosite seed article fixture validates the first local no-AWS authoring lifecycle', async () => {
  const fixture = await loadZoositeSeedArticleFixture();
  const validation = validateZoositeSeedArticleFixture(fixture);

  assert.deepEqual(validation, { ok: true, errors: [] });
  assert.equal(fixture.manifest.articleId, 'art_20260620_blog_builder');
  assert.equal(fixture.manifest.seo.canonicalPath, '/blog/web/blog-builder-seo');
  assert.equal(fixture.publishedBundle.path, '/blog/web/blog-builder-seo');
  assert.equal(fixture.articlePackage.rootIds.includes('articleRoot'), true);
  assert.equal(fixture.metadataTables.contentHubMetadata.some((item) => item.itemFamily === 'SLUG'), true);
});

test('zoosite seed article fixture fails closed for missing publish gates', async () => {
  const fixture = await loadZoositeSeedArticleFixture();
  const broken = structuredClone(fixture);
  broken.manifest.seo.title = '';
  broken.manifest.seo.canonicalPath = '/blog/web/blog-builder-seo';
  broken.publishedBundle.components.components[1].config.src = 'https://assets.example.com/file.webp?X-Amz-Signature=abc';
  broken.publishedBundle.components.components[1].config.alt = '';
  broken.publishedBundle.components.components[2].config.onClick = 'alert(1)';
  broken.analyticsEvents[0].email = 'person@example.com';

  const validation = validateZoositeSeedArticleFixture(broken);

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /SEO title/);
  assert.match(validation.errors.join('\n'), /signed URL/);
  assert.match(validation.errors.join('\n'), /alt text/);
  assert.match(validation.errors.join('\n'), /event handler/);
  assert.match(validation.errors.join('\n'), /PII/);
});

test('zoosite seed article publish/read path exposes only the public bundle and blog analytics events', async () => {
  const fixture = await loadZoositeSeedArticleFixture();
  const publication = publishZoositeSeedArticleFixture(fixture);
  const bundle = readPublishedSeedArticleBundle(publication, {
    renderDomain: 'zoositioweb.com.mx',
    locale: 'es',
    path: '/blog/web/blog-builder-seo',
  });

  assert.equal(publication.ok, true);
  assert.equal(bundle?.articleId, 'art_20260620_blog_builder');
  assert.equal(bundle?.seo.robots, 'index,follow');
  assert.equal(bundle?.components.components.some((component) => component.id === 'articleCta'), true);
  assert.deepEqual(fixture.analyticsEvents.map((event) => event.eventName), ['blog_view', 'blog_cta_click']);
  assert.equal(JSON.stringify(bundle).includes('serverPolicy'), false);
  assert.equal(JSON.stringify(bundle).includes('tableName'), false);
  assert.equal(JSON.stringify(bundle).includes('bucketName'), false);
});
