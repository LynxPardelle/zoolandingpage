import { TGenericComponent } from "../../components/wrapper-orchestrator/wrapper-orchestrator.types";

export const icons: TGenericComponent[] = [
    /* Hero */
    // Speed Icon
    {
        id: 'speed',
        type: 'icon',
        config: {
            iconName: 'speed',
            classes: 'ank-color-textColor ank-fs-1rem'
        }
    },
    // Security Icon
    {
        id: 'security',
        type: 'icon',
        config: {
            iconName: 'security',
            classes: 'ank-color-textColor ank-fs-1rem'
        }
    },
    // Analytics Icon
    {
        id: 'analytics',
        type: 'icon',
        config: {
            iconName: 'analytics',
            classes: 'ank-color-textColor ank-fs-1rem'
        }
    },
    // Flash On Icon
    {
        id: 'flash_on',
        type: 'icon',
        config: {
            iconName: 'flash_on',
            classes: 'ank-color-info ank-fs-1rem'
        }
    },
    // Verified Icon
    {
        id: 'verified',
        type: 'icon',
        config: {
            iconName: 'verified',
            classes: 'ank-color-textColor ank-fs-1rem'
        }
    },
    // Phone Android Icon
    {
        id: 'phone_android',
        type: 'icon',
        config: {
            iconName: 'phone_android',
            classes: 'ank-color-light ank-fs-1rem'
        }
    },
    // Help Outline Icon
    {
        id: 'help_outline',
        type: 'icon',
        config: {
            iconName: 'help_outline',
            classes: 'ank-color-textColor ank-fs-1_5rem'
        }
    },
    // Arrow Forward Icon
    {
        id: 'arrow_forward',
        type: 'icon',
        config: {
            iconName: 'arrow_forward',
            classes: 'ank-color-secondaryAccentColor ank-fs-1_5rem'
        }
    },

    /* Header */
    {
        id: 'menu',
        type: 'icon',
        valueInstructions: 'set:config.ariaLabel,i18n,ui.accessibility.openMenu',
        config: {
            iconName: 'menu',
            ariaLabel: '',
            classes: 'ank-color-textColor ank-fs-1_5rem'
        }
    },

];
