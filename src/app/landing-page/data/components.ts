import { TGenericComponent } from "@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types";
import { MotionPreferenceService } from "@/app/shared/services/motion-preference.service";
import { inject } from "@angular/core";
import { LandingPageI18nService } from "../components/landing-page/landing-page-i18n.service";

const i18n = inject(LandingPageI18nService);
const motion = inject(MotionPreferenceService);

const accordions: TGenericComponent[] = [];
const buttons: TGenericComponent[] = [
    /* Hero */
    // Primary CTA
    {
        id: 'primaryCTA',
        type: 'button',
        config: {
            label: i18n.hero().primary.label,
            classes: 'btnBaseVALSVL1_25remVL0_75remVL btnTypePrimaryVALSVLsecondaryLinkColorVLtextColorVL',
        }
    },
    // Secondary CTA
    {
        id: 'primaryCTA',
        condition: !!i18n.hero().secondary,
        type: 'button',
        config: {
            label: i18n.hero().secondary.label,
            classes: 'btnBaseVALSVL1_25remVL0_75remVL btnTypeOutlineVALSVLsecondaryLinkColorVLtextColorVL',
        }
    },
];
const containers: TGenericComponent[] = [
    /* Hero */
    // Hero Container
    {
        id: "heroContainer",
        type: 'container',
        config: {
            id: 'home',
            tag: 'div',
            classes:
                'ank-display-grid ank-gridTemplateColumns-1fr ank-gridTemplateColumns-lg-1fr__1fr ank-gap-2rem ank-alignItems-center ank-maxWidth-1280px ank-marginLeft-auto ank-marginRight-auto ank-width-100vw ank-py-2rem ank-px-1rem ank-boxSizing-borderMINbox ank-bg-secondaryBgColor ank-position-relative',
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
                'ank-display-flex ank-flexDirection-column ank-flexDirection-sm-row ank-gap-1rem ank-justifyContent-center ank-justifyContent-lg-start',
            components: ['primaryCTA', 'secondaryCTA'],
        }
    },
    // Badges Container
    {
        id: "badgesContainer",
        condition: i18n.hero().badges.length > 0,
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
            components: [...i18n.hero().badges.map((_, index) => `badgeContainer${ index + 1 }`)],
        },
    },
    // Badge Containers
    ...i18n.hero().badges.map((badge, index) => ({
        id: `badgeContainer${ index + 1 }`,
        type: 'container',
        config: {
            tag: 'div',
            classes: 'ank-display-flex ank-alignItems-center ank-gap-8px ank-bg-bgColorOPA__0_8 ank-borderRadius-24px ank-px-12px ank-px-lg-20px ank-py-6px ank-border-1px ank-borderColor-textColorOPA__0_2 ank-backdropFilter-blurSD8pxED ank-minWidth-120px ank-minWidth-lg-160px'
        },
        components: [`badgePoint${ index + 1 }`, `badge${ index + 1 }`]
    })) as TGenericComponent[],
    // Badge Points
    ...i18n.hero().badges.map((badge, index) => ({
        id: `badgePoint${ index + 1 }`,
        type: 'container',
        config: {
            tag: 'div',
            classes: 'ank-width-6px ank-height-6px ank-bg-accentColor ank-borderRadius-99rem'
        }
    })) as TGenericComponent[],
    // Hero Right
    {
        id: "heroRight",
        type: 'container',
        config: {
            tag: 'div',
            classes:
                'ank-position-relative ank-wmx-85vw ank-justifySelf-center' + (motion.reduced() ? ' ank-transition-none' : ''),
            components: ['heroImageMockup', 'heroBrowserMockup', 'heroAnimatedElements', 'heroFloatingMetrics', 'heroConversionBadge', 'heroVerifiedBadge', 'heroMobileBadge'],
        }
    },
    // Hero Image Mockup
    {
        id: "heroImageMockup",
        condition: !!i18n.hero().backgroundImage,
        type: 'container',
        config: {
            tag: 'div',
            classes: 'ank-position-absolute ank-inset-0 ank-bgCover ank-borderRadius-1rem ank-opacity-15 ank-backgroundImage-' + i18n.hero().backgroundImage,
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
        id: "heroLandingMockupFeature1",
        type: 'container',
        config: {
            tag: 'div',
            classes: 'ank-bg-titleColor ank-borderRadius-0_375rem ank-p-1rem ank-textAlign-center',
            components: ['heroLandingMockupFeatureIcon2', 'heroLandingMockupFeatureTitle', 'heroLandingMockupFeatureDescription'],
        }
    },
    // Hero Landing Mockup Feature 3
    {
        id: "heroLandingMockupFeature1",
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
];
const dropdowns: TGenericComponent[] = [];
const cards: TGenericComponent[] = [];
const loadingSpinners: TGenericComponent[] = [];
const icons: TGenericComponent[] = [
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

];
const modals: TGenericComponent[] = [];
const progressBars: TGenericComponent[] = [];
const searchBoxes: TGenericComponent[] = [];
const steppers: TGenericComponent[] = [];
const tabGroups: TGenericComponent[] = [];
const texts: TGenericComponent[] = [
    /* Hero */
    // MainTitle
    {
        id: 'mainTitle',
        type: 'text',
        config: {
            tag: 'h1',
            text: i18n.hero().title,
            classes:
                'ank-fs-3rem ank-fs-lg-5rem ank-fontWeight-bold ank-lh-3_3rem ank-lh-lg-5_5rem ank-mb-1_25rem textGradientVALSVAL2NsecondaryAccentColorVAL2NVAL3NsecondaryTitleColorVAL3NVL135degVL'
        }
    },
    // Subtitle
    {
        id: 'subtitle',
        type: 'text',
        config: {
            tag: 'p',
            text: i18n.hero().subtitle,
            classes: 'ank-fs-1_125rem ank-color-secondaryTextColor ank-mb-1_5rem ank-lineHeight-relaxed'
        }
    },
    // Description
    {
        id: 'description',
        type: 'text',
        config: {
            tag: 'p',
            text: i18n.hero().description,
            classes: 'ank-fs-1_125rem ank-color-secondaryTextColor ank-mb-1_5rem ank-lineHeight-relaxed'
        }
    },
    // Badges Label
    {
        id: 'badgesLabel',
        condition: !!i18n.hero().badgesLabel,
        type: 'text',
        config: {
            tag: 'p',
            text: i18n.hero().badgesLabel ?? '',
            classes: 'ank-fs-1rem ank-color-textColor ank-fontWeight-medium'
        }
    },
    // Badges
    ...i18n.hero().badges.map((badge, index) => ({
        id: `badge${ index + 1 }`,
        type: 'text',
        config: {
            tag: 'span',
            text: badge.text,
            classes: 'ank-fs-1rem ank-color-textColor ank-fontWeight-medium'
        }
    })) as TGenericComponent[],
    // Hero Browser Mockup Header Fake URL Bar Text
    {
        id: "heroBrowserMockupHeaderFakeUrlBarText",
        type: 'text',
        config: {
            tag: '',
            text: i18n.hero().mockup.url,
        }
    },
    // Hero Landing Mockup Logo Text
    {
        id: "heroLandingMockupLogoText",
        type: 'text',
        config: {
            tag: 'span',
            text: i18n.hero().mockup?.logo || 'LOGO',
            classes: 'ank-color-textColor ank-fs-1rem ank-fontWeight-bold'
        }
    },
    // Hero Landing Mockup Nav CTA Text
    {
        id: "heroLandingMockupNavCtaText",
        type: 'text',
        config: {
            tag: 'span',
            text: i18n.hero().mockup?.contact,
            classes: 'ank-color-textColor ank-fs-1rem ank-fontWeight-bold'
        }
    },
    // Hero Landing Mockup Content CTA1 Text
    {
        id: "heroLandingMockupContentCTA1Text",
        type: 'text',
        config: {
            tag: 'span',
            text: i18n.hero().mockup?.buyButton || 'COMPRAR',
            classes: 'ank-color-textColor ank-fs-1rem ank-fontWeight-bold'
        }
    },
    // Hero Landing Mockup Content CTA2 Text
    {
        id: "heroLandingMockupContentCTA2Text",
        type: 'text',
        config: {
            tag: 'span',
            text: i18n.hero().mockup?.demoButton || 'DEMO',
            classes: 'ank-color-secondaryAccentColor ank-fs-1rem ank-fontWeight-bold'
        }
    },
    // Hero Landing Mockup Footer Link Text
    {
        id: "heroLandingMockupFooterLinkText",
        type: 'text',
        config: {
            tag: 'span',
            text: i18n.hero().mockup?.ctaButton || 'SOLICITAR INFO',
            classes: 'ank-color-textColor ank-fs-1rem ank-fontWeight-bold ank-px-1rem'
        },
    },
    // Hero Floating Metrics Label Text
    {
        id: "heroFloatingMetricsLabelText",
        type: 'text',
        config: {
            tag: '',
            text: i18n.hero().floatingMetrics.speed,
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
            text: i18n.hero().floatingMetrics.conversion,
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
        config: { tag: '', text: i18n.hero().floatingMetrics.seoOptimized, }
    },
    // Hero Mobile Label
    {
        id: "heroMobileLabel",
        type: 'text',
        config: { tag: '', text: i18n.hero().floatingMetrics.mobileResponsive, }
    },
];
const toasts: TGenericComponent[] = [];
const tooltips: TGenericComponent[] = [];

export const COMPONENTS: TGenericComponent[] = [
    ...accordions,
    ...buttons,
    ...containers,
    ...dropdowns,
    ...cards,
    ...icons,
    ...loadingSpinners,
    ...modals,
    ...progressBars,
    ...searchBoxes,
    ...steppers,
    ...tabGroups,
    ...texts,
    ...toasts,
    ...tooltips
];
