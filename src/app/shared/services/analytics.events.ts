// Centralized analytics event and category constants
// Use these to avoid typos and keep the catalog consistent across the app.

export const AnalyticsEvents = {
    // Navigation
    PageView: 'page_view',
    NavClick: 'nav_click',
    MobileMenuOpen: 'mobile_menu_open',
    MobileMenuClose: 'mobile_menu_close',

    // Hero
    HeroPrimaryClick: 'hero_primary_click',
    HeroSecondaryClick: 'hero_secondary_click',

    // CTA
    CtaClick: 'cta_click',
    FinalCtaPrimaryClick: 'final_cta_primary_click',
    FinalCtaSecondaryClick: 'final_cta_secondary_click',
    // Toast
    ToastShow: 'toast_show',
    ToastHide: 'toast_hide',

    // Error
    ErrorThrow: 'error_throw',
    ErrorHandle: 'error_handle',

    // Generic Actions
    ActionTrigger: 'action_trigger',

    // Position (e.g., element position changes / tracking)
    PositionChange: 'position_change',

    // Clear / reset interactions
    Clear: 'clear',

    // Custom conversion (WhatsApp) button event (requested spelling)
    Convertion: 'convertion',

    // WhatsApp
    WhatsAppClick: 'whatsapp_click',

    // Services
    ServicesCtaClick: 'services_cta_click',

    // Conversion Calculator
    RoiSizeChange: 'conversion_size_change',
    RoiIndustryChange: 'conversion_industry_change',
    RoiVisitorsChange: 'conversion_visitors_change',
    RoiToggle: 'conversion_calculator_toggle',

    // Sections/Process
    SectionView: 'section_view',
    ProcessStepChange: 'process_step_change',
    ScrollDepth: 'scroll_depth',

    // UI/Prefs
    ThemeToggle: 'theme_toggle',
    LanguageToggle: 'language_toggle',

    // Modal
    ModalOpen: 'modal_open',
    ModalClose: 'modal_close',

    // FAQ
    FaqOpen: 'faq_open',
    FaqClose: 'faq_close',
    FaqCtaClick: 'faq_cta_click',
} as const;

export type AnalyticsEventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];

export const AnalyticsCategories = {
    Navigation: 'navigation',
    Hero: 'hero',
    CTA: 'cta',
    Services: 'services',
    Engagement: 'engagement',
    Faq: 'faq',
    RoiCalculator: 'roi_calculator',
    Modal: 'modal',
    Theme: 'theme',
    I18N: 'i18n',
    Process: 'process',
} as const;

export type AnalyticsCategory = typeof AnalyticsCategories[keyof typeof AnalyticsCategories];

// Unified payload interface for component-level analytics event emission.
// Components now emit this payload via an (analyticsEvent) Output instead of
// injecting AnalyticsService directly. AppShell centralizes actual tracking.
export type AnalyticsEventPayload = {
    readonly name: AnalyticsEventName;
    readonly category?: AnalyticsCategory;
    readonly label?: string;
    readonly value?: number;
    readonly meta?: any; // Additional contextual metadata
};
