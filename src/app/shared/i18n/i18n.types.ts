/**
 * Comprehensive type-safe internationalization system for landing page components
 * Centralizes all translatable content for Spanish/English support
 */

export type TLanguage = string;

// Hero Section
export interface THeroTranslations {
    title: string;
    subtitle: string;
    description: string;
    readonly backgroundImage?: string;
    primary: { label: string; trackLabel: string };
    secondary: { label: string; trackLabel: string };
    badges: readonly { text: string }[];
    badgesLabel: string;
    mockup: {
        url: string;
        logo: string;
        contact: string;
        buyButton: string;
        demoButton: string;
        ctaButton: string;
        badges: {
            conversion: string;
            speed: string;
            seoOptimized: string;
            mobileResponsive: string;
        };
    };
    floatingMetrics: {
        speed: string;
        conversion: string;
        seoOptimized: string;
        mobileResponsive: string;
    };
}

// Features Section
export interface TFeatureTranslations {
    icon: string;
    title: string;
    description: string;
    benefits: readonly string[];
}

// Features Section Header
export interface TFeaturesSectionTranslations {
    title: string;
    subtitle: string;
}

// Services Section
export interface TServiceTranslations {
    icon: string;
    title: string;
    description: string;
    features: readonly string[];
    color: string;
    buttonLabel: string;
}

// Testimonials Section
export interface TTestimonialTranslations {
    name: string;
    role: string;
    company: string;
    content: string;
    rating: number;
    avatar: string;
    verified?: boolean;
}

// Interactive Process Section
export interface TProcessStepTranslations {
    step: number;
    title: string;
    description: string;
    detailedDescription: string;
    duration: string;
    deliverables: readonly string[];
    isActive: boolean;
}

// Process Section Header
export interface TProcessSectionTranslations {
    title: string;
    sidebarTitle: string;
    detailedDescriptionLabel: string;
    deliverablesLabel: string;
}

// FAQ Section
export interface TFaqTranslations {
    id: string;
    title: string;
    content: string;
}

// FAQ Section Footer
export interface TFaqSectionTranslations {
    footerQuestion: string;
    footerButtonLabel: string;
    placeholderQuestions: readonly string[];
}

// Conversion Note Section
export interface TConversionNoteTranslations {
    title: string;
    question: string;
    investmentLabel: string;
    investmentValue: string;
    totalReturnLabel: string;
    totalReturnValue: string;
    explanation: string;
    conversionDescription: string;
}

// Conversion Calculator Section
export interface TCalculatorTranslations {
    title: string;
    subtitle: string;
    description: string;
    businessSizeLabels: {
        nano: { title: string; description: string };
        micro: { title: string; description: string };
        small: { title: string; description: string };
        medium: { title: string; description: string };
    };
    industryLabels: Record<string, string>;
    visitorsLabel: string;
    visitsPerMonthSuffix: string;
    inputVisitorsLabel: string;
    inputVisitorsAriaLabel: string;
    businessSizeLabel: string;
    industryLabel: string;
    growthPotentialTitle: string;
    basedOnCurrentConfig: string;
    resultsBasedHint: string;
    projectionsDisclaimer: string;
    requestConsultingCta: string;
    placeholderMonthlyIncreaseValue: string;
    placeholderConversionImprovementValue: string;
    resultsTitle: string;
    monthlyIncreaseLabel: string;
    conversionImprovementLabel: string;
}

// Stats Strip Section
export interface TStatsStripSectionTranslations {
    title: string;
    subtitle: string;
    description: string;
    visitsLabel: string;
    ctaInteractionsLabel: string;
    averageTimeLabel: string;
}

// Final CTA Section
export interface TFinalCtaSectionTranslations {
    title: string;
    subtitle: string;
    primaryLabel: string;
    secondaryLabel: string;
    trustSignals: {
        first: string;
        second: readonly string[];
    };
}

