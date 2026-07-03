import type { TDynamicValue } from '@/app/shared/types/component-runtime.types';

export type TGenericCardVariant = 'feature' | 'testimonial';
export type TGenericCardAction = {
    readonly label: TDynamicValue<string>;
    readonly ariaLabel?: TDynamicValue<string>;
    readonly eventInstructions?: TDynamicValue<string>;
    readonly confirmMessage?: TDynamicValue<string>;
    readonly classes?: TDynamicValue<string>;
    readonly disabled?: TDynamicValue<boolean>;
    readonly loading?: TDynamicValue<boolean>;
    readonly icon?: TDynamicValue<string>;
    readonly iconClasses?: TDynamicValue<string>;
    readonly iconPosition?: TDynamicValue<'after' | 'before'>;
};

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
    readonly imageContainerClasses?: string;
    readonly imageClasses?: string;
    readonly linkClasses?: string;
    readonly linkStyles?: Readonly<Record<string, string | number | null | undefined>>;
    readonly actionListClasses?: string;
    readonly actionButtonClasses?: string;

    readonly icon?: TDynamicValue<string>;
    readonly title?: TDynamicValue<string>;
    readonly description?: TDynamicValue<string>;
    readonly benefits?: TDynamicValue<readonly string[]>;
    readonly buttonLabel?: TDynamicValue<string>;
    readonly onCta?: (title: string) => void;
    readonly imageSrc?: TDynamicValue<string>;
    readonly imageAlt?: TDynamicValue<string>;
    readonly href?: TDynamicValue<string>;
    readonly linkHref?: TDynamicValue<string>;
    readonly linkLabel?: TDynamicValue<string>;
    readonly linkEventInstructions?: TDynamicValue<string>;
    readonly target?: TDynamicValue<'_self' | '_blank' | '_parent' | '_top'>;
    readonly rel?: TDynamicValue<string>;
    readonly actions?: TDynamicValue<readonly TGenericCardAction[]>;

    readonly name?: TDynamicValue<string>;
    readonly role?: TDynamicValue<string>;
    readonly company?: TDynamicValue<string>;
    readonly content?: TDynamicValue<string>;
    readonly rating?: TDynamicValue<number>;
    readonly avatar?: TDynamicValue<string>;
    readonly verified?: TDynamicValue<boolean>;
};
