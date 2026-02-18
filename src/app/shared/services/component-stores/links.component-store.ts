import { TGenericComponent } from "../../components/wrapper-orchestrator/wrapper-orchestrator.types";
import { footerSocialLinks } from "./data/footerSocialLinks";

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
        config: {
            id: 'headerLogoImage',
            href: '#home',
            ariaLabel: 'Zoo Landing',
            text: 'Zoo Landing',
            classes:
                'ank-fs-1_5rem ank-fs-md-2rem ank-fontWeight-bold ank-color-titleColor ank-ms-1rem ank-tde-none',
        }
    },
    {
        id: 'headerNavHome',
        type: 'link',
        eventInstructions: 'trackNavClick:home,event.eventData;navigationToSection:home',
        valueInstructions: 'set:config.text,langPick,Home,Inicio',
        config: {
            id: 'headerNavHome',
            href: '#home',
            text: '',
            classes:
                'ank-textDecoration-none ank-fontWeight-500 ank-letterSpacing-05px ank-position-relative ank-paddingInline-4px ank-paddingBlock-4px ank-transition-color ank-duration-200 ank-color-accentColor',
        }
    },
    {
        id: 'headerNavBenefits',
        type: 'link',
        eventInstructions: 'trackNavClick:benefits,event.eventData;navigationToSection:features-section',
        valueInstructions: 'set:config.text,langPick,Benefits,Beneficios',
        config: {
            id: 'headerNavBenefits',
            href: '#features-section',
            text: '',
            classes:
                'ank-textDecoration-none ank-fontWeight-500 ank-letterSpacing-05px ank-position-relative ank-paddingInline-4px ank-paddingBlock-4px ank-transition-color ank-duration-200 ank-color-textColor ank-opacity-80',
        }
    },
    {
        id: 'headerNavProcess',
        type: 'link',
        eventInstructions: 'trackNavClick:process,event.eventData;navigationToSection:process-section',
        valueInstructions: 'set:config.text,langPick,Process,Proceso',
        config: {
            id: 'headerNavProcess',
            href: '#process-section',
            text: '',
            classes:
                'ank-textDecoration-none ank-fontWeight-500 ank-letterSpacing-05px ank-position-relative ank-paddingInline-4px ank-paddingBlock-4px ank-transition-color ank-duration-200 ank-color-textColor ank-opacity-80',
        }
    },
    {
        id: 'headerNavServices',
        type: 'link',
        eventInstructions: 'trackNavClick:services,event.eventData;navigationToSection:services-section',
        valueInstructions: 'set:config.text,langPick,Services,Servicios',
        config: {
            id: 'headerNavServices',
            href: '#services-section',
            text: '',
            classes:
                'ank-textDecoration-none ank-fontWeight-500 ank-letterSpacing-05px ank-position-relative ank-paddingInline-4px ank-paddingBlock-4px ank-transition-color ank-duration-200 ank-color-textColor ank-opacity-80',
        }
    },
    {
        id: 'headerNavContact',
        type: 'link',
        eventInstructions: 'trackNavClick:contact,event.eventData;navigationToSection:contact-section',
        valueInstructions: 'set:config.text,langPick,Contact,Contacto',
        config: {
            id: 'headerNavContact',
            href: '#contact-section',
            text: '',
            classes:
                'ank-textDecoration-none ank-fontWeight-500 ank-letterSpacing-05px ank-position-relative ank-paddingInline-4px ank-paddingBlock-4px ank-transition-color ank-duration-200 ank-color-textColor ank-opacity-80',
        }
    },

    /* Footer */
    ...footerSocialLinks.map(link => ({
        id: link.id,
        type: 'link',
        config: {
            id: link.id,
            href: link.url,
            text: link.icon,
            classes: 'ank-color-secondaryTextColor ank-textDecoration-none ank-fontSize-lg ank-padding-8px ank-borderRadius-md ank-transition-colors',
            target: '_blank',
            rel: 'noopener noreferrer',
            ariaLabel: link.ariaLabel,
        }
    })) as TGenericComponent[],
];
