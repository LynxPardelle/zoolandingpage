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
export type TContentHubRuntimeCommentPolicy = 'disabled' | 'moderated' | 'authenticated';
export type TContentHubRuntimeContentSafetyRating = 'general' | 'sensitive' | 'restricted';
export type TContentHubHtmlFreedom = 'strict' | 'balanced' | 'advanced' | 'trusted';
export type TContentHubAnalyticsPiiPolicy = 'no-pii' | 'metadata-only';
export type TContentHubRevisionKind = 'snapshot' | 'delta';
export type TContentHubRuntimeReadKind =
    | 'articleList'
    | 'articleDetail'
    | 'taxonomyList'
    | 'moderationQueue'
    | 'assetList'
    | 'revisionList'
    | 'scheduleList'
    | 'publicBundlePreview'
    | 'analyticsSummary';
export type TContentHubRuntimeActionKind =
    | 'createArticle'
    | 'updatePackage'
    | 'upsertTaxonomy'
    | 'uploadAsset'
    | 'validate'
    | 'submitReview'
    | 'approveArticle'
    | 'publish'
    | 'unpublishArticle'
    | 'archiveArticle'
    | 'schedule'
    | 'cancelSchedule'
    | 'queueComment'
    | 'moderateComment'
    | 'recordInteraction'
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
    readonly publicArticles?: TContentHubRuntimeCollection<TContentHubRuntimeArticleSummary>;
    readonly publicTaxonomy?: TContentHubRuntimeCollection<TContentHubRuntimeTaxonomySummary>;
};

export type TContentHubRuntimeCollection<T> = readonly T[] | {
    readonly items?: readonly T[];
};

export type TContentHubRobotsPolicy =
    | 'index,follow'
    | 'noindex,follow'
    | 'index,nofollow'
    | 'noindex,nofollow';

export type TContentHubJsonValue =
    | null
    | boolean
    | number
    | string
    | readonly TContentHubJsonValue[]
    | { readonly [key: string]: TContentHubJsonValue };

export type TContentHubRuntimeArticleContent =
    | string
    | readonly TContentHubJsonValue[]
    | { readonly [key: string]: TContentHubJsonValue };

