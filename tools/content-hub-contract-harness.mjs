import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';

const SAFE_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const SAFE_DOMAIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/u;
const ZOOSITE_SEED_FIXTURE_ROOT = new URL('./tests/fixtures/content-hub/zoosite-seed-article/', import.meta.url);
const SERVER_ONLY_PUBLIC_KEY_PATTERN = /(?:credentialRef|clientSecret|accessToken|refreshToken|idToken|privateKey|signedUrl|serverPolicy|lambdaArn|tableName|bucketName|userPoolId|tenantId|groupsToRoles|authorizationDecision|lockId|moderationQueue|scheduleExecutor)/iu;
const UNSAFE_PUBLIC_STRING_PATTERN = /(?:javascript:|data:|X-Amz-Signature|X-Amz-Credential|X-Amz-Security-Token|Signature=|Expires=|ssm:\/|secretsmanager:\/)/iu;
const PII_ANALYTICS_FIELD_PATTERN = /^(?:email|mail|phone|telefono|tel[eé]fono|name|commentText|commentBody|formBody|subject|cognitoUsername|username)$/iu;
const CONTENT_HUB_AUTH_PROFILE_ALLOWED_GROUPS = Object.freeze([
  'zoosite-client',
  'zoosite-admin',
  'zoosite-blog-editor',
  'zoosite-blog-publisher',
  'zoosite-blog-media',
  'zoosite-blog-moderator',
  'zoosite-blog-analyst',
]);
const CONTENT_HUB_ROLE_GROUPS = new Set(CONTENT_HUB_AUTH_PROFILE_ALLOWED_GROUPS.filter((group) => group !== 'zoosite-client'));

export const CONTENT_HUB_REQUIRED_ITEM_FAMILIES = Object.freeze([
  'HUB',
  'ARTICLE',
  'ARTICLE_LANG',
  'SLUG',
  'TAXONOMY',
  'TAXONOMY_OVERRIDE',
  'REVISION',
  'LOCK',
  'SCHEDULE',
  'MODERATION',
  'ASSET',
  'INTERACTION',
  'HUB_CONNECTION',
]);

export const CONTENT_HUB_REPOSITORY_DECISIONS = Object.freeze([
  {
    capability: 'content-package-authoring',
    owner: 'zoolanding-config-authoring',
    splitOwnerIfNeeded: 'zoolanding-content-authoring',
    decision: 'extend',
    reason:
      'Article packages are draft-like file bundles with small metadata pointers, so the existing config authoring shape is the right first owner when extended with isolated content namespaces. Split to a generic content authoring repo if implementation would pollute site-package lifecycle.',
  },
  {
    capability: 'published-runtime-read',
    owner: 'zoolanding-config-runtime-read',
    splitOwnerIfNeeded: 'zoolanding-content-runtime-read',
    decision: 'extend',
    reason:
      'Published article bundles are public SSR/runtime payloads and follow the same S3-backed published bundle pattern as runtime site config. Split to a generic content runtime read repo if article slug/list/feed caching becomes its own lifecycle.',
  },
  {
    capability: 'grant-protected-public-image-upload',
    owner: 'zoolanding-image-upload',
    decision: 'keep-simple',
    reason:
      'The current uploader is useful for grant-protected public images, but it should not absorb full media lifecycle, non-image files, references, transforms, or protected media.',
  },
  {
    capability: 'media-lifecycle',
    owner: 'zoolanding-feature-media',
    decision: 'new-generic-repo-when-implemented',
    reason:
      'A separate generic media service is justified for metadata, references, transforms, file-type policy, lifecycle, and future private/protected assets.',
  },
  {
    capability: 'public-interactions-moderation',
    owner: 'zoolanding-feature-interactions',
    decision: 'new-generic-repo-when-implemented',
    reason:
      'Comments, reactions, CTAs, spam control, and moderation are runtime feature writes, not site config authoring and not raw analytics ingestion.',
  },
  {
    capability: 'analytics-ingestion',
    owner: 'zoolanding-data-dropper-lambda',
    decision: 'extend-event-taxonomy',
    reason:
      'Blog analytics can reuse the raw analytics sink when payloads remain sanitized, event-shaped, and free of PII or raw comment/form bodies.',
  },
]);

