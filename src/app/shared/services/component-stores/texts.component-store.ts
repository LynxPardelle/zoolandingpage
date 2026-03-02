import { TGenericComponent } from "../../components/wrapper-orchestrator/wrapper-orchestrator.types";

export const texts: TGenericComponent[] = [
    /* Hero */
    // MainTitle
    {
        id: 'mainTitle',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,hero.title',
        config: {
            tag: 'h1',
            text: '',
            classes:
                'ank-fs-3rem ank-fs-lg-5rem ank-fontWeight-bold ank-lh-3_3rem ank-lh-lg-5_5rem ank-mb-1_25rem textGradientVALSVAL2NsecondaryAccentColorVAL2NVAL3NsecondaryTitleColorVAL3NVL135degVL'
        }
    },
    // Subtitle
    {
        id: 'subtitle',
        type: 'text',
        condition: 'all:i18n,hero.subtitle',
        valueInstructions: 'set:config.text,i18n,hero.subtitle',
        config: {
            tag: 'p',
            text: '',
            classes: 'ank-fs-1_125rem ank-color-secondaryTextColor ank-mb-1_5rem ank-lineHeight-relaxed'
        }
    },
    // Description
    {
        id: 'description',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,hero.description',
        config: {
            tag: 'p',
            text: '',
            classes: 'ank-fs-1_125rem ank-color-secondaryTextColor ank-mb-1_5rem ank-lineHeight-relaxed'
        }
    },
    // Badges Label
    {
        id: 'badgesLabel',
        condition: 'all:i18n,hero.badgesLabel',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,hero.badgesLabel',
        config: {
            tag: 'p',
            text: '',
            classes: 'ank-fs-1rem ank-color-textColor ank-fontWeight-medium'
        }
    },
    // Badge Text Template (materialized via loopConfig)
    {
        id: 'badgeTextTemplate',
        type: 'text',
        loopConfig: {
            source: 'i18n',
            path: 'hero.badges',
            templateId: 'badgeTextTemplate',
            idPrefix: 'badgeText',
        },
        config: {
            tag: 'span',
            text: '',
            classes: 'ank-fs-1rem ank-color-textColor ank-fontWeight-medium'
        }
    },
    // Hero Browser Mockup Header Fake URL Bar Text
    {
        id: "heroBrowserMockupHeaderFakeUrlBarText",
        type: 'text',
        valueInstructions: 'set:config.text,i18n,hero.mockup.url',
        config: {
            tag: '',
            text: '',
        }
    },
    // Hero Landing Mockup Logo Text
    {
        id: "heroLandingMockupLogoText",
        type: 'text',
        valueInstructions: 'set:config.text,i18n,hero.mockup.logo',
        config: {
            tag: 'span',
            text: '',
            classes: 'ank-color-textColor ank-fs-1rem ank-fontWeight-bold'
        }
    },
    // Hero Landing Mockup Nav CTA Text
    {
        id: "heroLandingMockupNavCtaText",
        type: 'text',
        valueInstructions: 'set:config.text,i18n,hero.mockup.contact',
        config: {
            tag: 'span',
            text: '',
            classes: 'ank-color-textColor ank-fs-1rem ank-fontWeight-bold'
        }
    },
    // Hero Landing Mockup Content CTA1 Text
    {
        id: "heroLandingMockupContentCTA1Text",
        type: 'text',
        valueInstructions: 'set:config.text,i18n,hero.mockup.buyButton',
        config: {
            tag: 'span',
            text: '',
            classes: 'ank-color-textColor ank-fs-1rem ank-fontWeight-bold'
        }
    },
    // Hero Landing Mockup Content CTA2 Text
    {
        id: "heroLandingMockupContentCTA2Text",
        type: 'text',
        valueInstructions: 'set:config.text,i18n,hero.mockup.demoButton',
        config: {
            tag: 'span',
            text: '',
            classes: 'ank-color-secondaryAccentColor ank-fs-1rem ank-fontWeight-bold'
        }
    },
    // Hero Landing Mockup Footer Link Text
    {
        id: "heroLandingMockupFooterLinkText",
        type: 'text',
        valueInstructions: 'set:config.text,i18n,hero.mockup.ctaButton',
        config: {
            tag: 'span',
            text: '',
            classes: 'ank-color-textColor ank-fs-1rem ank-fontWeight-bold ank-px-1rem'
        },
    },
    // Hero Floating Metrics Label Text
    {
        id: "heroFloatingMetricsLabelText",
        type: 'text',
        valueInstructions: 'set:config.text,i18n,hero.floatingMetrics.speed',
        config: {
            tag: '',
            text: '',
        }
    },
    // Hero Floating Metrics Value Text
    {
        id: "heroFloatingMetricsValueText",
        type: 'text',
        config: {
            tag: '',
            text: '< 3s',
        }
    },
    // Hero Conversion Label Text
    {
        id: "heroConversionLabelText",
        type: 'text',
        valueInstructions: 'set:config.text,i18n,hero.floatingMetrics.conversion',
        config: {
            tag: '',
            text: '',
        }
    },
    // Hero Conversion Value Text
    {
        id: "heroConversionValueText",
        type: 'text',
        config: {
            tag: '',
            text: '+340%',
        }
    },
    // Hero Verified Label
    {
        id: "heroVerifiedLabel",
        type: 'text',
        valueInstructions: 'set:config.text,i18n,hero.floatingMetrics.seoOptimized',
        config: { tag: '', text: '' }
    },
    // Hero Mobile Label
    {
        id: "heroMobileLabel",
        type: 'text',
        valueInstructions: 'set:config.text,i18n,hero.floatingMetrics.mobileResponsive',
        config: { tag: '', text: '' }
    },

    /* Features Section */
    {
        id: 'featuresSectionTitle',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,featuresSection.title',
        config: {
            tag: 'h2',
            text: '',
            classes: 'ank-fs-2rem ank-fontWeight-bold ank-mb-1rem ank-color-titleColor',
        }
    },
    {
        id: 'featuresSectionSubtitle',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,featuresSection.subtitle',
        config: {
            tag: 'p',
            text: '',
            classes: 'ank-fs-1_25rem ank-color-textColor ank-maxWidth-37_5rem ank-mx-auto',
        }
    },

    /* Services Section */
    {
        id: 'servicesSectionTitle',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,ui.sections.services.title',
        config: {
            tag: 'h2',
            text: '',
        }
    },
    {
        id: 'servicesSectionSubtitle',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,ui.sections.services.subtitle',
        config: {
            tag: 'p',
            text: '',
        }
    },

    /* FAQ Section */
    {
        id: 'faqSectionTitle',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,ui.sections.faq.title',
        config: {
            tag: 'h2',
            text: '',
        }
    },
    {
        id: 'faqSectionSubtitle',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,ui.sections.faq.subtitle',
        config: {
            tag: 'p',
            text: '',
        }
    },
    {
        id: 'faqFooterQuestion',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,faqSection.footerQuestion',
        config: {
            tag: 'p',
            text: '',
        }
    },

    /* Final CTA Section */
    {
        id: 'finalCtaTitle',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,finalCtaSection.title',
        config: {
            tag: 'h2',
            text: '',
            classes: 'ank-fs-2rem ank-fontWeight-bold ank-mb-16px ank-color-titleColor',
        }
    },
    {
        id: 'finalCtaSubtitle',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,finalCtaSection.subtitle',
        config: {
            tag: 'p',
            text: '',
            classes: 'ank-fs-1_5rem ank-color-textColor ank-mb-32px ank-maxWidth-600px ank-mx-auto',
        }
    },

    // Final CTA Trust (Line 1)
    {
        id: 'finalCtaTrustLine1',
        type: 'text',
        valueInstructions: 'set:config.text,langPick,⭐ Measurement from day 1 • 🔒 SSL and hosting included • ⚡ Fast delivery,⭐ Medición desde el día 1 • 🔒 SSL y hosting incluido • ⚡ Entrega rápida',
        config: {
            tag: 'p',
            classes: 'ank-fs-1rem ank-color-textColor ank-m-0',
            text: '',
        }
    },

    // Final CTA Trust (Row 2)
    {
        id: 'finalCtaTrustSpanSupport',
        type: 'text',
        valueInstructions: 'set:config.text,langPick,💬 Continuous support,💬 Soporte continuo',
        config: {
            tag: 'span',
            text: '',
        }
    },
    {
        id: 'finalCtaTrustSpanReports',
        type: 'text',
        valueInstructions: 'set:config.text,langPick,📊 Optional simple reports,📊 Reportes simples opcionales',
        config: {
            tag: 'span',
            text: '',
        }
    },
    {
        id: 'finalCtaTrustSpanSeo',
        type: 'text',
        valueInstructions: 'set:config.text,langPick,🌐 Search engine optimization,🌐 Optimización para buscadores',
        config: {
            tag: 'span',
            text: '',
        }
    },
    {
        id: 'finalCtaTrustTextMeasurement',
        type: 'text',
        valueInstructions: 'set:config.text,langPick,Measurement from day 1,Medición desde el día 1',
        config: {
            tag: 'span',
            text: '',
        }
    },
    {
        id: 'finalCtaTrustTextSsl',
        type: 'text',
        valueInstructions: 'set:config.text,langPick,SSL and hosting included,SSL y hosting incluido',
        config: {
            tag: 'span',
            text: '',
        }
    },
    {
        id: 'finalCtaTrustTextDelivery',
        type: 'text',
        valueInstructions: 'set:config.text,langPick,Fast delivery,Entrega rápida',
        config: {
            tag: 'span',
            text: '',
        }
    },
    {
        id: 'finalCtaTrustTextSupport',
        type: 'text',
        valueInstructions: 'set:config.text,langPick,Continuous support,Soporte continuo',
        config: {
            tag: 'span',
            text: '',
        }
    },
    {
        id: 'finalCtaTrustTextReports',
        type: 'text',
        valueInstructions: 'set:config.text,langPick,Optional simple reports,Reportes simples opcionales',
        config: {
            tag: 'span',
            text: '',
        }
    },
    {
        id: 'finalCtaTrustTextSeo',
        type: 'text',
        valueInstructions: 'set:config.text,langPick,Search engine optimization,Optimización para buscadores',
        config: {
            tag: 'span',
            text: '',
        }
    },

    /* Testimonials Section */
    {
        id: 'testimonialsSectionTitle',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,ui.sections.testimonials.title',
        config: {
            tag: 'h2',
            text: '',
        }
    },
    {
        id: 'testimonialsSectionSubtitle',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,ui.sections.testimonials.subtitle',
        config: {
            tag: 'p',
            text: '',
        }
    },

    /* Stats Strip Section */
    {
        id: 'statsStripTitle',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,statsStrip.title',
        config: {
            tag: 'h2',
            text: '',
            classes: 'ank-fs-2rem ank-fontWeight-bold ank-mb-16px ank-color-titleColor',
        }
    },
    {
        id: 'statsStripSubtitle',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,statsStrip.subtitle',
        config: {
            tag: 'p',
            text: '',
            classes: 'ank-fs-1_5rem ank-color-textColor ank-mb-16px',
        }
    },
    {
        id: 'statsStripDescription',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,statsStrip.description',
        config: {
            tag: 'p',
            text: '',
            classes: 'ank-fs-1rem ank-color-textColor ank-maxWidth-700px ank-mx-auto',
        }
    },
    {
        id: 'statsStripVisitsLabel',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,statsStrip.visitsLabel',
        config: {
            tag: 'p',
            text: '',
            classes: 'ank-fs-1rem ank-opacity-90',
        }
    },
    {
        id: 'statsStripCtaLabel',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,statsStrip.ctaInteractionsLabel',
        config: {
            tag: 'p',
            text: '',
            classes: 'ank-fs-1rem ank-opacity-90',
        }
    },
    {
        id: 'statsStripAvgTimeLabel',
        type: 'text',
        valueInstructions: 'set:config.text,i18n,statsStrip.averageTimeLabel',
        config: {
            tag: 'p',
            text: '',
            classes: 'ank-fs-1rem ank-opacity-90',
        }
    },

    /* Conversion Note */
    // Conversion Note Header Title
    {
        id: "conversionNoteHeaderTitle",
        type: 'text',
        valueInstructions: 'set:config.text,i18n,conversionNote.title',
        config: {
            tag: 'h3',
            text: '',
            classes: 'ank-fs-1_5rem ank-fontWeight-bold ank-m-0 ank-color-titleColor'
        }
    },
    // Conversion Note Description Text
    {
        id: "conversionNoteDescriptionText",
        type: 'text',
        valueInstructions: 'set:config.html,i18n,conversionNote.conversionDescription',
        config: {
            tag: 'p',
            html: '',
            classes: 'ank-fs-1_25rem ank-lineHeight-relaxed ank-m-0 ank-color-bgColor'
        }
    },
    // Conversion Note Hint 1 Label
    {
        id: "conversionNoteHint1Label",
        type: 'text',
        valueInstructions: 'set:config.text,i18n,conversionNote.investmentLabel',
        config: {
            tag: 'p',
            text: '',
            classes: 'ank-fs-1rem ank-opacity-90'
        }
    },
    // Conversion Note Hint 1 Value
    {
        id: "conversionNoteHint1Value",
        type: 'text',
        valueInstructions: 'set:config.text,i18n,conversionNote.investmentValue',
        config: {
            tag: 'p',
            text: '',
            classes: 'ank-fs-1_25rem ank-fontWeight-bold'
        }
    },
    // Conversion Note Hint 3 Label
    {
        id: "conversionNoteHint3Label",
        type: 'text',
        valueInstructions: 'set:config.text,i18n,conversionNote.totalReturnLabel',
        config: {
            tag: 'p',
            text: '',
            classes: 'ank-fs-1rem ank-opacity-90'
        }
    },
    // Conversion Note Hint 3 Value
    {
        id: "conversionNoteHint3Value",
        type: 'text',
        valueInstructions: 'set:config.text,i18n,conversionNote.totalReturnValue',
        config: {
            tag: 'p',
            text: '',
            classes: 'ank-fs-1_25rem ank-fontWeight-bold'
        }
    },

    /* Footer */
    {
        id: 'footerLegalTitle',
        type: 'text',
        valueInstructions: 'set:config.text,langPick,host.footerTranslations.en.legalTitle,host.footerTranslations.es.legalTitle',
        config: {
            tag: 'h3',
            text: '',
            classes: 'ank-fontSize-lg ank-fontWeight-semibold ank-color-titleColor ank-margin-0',
        }
    },
    {
        id: 'footerLegalSeparator',
        type: 'text',
        config: {
            tag: 'span',
            text: '•',
            classes: 'ank-color-secondaryTextColor',
        }
    },
    {
        id: 'footerCopyrightText',
        type: 'text',
        valueInstructions: 'set:config.text,langPick,host.footerConfig.copyrightText,© 2025 Zoo Landing Page. Todos los derechos reservados.',
        config: {
            tag: 'p',
            text: '',
            classes: 'ank-color-secondaryTextColor ank-fontSize-sm ank-margin-0',
        }
    },
];
