import type { TDynamicValue } from '@/app/shared/types/component-runtime.types';

export type TGenericCardVariant = 'feature' | 'testimonial';

export type TGenericCardConfig = {
    readonly variant?: TGenericCardVariant;
    readonly classes?: string;
    readonly buttonClasses?: string;
    readonly featureIconContainerClasses?: string;
    readonly featureIconClasses?: string;
    readonly featureTitleClasses?: string;
    readonly featureDescriptionClasses?: string;
    readonly benefitsListClasses?: string;
    readonly benefitItemClasses?: string;
    readonly benefitIconClasses?: string;
    readonly benefitTextClasses?: string;
    readonly testimonialHeaderClasses?: string;
    readonly testimonialAvatarClasses?: string;
    readonly testimonialAuthorClasses?: string;
    readonly testimonialNameClasses?: string;
    readonly testimonialRoleClasses?: string;
    readonly testimonialVerifiedIconClasses?: string;
    readonly testimonialContentClasses?: string;
    readonly testimonialRatingClasses?: string;
    readonly testimonialStarClasses?: string;
    readonly testimonialRatingTextClasses?: string;

    readonly icon?: TDynamicValue<string>;
    readonly title?: TDynamicValue<string>;
    readonly description?: TDynamicValue<string>;
    readonly benefits?: TDynamicValue<readonly string[]>;
    readonly buttonLabel?: TDynamicValue<string>;
    readonly onCta?: (title: string) => void;

    readonly name?: TDynamicValue<string>;
    readonly role?: TDynamicValue<string>;
    readonly company?: TDynamicValue<string>;
    readonly content?: TDynamicValue<string>;
    readonly rating?: TDynamicValue<number>;
    readonly avatar?: TDynamicValue<string>;
    readonly verified?: TDynamicValue<boolean>;
};