export const CONTENT_HUB_ANALYTICS_EVENTS = Object.freeze([
  {
    eventName: 'blog_view',
    requiredFields: ['appName', 'timestamp', 'hubId', 'articleId', 'locale', 'path', 'renderDomain'],
  },
  {
    eventName: 'blog_read_depth',
    requiredFields: ['appName', 'timestamp', 'hubId', 'articleId', 'locale', 'depthPercent'],
  },
  {
    eventName: 'blog_taxonomy_filter',
    requiredFields: ['appName', 'timestamp', 'hubId', 'taxonomyKind', 'taxonomyIds', 'renderDomain'],
  },
  {
    eventName: 'blog_reaction',
    requiredFields: ['appName', 'timestamp', 'hubId', 'articleId', 'reactionType'],
  },
  {
    eventName: 'blog_cta_click',
    requiredFields: ['appName', 'timestamp', 'hubId', 'articleId', 'ctaId'],
  },
  {
    eventName: 'blog_form_submit',
    requiredFields: ['appName', 'timestamp', 'hubId', 'articleId', 'formId', 'outcome'],
    forbiddenFields: ['email', 'name', 'phone', 'commentText', 'formBody'],
  },
  {
    eventName: 'blog_comment_intent',
    requiredFields: ['appName', 'timestamp', 'hubId', 'articleId', 'outcome'],
    forbiddenFields: ['email', 'name', 'commentText', 'commentBody'],
  },
]);

export const CONTENT_HUB_ROLE_POLICIES = Object.freeze([
  {
    roleId: 'hub-admin',
    groups: ['zoosite-admin'],
    permissions: [
      'hub:hub:read',
      'hub:hub:update',
      'hub:connection:manage',
      'blog:article:read',
      'blog:article:create',
      'blog:article:update',
      'blog:article:validate',
      'blog:article:submit-review',
      'blog:article:approve',
      'blog:article:publish',
      'blog:article:unpublish',
      'blog:article:schedule',
      'blog:article:archive',
      'blog:revision:read',
      'blog:revision:restore',
      'blog:taxonomy:read',
      'blog:taxonomy:manage',
      'blog:media:read',
      'blog:media:manage',
      'blog:moderation:read',
      'blog:moderation:moderate',
      'blog:analytics:read',
      'blog:settings:manage',
    ],
  },
  {
    roleId: 'blog-admin',
    groups: ['zoosite-admin'],
    permissions: [
      'blog:article:read',
      'blog:article:create',
      'blog:article:update',
      'blog:article:validate',
      'blog:article:submit-review',
      'blog:article:approve',
      'blog:article:publish',
      'blog:article:unpublish',
      'blog:article:schedule',
      'blog:article:archive',
      'blog:revision:read',
      'blog:revision:restore',
      'blog:taxonomy:read',
      'blog:taxonomy:manage',
      'blog:media:read',
      'blog:media:manage',
      'blog:moderation:read',
      'blog:moderation:moderate',
      'blog:analytics:read',
      'blog:settings:manage',
    ],
  },
  {
    roleId: 'blog-editor',
    groups: ['zoosite-admin', 'zoosite-blog-editor'],
    permissions: [
      'blog:article:read',
      'blog:article:create',
      'blog:article:update',
      'blog:article:validate',
      'blog:article:submit-review',
      'blog:revision:read',
      'blog:taxonomy:read',
      'blog:media:read',
      'blog:media:manage',
    ],
  },
  {
    roleId: 'blog-publisher',
    groups: ['zoosite-admin', 'zoosite-blog-publisher'],
    permissions: [
      'blog:article:read',
      'blog:article:validate',
      'blog:article:approve',
      'blog:article:publish',
      'blog:article:unpublish',
      'blog:article:schedule',
      'blog:article:archive',
      'blog:revision:read',
      'blog:revision:restore',
    ],
  },
  {
    roleId: 'blog-reviewer',
    groups: ['zoosite-admin', 'zoosite-blog-publisher'],
    permissions: [
      'blog:article:read',
      'blog:article:validate',
      'blog:article:approve',
      'blog:article:request-changes',
      'blog:revision:read',
    ],
  },
  {
    roleId: 'blog-moderator',
    groups: ['zoosite-admin', 'zoosite-blog-moderator'],
    permissions: [
      'blog:article:read',
      'blog:moderation:read',
      'blog:moderation:moderate',
    ],
  },
  {
    roleId: 'blog-media-manager',
    groups: ['zoosite-admin', 'zoosite-blog-media'],
    permissions: [
      'blog:article:read',
      'blog:media:read',
      'blog:media:manage',
    ],
  },
  {
    roleId: 'blog-analyst',
    groups: ['zoosite-admin', 'zoosite-blog-analyst'],
    permissions: [
      'blog:article:read',
      'blog:analytics:read',
    ],
  },
]);

