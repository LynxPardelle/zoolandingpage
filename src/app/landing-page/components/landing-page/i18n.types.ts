/**
 * Comprehensive type-safe internationalization system for landing page components
 * Centralizes all translatable content for Spanish/English support
 */

export type Language = 'es' | 'en';

// Hero Section
export interface HeroTranslations {
    title: string;
    subtitle: string;
    description: string;
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
export interface FeatureTranslations {
    icon: string;
    title: string;
    description: string;
    benefits: readonly string[];
}

// Features Section Header
export interface FeaturesSectionTranslations {
    title: string;
    subtitle: string;
}

// Services Section
export interface ServiceTranslations {
    icon: string;
    title: string;
    description: string;
    features: readonly string[];
    color: string;
}

// Testimonials Section
export interface TestimonialTranslations {
    name: string;
    role: string;
    company: string;
    content: string;
    rating: number;
    avatar: string;
    verified?: boolean;
}

// Interactive Process Section
export interface ProcessStepTranslations {
    step: number;
    title: string;
    description: string;
    detailedDescription: string;
    duration: string;
    deliverables: readonly string[];
    isActive: boolean;
}

// Process Section Header
export interface ProcessSectionTranslations {
    title: string;
    sidebarTitle: string;
    detailedDescriptionLabel: string;
    deliverablesLabel: string;
}

// FAQ Section
export interface FaqTranslations {
    id: string;
    title: string;
    content: string;
}

// FAQ Section Footer
export interface FaqSectionTranslations {
    footerQuestion: string;
    footerButtonLabel: string;
    placeholderQuestions: readonly string[];
}

// Conversion Note Section
export interface RoiNoteTranslations {
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
export interface CalculatorTranslations {
    title: string;
    subtitle: string;
    description: string;
    projectsLabel: string;
    satisfactionLabel: string;
    improvementLabel: string;
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

// Final CTA Section
export interface FinalCtaSectionTranslations {
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
export interface UiTranslations {
    sections: {
        services: {
            title: string;
            subtitle: string;
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
export interface LandingPageTranslations {
    hero: HeroTranslations;
    featuresSection: FeaturesSectionTranslations;
    features: readonly FeatureTranslations[];
    services: readonly ServiceTranslations[];
    testimonials: readonly TestimonialTranslations[];
    processSection: ProcessSectionTranslations;
    process: readonly ProcessStepTranslations[];
    faqSection: FaqSectionTranslations;
    faq: readonly FaqTranslations[];
    conversionNote: RoiNoteTranslations;
    calculator: CalculatorTranslations;
    finalCtaSection: FinalCtaSectionTranslations;
    ui: UiTranslations;
}

// Translation configuration
export interface I18nConfig {
    currentLanguage: Language;
    translations: Record<Language, LandingPageTranslations>;
}

// Translation key paths for type safety
export type TranslationKeyPath =
    | 'hero.title'
    | 'hero.subtitle'
    | 'hero.description'
    | 'hero.primary.label'
    | 'hero.secondary.label'
    | 'features.0.title'
    | 'services.0.title'
    | 'testimonials.0.content'
    | 'process.0.title'
    | 'faq.0.title'
    | 'conversionNote.title'
    | 'calculator.title'
    | 'ui.sections.services.title'
    | 'ui.sections.testimonials.title'
    | 'ui.sections.faq.title'
    | 'ui.loading.calculator'
    | 'ui.contact.whatsappMessage';
