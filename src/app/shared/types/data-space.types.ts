export type TDataSpaceRuntimeReadKind =
    | 'collectionList'
    | 'collectionSchema'
    | 'recordList'
    | 'recordDetail';

export type TDataSpaceRuntimeActionKind =
    | 'createCollection'
    | 'updateCollection'
    | 'createRecord'
    | 'updateRecord'
    | 'publishRecord'
    | 'unpublishRecord';

export type TDataSpaceRuntimeReadBinding = {
    readonly read: TDataSpaceRuntimeReadKind;
    readonly spaceId: string;
    readonly access?: 'protected' | 'public';
};

export type TDataSpaceRuntimeActionBinding = {
    readonly action: TDataSpaceRuntimeActionKind;
    readonly spaceId: string;
};

export type TDataSpaceBrowserResponse<T = unknown> = {
    readonly ok?: boolean;
    readonly data: T;
    readonly requestId?: string;
};
