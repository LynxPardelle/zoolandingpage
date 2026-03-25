import type { TComponentChild } from '@/app/shared/components/component-children.types';
import type { GenericContainerComponentTag } from '@/app/shared/components/generic-container/generic-container.types';
import type { GenericTextTag } from '@/app/shared/components/generic-text/generic-text.types';
import { TGenericComponent } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types';

type TDynamicString = string | (() => string);
type TDynamicBoolean = boolean | (() => boolean);

type TGenericButtonOptions = {
    readonly icon?: string;
    readonly ariaLabel?: TDynamicString;
    readonly loading?: TDynamicBoolean;
    readonly eventInstructions?: string;
};

export const GenericComponentBuilder = {
    text(id: string, tag: GenericTextTag, text: TDynamicString, classes: string): TGenericComponent {
        return {
            id,
            type: 'text',
            config: {
                tag,
                text,
                classes,
            },
        };
    },

    translatedText(id: string, tag: GenericTextTag, key: string, classes: string): TGenericComponent {
        return {
            id,
            type: 'text',
            valueInstructions: `set:config.text,i18n,${ key }`,
            config: {
                tag,
                text: '',
                classes,
            },
        };
    },

    container(id: string, tag: GenericContainerComponentTag, classes: string, children: readonly TComponentChild[]): TGenericComponent {
        return {
            id,
            type: 'container',
            config: {
                tag,
                classes,
                components: children,
            },
        };
    },

    button(
        id: string,
        label: TDynamicString,
        classes: TDynamicString,
        pressed?: (event: MouseEvent) => void,
        options?: TGenericButtonOptions,
    ): TGenericComponent {
        return {
            id,
            type: 'button',
            eventInstructions: options?.eventInstructions,
            config: {
                type: 'button',
                label,
                classes,
                pressed,
                icon: options?.icon,
                ariaLabel: options?.ariaLabel,
                loading: options?.loading,
            },
        };
    },

    translatedEventButton(id: string, key: string, eventInstructions: string, classes: string): TGenericComponent {
        return {
            id,
            type: 'button',
            eventInstructions,
            valueInstructions: `set:config.label,i18n,${ key }`,
            config: {
                type: 'button',
                label: '',
                classes,
            },
        };
    },
};
