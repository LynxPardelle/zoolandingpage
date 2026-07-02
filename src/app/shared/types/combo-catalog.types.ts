export type TComboCatalogRuntimeReadKind =
    | 'runtimeCombos'
    | 'comboList'
    | 'comboDetail'
    | 'groupList'
    | 'draftPolicy';

export type TComboCatalogRuntimeActionKind =
    | 'createCombo'
    | 'updateCombo'
    | 'batchUpsertCombos'
    | 'softDeleteCombo'
    | 'createGroup'
    | 'updateGroup'
    | 'setDraftPolicy';

export type TComboCatalogRuntimeReadBinding = {
    readonly read: TComboCatalogRuntimeReadKind;
};

export type TComboCatalogRuntimeActionBinding = {
    readonly action: TComboCatalogRuntimeActionKind;
};
