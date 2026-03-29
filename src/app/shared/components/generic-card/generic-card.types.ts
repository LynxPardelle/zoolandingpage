export type TDynamicCardValue<T> = T | (() => T);

export type TGenericCardVariant = 'feature' | 'testimonial';

export type TGenericCardConfig = {
    readonly variant?: TGenericCardVariant;
    readonly classes?: string;

    readonly icon?: TDynamicCardValue<string>;
    readonly title?: TDynamicCardValue<string>;
    readonly description?: TDynamicCardValue<string>;
    readonly benefits?: TDynamicCardValue<readonly string[]>;
    readonly buttonLabel?: TDynamicCardValue<string>;
    readonly onCta?: (title: string) => void;

    readonly name?: TDynamicCardValue<string>;
    readonly role?: TDynamicCardValue<string>;
    readonly company?: TDynamicCardValue<string>;
    readonly content?: TDynamicCardValue<string>;
    readonly rating?: TDynamicCardValue<number>;
    readonly avatar?: TDynamicCardValue<string>;
    readonly verified?: TDynamicCardValue<boolean>;
};

export const DEFAULT_GENERIC_CARD_CONFIG: Readonly<Required<Pick<TGenericCardConfig, 'variant' | 'classes'>>> &
    Readonly<{
        title: string;
        description: string;
        benefits: readonly string[];
        buttonLabel: string;
        name: string;
        role: string;
        company: string;
        content: string;
        rating: number;
        avatar: string;
        verified: boolean;
    }> = {
    variant: 'feature',
    classes: '',
    title: '',
    description: '',
    benefits: [],
    buttonLabel: '',
    name: '',
    role: '',
    company: '',
    content: '',
    rating: 0,
    avatar: '',
    verified: false,
};
