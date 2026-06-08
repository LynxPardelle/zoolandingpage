export type TBlogPostSummary = {
    readonly id: string;
    readonly slug: string;
    readonly title: string;
    readonly excerpt?: string;
    readonly publishedAt: string;
    readonly authorName?: string;
    readonly tags?: readonly string[];
};

export type TBlogPublicSource = {
    readonly draftDomain: string;
    readonly pageId?: string;
};

export type TBlogLoadStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export type TBlogPublicExtraState = {
    readonly status: TBlogLoadStatus;
    readonly source: TBlogPublicSource | null;
    readonly error: string | null;
};

export type TBlogEditorStatus = 'idle' | 'editing' | 'saving' | 'saved' | 'error';

export type TBlogEditorState = {
    readonly draftId: string | null;
    readonly draftDomain: string | null;
    readonly title: string;
    readonly bodyMarkdown: string;
    readonly status: TBlogEditorStatus;
    readonly lastSavedAt: string | null;
    readonly error: string | null;
    readonly isDirty: boolean;
};
