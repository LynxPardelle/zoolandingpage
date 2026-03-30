import type { TDynamicValue } from '@/app/shared/types/component-runtime.types';

export type TGenericCardVariant = 'feature' | 'testimonial';

export type TGenericCardConfig = {
    readonly variant?: TGenericCardVariant;
    readonly classes?: string;

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
