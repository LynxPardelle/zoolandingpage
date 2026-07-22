export type TCommerceRuntimeReadKind =
    | 'itemList'
    | 'itemDetail'
    | 'offerList'
    | 'offerDetail'
    | 'discountList'
    | 'discountDetail';

export type TCommerceRuntimeActionKind =
    | 'createItem'
    | 'createOfferVersion'
    | 'createDiscountVersion'
    | 'advanceOfferLifecycle'
    | 'updateOfferPresentation'
    | 'advanceDiscountLifecycle'
    | 'updateDiscountPresentation'
    | 'adjustStock'
    | 'changePlan'
    | 'applyDiscount'
    | 'removeDiscount'
    | 'pause'
    | 'resume'
    | 'openPortal'
    | 'migrationPreview'
    | 'migrationExecute'
    | 'migrationPause'
    | 'migrationResume'
    | 'migrationCancel'
    | 'migrationStatus'
    | 'admitCheckout';

export type TCommerceRuntimeReadBinding = {
    readonly read: TCommerceRuntimeReadKind;
    readonly access?: 'protected' | 'public';
};

export type TCommerceRuntimeActionBinding = {
    readonly action: TCommerceRuntimeActionKind;
};

export type TCommerceCheckoutLine = {
    readonly offerVersionId: string;
    readonly quantity: number;
};

export type TCommerceBrowserResponse<T = unknown> = {
    readonly ok?: boolean;
    readonly data: T;
    readonly requestId?: string;
};
