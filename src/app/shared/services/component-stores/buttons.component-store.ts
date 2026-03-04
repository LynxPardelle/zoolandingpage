import { TGenericComponent } from "../../components/wrapper-orchestrator/wrapper-orchestrator.types";
import { AnalyticsEvents } from "../analytics.events";

export const buttons: TGenericComponent[] = [
    /* Hero */
    // Primary CTA
    {
        id: 'primaryCTA',
        type: 'button',
        eventInstructions: "openWhatsApp:event.meta_title,hero_primary,hero",
        meta_title: 'hero_primary_click',
        valueInstructions: 'set:config.label,i18n,hero.primary.label',
        config: {
            label: '',
            classes: 'btnBaseVALSVL1_25remVL0_75remVL btnTypePrimaryVALSVLsecondaryLinkColorVLtextColorVL',
        }
    },
    // Secondary CTA
    {
        id: 'secondaryCTA',
        condition: 'all:i18n,hero.secondary',
        type: 'button',
        eventInstructions: "trackCTAClick:event.meta_title,secondary,hero;navigationToSection:features-section",
        meta_title: 'hero_secondary_click',
        valueInstructions: 'set:config.label,i18n,hero.secondary.label',
        config: {
            label: '',
            classes: 'btnBaseVALSVL1_25remVL0_75remVL btnTypeOutlineVALSVLsecondaryLinkColorVLtextColorVL',
        }
    },

    /* FAQ Section */
    {
        id: 'faqFooterButton',
        type: 'button',
        eventInstructions: 'openFaqCtaWhatsApp',
        valueInstructions: 'set:config.label,i18n,faqSection.footerButtonLabel',
        config: {
            label: '',
            loading: false,
            disabled: false,
            classes: 'btnBaseVALSVL1_25remVL0_75remVL ank-bg-transparent ank-border-2px__solid__secondaryAccentColor ank-color-secondaryAccentColor ank-ts-200 ank-bgHover-secondaryAccentColor ank-colorHover-secondaryTextColor ank-mx-auto',
        }
    },

    /* Final CTA Section */
    {
        id: 'finalCtaPrimaryButton',
        type: 'button',
        eventInstructions: 'openFinalCtaWhatsApp:event.meta_title,primary',
        meta_title: AnalyticsEvents.FinalCtaPrimaryClick,
        valueInstructions: 'set:config.label,i18n,finalCtaSection.primaryLabel',
        config: {
            label: '',
            classes: 'btnBaseVALSVL1_25remVL0_75remVL btnTypePrimaryVALSVLsecondaryLinkColorVLtextColorVL',
        }
    },
    {
        id: 'finalCtaSecondaryButton',
        type: 'button',
        eventInstructions: 'openFinalCtaWhatsApp:event.meta_title,secondary',
        meta_title: AnalyticsEvents.FinalCtaSecondaryClick,
        valueInstructions: 'set:config.label,i18n,finalCtaSection.secondaryLabel',
        config: {
            label: '',
            classes:
                'btnBaseVALSVL1_25remVL0_75remVL ank-bg-transparent ank-border-2px__solid__secondaryLinkColor ank-color-secondaryLinkColor ank-ts-200 ank-bgHover-secondaryLinkColor ank-colorHover-secondaryTextColor',
        }
    },

    /* Header */
    {
        id: 'toggleThemeDesktop',
        type: 'button',
        eventInstructions: 'toggleTheme',
        meta_title: String(AnalyticsEvents.ThemeToggle),
        valueInstructions: 'set:config.label,themePick,☀️,🌙',
        config: {
            id: 'toggleTheme',
            label: '',
            classes:
                'ank-alignItems-center ank-and-7s ank-anic-infinite ank-antf-ease ank-bgcl-borderMINbox ank-bgi-linearMINgradientSD90degCOMaltBgColorCOMaltAccentColorCOMaltSecondaryBgColorED ank-bgs-150per ank-border-none ank-borderRadius-1rem ank-display-flex ank-p-0_5rem__1_5rem gradientShiftAnimation',
        }
    },
    {
        id: 'toggleLanguageDesktop',
        type: 'button',
        eventInstructions: 'toggleLanguage',
        meta_title: String(AnalyticsEvents.LanguageToggle),
        valueInstructions: 'set:config.label,i18n,ui.controls.languageToggle',
        config: {
            id: 'toggleLanguage',
            label: '',
            classes:
                'btnBaseVALSVAL9N1remVAL9NVL1_5remVL0_5remVL1remVL ank-bg-accentColor ank-color-secondaryTextColor ank-ts-200 ank-bgHover-secondaryAccentColor ank-colorHover-secondaryTextColor ank-border-none',
        }
    },
    {
        id: 'toggleThemeMobile',
        type: 'button',
        eventInstructions: 'toggleTheme',
        meta_title: String(AnalyticsEvents.ThemeToggle),
        valueInstructions: 'set:config.label,themePick,☀️,🌙',
        config: {
            id: 'toggleThemeMobile',
            label: '',
            classes:
                'ank-width-36px ank-height-36px ank-display-flex ank-alignItems-center ank-justifyContent-center ank-and-7s ank-anic-infinite ank-antf-ease ank-bgcl-borderMINbox ank-bgi-linearMINgradientSD90degCOMaltBgColorCOMaltAccentColorCOMaltSecondaryBgColorED ank-bgs-150per ank-border-none ank-borderRadius-1rem ank-p-0 gradientShiftAnimation',
        }
    },
    {
        id: 'toggleLanguageMobile',
        type: 'button',
        eventInstructions: 'toggleLanguage',
        meta_title: String(AnalyticsEvents.LanguageToggle),
        valueInstructions: 'set:config.label,i18n,ui.controls.languageToggle',
        config: {
            id: 'toggleLanguageMobile',
            label: '',
            classes:
                'btnBaseVALSVAL9N1remVAL9NVL8pxVL8pxVL0_75remVL ank-bg-accentColor ank-color-secondaryTextColor ank-ts-200 ank-bgHover-secondaryAccentColor ank-colorHover-secondaryTextColor ank-width-36px ank-height-36px ank-border-none',
        }
    },

    /* Footer */
    {
        id: 'footerTermsButton',
        type: 'button',
        eventInstructions: 'openFooterTerms',
        valueInstructions: 'set:config.label,i18n,footer.legal.terms.link; set:config.ariaLabel,i18n,footer.legal.terms.link',
        config: {
            label: '',
            ariaLabel: '',
            classes:
                'ank-bg-transparent ank-border-0 ank-color-secondaryTextColor ank-fontSize-sm ank-textDecoration-underline ank-cursor-pointer',
        }
    },
    {
        id: 'footerDataButton',
        type: 'button',
        eventInstructions: 'openFooterData',
        valueInstructions: 'set:config.label,i18n,footer.legal.data.link; set:config.ariaLabel,i18n,footer.legal.data.link',
        config: {
            label: '',
            ariaLabel: '',
            classes:
                'ank-bg-transparent ank-border-0 ank-color-secondaryTextColor ank-fontSize-sm ank-textDecoration-underline ank-cursor-pointer',
        }
    },
];
