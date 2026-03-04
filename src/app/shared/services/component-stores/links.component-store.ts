import { TGenericComponent } from "../../components/wrapper-orchestrator/wrapper-orchestrator.types";

export const links: TGenericComponent[] = [
    /* Accessibility */
    {
        id: 'skipToMainLink',
        type: 'link',
        eventInstructions: 'skipToMain:main-content',
        valueInstructions: 'set:config.text,i18n,ui.accessibility.skipToContent',
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
        valueInstructions: 'set:config.text,var,ui.brandTextFallback; set:config.ariaLabel,var,ui.brandTextFallback',
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
        id: 'headerNavLinkTemplate',
        type: 'link',
        eventInstructions: 'trackNavClick:event.eventData,event.eventData;navigationToSection:event.eventData',
        config: {
            id: 'headerNavLinkTemplate',
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