const REQUIRED_CONTENT_HUB_ROLE_IDS = Object.freeze([
  'hub-admin',
  'blog-admin',
  'blog-editor',
  'blog-publisher',
  'blog-reviewer',
  'blog-moderator',
  'blog-media-manager',
  'blog-analyst',
]);

export const CONTENT_HUB_DYNAMO_LAYOUT = Object.freeze([
  {
    table: 'contentHubMetadata',
    itemFamily: 'HUB',
    pk: 'HUB#{hubId}',
    sk: 'META',
    ownerCapability: 'content-package-authoring',
    gsis: ['GSI1_OWNER_DOMAIN', 'GSI2_STATUS_UPDATED'],
  },
  {
    table: 'contentHubMetadata',
    itemFamily: 'ARTICLE',
    pk: 'HUB#{hubId}',
    sk: 'ARTICLE#{articleId}',
    ownerCapability: 'content-package-authoring',
    gsis: ['GSI1_OWNER_DOMAIN', 'GSI2_STATUS_UPDATED'],
  },
  {
    table: 'contentHubMetadata',
    itemFamily: 'ARTICLE_LANG',
    pk: 'ARTICLE#{articleId}',
    sk: 'LANG#{locale}',
    ownerCapability: 'content-package-authoring',
    gsis: ['GSI2_STATUS_UPDATED', 'GSI3_TAXONOMY'],
  },
  {
    table: 'contentHubMetadata',
    itemFamily: 'SLUG',
    pk: 'SLUG#{environment}#{renderDomain}#{locale}',
    sk: 'PATH#{path}',
    ownerCapability: 'published-runtime-read',
    gsis: ['GSI4_ARTICLE_LOOKUP'],
  },
  {
    table: 'contentHubMetadata',
    itemFamily: 'TAXONOMY',
    pk: 'HUB#{hubId}',
    sk: 'TAXONOMY#{taxonomyKind}#{taxonomyId}',
    ownerCapability: 'content-package-authoring',
    gsis: ['GSI3_TAXONOMY'],
  },
  {
    table: 'contentHubMetadata',
    itemFamily: 'TAXONOMY_OVERRIDE',
    pk: 'TAXONOMY#{taxonomyId}',
    sk: 'OVERRIDE#{draftDomain}',
    ownerCapability: 'content-package-authoring',
    gsis: ['GSI1_OWNER_DOMAIN'],
  },
  {
    table: 'contentHubMetadata',
    itemFamily: 'REVISION',
    pk: 'ARTICLE#{articleId}',
    sk: 'REVISION#{revisionId}',
    ownerCapability: 'content-package-authoring',
    gsis: ['GSI2_STATUS_UPDATED'],
  },
  {
    table: 'contentHubMetadata',
    itemFamily: 'LOCK',
    pk: 'ARTICLE#{articleId}',
    sk: 'LOCK#{lockId}',
    ownerCapability: 'content-package-authoring',
    ttlAttribute: 'expiresAtEpochSeconds',
  },
  {
    table: 'contentHubMetadata',
    itemFamily: 'SCHEDULE',
    pk: 'SCHEDULE#{environment}',
    sk: 'DUE#{scheduledAt}#ARTICLE#{articleId}#REVISION#{revisionId}',
    ownerCapability: 'content-package-authoring',
    gsis: ['GSI5_SCHEDULE_DUE'],
  },
  {
    table: 'contentHubModeration',
    itemFamily: 'MODERATION',
    pk: 'HUB#{hubId}',
    sk: 'MODERATION#{status}#{createdAt}#{moderationId}',
    ownerCapability: 'public-interactions-moderation',
    gsis: ['GSI6_MODERATION_QUEUE'],
  },
  {
    table: 'contentHubMedia',
    itemFamily: 'ASSET',
    pk: 'HUB#{hubId}',
    sk: 'ASSET#{assetId}',
    ownerCapability: 'media-lifecycle',
    gsis: ['GSI7_ASSET_USAGE'],
  },
  {
    table: 'contentHubInteractions',
    itemFamily: 'INTERACTION',
    pk: 'ARTICLE#{articleId}',
    sk: 'INTERACTION#{interactionType}#{bucket}',
    ownerCapability: 'public-interactions-moderation',
    gsis: ['GSI8_INTERACTION_AGGREGATE'],
  },
  {
    table: 'contentHubMetadata',
    itemFamily: 'HUB_CONNECTION',
    pk: 'HUB#{hubId}',
    sk: 'CONNECTION#{draftDomain}',
    ownerCapability: 'content-package-authoring',
    gsis: ['GSI1_OWNER_DOMAIN'],
  },
]);

