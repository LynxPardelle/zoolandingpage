import { TGenericComponent } from "../../components/wrapper-orchestrator/wrapper-orchestrator.types";

export const devOnlyComponents: TGenericComponent[] = [
    {
        id: 'devDemoControlsRoot',
        type: 'container',
        condition: 'all:env,features.debugMode',
        config: {
            tag: 'div',
            classes:
                'ank-p-1rem__1rem__3rem__1rem ank-w-100per ank-bg-secondaryBgColor ank-borderTop-1px ank-borderColor-secondaryAccentColor ank-borderBottom-1px ank-pt-5rem ank-pb-15rem',
            components: [
                'devDemoTitle',
                'devDemoControlsRootContainer',
            ],
        },
    }, {
        id: 'devDemoControlsRootContainer',
        type: 'container',
        condition: 'all:env,features.debugMode',
        config: {
            tag: 'div',
            classes:
                'ank-p-1rem__1rem__3rem__1rem ank-display-flex ank-flexWrap-wrap ank-gap-0_5rem ank-w-100per ank-justifyContent-spaceMINevenly ank-bg-secondaryBgColor',
            components: [
                'devDemoOpenModalBtn',
                'devDemoToastSuccessBtn',
                'devDemoToastErrorBtn',
                'devDemoToastActionBtn',
                'devDemoToastPositionBtn',
                'devDemoToastClearBtn',
            ],
        },
    },
    {
        id: 'devDemoTitle',
        type: 'text',
        condition: 'all:env,features.debugMode',
        valueInstructions: 'set:config.text,i18n,demo.title',
        config: {
            tag: 'h3',
            text: '',
            classes: 'ank-w-100per ank-textAlign-center ank-color-secondaryTitleColor',
        },
    },
    {
        id: 'devDemoOpenModalBtn',
        type: 'button',
        condition: 'all:env,features.debugMode',
        eventInstructions: 'openModal:demo-modal',
        valueInstructions: 'set:config.label,i18n,demo.modal.button.open',
        config: {
            label: '',
            classes: 'btnBaseVALSVL1_25remVL0_75remVL ank-fs-1rem ank-btn-primary ank-color-textColor',
        },
    },
    {
        id: 'modalDemoRoot',
        type: 'container',
        condition: 'all:modalRefId,demo-modal',
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
            classes: 'ank-display-flex ank-alignItems-center ank-gap-0_5rem ank-bg-accentColor ank-color-bgColor ank-p-1rem ank-borderRadius-0_5rem',
            components: ['modalDemoHeaderIcon', 'modalDemoHeaderTitle'],
        },
    },
    {
        id: 'modalDemoHeaderIcon',
        type: 'container',
        config: {
            tag: 'div',
            classes: 'ank-width-2rem ank-height-2rem ank-borderRadius-50per ank-bg-secondaryAccentColor ank-display-flex ank-alignItems-center ank-justifyContent-center ank-color-bgColor ank-fontWeight-700',
            components: ['modalDemoHeaderIconGlyph'],
        },
    },
    {
        id: 'modalDemoHeaderIconGlyph',
        type: 'text',
        config: {
            tag: 'span',
            text: '!',
        },
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
        config: {
            tag: 'p',
            text: '',
            classes: 'ank-m-0 ank-color-secondaryTextColor',
        },
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
        config: {
            tag: 'li',
            components: ['modalDemoFeature0Text'],
        },
    },
    {
        id: 'modalDemoFeature0Text',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,demo.modal.features.0',
        config: {
            text: '',
        },
    },
    {
        id: 'modalDemoFeature1',
        type: 'container',
        config: {
            tag: 'li',
            components: ['modalDemoFeature1Text'],
        },
    },
    {
        id: 'modalDemoFeature1Text',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,demo.modal.features.1',
        config: {
            text: '',
        },
    },
    {
        id: 'modalDemoFeature2',
        type: 'container',
        config: {
            tag: 'li',
            components: ['modalDemoFeature2Text'],
        },
    },
    {
        id: 'modalDemoFeature2Text',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,demo.modal.features.2',
        config: {
            text: '',
        },
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
    {
        id: 'devDemoToastSuccessBtn',
        type: 'button',
        condition: 'all:env,features.debugMode',
        eventInstructions: 'showDemoToast',
        valueInstructions: 'set:config.label,i18n,demo.toast.button.success',
        config: {
            label: '',
            classes: 'btnBaseVALSVL1_25remVL0_75remVL ank-fs-1rem ank-btn-success ank-color-textColor',
        },
    },
    {
        id: 'devDemoToastErrorBtn',
        type: 'button',
        condition: 'all:env,features.debugMode',
        eventInstructions: 'showErrorToast',
        valueInstructions: 'set:config.label,i18n,demo.toast.button.error',
        config: {
            label: '',
            classes: 'btnBaseVALSVL1_25remVL0_75remVL ank-fs-1rem ank-btn-danger ank-color-textColor',
        },
    },
    {
        id: 'devDemoToastActionBtn',
        type: 'button',
        condition: 'all:env,features.debugMode',
        eventInstructions: 'showActionToast',
        valueInstructions: 'set:config.label,i18n,demo.toast.button.action',
        config: {
            label: '',
            classes: 'btnBaseVALSVL1_25remVL0_75remVL ank-fs-1rem ank-btn-warning ank-color-textColor',
        },
    },
    {
        id: 'devDemoToastPositionBtn',
        type: 'button',
        condition: 'all:env,features.debugMode',
        eventInstructions: 'showPositionDemo',
        valueInstructions: 'set:config.label,i18n,demo.toast.button.position',
        config: {
            label: '',
            classes: 'btnBaseVALSVL1_25remVL0_75remVL ank-fs-1rem ank-btn-info ank-color-textColor',
        },
    },
    {
        id: 'devDemoToastClearBtn',
        type: 'button',
        condition: 'all:env,features.debugMode',
        eventInstructions: 'clearAllToasts',
        valueInstructions: 'set:config.label,i18n,demo.toast.button.clear',
        config: {
            label: '',
            classes: 'btnBaseVALSVL1_25remVL0_75remVL ank-fs-1rem ank-btn-secondary ank-color-textColor',
        },
    },
];
