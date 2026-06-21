export type TContentHubId = string;
export type TContentHubArticleId = string;
export type TContentHubRevisionId = string;
export type TContentHubLocale = string;
export type TContentHubDraftDomain = string;

export type TContentHubSource = 'primary' | 'authorized';
export type TContentHubCanonicalMode = 'owner-canonical' | 'host-adaptive' | 'noindex-shared';
export type TContentHubArticleStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
export type TContentHubLanguageStatus = 'draft' | 'ready' | 'scheduled' | 'published' | 'archived';
export type TContentHubVisibility = 'public' | 'unlisted' | 'protected' | 'private';
export type TContentHubTaxonomyKind = 'category' | 'tag';
export type TContentHubCommentMode = 'off' | 'authenticated';
export type TContentHubModerationMode = 'off' | 'queue' | 'spam-check' | 'manual';
export type TContentHubHtmlFreedom = 'strict' | 'balanced' | 'advanced' | 'trusted';
export type TContentHubAnalyticsPiiPolicy = 'no-pii' | 'metadata-only';
export type TContentHubRevisionKind = 'snapshot' | 'delta';
export type TContentHubRuntimeReadKind =
    | 'articleList'
    | 'taxonomyList'
    | 'moderationQueue'
    | 'assetList'
    | 'revisionList'
    | 'publicBundlePreview';
export type TContentHubRuntimeActionKind =
    | 'createArticle'
    | 'updatePackage'
    | 'uploadAsset'
    | 'validate'
    | 'submitReview'
    | 'publish'
    | 'schedule'
    | 'moderateComment'
    | 'restoreRevision';

export type TContentHubPackagePointer = {
    readonly key: string;
    readonly sha256: string;
    readonly bytes?: number;
};

export type TContentHubAnalyticsContext = {
    readonly contentGroup: string;
    readonly eventPrefix: string;
    readonly piiPolicy?: TContentHubAnalyticsPiiPolicy;
};

export type TContentHubRuntimeConfig = {
    readonly hubId: TContentHubId;
    readonly ownerDraftDomain: TContentHubDraftDomain;
    readonly source: TContentHubSource;
    readonly routeBasePath: string;
    readonly listPath: string;
    readonly articlePathPattern: string;
    readonly defaultLocale: TContentHubLocale;
    readonly locales: readonly TContentHubLocale[];
    readonly canonicalMode: TContentHubCanonicalMode;
    readonly runtimeSourceId?: string;
    readonly publicApiBasePath?: string;
    readonly analyticsContext?: TContentHubAnalyticsContext;
    readonly publicArticles?: readonly TContentHubRuntimeArticleSummary[];
    readonly publicTaxonomy?: readonly TContentHubRuntimeTaxonomySummary[];
};

export type TContentHubRuntimeArticleSummary = {
    readonly articleId: TContentHubArticleId;
    readonly locale: TContentHubLocale;
    readonly status: 'published';
    readonly title: string;
    readonly summary?: string;
    readonly path: string;
    readonly categorySlug?: string;
    readonly tags?: readonly string[];
    readonly publishedAt: string;
    readonly updatedAt?: string;
    readonly authorLabel?: string;
    readonly canonicalPath?: string;
    readonly robots?: 'index,follow' | 'noindex,follow' | 'noindex,nofollow';
};

export type TContentHubRuntimeTaxonomySummary = {
    readonly taxonomyId: string;
    readonly kind: TContentHubTaxonomyKind;
    readonly slug: string;
    readonly label: string;
    readonly locale: TContentHubLocale;
    readonly visible?: boolean;
    readonly path?: string;
};

export type TContentHubRuntimeBindingBase = {
    readonly hubId: TContentHubId;
    readonly articleId?: TContentHubArticleId;
    readonly language?: TContentHubLocale;
    readonly revisionId?: TContentHubRevisionId;
    readonly taxonomyId?: string;
    readonly taxonomyKind?: TContentHubTaxonomyKind;
    readonly assetId?: string;
    readonly commentId?: string;
    readonly scheduleId?: string;
};

export type TContentHubRuntimeReadBinding = TContentHubRuntimeBindingBase & {
    readonly read: TContentHubRuntimeReadKind;
};

export type TContentHubRuntimeActionBinding = TContentHubRuntimeBindingBase & {
    readonly action: TContentHubRuntimeActionKind;
};

export type TContentHubLanguageManifest = {
    readonly locale: TContentHubLocale;
    readonly status: TContentHubLanguageStatus;
    readonly slug: string;
    readonly title: string;
    readonly summary?: string;
    readonly packagePointer: TContentHubPackagePointer;
    readonly latestRevisionId: TContentHubRevisionId;
};

