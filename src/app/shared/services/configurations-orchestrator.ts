import { LanguageService } from '@/app/core/services/language.service';
import { ThemeService } from '@/app/core/services/theme.service';
import { ProcessStep } from '@/app/landing-page/components/interactive-process/interactive-process.types';
import { LandingPageI18nService } from '@/app/landing-page/components/landing-page/index.i18n';
import type { StatsCounterConfig } from '@/app/landing-page/components/stats-counter/stats-counter.types';
import { MotionPreferenceService } from "@/app/shared/services/motion-preference.service";
import { computed, DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { GenericModalService } from '../components/generic-modal/generic-modal.service';
import { TGenericComponent } from '../components/wrapper-orchestrator/wrapper-orchestrator.types';
import { buildWhatsAppUrl } from '../utility/buildWhatsAppUrl.utility';
import { AnalyticsCategories, AnalyticsEvents } from './analytics.events';
import { AnalyticsService } from './analytics.service';
import { WHATSAPP_PHONE } from './contact.constants';
import { I18nService } from './i18n.service';
import { QuickStatsService } from './quick-stats.service';
@Injectable({
  providedIn: 'root',
})
export class ConfigurationsOrchestratorService {
  private readonly i18n = inject(LandingPageI18nService);
  private readonly motion = inject(MotionPreferenceService);
  private readonly doc: Document = inject(DOCUMENT);
  readonly analytics = inject(AnalyticsService);
  private readonly quickStats = inject(QuickStatsService);
  private readonly theme = inject(ThemeService);
  private readonly language = inject(LanguageService);
  private readonly modal = inject(GenericModalService);
  private readonly globalI18n = inject(I18nService);

  private readonly footerConfig = {
    showCopyright: true,
    showSocialLinks: false,
    showLegalLinks: true,
    organizationName: 'Zoo Landing',
    copyrightText: '© 2025 Zoo Landing Page. All rights reserved.',
  } as const;

  private readonly footerTranslations = {
    en: {
      legalTitle: 'Legal',
      termsLink: 'Terms of Service',
      dataLink: 'Data Privacy',
      termsAriaLabel: 'Terms of Service',
      dataAriaLabel: 'Data Privacy',
    },
    es: {
      legalTitle: 'Legal',
      termsLink: 'Términos de servicio',
      dataLink: 'Privacidad de datos',
      termsAriaLabel: 'Términos de servicio',
      dataAriaLabel: 'Privacidad de datos',
    },
  } as const;

  private readonly footerSocialLinks = [
    {
      id: 'footerSocialFacebook',
      name: 'Facebook',
      url: 'https://facebook.com/zoolanding',
      icon: '📘',
      ariaLabel: 'Visit our Facebook page',
    },
    {
      id: 'footerSocialTwitter',
      name: 'Twitter',
      url: 'https://twitter.com/zoolanding',
      icon: '🐦',
      ariaLabel: 'Follow us on Twitter',
    },
    {
      id: 'footerSocialInstagram',
      name: 'Instagram',
      url: 'https://instagram.com/zoolanding',
      icon: '📷',
      ariaLabel: 'Follow us on Instagram',
    },
  ] as const;

  private readonly statsStripContent = computed(() => this.i18n.statsStrip());
  private readonly statsStripRemote = computed(() => this.quickStats.remoteStats());

  private readonly statsStripVisitsConfig = computed<StatsCounterConfig>(() => ({
    target: Number(this.statsStripRemote()?.['metrics']?.['pageViews'] ?? this.analytics.getPageViewCount()),
    durationMs: 1600,
    startOnVisible: true,
    format: (v: number) => Math.max(0, Math.round(v)).toLocaleString(),
    ariaLabel: this.statsStripContent().visitsLabel,
  }));

  private readonly statsStripCtaInteractionsConfig = computed<StatsCounterConfig>(() => ({
    target: Number(this.statsStripRemote()?.['metrics']?.['ctaClicks'] ?? this.analytics.getEventCount('ctaClicks')),
    durationMs: 1800,
    startOnVisible: true,
    format: (v: number) => Math.max(0, Math.round(v)).toLocaleString(),
    ariaLabel: this.statsStripContent().ctaInteractionsLabel,
  }));

  private readonly statsStripAverageTimeConfig = computed<StatsCounterConfig>(() => ({
    target: Math.min(
      600,
      Math.max(
        284,
        Number(this.statsStripRemote()?.['metrics']?.['avgTimeSecs'] ?? this.analytics.getSessionEventCount() * 5)
      )
    ),
    durationMs: 2000,
    startOnVisible: true,
    format: (v: number) => `${ Math.round(v) }s`,
    ariaLabel: this.statsStripContent().averageTimeLabel,
  }));

  private readonly currentProcessStep = signal<number>(0);
  private readonly interactiveProcessSteps = computed<readonly ProcessStep[]>(() => {
    const stepIndex = this.currentProcessStep();
    return this.i18n.process().map((demo) => ({
      ...demo,
      isActive: demo.step === stepIndex + 1,
    }));
  });


  readonly accordions: TGenericComponent[] = [
    {
      id: 'faqAccordion',
      type: 'accordion',
      eventInstructions: 'trackFaqToggle:event.eventData',
      config: {
        items: () =>
          this.i18n.faq().map((faqItem) => ({
            id: faqItem.id,
            title: faqItem.title,
            content: faqItem.content,
          })),
        mode: 'single',
        allowToggle: true,
        containerClasses: 'ank-display-flex ank-flexDirection-column ank-gap-0_25rem',
        defaultItemContainerClasses: 'ank-border-1px-solid ank-borderColor-bgColor ank-borderRadius-0_5rem ank-transition-all ank-bgColor-transparent ng-star-inserted',
        defaultItemButtonConfig: {
          classes: 'ank-outline-2px__solid__secondaryAccentColor ank-m-8px ank-color-textColor ank-borderRadius-0_25rem ank-border-0 ank-width-100per ank-textAlign-left ank-padding-0_75rem ank-fontWeight-600 ank-transition-all ank-bgHover-secondaryAccentColor ank-colorHover-titleColor ank-cursor-pointer ank-bg-transparent'
        },
        defaultItemContainerIsExpandedClasses: 'accItemExpandedContainer',
        defaultItemContainerIsNotExpandedClasses: 'accItemNotExpandedContainer',
        defaultItemPanelClasses: 'ank-marginBlockStart-0 ank-marginBlockEnd-0 ank-color-textColor',
      },
    },
  ];
  readonly buttons: TGenericComponent[] = [
    /* Hero */
    // Primary CTA
    {
      id: 'primaryCTA',
      type: 'button',
      eventInstructions: "openWhatsApp:event.meta_title,hero_primary,hero",
      meta_title: 'hero_primary_click',
      config: {
        label: () => this.i18n.hero().primary.label,
        classes: 'btnBaseVALSVL1_25remVL0_75remVL btnTypePrimaryVALSVLsecondaryLinkColorVLtextColorVL',
      }
    },
    // Secondary CTA
    {
      id: 'secondaryCTA',
      condition: () => !!this.i18n.hero().secondary,
      type: 'button',
      eventInstructions: "trackCTAClick:event.meta_title,secondary,hero;navigationToSection:features-section",
      meta_title: 'hero_secondary_click',
      config: {
        label: () => this.i18n.hero().secondary.label,
        classes: 'btnBaseVALSVL1_25remVL0_75remVL btnTypeOutlineVALSVLsecondaryLinkColorVLtextColorVL',
      }
    },

    /* FAQ Section */
    {
      id: 'faqFooterButton',
      type: 'button',
      eventInstructions: 'openFaqCtaWhatsApp',
      config: {
        label: () => this.i18n.faqSection().footerButtonLabel,
        loading: false,
        disabled: false,
        classes: 'btnBaseVALSVL1_5remVL1remVL ank-bg-transparent ank-border-2px__solid__secondaryAccentColor ank-color-secondaryAccentColor ank-ts-200 ank-bgHover-secondaryAccentColor ank-colorHover-secondaryTextColor ank-mx-auto',
      }
    },

    /* Final CTA Section */
    {
      id: 'finalCtaPrimaryButton',
      type: 'button',
      eventInstructions: 'openFinalCtaWhatsApp:event.meta_title,primary',
      meta_title: AnalyticsEvents.FinalCtaPrimaryClick,
      config: {
        label: () => this.i18n.finalCtaSection().primaryLabel,
        classes: 'btnBaseVALSVL1_5remVL1remVL btnTypePrimaryVALSVLsecondaryLinkColorVLtextColorVL',
      }
    },
    {
      id: 'finalCtaSecondaryButton',
      type: 'button',
      eventInstructions: 'openFinalCtaWhatsApp:event.meta_title,secondary',
      meta_title: AnalyticsEvents.FinalCtaSecondaryClick,
      config: {
        label: () => this.i18n.finalCtaSection().secondaryLabel,
        classes:
          'btnBaseVALSVL1_5remVL1remVL ank-bg-transparent ank-border-2px__solid__secondaryLinkColor ank-color-secondaryLinkColor ank-ts-200 ank-bgHover-secondaryLinkColor ank-colorHover-secondaryTextColor',
      }
    },

    /* Header */
    {
      id: 'toggleThemeDesktop',
      type: 'button',
      eventInstructions: 'toggleTheme',
      meta_title: String(AnalyticsEvents.ThemeToggle),
      config: {
        id: 'toggleTheme',
        label: () => (this.theme.currentTheme() === 'dark' ? '☀️' : '🌙'),
        classes:
          'ank-alignItems-center ank-and-7s ank-anic-infinite ank-antf-ease ank-bgcl-borderMINbox ank-bgi-linearMINgradientSD90degCOMaltBgColorCOMaltAccentColorCOMaltSecondaryBgColorED ank-bgs-150per ank-border-none ank-borderRadius-1rem ank-display-flex ank-p-0_5rem__1_5rem gradientShiftAnimation',
      }
    },
    {
      id: 'toggleLanguageDesktop',
      type: 'button',
      eventInstructions: 'toggleLanguage',
      meta_title: String(AnalyticsEvents.LanguageToggle),
      config: {
        id: 'toggleLanguage',
        label: () => (this.language.currentLanguage() === 'en' ? 'EN' : 'ES'),
        classes:
          'btnBaseVALSVAL9N1remVAL9NVL1_5remVL0_5remVL1remVL ank-bg-accentColor ank-color-secondaryTextColor ank-ts-200 ank-bgHover-secondaryAccentColor ank-colorHover-secondaryTextColor ank-border-none',
      }
    },
    {
      id: 'toggleThemeMobile',
      type: 'button',
      eventInstructions: 'toggleTheme',
      meta_title: String(AnalyticsEvents.ThemeToggle),
      config: {
        id: 'toggleThemeMobile',
        label: () => (this.theme.currentTheme() === 'dark' ? '☀️' : '🌙'),
        classes:
          'ank-width-36px ank-height-36px ank-display-flex ank-alignItems-center ank-justifyContent-center ank-and-7s ank-anic-infinite ank-antf-ease ank-bgcl-borderMINbox ank-bgi-linearMINgradientSD90degCOMaltBgColorCOMaltAccentColorCOMaltSecondaryBgColorED ank-bgs-150per ank-border-none ank-borderRadius-1rem ank-p-0 gradientShiftAnimation',
      }
    },
    {
      id: 'toggleLanguageMobile',
      type: 'button',
      eventInstructions: 'toggleLanguage',
      meta_title: String(AnalyticsEvents.LanguageToggle),
      config: {
        id: 'toggleLanguageMobile',
        label: () => (this.language.currentLanguage() === 'en' ? 'EN' : 'ES'),
        classes:
          'btnBaseVALSVAL9N1remVAL9NVL8pxVL8pxVL0_75remVL ank-bg-accentColor ank-color-secondaryTextColor ank-ts-200 ank-bgHover-secondaryAccentColor ank-colorHover-secondaryTextColor ank-width-36px ank-height-36px ank-border-none',
      }
    },

    /* Footer */
    {
      id: 'footerTermsButton',
      type: 'button',
      eventInstructions: 'openFooterTerms',
      config: {
        label: () =>
          this.language.currentLanguage() === 'en'
            ? this.footerTranslations.en.termsLink
            : this.footerTranslations.es.termsLink,
        ariaLabel: () =>
          this.language.currentLanguage() === 'en'
            ? this.footerTranslations.en.termsAriaLabel
            : this.footerTranslations.es.termsAriaLabel,
        classes:
          'ank-bg-transparent ank-border-0 ank-color-secondaryTextColor ank-fontSize-sm ank-textDecoration-underline ank-cursor-pointer',
      }
    },
    {
      id: 'footerDataButton',
      type: 'button',
      eventInstructions: 'openFooterData',
      config: {
        label: () =>
          this.language.currentLanguage() === 'en'
            ? this.footerTranslations.en.dataLink
            : this.footerTranslations.es.dataLink,
        ariaLabel: () =>
          this.language.currentLanguage() === 'en'
            ? this.footerTranslations.en.dataAriaLabel
            : this.footerTranslations.es.dataAriaLabel,
        classes:
          'ank-bg-transparent ank-border-0 ank-color-secondaryTextColor ank-fontSize-sm ank-textDecoration-underline ank-cursor-pointer',
      }
    },
  ];

  readonly links: TGenericComponent[] = [
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
      config: {
        id: 'headerNavHome',
        href: '#home',
        text: () => (this.language.currentLanguage() === 'en' ? 'Home' : 'Inicio'),
        classes:
          'ank-textDecoration-none ank-fontWeight-500 ank-letterSpacing-05px ank-position-relative ank-paddingInline-4px ank-paddingBlock-4px ank-transition-color ank-duration-200 ank-color-accentColor',
      }
    },
    {
      id: 'headerNavBenefits',
      type: 'link',
      eventInstructions: 'trackNavClick:benefits,event.eventData;navigationToSection:features-section',
      config: {
        id: 'headerNavBenefits',
        href: '#features-section',
        text: () => (this.language.currentLanguage() === 'en' ? 'Benefits' : 'Beneficios'),
        classes:
          'ank-textDecoration-none ank-fontWeight-500 ank-letterSpacing-05px ank-position-relative ank-paddingInline-4px ank-paddingBlock-4px ank-transition-color ank-duration-200 ank-color-textColor ank-opacity-80',
      }
    },
    {
      id: 'headerNavProcess',
      type: 'link',
      eventInstructions: 'trackNavClick:process,event.eventData;navigationToSection:process-section',
      config: {
        id: 'headerNavProcess',
        href: '#process-section',
        text: () => (this.language.currentLanguage() === 'en' ? 'Process' : 'Proceso'),
        classes:
          'ank-textDecoration-none ank-fontWeight-500 ank-letterSpacing-05px ank-position-relative ank-paddingInline-4px ank-paddingBlock-4px ank-transition-color ank-duration-200 ank-color-textColor ank-opacity-80',
      }
    },
    {
      id: 'headerNavServices',
      type: 'link',
      eventInstructions: 'trackNavClick:services,event.eventData;navigationToSection:services-section',
      config: {
        id: 'headerNavServices',
        href: '#services-section',
        text: () => (this.language.currentLanguage() === 'en' ? 'Services' : 'Servicios'),
        classes:
          'ank-textDecoration-none ank-fontWeight-500 ank-letterSpacing-05px ank-position-relative ank-paddingInline-4px ank-paddingBlock-4px ank-transition-color ank-duration-200 ank-color-textColor ank-opacity-80',
      }
    },
    {
      id: 'headerNavContact',
      type: 'link',
      eventInstructions: 'trackNavClick:contact,event.eventData;navigationToSection:contact-section',
      config: {
        id: 'headerNavContact',
        href: '#contact-section',
        text: () => (this.language.currentLanguage() === 'en' ? 'Contact' : 'Contacto'),
        classes:
          'ank-textDecoration-none ank-fontWeight-500 ank-letterSpacing-05px ank-position-relative ank-paddingInline-4px ank-paddingBlock-4px ank-transition-color ank-duration-200 ank-color-textColor ank-opacity-80',
      }
    },

    /* Footer */
    ...this.footerSocialLinks.map(link => ({
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

  readonly media: TGenericComponent[] = [
    /* Header */
    // (empty) — header logo is now a text link
  ];
  readonly containers: TGenericComponent[] = [
    /* Landing Page Root */
    {
      id: 'landingPage',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-flexDirection-column',
        components: [
          'heroContainer',
          'conversionNoteContainer',
          'featuresSection',
          'interactiveProcessSection',
          'servicesSection',
          'statsStripSection',
          'testimonialsSection',
          'faqSection',
          'finalCtaSection'
        ],
      }
    },

    /* Hero */
    // Hero Container
    {
      id: "heroContainer",
      type: 'container',
      config: {
        id: 'home',
        tag: 'div',
        classes:
          'ank-width-100vw ank-py-2rem ank-px-1rem ank-boxSizing-borderMINbox ank-bg-secondaryBgColor ank-position-relative',
        components: ['heroContainerInner'],
      }
    },
    // Hero Container Inner
    {
      id: "heroContainerInner",
      type: 'container',
      config: {
        id: '_home',
        tag: 'div',
        classes:
          'ank-display-grid ank-gridTemplateColumns-1fr ank-gridTemplateColumns-lg-1fr__1fr ank-gap-2rem ank-alignItems-center ank-maxWidth-1280px ank-marginLeft-auto ank-marginRight-auto',
        components: ['heroLeft', 'heroRight'],
      }
    },
    // Hero Left
    {
      id: "heroLeft",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-textAlign-center ank-textAlign-lg-left ank-width-100per ank-maxWidth-100per ank-overflow-hidden ank-boxSizing-borderBox',
        components: ['mainTitle', 'subtitle', 'description', 'ctaContainer', 'badgesContainer'],
      }
    },
    // CTA Container
    {
      id: "ctaContainer",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-display-flex ank-flexDirection-column ank-flexDirection-sm-row ank-gap-1rem ank-justifyContent-center ank-justifyContent-lg-start ank-alignItems-center ng-trigger ng-trigger-fadeInDelay',
        components: ['primaryCTA', 'secondaryCTA'],
      }
    },
    // Badges Container
    {
      id: "badgesContainer",
      condition: this.i18n.hero().badges.length > 0,
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-mt-2rem ank-display-flex ank-flexDirection-column ank-alignItems-center ank-alignItems-lg-start ank-gap-1rem',
        components: ['badgesLabel', 'badgesListContainer'],
      },

    },
    // Badge List Container
    {
      id: "badgesListContainer",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-display-flex ank-flexDirection-column ank-gap-8px ank-alignItems-center ank-alignItems-lg-start',
        components: [...this.i18n.hero().badges.map((_, index) => `badgeContainer${ index + 1 }`)],
      },
    },
    // Badge Containers
    ...this.i18n.hero().badges.map((badge, index) => ({
      id: `badgeContainer${ index + 1 }`,
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-alignItems-center ank-gap-8px ank-bg-bgColorOPA__0_8 ank-borderRadius-24px ank-px-12px ank-px-lg-20px ank-py-6px ank-border-1px ank-borderColor-textColorOPA__0_2 ank-backdropFilter-blurSD8pxED ank-minWidth-120px ank-minWidth-lg-160px',
        components: [`badgePoint`, `badgeText${ index + 1 }`]
      },
    })) as TGenericComponent[],
    // Badge Points
    {
      id: `badgePoint`,
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-width-6px ank-height-6px ank-bg-accentColor ank-borderRadius-99rem'
      }
    },
    // Hero Right
    {
      id: "heroRight",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-position-relative ank-wmx-85vw ank-justifySelf-center' + (this.motion.reduced() ? ' ank-transition-none' : ''),
        components: ['heroImageMockup', 'heroBrowserMockup', 'heroAnimatedElements', 'heroFloatingMetrics', 'heroConversionBadge', 'heroVerifiedBadge', 'heroMobileBadge'],
      }
    },
    // Hero Image Mockup
    {
      id: "heroImageMockup",
      condition: () => !!this.i18n.hero().backgroundImage,
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-position-absolute ank-inset-0 ank-bgCover ank-borderRadius-1rem ank-opacity-15 ank-backgroundImage-' + this.i18n.hero().backgroundImage,
      }
    },
    // Hero Browser Mockup
    {
      id: "heroBrowserMockup",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-bg-textColor ank-borderRadius-1rem ank-p-0 cardHover ank-position-relative ank-zIndex-10 ank-boxShadow-0__8px__30px__rgbaSD0COM0COM0COM0_12ED',
        components: ['heroBrowserMockupHeader', 'heroBrowserMockupdLandingPage'],
      },
    },
    // Hero Browser Mockup Header
    {
      id: "heroBrowserMockupHeader",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-bg-titleColor ank-borderRadius-1rem__1rem__0__0 ank-p-1rem ank-display-flex ank-alignItems-center ank-gap-1rem ank-borderBottom-1px__solid__titleColor',
        components: ['heroBrowserMockupHeaderFakeButtons', 'heroBrowserMockupHeaderFakeUrlBar'],
      },
    },
    // Hero Browser Mockup Header Fake Buttons
    {
      id: "heroBrowserMockupHeaderFakeButtons",
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-gap-0_375rem',
        components: ['heroBrowserMockupHeaderFakeButtonRed', 'heroBrowserMockupHeaderFakeButtonYellow', 'heroBrowserMockupHeaderFakeButtonGreen'],
      },
    },
    // Hero Browser Mockup Header Fake Button Red
    {
      id: "heroBrowserMockupHeaderFakeButtonRed",
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-bg-danger ank-borderRadius-99rem ank-width-1rem ank-height-1rem'
      }
    },
    // Hero Browser Mockup Header Fake Button Yellow
    {
      id: "heroBrowserMockupHeaderFakeButtonYellow",
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-bg-warning ank-borderRadius-99rem ank-width-1rem ank-height-1rem'
      }
    },
    // Hero Browser Mockup Header Fake Button Green
    {
      id: "heroBrowserMockupHeaderFakeButtonGreen",
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-bg-success ank-borderRadius-99rem ank-width-1rem ank-height-1rem'
      }
    },
    // Hero Browser Mockup Header Fake URL Bar
    {
      id: "heroBrowserMockupHeaderFakeUrlBar",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-bg-textColor ank-borderRadius-0_375rem ank-px-1rem ank-py-0_375rem ank-flexGrow-1 ank-fs-1rem ank-color-bgColor',
        components: ['heroBrowserMockupHeaderFakeUrlBarText'],
      }
    },

    {
      id: 'siteHeader',
      type: 'container',
      config: {
        tag: 'header',
        role: 'banner',
        classes:
          'ank-and-15s ank-anic-infinite ank-antf-ease ank-bg-bgColor ank-bg-transparent ank-bgcl-borderMINbox ank-bgi-linearMINgradientSD90degCOMbgColorCOMsecondaryBgColorED ank-bgs-200per ank-borderBottom-1px ank-borderColor-secondaryBgColor ank-color-textColor ank-position-sticky ank-top-0 ank-width-100per ank-zIndex-50 gradientShiftAnimation',
        components: ['headerDesktop', 'headerMobile'],
      }
    },
    {
      id: 'headerDesktop',
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-display-none ank-display-md-flex ank-alignItems-center ank-container ank-gap-24px ank-justifyContent-md-start ank-justifyContent-spaceMINbetween ank-marginInline-auto ank-maxWidth-7xl ank-paddingBottom-16px ank-paddingTop-16px ng-star-inserted',
        components: ['headerLogo', 'headerDesktopNav'],
      }
    },
    {
      id: 'headerLogo',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-alignItems-center',
        components: ['headerLogoImage'],
      }
    },
    {
      id: 'headerDesktopNav',
      type: 'container',
      config: {
        tag: 'nav',
        ariaLabel: 'Primary',
        classes:
          'ank-display-none ank-display-md-flex ank-alignItems-center ank-jc-spaceMINbetween ank-gap-32px ank-w-calcSD100per__MIN__17remED ank-mx-1rem',
        components: ['headerDesktopNavLinks', 'headerDesktopNavActions'],
      }
    },
    {
      id: 'headerDesktopNavLinks',
      type: 'container',
      config: {
        tag: 'ul',
        classes:
          'ank-display-flex ank-gap-28px ank-listStyle-none ank-margin-0 ank-padding-0 ank-flexWrap-nowrap ank-whiteSpace-nowrap ank-justifyContent-spaceMINevenly ank-alignItems-center',
        components: ['headerNavHomeLi', 'headerNavBenefitsLi', 'headerNavProcessLi', 'headerNavServicesLi', 'headerNavContactLi'],
      }
    },
    {
      id: 'headerNavHomeLi',
      type: 'container',
      config: {
        tag: 'li',
        classes: 'ank-position-relative',
        components: ['headerNavHome'],
      }
    },
    {
      id: 'headerNavBenefitsLi',
      type: 'container',
      config: {
        tag: 'li',
        classes: 'ank-position-relative',
        components: ['headerNavBenefits'],
      }
    },
    {
      id: 'headerNavProcessLi',
      type: 'container',
      config: {
        tag: 'li',
        classes: 'ank-position-relative',
        components: ['headerNavProcess'],
      }
    },
    {
      id: 'headerNavServicesLi',
      type: 'container',
      config: {
        tag: 'li',
        classes: 'ank-position-relative',
        components: ['headerNavServices'],
      }
    },
    {
      id: 'headerNavContactLi',
      type: 'container',
      config: {
        tag: 'li',
        classes: 'ank-position-relative',
        components: ['headerNavContact'],
      }
    },
    {
      id: 'headerDesktopNavActions',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-none ank-display-md-flex ank-gap-12px',
        components: ['toggleThemeDesktop', 'toggleLanguageDesktop'],
      }
    },
    {
      id: 'headerMobile',
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-display-flex ank-display-md-none ank-alignItems-center ank-container ank-gap-24px ank-justifyContent-spaceMINbetween ank-marginInline-auto ank-maxWidth-7xl ank-paddingBottom-16px ank-paddingTop-16px',
        components: ['headerLogo', 'headerMobileActions'],
      }
    },
    {
      id: 'headerMobileActions',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-alignItems-center ank-gap-12px',
        components: ['toggleThemeMobile', 'toggleLanguageMobile', 'headerMobileNav'],
      }
    },

    // Hero Browser Mockup Landing Page
    {
      id: "heroBrowserMockupdLandingPage",
      type: 'container',
      config: {
        tag: 'div', classes: 'ank-p-1_5rem',
        components: ['heroLandingMockupNavigation', 'heroLandingMockupContent', 'heroLandingMockupFeatures', 'heroLandingMockupFooter'],
      }
    },
    // Hero Landing Mockup Navigation
    {
      id: "heroLandingMockupNavigation",
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-gap-1rem ank-alignItems-stretch ank-justifyContent-start ank-mb-1_5rem',
        components: ['heroLandingMockupLogo', 'heroLandingMockupNavLink', 'heroLandingMockupNavLink', 'heroLandingMockupNavCta'],
      }
    },
    // Hero Landing Mockup Logo
    {
      id: "heroLandingMockupLogo",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-bg-accentColor ank-borderRadius-0_375rem ank-width-6rem ank-height-1_5rem ank-display-flex ank-alignItems-center ank-justifyContent-center',
        components: ['heroLandingMockupLogoText'],
      }
    },
    // Hero Landing Mockup Nav Link
    {
      id: "heroLandingMockupNavLink",
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-bg-titleColor ank-borderRadius-0_25rem ank-width-5rem ank-height-1_5rem'
      }
    },
    // Hero Landing Mockup Nav CTA
    {
      id: "heroLandingMockupNavCta",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-bg-accentColor ank-borderRadius-0_375rem ank-width-5rem ank-height-1_5rem ank-display-flex ank-alignItems-center ank-justifyContent-center ank-px-1rem',
        components: ['heroLandingMockupNavCtaText'],
      }
    },
    // Hero Landing Mockup Content
    {
      id: "heroLandingMockupContent",
      type: 'container',
      config: {
        tag: 'div', classes: 'ank-textAlign-center ank-mb-1_5rem',
        components: ['heroLandingMockupContentTitle', 'heroLandingMockupContentSubtitle', 'heroLandingMockupContentCTAs'],
      }
    },
    // Hero Landing Mockup Content Title
    {
      id: "heroLandingMockupContentTitle",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-bg-titleColor ank-borderRadius-0_375rem ank-width-80per ank-height-1rem ank-mx-auto ank-mb-1rem'
      }
    },
    // Hero Landing Mockup Content Subtitle
    {
      id: "heroLandingMockupContentSubtitle",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-bg-titleColor ank-borderRadius-0_375rem ank-width-60per ank-height-1rem ank-mx-auto ank-mb-1rem'
      }
    },
    // Hero Landing Mockup Content CTAs
    {
      id: "heroLandingMockupContentCTAs",
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-justifyContent-center ank-gap-1rem ank-mb-1_25rem',
        components: ['heroLandingMockupContentCTA1', 'heroLandingMockupContentCTA2'],
      }
    },
    // Hero Landing Mockup Content CTA 1
    {
      id: "heroLandingMockupContentCTA1",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-bg-secondaryAccentColor ank-borderStyle-solid ank-borderColor-secondaryAccentColor ank-borderRadius-0_375rem ank-width-6rem ank-height-1_5rem ank-display-flex ank-alignItems-center ank-justifyContent-center',
        components: ['heroLandingMockupContentCTA1Text'],
      }
    },
    // Hero Landing Mockup Content CTA 2
    {
      id: "heroLandingMockupContentCTA2",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-border-2px__solid__secondaryAccentColor ank-borderRadius-0_375rem ank-width-6rem ank-height-1_5rem ank-display-flex ank-alignItems-center ank-justifyContent-center',
        components: ['heroLandingMockupContentCTA2Text'],
      },
    },
    // Hero Landing Mockup Features
    {
      id: "heroLandingMockupFeatures",
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-grid ank-gridTemplateColumns-1fr__1fr__1fr ank-gap-1rem ank-mb-1_25rem',
        components: ['heroLandingMockupFeature1', 'heroLandingMockupFeature2', 'heroLandingMockupFeature3'],
      },
    },
    // Hero Landing Mockup Feature 1
    {
      id: "heroLandingMockupFeature1",
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-bg-titleColor ank-borderRadius-0_375rem ank-p-1rem ank-textAlign-center',
        components: ['heroLandingMockupFeatureIcon1', 'heroLandingMockupFeatureTitle', 'heroLandingMockupFeatureDescription'],
      }
    },
    // Hero Landing Mockup Feature 2
    {
      id: "heroLandingMockupFeature2",
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-bg-titleColor ank-borderRadius-0_375rem ank-p-1rem ank-textAlign-center',
        components: ['heroLandingMockupFeatureIcon2', 'heroLandingMockupFeatureTitle', 'heroLandingMockupFeatureDescription'],
      }
    },
    // Hero Landing Mockup Feature 3
    {
      id: "heroLandingMockupFeature3",
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-bg-titleColor ank-borderRadius-0_375rem ank-p-1rem ank-textAlign-center',
        components: ['heroLandingMockupFeatureIcon3', 'heroLandingMockupFeatureTitle', 'heroLandingMockupFeatureDescription'],
      }
    },
    // Hero Landing Mockup Feature Icon 1
    {
      id: "heroLandingMockupFeatureIcon1",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-bg-accentColor ank-borderRadius-0_25rem ank-width-1_5rem ank-height-1_5rem ank-mx-auto ank-mb-0_75rem ank-display-flex ank-alignItems-center ank-justifyContent-center',
        components: ['speed'],
      }
    },
    // Hero Landing Mockup Feature Icon 2
    {
      id: "heroLandingMockupFeatureIcon2",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-bg-success ank-borderRadius-0_25rem ank-width-1_5rem ank-height-1_5rem ank-mx-auto ank-mb-0_75rem ank-display-flex ank-alignItems-center ank-justifyContent-center',
        components: ['security'],
      }
    },
    // Hero Landing Mockup Feature Icon 3
    {
      id: "heroLandingMockupFeatureIcon3",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-bg-info ank-borderRadius-0_25rem ank-width-1_5rem ank-height-1_5rem ank-mx-auto ank-mb-0_75rem ank-display-flex ank-alignItems-center ank-justifyContent-center',
        components: ['analytics'],
      }
    },
    // Hero Landing Mockup Feature Title
    {
      id: "heroLandingMockupFeatureTitle",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-bg-textColor ank-borderRadius-0_25rem ank-width-75per ank-height-0_75rem ank-mx-auto ank-mb-0_25rem'
      }
    },
    // Hero Landing Mockup Feature Description
    {
      id: "heroLandingMockupFeatureDescription",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-bg-textColorOPA__0_5 ank-borderRadius-0_25rem ank-width-50per ank-height-0_375rem ank-mx-auto'
      }
    },
    // Hero Landing Mockup Footer
    {
      id: "heroLandingMockupFooter",
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-bg-titleColor ank-borderRadius-0_75rem ank-p-1_25rem ank-textAlign-center',
        components: ['heroLandingMockupFooterText', 'heroLandingMockupFooterLink'],
      }
    },
    // Hero Landing Mockup Footer Text
    {
      id: "heroLandingMockupFooterText",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-bg-textColor ank-borderRadius-0_25rem ank-width-50per ank-height-1rem ank-mx-auto ank-mb-1rem ank-opacity-90'
      }
    },
    // Hero Landing Mockup Footer Link
    {
      id: "heroLandingMockupFooterLink",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-bg-accentColor ank-borderRadius-0_375rem ank-width-10rem ank-height-2rem ank-mx-auto ank-display-flex ank-alignItems-center ank-justifyContent-center',
        components: ['heroLandingMockupFooterLinkText'],
      }
    },
    // Hero Animated Elements
    {
      id: "heroAnimatedElements",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-position-absolute ank-top-0 ank-left-0 ank-width-100per ank-height-100per ank-pointerEvents-none ank-zIndex-10',
        components: ['heroAnimatedElement1', 'heroAnimatedElement2', 'heroAnimatedElement3'],
      }
    },
    // Hero Animated Element 1
    {
      id: "heroAnimatedElement1",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-position-absolute ank-top-10per ank-right-20per ank-width-4rem ank-height-4rem ank-bg-accentColor ank-borderRadius-99rem ank-opacity-10 ank-filter-blurSD20pxED'
      }
    },
    // Hero Animated Element 2
    {
      id: "heroAnimatedElement2",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-position-absolute ank-bottom-20per ank-left-10per ank-width-6rem ank-height-6rem ank-bg-linkColor ank-borderRadius-99rem ank-opacity-8 ank-filter-blurSD30pxED'
      }
    },
    // Hero Animated Element 3
    {
      id: "heroAnimatedElement3",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-position-absolute ank-top-30per ank-left-5per ank-width-2rem ank-height-2rem ank-bg-secondaryLinkColor ank-borderRadius-99rem ank-opacity-12 ank-filter-blurSD15pxED'
      }
    },
    // Hero Floating Metrics
    {
      id: "heroFloatingMetrics",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-position-absolute ank-bottom-MIN1rem ank-left-MIN1_5rem ank-bg-info ank-color-dark ank-px-1_25rem ank-py-1rem ank-borderRadius-1rem ank-fs-1rem ank-fontWeight-bold ank-zIndex-30 ank-display-flex ank-alignItems-center ank-gap-0_75rem ank-boxShadow-0__6px__20px__rgbaSD59COM130COM246COM0_3ED ank-border-2px ank-bordercolor-textColor',
        components: ['flash_onContainer', 'heroFloatingMetricsContainer'],
      }
    },
    // Flash On Icon Container
    {
      id: "flash_onContainer",
      type: 'container',
      config: {
        tag: 'div', classes: 'ank-bg-bgColor ank-borderRadius-99rem ank-p-0_25rem',
        components: ['flash_on']
      }
    },
    // Hero Floating Metrics Container
    {
      id: "heroFloatingMetricsContainer",
      type: 'container',
      config: { tag: 'div', classes: 'ank-textAlign-left', components: ['heroFloatingMetricsLabel', 'heroFloatingMetricsValue'] }
    },
    // Hero Floating Metrics Label
    {
      id: "heroFloatingMetricsLabel",
      type: 'container',
      config: { tag: 'div', classes: 'ank-fs-1rem ank-opacity-90', components: ['heroFloatingMetricsLabelText'] },
    },
    // Hero Floating Metrics Value
    {
      id: "heroFloatingMetricsValue",
      type: 'container',
      config: { tag: 'div', classes: 'ank-fs-1_5rem ank-fontWeight-bold', components: ['heroFloatingMetricsValueText'] },
    },
    // Hero Conversion Badge
    {
      id: "heroConversionBadge",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-position-absolute ank-top-30per ank-left-MIN1_5rem ank-transform-translateYSDMIN50perED ank-bg-warning ank-color-dark ank-px-1rem ank-py-1rem ank-borderRadius-1rem ank-fs-1rem ank-fontWeight-bold ank-zIndex-30 ank-boxShadow-0__4px__15px__rgbaSD255COM193COM7COM0_3ED ank-border-2px__textColor ank-textAlign-center',
        components: ['heroconversionLabel', 'heroConversionValue'],
      }
    },
    // Hero Conversion Label
    {
      id: "heroconversionLabel",
      type: 'container',
      config: { tag: 'div', classes: 'ank-fs-1rem ank-opacity-75 ank-mb-0_125rem', components: ['heroConversionLabelText'] },
    },
    // Hero Conversion Value
    {
      id: "heroConversionValue",
      type: 'container',
      config: { tag: 'div', classes: 'ank-fs-1_5rem ank-fontWeight-bolder', components: ['heroConversionValueText'] },
    },
    // Hero Verified Badge
    {
      id: "heroVerifiedBadge",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-position-absolute ank-top-30per ank-right-MIN1_5rem ank-bg-purple ank-px-1rem ank-py-0_75rem ank-borderRadius-1rem ank-fs-1rem ank-fontWeight-bold ank-zIndex-25 ank-display-flex ank-alignItems-center ank-gap-0_375rem ank-boxShadow-0__3px__10px__rgbaSD147COM51COM234COM0_25ED ank-opacity-95 ank-color-light',
        components: ['verified', 'heroVerifiedLabel'],
      }
    },
    // Hero Mobile Badge
    {
      id: "heroMobileBadge",
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-position-absolute ank-bottom-20per ank-right-MIN1_5rem ank-bg-teal ank-color-light ank-px-1rem ank-py-0_75rem ank-borderRadius-1rem ank-fs-1rem ank-fontWeight-bold ank-zIndex-25 ank-display-flex ank-alignItems-center ank-gap-0_375rem ank-boxShadow-0__3px__10px__rgbaSD20COM184COM166COM0_25ED ank-border-1px__textColor ank-opacity-95',
        components: ['phone_android', 'heroMobileLabel'],
      }
    },

    /* Features Section */
    {
      id: 'featuresSection',
      type: 'container',
      config: {
        id: 'features-section',
        tag: 'section',
        classes: 'ank-width-100per ank-position-relative ank-bg-bgColor ank-py-6rem',
        components: ['featuresSectionContainer'],
      }
    },
    {
      id: 'featuresSectionContainer',
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-width-100vw ank-px-1rem ank-boxSizing-borderMINbox ank-maxWidth-1280px ank-marginLeft-auto ank-marginRight-auto',
        components: ['featuresSectionContent'],
      }
    },
    {
      id: 'featuresSectionContent',
      type: 'container',
      config: {
        tag: 'div',
        components: ['featuresSectionHeader', 'featuresSectionGrid'],
      }
    },
    {
      id: 'featuresSectionHeader',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-textAlign-center ank-mb-4rem',
        components: ['featuresSectionTitle', 'featuresSectionSubtitle'],
      }
    },
    {
      id: 'featuresSectionGrid',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'gridCol2',
        components: [...this.i18n.features().map((_, index) => `featuresCard${ index + 1 }`)],
      }
    },

    /* Services Section */
    {
      id: 'servicesSection',
      type: 'container',
      config: {
        id: 'services-section',
        tag: 'section',
        classes: 'ank-width-100per ank-position-relative ank-bg-bgColor ank-py-6rem',
        components: ['servicesSectionContainer'],
      }
    },
    {
      id: 'servicesSectionContainer',
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-width-100vw ank-px-1rem ank-boxSizing-borderMINbox ank-maxWidth-1280px ank-marginLeft-auto ank-marginRight-auto',
        components: ['servicesSectionContent'],
      }
    },
    {
      id: 'servicesSectionContent',
      type: 'container',
      config: {
        tag: 'div',
        components: ['servicesSectionHeader', 'servicesSectionGrid'],
      }
    },
    {
      id: 'servicesSectionHeader',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-textAlign-center ank-mb-64px ank-fsSELCHILDh2-2rem ankfontWeightSELCHILDh2-bold ank-mbSELCHILDh2-16px ank-colorSELCHILDh2-titleColor ank-fsSELCHILDp-1_5rem ank-colorSELCHILDp-textColor ank-maxWidthSELCHILDp-700px ank-mxSELCHILDp-auto',
        components: ['servicesSectionTitle', 'servicesSectionSubtitle'],
      }
    },
    {
      id: 'servicesSectionGrid',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'gridCol2',
        components: [...this.i18n.services().map((_, index) => `servicesCard${ index + 1 }`)],
      }
    },

    /* FAQ Section */
    {
      id: 'faqSection',
      type: 'container',
      config: {
        id: 'faq-section',
        tag: 'section',
        classes: 'ank-width-100per ank-position-relative ank-bg-bgColor ank-py-6rem',
        components: ['faqSectionContainer'],
      }
    },
    {
      id: 'faqSectionContainer',
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-width-100vw ank-px-1rem ank-boxSizing-borderMINbox ank-maxWidth-1024px ank-marginLeft-auto ank-marginRight-auto',
        components: ['faqSectionContent'],
      }
    },
    {
      id: 'faqSectionContent',
      type: 'container',
      config: {
        tag: 'div',
        components: ['faqSectionHeader', 'faqAccordionWrapper', 'faqSectionFooter'],
      }
    },
    {
      id: 'faqSectionHeader',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-textAlign-center ank-mb-64px ank-fsSELCHILDh2-2rem ankfontWeightSELCHILDh2-bold ank-mbSELCHILDh2-16px ank-colorSELCHILDh2-titleColor ank-fsSELCHILDp-1_5rem ank-colorSELCHILDp-textColor ank-maxWidthSELCHILDp-700px ank-mxSELCHILDp-auto',
        components: ['faqSectionTitle', 'faqSectionSubtitle'],
      }
    },
    {
      id: 'faqAccordionWrapper',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-maxWidth-800px ank-mx-auto',
        components: ['faqAccordion'],
      }
    },
    {
      id: 'faqSectionFooter',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-textAlign-center ank-mt-48px ank-fsSELCHILDp-1rem ank-colorSELCHILDp-textColor ank-mbSELCHILDp-24px',
        components: ['faqFooterQuestion', 'faqFooterButton'],
      }
    },

    /* Testimonials Section */
    {
      id: 'testimonialsSection',
      type: 'container',
      config: {
        id: 'testimonials-section',
        tag: 'section',
        classes: 'ank-width-100per ank-position-relative ank-bg-bgColor ank-py-6rem',
        components: ['testimonialsSectionContainer'],
      }
    },
    {
      id: 'testimonialsSectionContainer',
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-width-100vw ank-px-1rem ank-boxSizing-borderMINbox ank-maxWidth-1280px ank-marginLeft-auto ank-marginRight-auto',
        components: ['testimonialsSectionContent'],
      }
    },
    {
      id: 'testimonialsSectionContent',
      type: 'container',
      config: {
        tag: 'div',
        components: ['testimonialsSectionHeader', 'testimonialsSectionGrid'],
      }
    },
    {
      id: 'testimonialsSectionHeader',
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-textAlign-center ank-mb-64px ank-fsSELCHILDh2-2rem ankfontWeightSELCHILDh2-bold ank-mbSELCHILDh2-16px ank-colorSELCHILDh2-titleColor ank-fsSELCHILDp-1_5rem ank-colorSELCHILDp-textColor ank-maxWidthSELCHILDp-700px ank-mxSELCHILDp-auto',
        components: ['testimonialsSectionTitle', 'testimonialsSectionSubtitle'],
      }
    },
    {
      id: 'testimonialsSectionGrid',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'gridCol2',
        components: [...this.i18n.testimonials().map((_, index) => `testimonialsCard${ index + 1 }`)],
      }
    },

    /* Final CTA Section */
    {
      id: 'finalCtaSection',
      type: 'container',
      config: {
        id: 'final-cta-section',
        tag: 'section',
        classes: 'ank-width-100per ank-position-relative ank-bg-accentColor ank-py-6rem',
        components: ['finalCtaContainer'],
      }
    },
    {
      id: 'finalCtaContainer',
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-width-100vw ank-px-1rem ank-boxSizing-borderMINbox ank-maxWidth-1024px ank-marginLeft-auto ank-marginRight-auto',
        components: ['finalCtaContent'],
      }
    },
    {
      id: 'finalCtaContent',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-textAlign-center',
        components: ['finalCtaTitle', 'finalCtaSubtitle', 'finalCtaButtonsRow', 'finalCtaTrust'],
      }
    },
    {
      id: 'finalCtaButtonsRow',
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-display-flex ank-flexDirection-column ank-flexDirection-sm-row ank-gap-16px ank-justifyContent-center ank-mb-32px ank-alignItems-stretch',
        components: ['finalCtaPrimaryButton', 'finalCtaSecondaryButton'],
      }
    },
    {
      id: 'finalCtaTrust',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-flexDirection-column ank-alignItems-center ank-gap-16px ank-opacity-70',
        components: ['finalCtaTrustLine1', 'finalCtaTrustRow2'],
      }
    },

    {
      id: 'finalCtaTrustRow2',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-gap-16px ank-alignItems-center ank-fs-1rem ank-color-textColor',
        components: ['finalCtaTrustSpanSupport', 'finalCtaTrustSpanReports', 'finalCtaTrustSpanSeo'],
      }
    },
    {
      id: 'finalCtaTrustItems',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-flexDirection-column ank-alignItems-center ank-gap-16px ank-opacity-70',
        components: [
          'finalCtaTrustItemMeasurement',
          'finalCtaTrustItemSsl',
          'finalCtaTrustItemDelivery',
          'finalCtaTrustItemSupport',
          'finalCtaTrustItemReports',
          'finalCtaTrustItemSeo',
        ],
      }
    },
    {
      id: 'finalCtaTrustItemMeasurement',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-alignItems-center ank-gap-8px ank-fs-1rem ank-color-textColor',
        components: ['finalCtaTrustIconMeasurement', 'finalCtaTrustTextMeasurement'],
      }
    },
    {
      id: 'finalCtaTrustItemSsl',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-alignItems-center ank-gap-8px ank-fs-1rem ank-color-textColor',
        components: ['finalCtaTrustIconSsl', 'finalCtaTrustTextSsl'],
      }
    },
    {
      id: 'finalCtaTrustItemDelivery',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-alignItems-center ank-gap-8px ank-fs-1rem ank-color-textColor',
        components: ['finalCtaTrustIconDelivery', 'finalCtaTrustTextDelivery'],
      }
    },
    {
      id: 'finalCtaTrustItemSupport',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-alignItems-center ank-gap-8px ank-fs-1rem ank-color-textColor',
        components: ['finalCtaTrustIconSupport', 'finalCtaTrustTextSupport'],
      }
    },
    {
      id: 'finalCtaTrustItemReports',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-alignItems-center ank-gap-8px ank-fs-1rem ank-color-textColor',
        components: ['finalCtaTrustIconReports', 'finalCtaTrustTextReports'],
      }
    },
    {
      id: 'finalCtaTrustItemSeo',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-alignItems-center ank-gap-8px ank-fs-1rem ank-color-textColor',
        components: ['finalCtaTrustIconSeo', 'finalCtaTrustTextSeo'],
      }
    },

    /* Stats Strip Section */
    {
      id: 'statsStripSection',
      type: 'container',
      config: {
        id: 'stats-strip-section',
        tag: 'section',
        classes: 'ank-width-100per ank-position-relative ank-bg-accentColor ank-py-6rem',
        components: ['statsStripContainer'],
      }
    },
    {
      id: 'statsStripContainer',
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-width-100vw ank-px-1rem ank-boxSizing-borderMINbox ank-maxWidth-1024px ank-marginLeft-auto ank-marginRight-auto',
        components: ['statsStripHeader', 'statsStripPanel'],
      }
    },
    {
      id: 'statsStripHeader',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-textAlign-center ank-mb-48px',
        components: ['statsStripTitle', 'statsStripSubtitle', 'statsStripDescription'],
      }
    },
    {
      id: 'statsStripPanel',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-bg-accentColor ank-borderRadius-12px ank-p-24px ank-color-textColor',
        components: ['statsStripRow'],
      }
    },
    {
      id: 'statsStripRow',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-flexWrap-wrap ank-gap-2rem ank-justifyContent-center',
        components: ['statsStripVisitsBlock', 'statsStripCtaBlock', 'statsStripAvgTimeBlock'],
      }
    },
    {
      id: 'statsStripVisitsBlock',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-textAlign-center',
        components: ['statsStripVisitsValue', 'statsStripVisitsLabel'],
      }
    },
    {
      id: 'statsStripVisitsValue',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-fs-2rem ank-fontWeight-bold ank-mb-8px',
        components: ['statsStripVisitsCounter'],
      }
    },
    {
      id: 'statsStripCtaBlock',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-textAlign-center',
        components: ['statsStripCtaValue', 'statsStripCtaLabel'],
      }
    },
    {
      id: 'statsStripCtaValue',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-fs-2rem ank-fontWeight-bold ank-mb-8px',
        components: ['statsStripCtaCounter'],
      }
    },
    {
      id: 'statsStripAvgTimeBlock',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-textAlign-center',
        components: ['statsStripAvgTimeValue', 'statsStripAvgTimeLabel'],
      }
    },
    {
      id: 'statsStripAvgTimeValue',
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-fs-2rem ank-fontWeight-bold ank-mb-8px',
        components: ['statsStripAvgTimeCounter'],
      }
    },

    /* Conversion Note */
    // Conversion Note Container
    {
      id: "conversionNoteContainer",
      type: 'container',
      config: {
        id: 'conversion-note',
        tag: 'div',
        classes:
          'ank-bg-bgColor ank-borderRadius-1rem ank-p-1_5rem ank-maxWidth-50rem ank-mx-auto ank-boxShadow-0__4px__20px__rgbaSD0COM0COM0COM0_1ED ank-border-2px ank-borderColor-success ank-borderOpacity-20 ank-textAlign-center ank-alignItems-center ank-maxWidth-1280px ank-marginLeft-auto ank-marginRight-auto ank-width-100vw ank-my-2rem ank-px-1rem ank-boxSizing-borderMINbox ank-bg-secondaryBgColor ank-position-relative',
        components: ['conversionNoteHeader', 'conversionNoteDescription', 'conversionNoteHints'],
      }
    },
    // Conversion Note Header
    {
      id: "conversionNoteHeader",
      type: 'container',
      config: {
        id: 'conversion-note-header',
        tag: 'div',
        classes: 'ank-display-flex ank-alignItems-center ank-justifyContent-center ank-gap-1rem ank-mb-1rem',
        components: ['conversionNoteHeaderIconContainer', 'conversionNoteHeaderTitle'],
      }
    },
    // Conversion Note Header Icon Container
    {
      id: "conversionNoteHeaderIconContainer",
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-bg-secondaryAccentColor ank-borderRadius-99rem ank-w-50px ank-h-50px ank-d-flex ank-alignItems-center ank-justifyContent-center',
        components: ['help_outline']
      }
    },
    // Conversion Note Description
    {
      id: "conversionNoteDescription",
      type: 'container',
      config: {
        id: 'conversion-note-description',
        tag: 'div',
        classes: 'ank-bg-textColor ank-borderRadius-1rem ank-p-1_25rem ank-mb-1rem',
        components: ['conversionNoteDescriptionText'],
      }
    },
    // Conversion Note Hints
    {
      id: "conversionNoteHints",
      type: 'container',
      config: {
        id: 'conversion-note-hints',
        tag: 'div',
        classes: 'ank-display-grid ank-gridTemplateColumns-1fr__1fr__1fr ank-gap-1rem ank-textAlign-center',
        components: ['conversionNoteHint1', 'conversionNoteHint2', 'conversionNoteHint3'],
      }
    },
    // Conversion Note Hint 1
    {
      id: "conversionNoteHint1",
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-bg-accentColor ank-borderRadius-0_75rem ank-p-1rem ank-color-textColor',
        components: ['conversionNoteHint1Label', 'conversionNoteHint1Value'],
      }
    },
    // Conversion Note Hint 2
    {
      id: "conversionNoteHint2",
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-alignItems-center ank-justifyContent-center',
        components: ['arrow_forward'],
      }
    },
    // Conversion Note Hint 3
    {
      id: "conversionNoteHint3",
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-bg-secondaryAccentColor ank-borderRadius-0_75rem ank-p-1rem ank-color-textColor',
        components: ['conversionNoteHint3Label', 'conversionNoteHint3Value'],
      }
    },

    /* Footer */
    {
      id: 'siteFooter',
      type: 'container',
      config: {
        id: 'contact-section',
        tag: 'footer',
        classes:
          'ank-width-100per ank-bg-secondaryBgColor ank-borderTop-1px ank-borderColor-secondaryBgColor ank-marginTop-auto ank-display-flex ank-justifyContent-center ank-paddingInline-16px ank-paddingBlock-24px',
        components: ['siteFooterContent'],
      }
    },
    {
      id: 'siteFooterContent',
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-display-flex ank-flexDirection-column ank-alignItems-center ank-justifyContent-center ank-gap-16px ank-width-100per ank-maxWidth-1200px ank-flexDirectionMd-row ank-justifyContentMd-spaceBetween ank-alignItemsMd-center',
        components: ['footerLegalSection', 'footerSocialSection', 'footerCopyrightSection'],
      }
    },
    {
      id: 'footerLegalSection',
      condition: this.footerConfig.showLegalLinks,
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-display-flex ank-flexDirection-column ank-alignItems-center ank-gap-8px ank-textAlign-center',
        components: ['footerLegalTitle', 'footerLegalLinks'],
      }
    },
    {
      id: 'footerLegalLinks',
      type: 'container',
      config: {
        tag: 'div',
        classes:
          'ank-display-flex ank-gap-12px ank-flexWrap-wrap ank-justifyContent-center',
        components: ['footerTermsButton', 'footerLegalSeparator', 'footerDataButton'],
      }
    },
    {
      id: 'footerSocialSection',
      condition: this.footerConfig.showSocialLinks && this.footerSocialLinks.length > 0,
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-display-flex ank-gap-16px ank-alignItems-center',
        components: this.footerSocialLinks.map(link => link.id) as readonly string[],
      }
    },
    {
      id: 'footerCopyrightSection',
      condition: this.footerConfig.showCopyright,
      type: 'container',
      config: {
        tag: 'div',
        classes: 'ank-textAlign-center',
        components: ['footerCopyrightText'],
      }
    },
  ];
  readonly dropdowns: TGenericComponent[] = [
    /* Header (Mobile) */
    {
      id: 'headerMobileNav',
      type: 'dropdown',
      eventInstructions: 'trackNavClick:event.eventData.id,event.eventData.value;navigationToSection:event.eventData.value',
      config: {
        items: [
          {
            id: 'home',
            value: 'home',
            label: () => (this.language.currentLanguage() === 'en' ? 'Home' : 'Inicio'),
          },
          {
            id: 'benefits',
            value: 'features-section',
            label: () => (this.language.currentLanguage() === 'en' ? 'Benefits' : 'Beneficios'),
          },
          {
            id: 'process',
            value: 'process-section',
            label: () => (this.language.currentLanguage() === 'en' ? 'Process' : 'Proceso'),
          },
          {
            id: 'services',
            value: 'services-section',
            label: () => (this.language.currentLanguage() === 'en' ? 'Services' : 'Servicios'),
          },
          {
            id: 'contact',
            value: 'contact-section',
            label: () => (this.language.currentLanguage() === 'en' ? 'Contact' : 'Contacto'),
          },
        ],
        dropdownConfig: {
          ariaLabel: 'Mobile navigation menu',
          classes: '',
          buttonClasses: 'ank-bg-transparent ank-border-0 ank-p-0 ank-cursor-pointer',
          itemLinkClasses: 'ank-display-block ank-padding-8px ank-borderRadius-0_75rem ank-textDecoration-none ank-transition-bgColor ank-duration-50 ank-bg-secondaryBgColor ank-color-accentColor',
          menuContainerClasses: 'ank-display-md-none ank-bg-bgColor ank-borderTop-1px ank-borderColor-secondaryBgColor ank-padding-20px ank-space-y-20px ank-animation-fadeInDown ng-star-inserted',
          menuNavClasses: 'ng-star-inserted',
          menuListClasses: 'ank-listStyle-none ank-padding-0 ank-margin-0 ank-display-flex ank-flexDirection-column ank-gap-8px',
          renderMode: 'inline',
          menuContainerId: 'mobile-primary-navigation',
          closeOnSelect: true,
        },
        components: ['menu'],
      }
    },
  ];
  readonly cards: TGenericComponent[] = [
    /* Features Section */
    ...this.i18n.features().map((item, index) => ({
      id: `featuresCard${ index + 1 }`,
      type: 'feature-card',
      config: {
        icon: item.icon,
        title: () => this.i18n.features()[index]?.title ?? '',
        description: () => this.i18n.features()[index]?.description ?? '',
        benefits: () => this.i18n.features()[index]?.benefits ?? [],
        classes:
          'ank-bg-secondaryBgColor ank-borderRadius-1rem ank-p-1_5rem cardHover ank-textAlign-center ank-border-1px ank-borderColor-border ank-h-calcSD100per__MIN__3remED',
      },
    })) as TGenericComponent[],

    /* Services Section */
    ...this.i18n.services().map((service, index) => ({
      id: `servicesCard${ index + 1 }`,
      type: 'feature-card',
      config: {
        icon: service.icon,
        title: () => this.i18n.services()[index]?.title ?? '',
        description: () => this.i18n.services()[index]?.description ?? '',
        benefits: () => this.i18n.services()[index]?.features ?? [],
        buttonLabel: () => this.i18n.services()[index]?.buttonLabel ?? '',
        onCta: (title: string) => this.openWhatsApp(AnalyticsEvents.ServicesCtaClick, 'services', title),
        classes:
          'ank-bg-secondaryBgColor ank-borderRadius-1rem ank-p-1_5rem cardHover ank-textAlign-center ank-border-1px ank-borderColor-border ank-h-calcSD100per__MIN__3remED',
      },
    })) as TGenericComponent[],

    /* Testimonials Section */
    ...this.i18n.testimonials().map((t, index) => ({
      id: `testimonialsCard${ index + 1 }`,
      type: 'testimonial-card',
      config: {
        name: () => this.i18n.testimonials()[index]?.name ?? '',
        role: () => this.i18n.testimonials()[index]?.role ?? '',
        company: () => this.i18n.testimonials()[index]?.company ?? '',
        content: () => this.i18n.testimonials()[index]?.content ?? '',
        rating: t.rating,
        avatar: t.avatar,
      },
    })) as TGenericComponent[],
  ];

  readonly statsCounters: TGenericComponent[] = [
    {
      id: 'statsStripVisitsCounter',
      type: 'stats-counter',
      config: this.statsStripVisitsConfig,
    },
    {
      id: 'statsStripCtaCounter',
      type: 'stats-counter',
      config: this.statsStripCtaInteractionsConfig,
    },
    {
      id: 'statsStripAvgTimeCounter',
      type: 'stats-counter',
      config: this.statsStripAverageTimeConfig,
    },
  ];
  readonly loadingSpinners: TGenericComponent[] = [];
  readonly icons: TGenericComponent[] = [
    /* Hero */
    // Speed Icon
    {
      id: 'speed',
      type: 'icon',
      config: {
        iconName: 'speed',
        classes: 'ank-color-textColor ank-fs-1rem'
      }
    },
    // Security Icon
    {
      id: 'security',
      type: 'icon',
      config: {
        iconName: 'security',
        classes: 'ank-color-textColor ank-fs-1rem'
      }
    },
    // Analytics Icon
    {
      id: 'analytics',
      type: 'icon',
      config: {
        iconName: 'analytics',
        classes: 'ank-color-textColor ank-fs-1rem'
      }
    },
    // Flash On Icon
    {
      id: 'flash_on',
      type: 'icon',
      config: {
        iconName: 'flash_on',
        classes: 'ank-color-info ank-fs-1rem'
      }
    },
    // Verified Icon
    {
      id: 'verified',
      type: 'icon',
      config: {
        iconName: 'verified',
        classes: 'ank-color-textColor ank-fs-1rem'
      }
    },
    // Phone Android Icon
    {
      id: 'phone_android',
      type: 'icon',
      config: {
        iconName: 'phone_android',
        classes: 'ank-color-light ank-fs-1rem'
      }
    },
    // Help Outline Icon
    {
      id: 'help_outline',
      type: 'icon',
      config: {
        iconName: 'help_outline',
        classes: 'ank-color-textColor ank-fs-1_5rem'
      }
    },
    // Arrow Forward Icon
    {
      id: 'arrow_forward',
      type: 'icon',
      config: {
        iconName: 'arrow_forward',
        classes: 'ank-color-secondaryAccentColor ank-fs-1_5rem'
      }
    },

    /* Header */
    {
      id: 'menu',
      type: 'icon',
      config: {
        iconName: 'menu',
        ariaLabel: 'Open menu',
        classes: 'ank-color-textColor ank-fs-1_5rem'
      }
    },

    /* Final CTA Trust Icons */
    {
      id: 'finalCtaTrustIconMeasurement',
      type: 'icon',
      config: {
        iconName: 'star',
        ariaHidden: true,
        classes: 'ank-color-secondaryAccentColor ank-fs-1_25rem'
      }
    },
    {
      id: 'finalCtaTrustIconSsl',
      type: 'icon',
      config: {
        iconName: 'lock',
        ariaHidden: true,
        classes: 'ank-color-secondaryAccentColor ank-fs-1_25rem'
      }
    },
    {
      id: 'finalCtaTrustIconDelivery',
      type: 'icon',
      config: {
        iconName: 'flash_on',
        ariaHidden: true,
        classes: 'ank-color-secondaryAccentColor ank-fs-1_25rem'
      }
    },
    {
      id: 'finalCtaTrustIconSupport',
      type: 'icon',
      config: {
        iconName: 'support_agent',
        ariaHidden: true,
        classes: 'ank-color-secondaryAccentColor ank-fs-1_25rem'
      }
    },
    {
      id: 'finalCtaTrustIconReports',
      type: 'icon',
      config: {
        iconName: 'bar_chart',
        ariaHidden: true,
        classes: 'ank-color-secondaryAccentColor ank-fs-1_25rem'
      }
    },
    {
      id: 'finalCtaTrustIconSeo',
      type: 'icon',
      config: {
        iconName: 'search',
        ariaHidden: true,
        classes: 'ank-color-secondaryAccentColor ank-fs-1_25rem'
      }
    },
  ];
  readonly modals: TGenericComponent[] = [];
  readonly progressBars: TGenericComponent[] = [];
  readonly searchBoxes: TGenericComponent[] = [];
  readonly steppers: TGenericComponent[] = [];
  readonly tabGroups: TGenericComponent[] = [];
  readonly texts: TGenericComponent[] = [
    /* Hero */
    // MainTitle
    {
      id: 'mainTitle',
      type: 'text',
      config: {
        tag: 'h1',
        text: () => this.i18n.hero().title,
        classes:
          'ank-fs-3rem ank-fs-lg-5rem ank-fontWeight-bold ank-lh-3_3rem ank-lh-lg-5_5rem ank-mb-1_25rem textGradientVALSVAL2NsecondaryAccentColorVAL2NVAL3NsecondaryTitleColorVAL3NVL135degVL'
      }
    },
    // Subtitle
    {
      id: 'subtitle',
      type: 'text',
      condition: () => !!this.i18n.hero().subtitle,
      config: {
        tag: 'p',
        text: () => this.i18n.hero().subtitle,
        classes: 'ank-fs-1_125rem ank-color-secondaryTextColor ank-mb-1_5rem ank-lineHeight-relaxed'
      }
    },
    // Description
    {
      id: 'description',
      type: 'text',
      config: {
        tag: 'p',
        text: () => this.i18n.hero().description,
        classes: 'ank-fs-1_125rem ank-color-secondaryTextColor ank-mb-1_5rem ank-lineHeight-relaxed'
      }
    },
    // Badges Label
    {
      id: 'badgesLabel',
      condition: () => !!this.i18n.hero().badgesLabel,
      type: 'text',
      config: {
        tag: 'p',
        text: () => this.i18n.hero().badgesLabel ?? '',
        classes: 'ank-fs-1rem ank-color-textColor ank-fontWeight-medium'
      }
    },
    // Badges
    ...this.i18n.hero().badges.map((_, index) => ({
      id: `badgeText${ index + 1 }`,
      type: 'text',
      config: {
        tag: 'span',
        text: () => this.i18n.hero().badges[index]?.text ?? '',
        classes: 'ank-fs-1rem ank-color-textColor ank-fontWeight-medium'
      }
    })) as TGenericComponent[],
    // Hero Browser Mockup Header Fake URL Bar Text
    {
      id: "heroBrowserMockupHeaderFakeUrlBarText",
      type: 'text',
      config: {
        tag: '',
        text: () => this.i18n.hero().mockup.url,
      }
    },
    // Hero Landing Mockup Logo Text
    {
      id: "heroLandingMockupLogoText",
      type: 'text',
      config: {
        tag: 'span',
        text: () => this.i18n.hero().mockup?.logo || 'LOGO',
        classes: 'ank-color-textColor ank-fs-1rem ank-fontWeight-bold'
      }
    },
    // Hero Landing Mockup Nav CTA Text
    {
      id: "heroLandingMockupNavCtaText",
      type: 'text',
      config: {
        tag: 'span',
        text: () => this.i18n.hero().mockup?.contact,
        classes: 'ank-color-textColor ank-fs-1rem ank-fontWeight-bold'
      }
    },
    // Hero Landing Mockup Content CTA1 Text
    {
      id: "heroLandingMockupContentCTA1Text",
      type: 'text',
      config: {
        tag: 'span',
        text: () => this.i18n.hero().mockup?.buyButton || 'COMPRAR',
        classes: 'ank-color-textColor ank-fs-1rem ank-fontWeight-bold'
      }
    },
    // Hero Landing Mockup Content CTA2 Text
    {
      id: "heroLandingMockupContentCTA2Text",
      type: 'text',
      config: {
        tag: 'span',
        text: () => this.i18n.hero().mockup?.demoButton || 'DEMO',
        classes: 'ank-color-secondaryAccentColor ank-fs-1rem ank-fontWeight-bold'
      }
    },
    // Hero Landing Mockup Footer Link Text
    {
      id: "heroLandingMockupFooterLinkText",
      type: 'text',
      config: {
        tag: 'span',
        text: () => this.i18n.hero().mockup?.ctaButton || 'SOLICITAR INFO',
        classes: 'ank-color-textColor ank-fs-1rem ank-fontWeight-bold ank-px-1rem'
      },
    },
    // Hero Floating Metrics Label Text
    {
      id: "heroFloatingMetricsLabelText",
      type: 'text',
      config: {
        tag: '',
        text: () => this.i18n.hero().floatingMetrics.speed,
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
      config: {
        tag: '',
        text: () => this.i18n.hero().floatingMetrics.conversion,
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
      config: { tag: '', text: () => this.i18n.hero().floatingMetrics.seoOptimized, }
    },
    // Hero Mobile Label
    {
      id: "heroMobileLabel",
      type: 'text',
      config: { tag: '', text: () => this.i18n.hero().floatingMetrics.mobileResponsive, }
    },

    /* Features Section */
    {
      id: 'featuresSectionTitle',
      type: 'text',
      config: {
        tag: 'h2',
        text: () => this.i18n.featuresSection().title,
        classes: 'ank-fs-2rem ank-fontWeight-bold ank-mb-1rem ank-color-titleColor',
      }
    },
    {
      id: 'featuresSectionSubtitle',
      type: 'text',
      config: {
        tag: 'p',
        text: () => this.i18n.featuresSection().subtitle,
        classes: 'ank-fs-1_25rem ank-color-textColor ank-maxWidth-37_5rem ank-mx-auto',
      }
    },

    /* Services Section */
    {
      id: 'servicesSectionTitle',
      type: 'text',
      config: {
        tag: 'h2',
        text: () => this.i18n.ui().sections.services.title,
      }
    },
    {
      id: 'servicesSectionSubtitle',
      type: 'text',
      config: {
        tag: 'p',
        text: () => this.i18n.ui().sections.services.subtitle,
      }
    },

    /* FAQ Section */
    {
      id: 'faqSectionTitle',
      type: 'text',
      config: {
        tag: 'h2',
        text: () => this.i18n.ui().sections.faq.title,
      }
    },
    {
      id: 'faqSectionSubtitle',
      type: 'text',
      config: {
        tag: 'p',
        text: () => this.i18n.ui().sections.faq.subtitle,
      }
    },
    {
      id: 'faqFooterQuestion',
      type: 'text',
      config: {
        tag: 'p',
        text: () => this.i18n.faqSection().footerQuestion,
      }
    },

    /* Final CTA Section */
    {
      id: 'finalCtaTitle',
      type: 'text',
      config: {
        tag: 'h2',
        text: () => this.i18n.finalCtaSection().title,
        classes: 'ank-fs-2rem ank-fontWeight-bold ank-mb-16px ank-color-titleColor',
      }
    },
    {
      id: 'finalCtaSubtitle',
      type: 'text',
      config: {
        tag: 'p',
        text: () => this.i18n.finalCtaSection().subtitle,
        classes: 'ank-fs-1_5rem ank-color-textColor ank-mb-32px ank-maxWidth-600px ank-mx-auto',
      }
    },

    // Final CTA Trust (Line 1)
    {
      id: 'finalCtaTrustLine1',
      type: 'text',
      config: {
        tag: 'p',
        classes: 'ank-fs-1rem ank-color-textColor ank-m-0',
        text: () =>
          this.language.currentLanguage() === 'en'
            ? '⭐ Measurement from day 1 • 🔒 SSL and hosting included • ⚡ Fast delivery'
            : '⭐ Medición desde el día 1 • 🔒 SSL y hosting incluido • ⚡ Entrega rápida',
      }
    },

    // Final CTA Trust (Row 2)
    {
      id: 'finalCtaTrustSpanSupport',
      type: 'text',
      config: {
        tag: 'span',
        text: () => (this.language.currentLanguage() === 'en' ? '💬 Continuous support' : '💬 Soporte continuo'),
      }
    },
    {
      id: 'finalCtaTrustSpanReports',
      type: 'text',
      config: {
        tag: 'span',
        text: () =>
          this.language.currentLanguage() === 'en'
            ? '📊 Optional simple reports'
            : '📊 Reportes simples opcionales',
      }
    },
    {
      id: 'finalCtaTrustSpanSeo',
      type: 'text',
      config: {
        tag: 'span',
        text: () =>
          this.language.currentLanguage() === 'en'
            ? '🌐 Search engine optimization'
            : '🌐 Optimización para buscadores',
      }
    },
    {
      id: 'finalCtaTrustTextMeasurement',
      type: 'text',
      config: {
        tag: 'span',
        text: () => (this.language.currentLanguage() === 'en' ? 'Measurement from day 1' : 'Medición desde el día 1'),
      }
    },
    {
      id: 'finalCtaTrustTextSsl',
      type: 'text',
      config: {
        tag: 'span',
        text: () => (this.language.currentLanguage() === 'en' ? 'SSL and hosting included' : 'SSL y hosting incluido'),
      }
    },
    {
      id: 'finalCtaTrustTextDelivery',
      type: 'text',
      config: {
        tag: 'span',
        text: () => (this.language.currentLanguage() === 'en' ? 'Fast delivery' : 'Entrega rápida'),
      }
    },
    {
      id: 'finalCtaTrustTextSupport',
      type: 'text',
      config: {
        tag: 'span',
        text: () => (this.language.currentLanguage() === 'en' ? 'Continuous support' : 'Soporte continuo'),
      }
    },
    {
      id: 'finalCtaTrustTextReports',
      type: 'text',
      config: {
        tag: 'span',
        text: () => (this.language.currentLanguage() === 'en' ? 'Optional simple reports' : 'Reportes simples opcionales'),
      }
    },
    {
      id: 'finalCtaTrustTextSeo',
      type: 'text',
      config: {
        tag: 'span',
        text: () => (this.language.currentLanguage() === 'en' ? 'Search engine optimization' : 'Optimización para buscadores'),
      }
    },

    /* Testimonials Section */
    {
      id: 'testimonialsSectionTitle',
      type: 'text',
      config: {
        tag: 'h2',
        text: () => this.i18n.ui().sections.testimonials.title,
      }
    },
    {
      id: 'testimonialsSectionSubtitle',
      type: 'text',
      config: {
        tag: 'p',
        text: () => this.i18n.ui().sections.testimonials.subtitle,
      }
    },

    /* Stats Strip Section */
    {
      id: 'statsStripTitle',
      type: 'text',
      config: {
        tag: 'h2',
        text: () => this.statsStripContent().title,
        classes: 'ank-fs-2rem ank-fontWeight-bold ank-mb-16px ank-color-titleColor',
      }
    },
    {
      id: 'statsStripSubtitle',
      type: 'text',
      config: {
        tag: 'p',
        text: () => this.statsStripContent().subtitle,
        classes: 'ank-fs-1_5rem ank-color-textColor ank-mb-16px',
      }
    },
    {
      id: 'statsStripDescription',
      type: 'text',
      config: {
        tag: 'p',
        text: () => this.statsStripContent().description,
        classes: 'ank-fs-1rem ank-color-textColor ank-maxWidth-700px ank-mx-auto',
      }
    },
    {
      id: 'statsStripVisitsLabel',
      type: 'text',
      config: {
        tag: 'p',
        text: () => this.statsStripContent().visitsLabel,
        classes: 'ank-fs-1rem ank-opacity-90',
      }
    },
    {
      id: 'statsStripCtaLabel',
      type: 'text',
      config: {
        tag: 'p',
        text: () => this.statsStripContent().ctaInteractionsLabel,
        classes: 'ank-fs-1rem ank-opacity-90',
      }
    },
    {
      id: 'statsStripAvgTimeLabel',
      type: 'text',
      config: {
        tag: 'p',
        text: () => this.statsStripContent().averageTimeLabel,
        classes: 'ank-fs-1rem ank-opacity-90',
      }
    },

    /* Conversion Note */
    // Conversion Note Header Title
    {
      id: "conversionNoteHeaderTitle",
      type: 'text',
      config: {
        tag: 'h3',
        text: () => this.i18n.conversionNote().title,
        classes: 'ank-fs-1_5rem ank-fontWeight-bold ank-m-0 ank-color-titleColor'
      }
    },
    // Conversion Note Description Text
    {
      id: "conversionNoteDescriptionText",
      type: 'text',
      config: {
        tag: 'p',
        html: () => this.i18n.conversionNote().conversionDescription,
        classes: 'ank-fs-1_25rem ank-lineHeight-relaxed ank-m-0 ank-color-bgColor'
      }
    },
    // Conversion Note Hint 1 Label
    {
      id: "conversionNoteHint1Label",
      type: 'text',
      config: {
        tag: 'p',
        text: () => this.i18n.conversionNote().investmentLabel,
        classes: 'ank-fs-1rem ank-opacity-90'
      }
    },
    // Conversion Note Hint 1 Value
    {
      id: "conversionNoteHint1Value",
      type: 'text',
      config: {
        tag: 'p',
        text: () => this.i18n.conversionNote().investmentValue,
        classes: 'ank-fs-1_25rem ank-fontWeight-bold'
      }
    },
    // Conversion Note Hint 3 Label
    {
      id: "conversionNoteHint3Label",
      type: 'text',
      config: {
        tag: 'p',
        text: () => this.i18n.conversionNote().totalReturnLabel,
        classes: 'ank-fs-1rem ank-opacity-90'
      }
    },
    // Conversion Note Hint 3 Value
    {
      id: "conversionNoteHint3Value",
      type: 'text',
      config: {
        tag: 'p',
        text: () => this.i18n.conversionNote().totalReturnValue,
        classes: 'ank-fs-1_25rem ank-fontWeight-bold'
      }
    },

    /* Footer */
    {
      id: 'footerLegalTitle',
      type: 'text',
      config: {
        tag: 'h3',
        text: () =>
          this.language.currentLanguage() === 'en'
            ? this.footerTranslations.en.legalTitle
            : this.footerTranslations.es.legalTitle,
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
      config: {
        tag: 'p',
        text: () =>
          this.language.currentLanguage() === 'en'
            ? this.footerConfig.copyrightText
            : '© 2025 Zoo Landing Page. Todos los derechos reservados.',
        classes: 'ank-color-secondaryTextColor ank-fontSize-sm ank-margin-0',
      }
    },
  ];
  readonly toasts: TGenericComponent[] = [];
  readonly tooltips: TGenericComponent[] = [];

  readonly interactiveProcesses: TGenericComponent[] = [
    {
      id: 'interactiveProcessSection',
      type: 'container',
      config: {
        id: 'process-section',
        tag: 'div',
        classes: '',
        components: ['interactiveProcess'],
      },
    },
    {
      id: 'interactiveProcess',
      type: 'interactive-process',
      eventInstructions: 'setInteractiveProcessStep:event.eventData',
      meta_title: String(AnalyticsEvents.ProcessStepChange),
      config: {
        process: this.interactiveProcessSteps,
        currentStep: this.currentProcessStep,
      },
    },
  ];

  readonly components: TGenericComponent[] = [
    ...this.accordions,
    ...this.buttons,
    ...this.links,
    ...this.media,
    ...this.containers,
    ...this.dropdowns,
    ...this.cards,
    ...this.icons,
    ...this.interactiveProcesses,
    ...this.loadingSpinners,
    ...this.modals,
    ...this.progressBars,
    ...this.searchBoxes,
    ...this.statsCounters,
    ...this.steppers,
    ...this.tabGroups,
    ...this.texts,
    ...this.toasts,
    ...this.tooltips
  ];

  private readonly componentsAlreadyRendered: Set<string> = new Set<string>();
  private readonly componentsToBeRendered: Set<string> = new Set<string>(this.components.map(component => component.id));

  public allComponentsRendered(): boolean {
    return this.componentsAlreadyRendered.size === this.componentsToBeRendered.size;
  }

  getComponentById(id: string) {
    let component = this.components.find(component => component.id === id);
    if (!component) {
      console.error(`Component with id "${ id }" not found in ConfigurationsOrchestratorService.`);
    } else {
      const normalizedType = String((component as any).type ?? '')
        .trim()
        .replace(/[\u2010\u2011\u2212]/g, '-');
      if (normalizedType && normalizedType !== (component as any).type) {
        component = { ...(component as any), type: normalizedType } as TGenericComponent;
      }
      this.componentsAlreadyRendered.add(id);
      this.componentsToBeRendered.delete(id);
    }
    return component;
  }

  getAllTheClassesFromComponents(): string[] {
    const classesSet: Set<string> = new Set<string>();

    const addClasses = (raw: unknown) => {
      if (!raw || typeof raw !== 'string') return;
      raw
        .split(' ')
        .map(cls => cls.trim())
        .filter(cls => cls.length > 0)
        .forEach(cls => classesSet.add(cls));
    };

    this.components.forEach(component => {
      if (component.config && 'classes' in component.config && component.config.classes) {
        addClasses((component.config as any).classes);
      }

      // Also collect classes from dropdownConfig fields (these are not under config.classes)
      if ((component as any).type === 'dropdown') {
        const ddCfg = (component as any).config?.dropdownConfig;
        if (ddCfg) {
          addClasses(ddCfg.classes);
          addClasses(ddCfg.buttonClasses);
          addClasses(ddCfg.itemLinkClasses);
          addClasses(ddCfg.menuContainerClasses);
          addClasses(ddCfg.menuNavClasses);
          addClasses(ddCfg.menuListClasses);
        }
      }
    });
    return Array.from(classesSet);
  }

  readonly posibleActions = ['openWhatsApp', 'trackCTAClick', 'trackNavClick', 'navigationToSection', 'setInteractiveProcessStep', 'trackFaqToggle', 'openFaqCtaWhatsApp', 'openFinalCtaWhatsApp', 'toggleTheme', 'toggleLanguage', 'openFooterTerms', 'openFooterData'];
  handleComponentEvent(event: { componentId: string, meta_title?: string, eventName: string, eventData?: unknown, eventInstructions?: string }): void {
    console.log(`Event "${ event.eventName }" triggered from component with id "${ event.componentId }" with the following data: `, event.eventData, ' // and the following instructions: ', event.eventInstructions);
    if (!event.eventInstructions) return;

    const resolveEventPath = (rawPath: string): unknown => {
      // Supports: event.eventData.id, event.meta_title, etc.
      const path = rawPath.trim();
      if (!path.startsWith('event.')) return undefined;
      const parts = path.replace(/^event\./, '').split('.').filter(Boolean);
      let cur: any = event as any;
      for (const part of parts) {
        if (cur == null) return undefined;
        cur = cur[part];
      }
      return cur;
    };

    const instructions = event.eventInstructions.split(';');
    instructions.forEach(instruction => {
      const [action, params] = instruction.split(':');
      if (this.posibleActions.includes(action)) {
        let paramList: any[] = params ? params.split(',') : [];
        paramList = paramList.map(param => {
          let p = param.trim();
          if (p.includes('event.')) {
            console.log('Resolving event param for ', p);
            const resolved = resolveEventPath(p);
            p = resolved as any;
            console.log('Resolved to ', p);
          }
          if (p === 'null') return null;
          if (p === 'undefined') return undefined;
          if (!isNaN(Number(p))) return Number(p);
          return p;
        });
        switch (action) {
          case 'openWhatsApp':
            this.openWhatsApp(...(paramList as [string, string, string?]));
            break;
          case 'trackCTAClick':
            this.trackCTAClick(...(paramList as [string, string, string]));
            break;
          case 'trackNavClick':
            this.trackNavClick(paramList[0] as any, paramList[1] as any);
            break;
          case 'navigationToSection':
            this.navigationToSection(...(paramList as [string]));
            break;
          case 'setInteractiveProcessStep':
            this.setInteractiveProcessStep(...(paramList as [number]));
            break;
          case 'trackFaqToggle':
            this.trackFaqToggle(paramList[0] as any);
            break;
          case 'openFaqCtaWhatsApp':
            this.openFaqCtaWhatsApp();
            break;
          case 'openFinalCtaWhatsApp':
            this.openFinalCtaWhatsApp(paramList[0] as any, paramList[1] as any);
            break;
          case 'toggleTheme':
            this.toggleTheme();
            break;
          case 'toggleLanguage':
            this.toggleLanguage();
            break;
          case 'openFooterTerms':
            this.openFooterTerms();
            break;
          case 'openFooterData':
            this.openFooterData();
            break;
          default:
            console.error(`Action "${ action }" not recognized.`);
            break;
        }
      }
    });
  }

  toggleTheme(): void {
    const before = this.theme.currentTheme();
    this.theme.toggleTheme();
    const after = this.theme.currentTheme();
    this.handleAnalyticsEvent({
      name: AnalyticsEvents.ThemeToggle,
      category: AnalyticsCategories.Theme,
      label: `${ before }->${ after }`,
      meta: { before, after, type: 'theme', action: 'toggle' },
    });
  }

  toggleLanguage(): void {
    const before = this.language.currentLanguage();
    this.language.toggleLanguage();
    const after = this.language.currentLanguage();
    this.handleAnalyticsEvent({
      name: AnalyticsEvents.LanguageToggle,
      category: AnalyticsCategories.I18N,
      label: `${ before }->${ after }`,
      meta: { before, after, type: 'language', action: 'toggle' },
    });
  }

  trackFaqToggle(eventData: { id?: string; expanded?: boolean } | undefined): void {
    if (!eventData?.expanded) return;
    const id = String(eventData.id ?? 'unknown');
    this.handleAnalyticsEvent({ name: AnalyticsEvents.FaqOpen, category: AnalyticsCategories.Faq, label: id });
  }

  openFaqCtaWhatsApp(): void {
    this.handleAnalyticsEvent({
      name: AnalyticsEvents.FaqCtaClick,
      category: AnalyticsCategories.CTA,
      label: 'faq:whatsapp',
      meta: { location: 'faq-section', channel: 'whatsapp' },
    });
    try {
      const phone = WHATSAPP_PHONE;
      const link = buildWhatsAppUrl(phone, this.i18n.ui().sections.faq.subtitle);
      if (link && typeof window !== 'undefined') window.open(link, '_blank', 'noopener,noreferrer');
    } catch {
      // no-op
    }
  }

  openFinalCtaWhatsApp(eventName: string | undefined, variant: 'primary' | 'secondary' | string): void {
    const name = String(eventName ?? AnalyticsEvents.CtaClick);
    this.handleAnalyticsEvent({
      name,
      category: AnalyticsCategories.CTA,
      label: `final-cta:${ String(variant || 'primary') }`,
      meta: { location: 'final-cta', source: 'final_cta_section', channel: 'whatsapp', phone: WHATSAPP_PHONE }
    });
    try {
      const link = buildWhatsAppUrl(WHATSAPP_PHONE, this.i18n.hero().subtitle);
      if (link && typeof window !== 'undefined') window.open(link, '_blank', 'noopener,noreferrer');
    } catch {
      // no-op
    }
  }

  openFooterTerms(): void {
    this.modal.open({
      id: 'terms-of-service',
      size: 'lg',
      ariaLabel: this.globalI18n.t('footer.legal.terms.title'),
      showAccentBar: true,
      accentColor: 'secondaryAccentColor',
    });
    this.handleAnalyticsEvent({
      name: AnalyticsEvents.ActionTrigger,
      category: AnalyticsCategories.Engagement,
      label: 'footer:terms',
      meta: { location: 'footer', action: 'open_terms_modal' },
    });
  }

  openFooterData(): void {
    this.modal.open({
      id: 'data-use',
      size: 'md',
      ariaLabel: this.globalI18n.t('footer.legal.data.title'),
      showAccentBar: true,
      accentColor: 'secondaryAccentColor',
    });
    this.handleAnalyticsEvent({
      name: AnalyticsEvents.ActionTrigger,
      category: AnalyticsCategories.Engagement,
      label: 'footer:data',
      meta: { location: 'footer', action: 'open_data_privacy_modal' },
    });
  }

  setInteractiveProcessStep(step: number): void {
    this.currentProcessStep.set(step);
    this.handleAnalyticsEvent({
      name: AnalyticsEvents.ProcessStepChange,
      category: AnalyticsCategories.Process,
      label: String(step + 1),
    });
  }

  openWhatsApp(meta_title: string, location: string, serviceLabel?: string): void {

    const rawMessage = this.i18n.ui().contact.whatsappMessage;
    const phone = WHATSAPP_PHONE;
    const link = buildWhatsAppUrl(phone, rawMessage);
    const isService = meta_title === AnalyticsEvents.ServicesCtaClick;
    const comingFromServicesSection = location === 'services';
    if (isService) {
      // Emit only if not original services section (avoid duplicates) or if we have an override label
      if (!comingFromServicesSection || !!serviceLabel) {
        const label = serviceLabel || 'whatsapp-button';
        this.handleAnalyticsEvent({ name: meta_title, category: AnalyticsCategories.CTA, label, meta: { location, via: 'whatsapp_button' } });
      }
    } else {
      this.handleAnalyticsEvent({ name: meta_title, category: AnalyticsCategories.CTA, label: 'whatsapp-button', meta: { location, forwardedFrom: serviceLabel || null } });
    }
    window.open(link, '_blank');
  }
  trackCTAClick(meta_title: string, ctaType: string, location: string): void {
    this.handleAnalyticsEvent({ name: meta_title, category: AnalyticsCategories.CTA, label: `${ location }:${ ctaType }`, meta: { location } });
  }

  navigationToSection(sectionId: string): void {
    // Suppress SectionView spam during programmatic scroll
    this.handleAnalyticsEvent({
      name: AnalyticsEvents.SectionView,
      category: AnalyticsCategories.Navigation,
      label: 'suppress_request',
      meta: { suppressForMs: 500, intent: 'suppress_section_view_during_programmatic_scroll' },
    });
    const sectionElement = this.doc.getElementById(sectionId);
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  trackNavClick(key: string, href: unknown): void {
    const lang = this.language.currentLanguage();
    const labels: Record<string, string> =
      lang === 'en'
        ? { home: 'Home', benefits: 'Benefits', process: 'Process', services: 'Services', contact: 'Contact' }
        : { home: 'Inicio', benefits: 'Beneficios', process: 'Proceso', services: 'Servicios', contact: 'Contacto' };
    const label = labels[String(key ?? '').trim()] ?? String(key ?? 'nav');
    const hrefStr = String(href ?? '');
    this.handleAnalyticsEvent({
      name: AnalyticsEvents.NavClick,
      category: AnalyticsCategories.Navigation,
      label,
      meta: { href: hrefStr },
    });
  }

  // Unified analytics event handler (receives from any child component)
  handleAnalyticsEvent(evt: {
    readonly name: string;
    readonly category?: string;
    readonly label?: string;
    readonly value?: number;
    readonly meta?: any; // Additional contextual metadata
  }): void {
    // Apply suppression hints
    if (
      evt.label === "suppress_request" &&
      evt.meta?.suppressForMs &&
      evt.meta?.intent
    ) {
      const until = Date.now() + Number(evt.meta.suppressForMs || 0);
      this.analytics.suppress([evt.name], until); // re-use name; SectionView expected
      return; // do not forward suppression pseudo-event itself
    }
    /* console.log('[AppShell] analytics event', evt); */
    this.analytics.track(evt.name, {
      category: evt.category,
      label: evt.label,
      value: evt.value,
      meta: evt.meta,
    });
  }
}
