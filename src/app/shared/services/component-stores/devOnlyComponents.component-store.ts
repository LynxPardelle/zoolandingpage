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
        eventInstructions: 'showDemoModal',
        valueInstructions: 'set:config.label,i18n,demo.modal.button.open',
        config: {
            label: '',
            classes: 'btnBaseVALSVL1_25remVL0_75remVL ank-fs-1rem ank-btn-primary ank-color-textColor',
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
