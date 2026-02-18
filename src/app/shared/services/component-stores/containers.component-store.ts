import { TGenericComponent } from "../../components/wrapper-orchestrator/wrapper-orchestrator.types";
import { I18nService } from "../i18n.service";
import { footerSocialLinks } from "./data/footerSocialLinks";

export const createContainers = (globalI18n: I18nService): TGenericComponent[] => {
    return [
        /* Landing Page Root */
        {
            id: 'landingPage',
            type: 'container',
            config: {
                tag: 'main',
                id: 'main-content',
                role: 'main',
                tabindex: -1,
                classes: 'ank-display-flex ank-flexDirection-column ank-outline-none',
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
            },
        },
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
            },
        },
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
            condition: 'all:i18n,hero.badges',
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
                components: Array.from({ length: 5 }, (_, index) => `badgeContainer${ index + 1 }`),
            },
        },
        // Badge Containers
        ...Array.from({ length: 5 }, (_, index) => ({
            id: `badgeContainer${ index + 1 }`,
            condition: `all:i18n,hero.badges.${ index }`,
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
                    'ank-position-relative ank-wmx-85vw ank-justifySelf-center',
                components: ['heroImageMockup', 'heroBrowserMockup', 'heroAnimatedElements', 'heroFloatingMetrics', 'heroConversionBadge', 'heroVerifiedBadge', 'heroMobileBadge'],
            }
        },
        // Hero Image Mockup
        {
            id: "heroImageMockup",
            condition: 'all:i18n,hero.backgroundImage',
            type: 'container',
            config: {
                tag: 'div',
                classes: 'ank-position-absolute ank-inset-0 ank-bgCover ank-borderRadius-1rem ank-opacity-15 ank-backgroundImage-' + (globalI18n.get<string>('hero.backgroundImage') ?? ''),
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
                components: Array.from({ length: 6 }, (_, index) => `featuresCard${ index + 1 }`),
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
                components: Array.from({ length: 3 }, (_, index) => `servicesCard${ index + 1 }`),
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
                components: Array.from({ length: 3 }, (_, index) => `testimonialsCard${ index + 1 }`),
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
            condition: 'all:footerConfig,showLegalLinks',
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
            condition: 'all:footerConfig,showSocialLinks; all:footerSocialLinks,exists',
            type: 'container',
            config: {
                tag: 'div',
                classes: 'ank-display-flex ank-gap-16px ank-alignItems-center',
                components: footerSocialLinks.map(link => link.id) as readonly string[],
            }
        },
        {
            id: 'footerCopyrightSection',
            condition: 'all:footerConfig,showCopyright',
            type: 'container',
            config: {
                tag: 'div',
                classes: 'ank-textAlign-center',
                components: ['footerCopyrightText'],
            }
        },
    ];
};
