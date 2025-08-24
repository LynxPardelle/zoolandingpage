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

    // WhatsApp
    WhatsAppClick: 'whatsapp_click',

    // Services
    ServicesCtaClick: 'services_cta_click',

    // ROI Calculator
    RoiSizeChange: 'roi_size_change',
    RoiIndustryChange: 'roi_industry_change',
    RoiVisitorsChange: 'roi_visitors_change',
    RoiToggle: 'roi_calculator_toggle',

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
} as const;

export type AnalyticsEventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];

export const AnalyticsCategories = {
    Navigation: 'navigation',
    Hero: 'hero',
    CTA: 'cta',
    Services: 'services',
    Engagement: 'engagement',
    RoiCalculator: 'roi_calculator',
    Modal: 'modal',
    Theme: 'theme',
    I18N: 'i18n',
    Process: 'process',
} as const;

export type AnalyticsCategory = typeof AnalyticsCategories[keyof typeof AnalyticsCategories];