export const CONTENT_HUB_S3_LAYOUTS = Object.freeze([
  {
    kind: 'articlePackageManifest',
    capability: 'content-package-authoring',
    key: 'content-hubs/{environment}/{hubId}/articles/{articleId}/manifest.json',
  },
  {
    kind: 'articlePackage',
    capability: 'content-package-authoring',
    key: 'content-hubs/{environment}/{hubId}/articles/{articleId}/lang/{locale}/revisions/{revisionId}/package.json',
  },
  {
    kind: 'components',
    capability: 'content-package-authoring',
    key: 'content-hubs/{environment}/{hubId}/articles/{articleId}/lang/{locale}/revisions/{revisionId}/components.json',
  },
  {
    kind: 'variables',
    capability: 'content-package-authoring',
    key: 'content-hubs/{environment}/{hubId}/articles/{articleId}/lang/{locale}/revisions/{revisionId}/variables.json',
  },
  {
    kind: 'i18n',
    capability: 'content-package-authoring',
    key: 'content-hubs/{environment}/{hubId}/articles/{articleId}/lang/{locale}/revisions/{revisionId}/i18n/{locale}.json',
  },
  {
    kind: 'revisionSnapshot',
    capability: 'content-package-authoring',
    key: 'content-hubs/{environment}/{hubId}/articles/{articleId}/lang/{locale}/revisions/{revisionId}/snapshot.json',
  },
  {
    kind: 'revisionDelta',
    capability: 'content-package-authoring',
    key: 'content-hubs/{environment}/{hubId}/articles/{articleId}/lang/{locale}/revisions/{revisionId}/delta.json',
  },
  {
    kind: 'publishedBundle',
    capability: 'published-runtime-read',
    key: 'content-hubs/{environment}/{hubId}/published/{renderDomain}/{locale}/{articleId}/{revisionId}/bundle.json',
  },
  {
    kind: 'validationReport',
    capability: 'content-package-authoring',
    key: 'content-hubs/{environment}/{hubId}/articles/{articleId}/lang/{locale}/revisions/{revisionId}/validation-report.json',
  },
  {
    kind: 'assetManifest',
    capability: 'media-lifecycle',
    key: 'content-hubs/{environment}/{hubId}/assets/{assetId}/manifest.json',
  },
  {
    kind: 'assetOriginal',
    capability: 'media-lifecycle',
    key: 'content-hubs/{environment}/{hubId}/assets/{assetId}/original/{fileName}',
  },
  {
    kind: 'assetVariant',
    capability: 'media-lifecycle',
    key: 'content-hubs/{environment}/{hubId}/assets/{assetId}/variants/{variantId}/{fileName}',
  },
  {
    kind: 'sitemap',
    capability: 'published-runtime-read',
    key: 'content-hubs/{environment}/{hubId}/published/{renderDomain}/{locale}/sitemap.xml',
  },
  {
    kind: 'sitemapEntry',
    capability: 'published-runtime-read',
    key: 'content-hubs/{environment}/{hubId}/published/{renderDomain}/{locale}/{articleId}/sitemap-entry.json',
  },
  {
    kind: 'feedJson',
    capability: 'published-runtime-read',
    key: 'content-hubs/{environment}/{hubId}/published/{renderDomain}/{locale}/feeds/feed.json',
  },
  {
    kind: 'feedXml',
    capability: 'published-runtime-read',
    key: 'content-hubs/{environment}/{hubId}/published/{renderDomain}/{locale}/feeds/feed.xml',
  },
]);

