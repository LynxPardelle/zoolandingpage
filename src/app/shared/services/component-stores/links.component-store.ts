import { TGenericComponent } from "../../components/wrapper-orchestrator/wrapper-orchestrator.types";

export const links: TGenericComponent[] = [
    /* Accessibility */
    {
        id: 'skipToMainLink',
        type: 'link',
        eventInstructions: 'skipToMain:main-content',
        valueInstructions: 'set:config.text,langPick,Skip to content,Saltar al contenido',
        config: {
            id: 'skipToMainLink',
            href: '#main-content',
            text: '',
            classes:
                'ank-position-absolute ank-s-0 ank-t-0 ank-w-1px ank-h-1px ank-overflow-hidden ank-positionFocus-static ank-wFocus-auto ank-hFocus-auto ank-pFocus-0_5rem__1rem ank-bgFocus-abyss ank-colorFocus-white ank-zIndexFocus-1000',
        },
    },

    /* Header */
    {
        id: 'headerLogoImage',
        type: 'link',
        valueInstructions: 'set:config.text,varOr,ui.brandTextFallback,Zoo Landing; set:config.ariaLabel,varOr,ui.brandTextFallback,Zoo Landing',
        config: {
            id: 'headerLogoImage',
            href: '#home',
            ariaLabel: '',
            text: '',
            classes:
                'ank-fs-1_5rem ank-fs-md-2rem ank-fontWeight-bold ank-color-titleColor ank-ms-1rem ank-tde-none',
        }
    },
    {
        id: 'headerNavHome',
        type: 'link',
        eventInstructions: 'trackNavClick:home,event.eventData;navigationToSection:event.eventData',
        valueInstructions: 'set:config.text,langPick,host.navigation.0.labelEn,host.navigation.0.labelEs; set:config.href,concat,#,host.navigation.0.sectionId',
        config: {
            id: 'headerNavHome',
            href: '',
            text: '',
            classes:
                'ank-textDecoration-none ank-fontWeight-500 ank-letterSpacing-05px ank-position-relative ank-paddingInline-4px ank-paddingBlock-4px ank-transition-color ank-duration-200 ank-color-accentColor',
        }
    },
    {
        id: 'headerNavBenefits',
        type: 'link',
        eventInstructions: 'trackNavClick:benefits,event.eventData;navigationToSection:event.eventData',
        valueInstructions: 'set:config.text,langPick,host.navigation.1.labelEn,host.navigation.1.labelEs; set:config.href,concat,#,host.navigation.1.sectionId',
        config: {
            id: 'headerNavBenefits',
            href: '',
            text: '',
            classes:
                'ank-textDecoration-none ank-fontWeight-500 ank-letterSpacing-05px ank-position-relative ank-paddingInline-4px ank-paddingBlock-4px ank-transition-color ank-duration-200 ank-color-textColor ank-opacity-80',
        }
    },
    {
        id: 'headerNavProcess',
        type: 'link',
        eventInstructions: 'trackNavClick:process,event.eventData;navigationToSection:event.eventData',
        valueInstructions: 'set:config.text,langPick,host.navigation.2.labelEn,host.navigation.2.labelEs; set:config.href,concat,#,host.navigation.2.sectionId',
        config: {
            id: 'headerNavProcess',
            href: '',
            text: '',
            classes:
                'ank-textDecoration-none ank-fontWeight-500 ank-letterSpacing-05px ank-position-relative ank-paddingInline-4px ank-paddingBlock-4px ank-transition-color ank-duration-200 ank-color-textColor ank-opacity-80',
        }
    },
    {
        id: 'headerNavServices',
        type: 'link',
        eventInstructions: 'trackNavClick:services,event.eventData;navigationToSection:event.eventData',
        valueInstructions: 'set:config.text,langPick,host.navigation.3.labelEn,host.navigation.3.labelEs; set:config.href,concat,#,host.navigation.3.sectionId',
        config: {
            id: 'headerNavServices',
            href: '',
            text: '',
            classes:
                'ank-textDecoration-none ank-fontWeight-500 ank-letterSpacing-05px ank-position-relative ank-paddingInline-4px ank-paddingBlock-4px ank-transition-color ank-duration-200 ank-color-textColor ank-opacity-80',
        }
    },
    {
        id: 'headerNavContact',
        type: 'link',
        eventInstructions: 'trackNavClick:contact,event.eventData;navigationToSection:event.eventData',
        valueInstructions: 'set:config.text,langPick,host.navigation.4.labelEn,host.navigation.4.labelEs; set:config.href,concat,#,host.navigation.4.sectionId',
        config: {
            id: 'headerNavContact',
            href: '',
            text: '',
            classes:
                'ank-textDecoration-none ank-fontWeight-500 ank-letterSpacing-05px ank-position-relative ank-paddingInline-4px ank-paddingBlock-4px ank-transition-color ank-duration-200 ank-color-textColor ank-opacity-80',
        }
    },

    /* Footer */
    {
        id: 'footerSocialLinkTemplate',
        type: 'link',
        config: {
            id: 'footerSocialLinkTemplate',
            href: '#',
            text: '',
            classes: 'ank-color-secondaryTextColor ank-textDecoration-none ank-fontSize-lg ank-padding-8px ank-borderRadius-md ank-transition-colors',
            target: '_blank',
            rel: 'noopener noreferrer',
            ariaLabel: '',
        }
    },
];