export type TContentHubRuntimeArticleLocalization = {
    readonly title?: string;
    readonly summary?: string;
    readonly path?: string;
    readonly categorySlug?: string;
    readonly tags?: readonly string[];
    readonly publishedAt?: string;
    readonly updatedAt?: string;
    readonly authorLabel?: string;
    readonly canonicalPath?: string;
    readonly robots?: TContentHubRobotsPolicy;
    readonly articleContent?: TContentHubRuntimeArticleContent;
    readonly imageSrc?: string;
    readonly imageAlt?: string;
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
    readonly visibility?: 'public';
    readonly publishedAt: string;
    readonly updatedAt?: string;
    readonly authorLabel?: string;
    readonly canonicalPath?: string;
    readonly robots?: TContentHubRobotsPolicy;
    readonly articleContent?: TContentHubRuntimeArticleContent;
    readonly imageSrc?: string;
    readonly imageAlt?: string;
    readonly localizations?: Readonly<Record<TContentHubLocale, TContentHubRuntimeArticleLocalization>>;
    readonly commentPolicy?: TContentHubRuntimeCommentPolicy;
    readonly contentSafety?: {
        readonly rating: TContentHubRuntimeContentSafetyRating;
        readonly warnings?: readonly string[];
    };
    readonly interactions?: {
        readonly reactions?: TContentHubInteractionPolicy;
        readonly ctas?: TContentHubInteractionPolicy;
        readonly shares?: TContentHubInteractionPolicy;
        readonly readProgress?: TContentHubInteractionPolicy;
        readonly assetDownloads?: TContentHubInteractionPolicy;
        readonly forms?: TContentHubInteractionPolicy;
    };
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
    readonly robots: TContentHubRobotsPolicy;
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
    readonly shares?: TContentHubInteractionPolicy;
    readonly readProgress?: TContentHubInteractionPolicy;
    readonly assetDownloads?: TContentHubInteractionPolicy;
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

export type TContentHubPublishedCanonicalMode = 'self' | 'custom' | 'none';

export type TContentHubPublishedRobotsPolicy = TContentHubRobotsPolicy;

export type TContentHubPublishedJson = TContentHubJsonValue;

export type TContentHubPublishedArticleContent = TContentHubRuntimeArticleContent;

export type TContentHubPublishedVariables = Readonly<Record<string, TContentHubPublishedJson>> & {
    readonly articleContent?: TContentHubPublishedArticleContent;
};

export type TContentHubPublishedTaxonomyRef = {
    readonly taxonomyId?: string;
    readonly slug?: string;
    readonly label?: string;
};

export type TContentHubPublishedInteractionChannel = {
    readonly enabled: boolean;
    readonly moderation?: string;
};

export type TContentHubPublishedComponentType =
    | 'container'
    | 'media'
    | 'text'
    | 'link';

export type TContentHubPublishedContainerTag =
    | 'span'
    | 'div'
    | 'section'
    | 'main'
    | 'header'
    | 'footer'
    | 'nav'
    | 'article'
    | 'figure'
    | 'ul'
    | 'ol'
    | 'li'
    | 'aside';

export type TContentHubPublishedTextTag =
    | 'p'
    | 'span'
    | 'small'
    | 'strong'
    | 'em'
    | 'figcaption'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6';

export type TContentHubPublishedLinkTarget = '_self' | '_blank' | '_parent' | '_top';

export type TContentHubPublishedContainerConfig = {
    readonly tag?: TContentHubPublishedContainerTag;
    readonly components: readonly string[];
    readonly classes?: string;
};

export type TContentHubPublishedMediaConfig = {
    readonly tag: 'image';
    readonly src: string;
    readonly alt: string;
    readonly classes?: string;
};

export type TContentHubPublishedTextConfig = {
    readonly tag: TContentHubPublishedTextTag;
    readonly text: string;
    readonly classes?: string;
};

export type TContentHubPublishedLinkConfig = {
    readonly href: string;
    readonly text?: string;
    readonly classes?: string;
    readonly target?: TContentHubPublishedLinkTarget;
    readonly rel?: string;
    readonly ariaLabel?: string;
};

type TContentHubPublishedComponentBase = {
    readonly id: string;
    readonly condition?: boolean | string;
    readonly valueInstructions?: string;
    readonly eventInstructions?: string;
    readonly order?: number;
    readonly meta_title?: string;
};

export type TContentHubPublishedComponent = TContentHubPublishedComponentBase & (
    | {
        readonly type: 'container';
        readonly config: TContentHubPublishedContainerConfig;
    }
    | {
        readonly type: 'media';
        readonly config: TContentHubPublishedMediaConfig;
    }
    | {
        readonly type: 'text';
        readonly config: TContentHubPublishedTextConfig;
    }
    | {
        readonly type: 'link';
        readonly config: TContentHubPublishedLinkConfig;
    }
);

export type TContentHubPublishedBundle = {
    readonly version: 1;
    readonly bundleId: string;
    readonly hubId: TContentHubId;
    readonly articleId: TContentHubArticleId;
    readonly kind?: 'content-hub-published-bundle';
    readonly revisionId?: TContentHubRevisionId;
    readonly ownerDraftDomain: TContentHubDraftDomain;
    readonly renderDomain: TContentHubDraftDomain;
    readonly locale: TContentHubLocale;
    readonly path: string;
    readonly safeArticlePath?: string;
    readonly status: 'published';
    readonly publishedAt: string;
    readonly previewedAt?: '';
    readonly title?: string;
    readonly summary?: string;
    readonly slug?: string;
    readonly category?: TContentHubPublishedTaxonomyRef;
    readonly tags?: readonly TContentHubPublishedTaxonomyRef[];
    readonly commentPolicy?: TContentHubRuntimeCommentPolicy;
    readonly contentSafety?: {
        readonly rating: TContentHubRuntimeContentSafetyRating;
        readonly warnings: readonly string[];
    };
    readonly interactions?: {
        readonly ctas?: TContentHubPublishedInteractionChannel;
        readonly reactions?: TContentHubPublishedInteractionChannel;
        readonly shares?: TContentHubPublishedInteractionChannel;
        readonly readProgress?: TContentHubPublishedInteractionChannel;
        readonly assetDownloads?: TContentHubPublishedInteractionChannel;
        readonly forms?: TContentHubPublishedInteractionChannel;
    };
    readonly seo: {
        readonly title: string;
        readonly description: string;
        readonly canonical: string;
        readonly canonicalMode?: TContentHubPublishedCanonicalMode;
        readonly robots: TContentHubPublishedRobotsPolicy;
    };
    readonly structuredData?: readonly {
        readonly type: 'Article' | 'BlogPosting' | 'BreadcrumbList' | 'FAQPage' | 'HowTo' | 'Product';
        readonly json: Readonly<Record<string, TContentHubPublishedJson>>;
    }[];
    readonly components: readonly TContentHubPublishedComponent[];
    readonly variables?: TContentHubPublishedVariables;
    readonly i18n?: Readonly<Record<string, TContentHubPublishedJson>>;
    readonly analytics: TContentHubAnalyticsContext & {
        readonly piiPolicy: TContentHubAnalyticsPiiPolicy;
    };
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