export const CONTENT_HUB_IAM_BOUNDARIES = Object.freeze([
  {
    capability: 'content-package-authoring',
    repository: 'zoolanding-config-authoring',
    allowedActions: [
      'dynamodb:BatchGetItem',
      'dynamodb:DeleteItem',
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:Query',
      'dynamodb:UpdateItem',
      's3:DeleteObject',
      's3:GetObject',
      's3:PutObject',
    ],
    resourceScopes: [
      'table/contentHubMetadata/items owned by HUB#{hubId}, ARTICLE#{articleId}, SLUG#{environment}#{renderDomain}#{locale}, TAXONOMY#{taxonomyId}, SCHEDULE#{environment}',
      's3/content-hubs/{environment}/{hubId}/articles/{articleId}/',
      's3/content-hubs/{environment}/{hubId}/taxonomy/',
    ],
    noSecrets: true,
  },
  {
    capability: 'published-runtime-read',
    repository: 'zoolanding-config-runtime-read',
    allowedActions: ['dynamodb:GetItem', 'dynamodb:Query', 's3:GetObject'],
    resourceScopes: [
      'table/contentHubMetadata/items for HUB, ARTICLE, ARTICLE_LANG, SLUG, TAXONOMY, TAXONOMY_OVERRIDE, HUB_CONNECTION',
      's3/content-hubs/{environment}/{hubId}/published/{renderDomain}/',
    ],
    noSecrets: true,
  },
  {
    capability: 'media-lifecycle',
    repository: 'zoolanding-feature-media',
    allowedActions: [
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:Query',
      'dynamodb:UpdateItem',
      's3:DeleteObject',
      's3:GetObject',
      's3:PutObject',
    ],
    resourceScopes: [
      'table/contentHubMedia/items owned by HUB#{hubId} and ASSET#{assetId}',
      's3/content-hubs/{environment}/{hubId}/assets/{assetId}/',
    ],
    noSecrets: true,
  },
  {
    capability: 'public-interactions-moderation',
    repository: 'zoolanding-feature-interactions',
    allowedActions: [
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:Query',
      'dynamodb:UpdateItem',
      's3:PutObject',
    ],
    resourceScopes: [
      'table/contentHubInteractions/items owned by ARTICLE#{articleId}',
      'table/contentHubModeration/items owned by HUB#{hubId}',
      's3/content-hubs/{environment}/{hubId}/moderation/',
    ],
    noSecrets: true,
  },
  {
    capability: 'analytics-ingestion',
    repository: 'zoolanding-data-dropper-lambda',
    allowedActions: ['s3:PutObject'],
    resourceScopes: ['s3/analytics/{environment}/date=*/eventPrefix=blog/'],
    noSecrets: true,
  },
]);

function assertSafeSegment(name, value) {
  if (typeof value !== 'string' || !SAFE_SEGMENT_PATTERN.test(value)) {
    throw new TypeError(`${name} must be an ASCII-safe segment`);
  }
}

function assertSafeDomain(name, value) {
  if (typeof value !== 'string' || !SAFE_DOMAIN_PATTERN.test(value) || value.includes('..')) {
    throw new TypeError(`${name} must be an ASCII-safe domain`);
  }
}

function renderTemplate(template, context) {
  return template.replace(/\{([A-Za-z0-9]+)\}/gu, (match, key) => {
    if (!Object.hasOwn(context, key)) {
      throw new TypeError(`Missing template value: ${key}`);
    }
    return context[key];
  });
}

export function buildContentHubLocalContractPlan(input = {}) {
  const context = {
    environment: input.environment ?? 'test',
    hubId: input.hubId ?? 'zoosite-main',
    articleId: input.articleId ?? 'art_20260620_blog_builder',
    locale: input.locale ?? 'es',
    revisionId: input.revisionId ?? 'rev_001',
    renderDomain: input.renderDomain ?? 'zoositioweb.com.mx',
    draftDomain: input.draftDomain ?? 'zoositioweb.com.mx',
    taxonomyKind: input.taxonomyKind ?? 'category',
    taxonomyId: input.taxonomyId ?? 'web',
    lockId: input.lockId ?? 'lock_001',
    assetId: input.assetId ?? 'asset_cover',
    fileName: input.fileName ?? 'cover.webp',
    variantId: input.variantId ?? 'webp_1200',
    path: input.path ?? '/blog/web/blog-builder-seo',
    scheduledAt: input.scheduledAt ?? '2026-06-21T15:00:00.000Z',
  };

  for (const key of [
    'environment',
    'hubId',
    'articleId',
    'locale',
    'revisionId',
    'taxonomyKind',
    'taxonomyId',
    'lockId',
    'assetId',
    'fileName',
    'variantId',
  ]) {
    assertSafeSegment(key, context[key]);
  }
  assertSafeDomain('renderDomain', context.renderDomain);
  assertSafeDomain('draftDomain', context.draftDomain);
  if (!context.path.startsWith('/') || context.path.includes('\\') || /\s/u.test(context.path)) {
    throw new TypeError('path must be a same-origin URL path without whitespace or backslashes');
  }

  const renderedS3Layouts = CONTENT_HUB_S3_LAYOUTS.map((layout) => ({
    ...layout,
    renderedKey: renderTemplate(layout.key, context),
  }));

  return {
    version: 1,
    mode: 'local-no-aws',
    context,
    repositoryDecisions: CONTENT_HUB_REPOSITORY_DECISIONS,
    rolePolicies: CONTENT_HUB_ROLE_POLICIES,
    analyticsEvents: CONTENT_HUB_ANALYTICS_EVENTS,
    dynamoLayout: CONTENT_HUB_DYNAMO_LAYOUT,
    s3Layouts: renderedS3Layouts,
    iamBoundaries: CONTENT_HUB_IAM_BOUNDARIES,
    localAssertions: [
      'All required item families are represented before AWS writes exist.',
      'All S3 keys are deterministic and scoped by environment plus hub.',
      'Article package, snapshot, delta, published bundle, and validation report keys include article, locale, and revision where applicable.',
      'Runtime reads are read-only and cannot write package or metadata state.',
      'Blog roles map auth groups to explicit action-scoped permissions without wildcard grants.',
      'No capability receives secretsmanager, ssm, wildcard IAM actions, raw secrets, or cross-capability table access by default.',
      'Analytics events use blog-prefixed event names and forbid raw PII/comment/form body fields.',
    ],
  };
}

