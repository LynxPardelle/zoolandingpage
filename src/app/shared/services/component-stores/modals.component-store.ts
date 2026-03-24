import { TGenericComponent } from "../../components/wrapper-orchestrator/wrapper-orchestrator.types";

export const modals: TGenericComponent[] = [
    // [MODALS-4] Analytics consent modal content
    {
        id: 'modalAnalyticsConsentRoot',
        type: 'container',
        config: {
            tag: 'section',
            classes: 'ank-display-flex ank-flexDirection-column ank-gap-0_75rem ank-w-100per',
            components: ['modalConsentHeader', 'modalConsentIntro', 'modalConsentBullets', 'modalConsentActions'],
        },
    },
    {
        id: 'modalConsentHeader',
        type: 'container',
        config: {
            tag: 'div',
            classes:
                'ank-display-flex ank-alignItems-center ank-gap-0_5rem ank-bg-secondaryBgColor ank-border-1px ank-borderColor-border ank-p-0_5rem ank-borderRadius-0_5rem',
            components: ['modalConsentHeaderIcon', 'modalConsentHeaderTitle'],
        },
    },
    {
        id: 'modalConsentHeaderIcon',
        type: 'container',
        config: {
            tag: 'div',
            classes:
                'ank-width-2rem ank-height-2rem ank-borderRadius-50per ank-bg-accentColor ank-display-flex ank-alignItems-center ank-justifyContent-center ank-color-bgColor ank-fontWeight-700',
            components: ['modalConsentHeaderIconGlyph'],
        },
    },
    {
        id: 'modalConsentHeaderIconGlyph',
        type: 'text',
        config: { tag: 'span', text: 'ⓘ' },
    },
    {
        id: 'modalConsentHeaderTitle',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,consent.title',
        config: {
            tag: 'h2',
            text: '',
            classes: 'ank-m-0 ank-fontSize-1_125rem ank-fontWeight-700 ank-color-textColor',
        },
    },
    {
        id: 'modalConsentIntro',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,consent.intro',
        config: { tag: 'p', text: '', classes: 'ank-m-0 ank-color-secondaryTextColor' },
    },
    {
        id: 'modalConsentBullets',
        type: 'container',
        config: {
            tag: 'ul',
            classes: 'ank-m-0 ank-pt-0_25rem ank-pl-1rem ank-color-secondaryTextColor',
            components: ['modalConsentBullet0', 'modalConsentBullet1', 'modalConsentBullet2'],
        },
    },
    {
        id: 'modalConsentBullet0',
        type: 'container',
        config: { tag: 'li', components: ['modalConsentBullet0Text'] },
    },
    {
        id: 'modalConsentBullet0Text',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,consent.bullets.0',
        config: { text: '' },
    },
    {
        id: 'modalConsentBullet1',
        type: 'container',
        config: { tag: 'li', components: ['modalConsentBullet1Text'] },
    },
    {
        id: 'modalConsentBullet1Text',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,consent.bullets.1',
        config: { text: '' },
    },
    {
        id: 'modalConsentBullet2',
        type: 'container',
        config: { tag: 'li', components: ['modalConsentBullet2Text'] },
    },
    {
        id: 'modalConsentBullet2Text',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,consent.bullets.2',
        config: { text: '' },
    },
    {
        id: 'modalConsentActions',
        type: 'container',
        config: {
            tag: 'div',
            classes:
                'ank-display-flex ank-gap-0_5rem ank-justifyContent-end ank-alignItems-stretch ank-mt-0_75rem ank-flexWrap-wrap',
            components: ['modalConsentDeclineBtn', 'modalConsentLaterBtn', 'modalConsentAllowBtn'],
        },
    },
    {
        id: 'modalConsentDeclineBtn',
        type: 'button',
        eventInstructions: 'declineConsent',
        valueInstructions: 'set:config.label,i18n,consent.actions.decline',
        config: {
            label: '',
            classes: 'btnBaseVALSVL1_25remVL0_75remVL btnTypePrimaryVALSVLsecondaryAccentColorVLtextColorVL',
        },
    },
    {
        id: 'modalConsentLaterBtn',
        type: 'button',
        eventInstructions: 'remindLater:24',
        valueInstructions: 'set:config.label,i18n,consent.actions.later',
        config: {
            label: '',
            classes: 'btnBaseVALSVL1_25remVL0_75remVL btnTypePrimaryVALSVLwarningVLtextColorVL',
        },
    },
    {
        id: 'modalConsentAllowBtn',
        type: 'button',
        eventInstructions: 'acceptConsent',
        valueInstructions: 'set:config.label,i18n,consent.actions.allow',
        config: {
            label: '',
            classes: 'btnBaseVALSVL1_25remVL0_75remVL btnTypePrimaryVALSVLprimaryVLtextColorVL',
        },
    },

    // [MODALS-5] Demo modal content
    {
        id: 'modalDemoRoot',
        type: 'container',
        config: {
            tag: 'section',
            classes: 'ank-display-flex ank-flexDirection-column ank-gap-1rem ank-w-100per',
            components: ['modalDemoHeader', 'modalDemoDesc', 'modalDemoFeatures', 'modalDemoActions'],
        },
    },
    {
        id: 'modalDemoHeader',
        type: 'container',
        config: {
            tag: 'header',
            classes:
                'ank-display-flex ank-alignItems-center ank-gap-0_5rem ank-bg-accentColor ank-color-bgColor ank-p-1rem ank-borderRadius-0_5rem',
            components: ['modalDemoHeaderIcon', 'modalDemoHeaderTitle'],
        },
    },
    {
        id: 'modalDemoHeaderIcon',
        type: 'container',
        config: {
            tag: 'div',
            classes:
                'ank-width-2rem ank-height-2rem ank-borderRadius-50per ank-bg-secondaryAccentColor ank-display-flex ank-alignItems-center ank-justifyContent-center ank-color-bgColor ank-fontWeight-700',
            components: ['modalDemoHeaderIconGlyph'],
        },
    },
    {
        id: 'modalDemoHeaderIconGlyph',
        type: 'text',
        config: { tag: 'span', text: '🎉' },
    },
    {
        id: 'modalDemoHeaderTitle',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,demo.modal.header',
        config: {
            tag: 'h2',
            text: '',
            classes: 'ank-m-0 ank-fontSize-1_25rem ank-fontWeight-700',
        },
    },
    {
        id: 'modalDemoDesc',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,demo.modal.desc',
        config: { tag: 'p', text: '', classes: 'ank-m-0 ank-color-secondaryTextColor' },
    },
    {
        id: 'modalDemoFeatures',
        type: 'container',
        config: {
            tag: 'ul',
            classes: 'ank-m-0 ank-pl-1rem ank-color-secondaryTextColor',
            components: ['modalDemoFeature0', 'modalDemoFeature1', 'modalDemoFeature2'],
        },
    },
    {
        id: 'modalDemoFeature0',
        type: 'container',
        config: { tag: 'li', components: ['modalDemoFeature0Text'] },
    },
    {
        id: 'modalDemoFeature0Text',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,demo.modal.features.0',
        config: { text: '' },
    },
    {
        id: 'modalDemoFeature1',
        type: 'container',
        config: { tag: 'li', components: ['modalDemoFeature1Text'] },
    },
    {
        id: 'modalDemoFeature1Text',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,demo.modal.features.1',
        config: { text: '' },
    },
    {
        id: 'modalDemoFeature2',
        type: 'container',
        config: { tag: 'li', components: ['modalDemoFeature2Text'] },
    },
    {
        id: 'modalDemoFeature2Text',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,demo.modal.features.2',
        config: { text: '' },
    },
    {
        id: 'modalDemoActions',
        type: 'container',
        config: {
            tag: 'div',
            classes: 'ank-display-flex ank-justifyContent-end ank-gap-0_5rem ank-mt-1rem',
            components: ['modalDemoCloseBtn'],
        },
    },
    {
        id: 'modalDemoCloseBtn',
        type: 'button',
        eventInstructions: 'closeModal',
        valueInstructions: 'set:config.label,i18n,demo.modal.close',
        config: {
            label: '',
            classes: 'btnBaseVALSVL1_25remVL0_75remVL btnTypePrimaryVALSVLsecondaryAccentColorVLtextColorVL',
        },
    },
];