// Section Titles and General UI
export type TUiTranslations = {
    sections: {
        services: {
            title: string;
            subtitle: string;
            cta: string;
        };
        testimonials: {
            title: string;
            subtitle: string;
        };
        faq: {
            title: string;
            subtitle: string;
        };
        finalCta: {
            title: string;
            subtitle: string;
            primaryLabel: string;
            secondaryLabel: string;
        };
    };
    loading: {
        calculator: string;
        testimonials: string;
        faq: string;
    };
    contact: {
        label: string;
        whatsappMessage: string;
    };
    accessibility: {
        skipToContent: string;
        openMenu: string;
        mobileMenuAriaLabel: string;
        primaryNavigation: string;
        dialog: string;
        analyticsConsentDialog: string;
        dialogOpened: string;
        dialogClosed: string;
    };
    controls: {
        languageToggle: string;
    };
    debugPanel: {
        downloadDraftPayloads: string;
        writeDraftsToDisk: string;
        configIssues: string;
        analyticsLatest: string;
        unknownComponentPrefix: string;
    };
    common: {
        loading: string;
        search: string;
        noResults: string;
        loadingPanel: string;
        notifications: string;
        dismissNotification: string;
        verified: string;
    };
}

// Demo
export type TDemoTranslations = {
    title: string,
    modal: {
        title: string,
        header: string,
        desc: string,
        features: readonly string[],
        close: string,
        button: {
            open: string;
        },
        action: {
            confirm: string;
            cancel: string;
        },
        actions: {
            primary: string;
            secondary: string;
        },
        info: string;
        closeLabel: string;
    },
    toast: {
        demoTitle: string,
        basicTypesTitle: string,
        advancedFeaturesTitle: string,
        positionConfigTitle: string,
        currentConfigurationTitle: string,
        positionLabel: string,
        maxVisibleLabel: string,
        defaultAutoCloseLabel: string,
        activeToastsLabel: string,
        success: string,
        error: string,
        warning: string,
        info: string,
        multipleMessages: readonly string[],
        fileUploadTitle: string,
        fileUploadText: string,
        unsavedTitle: string,
        unsavedText: string,
        unsavedSave: string,
        criticalTitle: string,
        criticalText: string,
        contactSupport: string,
        tryAgain: string,
        updateTitle: string,
        updateText: string,
        updateNow: string,
        viewChanges: string,
        later: string,
        updateStarted: string,
        connectionRestored: string,
        openingChangelog: string,
        updatePostponed: string,
        positionChanged: string,
        positionTopRight: string,
        positionTopLeft: string,
        positionBottomCenter: string,
        allCleared: string,
        changesSaved: string,
        discard: string,
        openingSupport: string,
        button: {
            success: string,
            error: string,
            warning: string,
            info: string,
            withTitle: string,
            fileUpload: string,
            unsaved: string,
            critical: string,
            action: string,
            persistent: string,
            multiple: string,
            position: string,
            topRight: string,
            topLeft: string,
            bottomCenter: string,
            clear: string
        }
    }
}

// Consent
export type TConsentTranslations = {
    title: string,
    intro: string,
    bullets: [
        string,
        string,
        string
    ],
    actions: {
        allow: string,
        decline: string,
        remove: string,
        later: string,
        confirm: string,
        cancel: string
    },
    feedback: {
        snoozed: string,
        removed: string,
        confirmRemove: string
    }
}

// Footer
export type TFooterTranslations = {
    actions: {
        close: string
    },
    legal: {
        title: string,
        terms: {
            link: string,
            title: string,
            intro: string,
            sections: [
                {
                    title: string,
                    text: string
                },
                {
                    title: string,
                    text: string
                },
                {
                    title: string,
                    text: string
                },
                {
                    title: string,
                    text: string
                }
            ]
        },
        data: {
            link: string,
            title: string,
            intro: string,
            points: [
                string,
                string,
                string,
                string
            ],
            consentNote: string
        }
    }
}

// Complete translation interface
export interface TLandingPageTranslations {
    hero: THeroTranslations;
    featuresSection: TFeaturesSectionTranslations;
    features: readonly TFeatureTranslations[];
    services: readonly TServiceTranslations[];
    testimonials: readonly TTestimonialTranslations[];
    processSection: TProcessSectionTranslations;
    process: readonly TProcessStepTranslations[];
    faqSection: TFaqSectionTranslations;
    faq: readonly TFaqTranslations[];
    conversionNote: TConversionNoteTranslations;
    statsStrip: TStatsStripSectionTranslations;
    calculator: TCalculatorTranslations;
    finalCtaSection: TFinalCtaSectionTranslations;
    ui: TUiTranslations;
    demo: TDemoTranslations;
    consent: TConsentTranslations;
    footer: TFooterTranslations;
}

// Translation configuration
export interface TI18nConfig {
    currentLanguage: TLanguage;
    translations: Record<TLanguage, TLandingPageTranslations>;
}