export function validateContentHubLocalContractPlan(plan) {
  const errors = [];
  const itemFamilies = new Set(plan?.dynamoLayout?.map((item) => item.itemFamily) ?? []);

  for (const requiredFamily of CONTENT_HUB_REQUIRED_ITEM_FAMILIES) {
    if (!itemFamilies.has(requiredFamily)) {
      errors.push(`Missing DynamoDB item family: ${requiredFamily}`);
    }
  }

  for (const layout of plan?.s3Layouts ?? []) {
    if (!layout.renderedKey?.startsWith(`content-hubs/${plan.context.environment}/${plan.context.hubId}/`)) {
      errors.push(`S3 key is not environment/hub scoped: ${layout.kind}`);
    }

    if (
      ['articlePackage', 'revisionSnapshot', 'revisionDelta', 'publishedBundle', 'validationReport'].includes(
        layout.kind,
      ) &&
      (!layout.renderedKey.includes(plan.context.articleId) ||
        !layout.renderedKey.includes(plan.context.locale) ||
        !layout.renderedKey.includes(plan.context.revisionId))
    ) {
      errors.push(`S3 key lacks article/locale/revision scope: ${layout.kind}`);
    }
  }

  const decisions = new Map((plan?.repositoryDecisions ?? []).map((item) => [item.capability, item]));
  for (const capability of [
    'content-package-authoring',
    'published-runtime-read',
    'media-lifecycle',
    'public-interactions-moderation',
    'analytics-ingestion',
  ]) {
    if (!decisions.has(capability)) {
      errors.push(`Missing repository decision for capability: ${capability}`);
    }
  }

  const rolePolicies = Array.isArray(plan?.rolePolicies) ? plan.rolePolicies : [];
  const roleIds = new Set(rolePolicies.map((policy) => policy?.roleId));
  for (const roleId of REQUIRED_CONTENT_HUB_ROLE_IDS) {
    if (!roleIds.has(roleId)) {
      errors.push(`Missing content hub role policy: ${roleId}`);
    }
  }
  for (const policy of rolePolicies) {
    if (!SAFE_SEGMENT_PATTERN.test(cleanString(policy?.roleId))) {
      errors.push(`Role policy id is not safe: ${policy?.roleId ?? '<empty>'}`);
    }
    if (!Array.isArray(policy?.groups) || policy.groups.length === 0) {
      errors.push(`Role policy must map to at least one auth group: ${policy?.roleId ?? '<empty>'}`);
    }
    for (const group of policy?.groups ?? []) {
      if (!SAFE_SEGMENT_PATTERN.test(cleanString(group))) {
        errors.push(`Role policy group is not safe: ${policy?.roleId ?? '<empty>'}.${group ?? '<empty>'}`);
      }
      if (!CONTENT_HUB_ROLE_GROUPS.has(cleanString(group))) {
        errors.push(`Role policy group is not allowed for content hub: ${policy?.roleId ?? '<empty>'}.${group ?? '<empty>'}`);
      }
    }
    if (!Array.isArray(policy?.permissions) || policy.permissions.length === 0) {
      errors.push(`Role policy must declare permissions: ${policy?.roleId ?? '<empty>'}`);
    }
    for (const permission of policy?.permissions ?? []) {
      if (typeof permission !== 'string' || !/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/u.test(permission)) {
        errors.push(`Role policy permission must be action-scoped: ${policy?.roleId ?? '<empty>'}.${permission ?? '<empty>'}`);
      }
      if (String(permission).includes('*')) {
        errors.push(`Role policy permission must not use wildcards: ${policy?.roleId ?? '<empty>'}.${permission}`);
      }
    }
  }

  for (const boundary of plan?.iamBoundaries ?? []) {
    if (boundary.noSecrets !== true) {
      errors.push(`IAM boundary must explicitly reject secrets: ${boundary.capability}`);
    }
    for (const action of boundary.allowedActions ?? []) {
      if (action.includes('*')) {
        errors.push(`Wildcard IAM action is not allowed: ${boundary.capability} ${action}`);
      }
      if (action.startsWith('secretsmanager:') || action.startsWith('ssm:')) {
        errors.push(`Secret store IAM action is not allowed: ${boundary.capability} ${action}`);
      }
    }
  }

  for (const event of plan?.analyticsEvents ?? []) {
    if (!event.eventName?.startsWith('blog_')) {
      errors.push(`Analytics event must use blog_ prefix: ${event.eventName}`);
    }
    for (const forbiddenField of event.forbiddenFields ?? []) {
      if (!['email', 'name', 'phone', 'commentText', 'commentBody', 'formBody'].includes(forbiddenField)) {
        errors.push(`Unexpected forbidden analytics field name: ${event.eventName}.${forbiddenField}`);
      }
    }
    for (const requiredField of ['appName', 'timestamp']) {
      if (!event.requiredFields?.includes(requiredField)) {
        errors.push(`Analytics event must keep data-dropper envelope field: ${event.eventName}.${requiredField}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

async function readFixtureJson(relativePath, root = ZOOSITE_SEED_FIXTURE_ROOT) {
  return JSON.parse(await readFile(new URL(relativePath, root), 'utf8'));
}

async function readFixtureJsonl(relativePath, root = ZOOSITE_SEED_FIXTURE_ROOT) {
  const contents = await readFile(new URL(relativePath, root), 'utf8');
  return contents
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export async function loadZoositeSeedArticleFixture(root = ZOOSITE_SEED_FIXTURE_ROOT) {
  const revisionBase = 'content-hubs/test/zoosite-main/articles/art_20260620_blog_builder/lang/es/revisions/rev_001/';
  return {
    manifest: await readFixtureJson(
      'content-hubs/test/zoosite-main/articles/art_20260620_blog_builder/manifest.json',
      root,
    ),
    articlePackage: await readFixtureJson(`${revisionBase}package.json`, root),
    components: await readFixtureJson(`${revisionBase}components.json`, root),
    variables: await readFixtureJson(`${revisionBase}variables.json`, root),
    i18n: await readFixtureJson(`${revisionBase}i18n/es.json`, root),
    snapshot: await readFixtureJson(`${revisionBase}snapshot.json`, root),
    delta: await readFixtureJson(`${revisionBase}delta.json`, root),
    validationReport: await readFixtureJson(`${revisionBase}validation-report.json`, root),
    publishedBundle: await readFixtureJson(
      'content-hubs/test/zoosite-main/published/zoositioweb.com.mx/es/art_20260620_blog_builder/rev_001/bundle.json',
      root,
    ),
    taxonomy: await readFixtureJson('content-hubs/test/zoosite-main/taxonomy/taxonomy.json', root),
    metadataTables: {
      contentHubMetadata: await readFixtureJson('dynamodb/contentHubMetadata.json', root),
      contentHubMedia: await readFixtureJson('dynamodb/contentHubMedia.json', root),
      contentHubInteractions: await readFixtureJson('dynamodb/contentHubInteractions.json', root),
    },
    analyticsEvents: await readFixtureJsonl('analytics/blog-events.jsonl', root),
  };
}

export function validateZoositeSeedArticleFixture(fixture) {
  const errors = [];
  const manifest = fixture?.manifest ?? {};
  const articlePackage = fixture?.articlePackage ?? {};
  const bundle = fixture?.publishedBundle ?? {};
  const components = Array.isArray(bundle?.components?.components) ? bundle.components.components : [];
  const metadataItems = Array.isArray(fixture?.metadataTables?.contentHubMetadata)
    ? fixture.metadataTables.contentHubMetadata
    : [];
  const analyticsEvents = Array.isArray(fixture?.analyticsEvents) ? fixture.analyticsEvents : [];

  if (!cleanString(manifest?.seo?.title)) errors.push('SEO title is required before publish.');
  if (!cleanString(manifest?.seo?.description)) errors.push('SEO description is required before publish.');
  if (!isSafeSameOriginPath(manifest?.seo?.canonicalPath)) errors.push('SEO canonicalPath must be same-origin.');
  if (!cleanString(manifest?.languages?.[0]?.slug)) errors.push('Language slug is required before publish.');
  if (!Array.isArray(articlePackage?.rootIds) || !articlePackage.rootIds.includes('articleRoot')) {
    errors.push('Article package must keep articleRoot as a stable render root.');
  }

  const slugKeys = metadataItems
    .filter((item) => item?.itemFamily === 'SLUG')
    .map((item) => `${item.pk ?? ''}|${item.sk ?? ''}`);
  if (slugKeys.length !== new Set(slugKeys).size) {
    errors.push('Slug uniqueness check failed for metadata fixture.');
  }

  for (const asset of manifest?.media ?? []) {
    if (asset?.kind === 'image' && !cleanString(asset.alt)) {
      errors.push(`Image asset ${asset.assetId ?? '<unknown>'} requires alt text.`);
    }
    if (isUnsafePublicString(asset?.publicUrl)) {
      errors.push(`Image asset ${asset.assetId ?? '<unknown>'} uses a signed URL or unsafe URL.`);
    }
  }

  const ids = new Set();
  const headingTags = new Set();
  for (const component of components) {
    const id = cleanString(component?.id);
    if (!SAFE_SEGMENT_PATTERN.test(id)) errors.push(`Component id is not stable/safe: ${id || '<empty>'}`);
    if (ids.has(id)) errors.push(`Duplicate component id: ${id}`);
    ids.add(id);
    const config = component?.config;
    if (config?.tag) headingTags.add(config.tag);
    collectPublicLeaks(component, `component.${id || '<empty>'}`, errors);
    if (component?.type === 'image' && !cleanString(config?.alt)) {
      errors.push(`Image component ${id} requires alt text.`);
    }
  }
  if (!headingTags.has('h1')) errors.push('Published article must render an h1 heading.');

  collectPublicLeaks(bundle, 'publishedBundle', errors);

  const eventNames = analyticsEvents.map((event) => event?.eventName);
  if (!eventNames.includes('blog_view')) errors.push('Analytics fixture must include blog_view.');
  if (!eventNames.includes('blog_cta_click')) errors.push('Analytics fixture must include blog_cta_click.');
  for (const event of analyticsEvents) {
    for (const key of Object.keys(event ?? {})) {
      if (PII_ANALYTICS_FIELD_PATTERN.test(key)) {
        errors.push(`Analytics event contains PII field: ${key}`);
      }
    }
    if (!String(event?.eventName ?? '').startsWith('blog_')) {
      errors.push(`Analytics event must use blog_ prefix: ${event?.eventName ?? '<empty>'}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function publishZoositeSeedArticleFixture(fixture) {
  const validation = validateZoositeSeedArticleFixture(fixture);
  if (!validation.ok) {
    return {
      ok: false,
      validation,
      bundles: [],
    };
  }

  return {
    ok: true,
    validation,
    bundles: [fixture.publishedBundle],
  };
}

export function readPublishedSeedArticleBundle(publication, request) {
  if (!publication?.ok) return null;
  const renderDomain = cleanString(request?.renderDomain);
  const locale = cleanString(request?.locale);
  const path = cleanString(request?.path);
  return publication.bundles.find((bundle) => (
    bundle.renderDomain === renderDomain
    && bundle.locale === locale
    && bundle.path === path
    && bundle.status === 'published'
  )) ?? null;
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isSafeSameOriginPath(value) {
  const path = cleanString(value);
  return path.startsWith('/')
    && !path.startsWith('//')
    && !path.includes('\\')
    && !/[\s\u0000-\u001F\u007F]/u.test(path);
}

function isUnsafePublicString(value) {
  return typeof value === 'string' && UNSAFE_PUBLIC_STRING_PATTERN.test(value);
}

function collectPublicLeaks(value, path, errors) {
  if (value == null || typeof value !== 'object') {
    if (isUnsafePublicString(value)) {
      errors.push(`Unsafe public string at ${path}: signed URL or disallowed scheme.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectPublicLeaks(item, `${path}[${index}]`, errors));
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (SERVER_ONLY_PUBLIC_KEY_PATTERN.test(key)) {
      errors.push(`Server-only public key leaked at ${path}.${key}.`);
    }
    if (/^on[A-Za-z]/u.test(key)) {
      errors.push(`Unsafe event handler key leaked at ${path}.${key}.`);
    }
    collectPublicLeaks(entry, `${path}.${key}`, errors);
  }
}

function runCli() {
  const plan = buildContentHubLocalContractPlan();
  const validation = validateContentHubLocalContractPlan(plan);
  console.log(JSON.stringify({ ok: validation.ok, validation, plan }, null, 2));
  if (!validation.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