export type TContentHubTaxonomyRefs = {
    readonly categories: readonly string[];
    readonly tags: readonly string[];
};

export type TContentHubSeoPolicy = {
    readonly title: string;
    readonly description: string;
    readonly canonicalPath: string;
    readonly robots: 'index,follow' | 'noindex,follow' | 'noindex,nofollow';
    readonly structuredDataTypes?: readonly string[];
};

export type TContentHubMediaAssetMetadata = {
    readonly assetId: string;
    readonly kind: 'image' | 'video' | 'audio' | 'document' | 'download';
    readonly publicUrl: string;
    readonly alt?: string;
    readonly title?: string;
    readonly caption?: string;
    readonly credit?: string;
    readonly license?: string;
    readonly mimeType: string;
    readonly bytes: number;
    readonly width?: number;
    readonly height?: number;
    readonly focalPoint?: {
        readonly x: number;
        readonly y: number;
    };
    readonly usageRefs?: readonly string[];
};

export type TContentHubCommentPolicy = {
    readonly mode: TContentHubCommentMode;
    readonly moderation: TContentHubModerationMode;
};

export type TContentHubInteractionPolicy = {
    readonly enabled: boolean;
    readonly moderation: TContentHubModerationMode;
};

export type TContentHubInteractionPolicies = {
    readonly reactions?: TContentHubInteractionPolicy;
    readonly ctas?: TContentHubInteractionPolicy;
    readonly forms?: TContentHubInteractionPolicy;
};

export type TContentHubContentSafetyPolicy = {
    readonly sanitizerPolicyId: string;
    readonly htmlFreedom: TContentHubHtmlFreedom;
    readonly allowedComponentPresetIds?: readonly string[];
};

export type TContentHubRevisionPointer = {
    readonly revisionId: TContentHubRevisionId;
    readonly kind: TContentHubRevisionKind;
    readonly createdAt: string;
    readonly packagePointer: TContentHubPackagePointer;
};

export type TContentHubArticlePackageManifest = {
    readonly version: 1;
    readonly hubId: TContentHubId;
    readonly articleId: TContentHubArticleId;
    readonly ownerDraftDomain: TContentHubDraftDomain;
    readonly originDraftDomain: TContentHubDraftDomain;
    readonly status: TContentHubArticleStatus;
    readonly visibility: TContentHubVisibility;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly scheduledAt?: string;
    readonly primaryLocale: TContentHubLocale;
    readonly languages: readonly TContentHubLanguageManifest[];
    readonly taxonomy: TContentHubTaxonomyRefs;
    readonly seo: TContentHubSeoPolicy;
    readonly media?: readonly TContentHubMediaAssetMetadata[];
    readonly comments: TContentHubCommentPolicy;
    readonly interactions?: TContentHubInteractionPolicies;
    readonly contentSafety: TContentHubContentSafetyPolicy;
    readonly analytics: TContentHubAnalyticsContext;
    readonly revisions: readonly TContentHubRevisionPointer[];
};

export type TContentHubPublishedBundle = {
    readonly version: 1;
    readonly bundleId: string;
    readonly hubId: TContentHubId;
    readonly articleId: TContentHubArticleId;
    readonly ownerDraftDomain: TContentHubDraftDomain;
    readonly renderDomain: TContentHubDraftDomain;
    readonly locale: TContentHubLocale;
    readonly path: string;
    readonly status: 'published';
    readonly publishedAt: string;
    readonly seo: {
        readonly title: string;
        readonly description: string;
        readonly canonical: string;
        readonly robots: 'index,follow' | 'noindex,follow' | 'noindex,nofollow';
    };
    readonly structuredData?: readonly {
        readonly type: string;
        readonly json: Record<string, unknown>;
    }[];
    readonly components: unknown;
    readonly variables?: unknown;
    readonly i18n?: unknown;
    readonly analytics: TContentHubAnalyticsContext;
};

export type TContentHubTaxonomyRecord = {
    readonly taxonomyId: string;
    readonly kind: TContentHubTaxonomyKind;
    readonly slug: string;
    readonly createdByDraftDomain: TContentHubDraftDomain;
    readonly defaultLocale: TContentHubLocale;
    readonly labels: Readonly<Record<TContentHubLocale, string>>;
    readonly visibility: {
        readonly default: 'visible' | 'hidden';
        readonly overrides?: readonly {
            readonly draftDomain: TContentHubDraftDomain;
            readonly visible: boolean;
            readonly labels?: Readonly<Record<TContentHubLocale, string>>;
        }[];
    };
};
