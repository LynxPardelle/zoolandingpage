/**
 * Comprehensive type-safe internationalization system for landing page components
 * Centralizes all translatable content for Spanish/English support
 */

export type TLanguage = 'es' | 'en';

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
export interface TUiTranslations {
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
}

// Translation configuration
export interface TI18nConfig {
    currentLanguage: TLanguage;
    translations: Record<TLanguage, TLandingPageTranslations>;
}
