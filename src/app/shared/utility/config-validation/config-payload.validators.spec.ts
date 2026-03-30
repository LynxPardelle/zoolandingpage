import {
    isAnalyticsConfigPayload,
    isAngoraCombosPayload,
    isComponentsPayload,
    isI18nPayload,
    isPageConfigPayload,
    isSeoPayload,
    isStructuredDataPayload,
    isVariablesPayload,
} from './config-payload.validators';

const TEST_DOMAIN = 'preview.example.test';

describe('config-payload.validators', () => {
    it('validates page-config payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            rootIds: ['landingPage'],
        };
        const invalid = { pageId: 'default' };

        expect(isPageConfigPayload(valid)).toBeTrue();
        expect(isPageConfigPayload(invalid)).toBeFalse();
    });

    it('validates components payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            components: {},
        };
        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts interaction-scope and input component payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            components: {
                leadScope: {
                    id: 'leadScope',
                    type: 'interaction-scope',
                    config: {
                        scopeId: 'leadForm',
                        tag: 'form',
                        components: ['emailField'],
                        computations: [
                            {
                                resultId: 'score',
                                initial: { source: 'literal', value: 10 },
                                steps: [{ op: 'multiply', value: { source: 'literal', value: 2 } }],
                            },
                        ],
                    },
                },
                emailField: {
                    id: 'emailField',
                    type: 'input',
                    config: {
                        fieldId: 'email',
                        controlType: 'text',
                        validation: [{ type: 'email' }],
                    },
                },
            },
        };

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts generic-card payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            components: {
                serviceCardTemplate: {
                    id: 'serviceCardTemplate',
                    type: 'generic-card',
                    config: {
                        variant: 'feature',
                        icon: 'rocket_launch',
                        title: 'Launch faster',
                        description: 'A reusable feature card.',
                        benefits: ['One', 'Two'],
                        buttonLabel: 'Request info',
                        featureTitleClasses: 'featureCardTitle',
                        benefitIconClasses: 'featureCardBenefitIcon',
                        classes: 'featureCard',
                    },
                },
                reviewCardTemplate: {
                    id: 'reviewCardTemplate',
                    type: 'generic-card',
                    config: {
                        variant: 'testimonial',
                        name: 'Ada',
                        role: 'Founder',
                        company: 'Example Co',
                        content: 'Excellent work.',
                        rating: 5,
                        avatar: 'A',
                        verified: true,
                        testimonialContentClasses: 'reviewCardContent',
                    },
                },
            },
        };

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts explicit loopConfig bindings in components payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: TEST_DOMAIN,
            components: {
                socialLinkTemplate: {
                    id: 'socialLinkTemplate',
                    type: 'link',
                    config: {
                        id: 'socialLinkTemplate',
                        href: '#',
                        text: '',
                        ariaLabel: '',
                    },
                },
                socialLinks: {
                    id: 'socialLinks',
                    type: 'container',
                    loopConfig: {
                        source: 'var',
                        path: 'socialLinks',
                        templateId: 'socialLinkTemplate',
                        idPrefix: 'socialLink',
                        bindings: [
                            {
                                to: 'config.href',
                                sources: ['href', 'url', { from: 'value', transform: 'navigationHref' }],
                            },
                            {
                                to: 'config.text',
                                sources: ['icon', { from: 'labelKey', transform: 'i18nKey' }, { from: 'label', transform: 'locale' }],
                            },
                        ],
                    },
                    config: {
                        tag: 'div',
                        components: [],
                    },
                },
            },
        };

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('rejects loopConfig bindings with unknown transforms', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: TEST_DOMAIN,
            components: {
                badLoop: {
                    id: 'badLoop',
                    type: 'container',
                    loopConfig: {
                        source: 'i18n',
                        path: 'items',
                        templateId: 'itemTemplate',
                        bindings: [
                            {
                                to: 'config.text',
                                sources: [{ from: 'label', transform: 'unknownTransform' }],
                            },
                        ],
                    },
                    config: {
                        tag: 'div',
                        components: [],
                    },
                },
            },
        };

        expect(isComponentsPayload(invalid)).toBeFalse();
    });

    it('rejects retired feature-card and testimonial-card payloads', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            components: {
                oldFeatureCard: {
                    id: 'oldFeatureCard',
                    type: 'feature-card',
                    config: {},
                },
                oldTestimonialCard: {
                    id: 'oldTestimonialCard',
                    type: 'testimonial-card',
                    config: {},
                },
            },
        };

        expect(isComponentsPayload(invalid)).toBeFalse();
    });

    it('accepts textarea input payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            components: {
                messageField: {
                    id: 'messageField',
                    type: 'input',
                    config: {
                        fieldId: 'message',
                        controlType: 'textarea',
                        rows: 6,
                        validation: [{ type: 'minLength', value: 20 }],
                    },
                },
            },
        };

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts select input payloads with draft-owned dropdown presentation config', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: TEST_DOMAIN,
            components: {
                matterTypeField: {
                    id: 'matterTypeField',
                    type: 'input',
                    config: {
                        fieldId: 'matterType',
                        controlType: 'select',
                        fieldClasses: 'ank-width-100per',
                        inputClasses: 'formInput formSelectTrigger',
                        dropdownTriggerClasses: 'ank-width-100per ank-display-flex ank-alignItems-center ank-justifyContent-spaceBetween ank-gap-12px',
                        dropdownIndicatorText: '▾',
                        dropdownIndicatorClasses: 'ank-display-inlineFlex ank-alignItems-center',
                        dropdownTriggerTextConfig: {
                            classes: 'ank-display-block ank-flex-1 ank-overflow-hidden formSelectTriggerText',
                        },
                        dropdownConfig: {
                            classes: 'formDropdown',
                            menuContainerClasses: 'formDropdownMenu',
                            menuRole: 'listbox',
                            itemRole: 'option',
                            triggerRole: 'combobox',
                            overlayMatchWidth: 'origin',
                            overlayOffsetY: 8,
                        },
                        options: [
                            { value: 'contract-review', label: 'Contract review' },
                            { value: 'corporate-advisory', label: 'Corporate advisory' },
                        ],
                    },
                },
            },
        };

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts search-box payloads with authored suggestions and trigger config', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: TEST_DOMAIN,
            components: {
                headerSearch: {
                    id: 'headerSearch',
                    type: 'search-box',
                    config: {
                        minLength: 1,
                        debounceMs: 0,
                        collapsed: true,
                        triggerIcon: 'search',
                        closeIcon: 'arrow_back',
                        triggerAriaLabel: 'Open search',
                        closeAriaLabel: 'Close search',
                        resultItemClasses: 'search-result-item',
                        statusItemClasses: 'search-status-item',
                        suggestions: [
                            { id: 'services', label: 'Services', href: '/services' },
                            { id: 'contact', label: 'Contact', href: '/contact', target: '_self' },
                        ],
                    },
                },
            },
        };

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts accordion payloads with detail-mode authored icons', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: TEST_DOMAIN,
            components: {
                faqAccordion: {
                    id: 'faqAccordion',
                    type: 'accordion',
                    config: {
                        renderMode: 'detail',
                        toggleIconName: 'expand_more',
                        detailMetaIconName: 'schedule',
                        detailItemIconName: 'check_circle',
                        items: [
                            {
                                id: 'faq-1',
                                title: 'Question',
                                summary: 'Short answer',
                                content: 'Long answer',
                                meta: '2 days',
                                detailItems: ['One', 'Two'],
                            },
                        ],
                    },
                },
            },
        };

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts stats-counter payloads with plain authored formatting fields', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: TEST_DOMAIN,
            components: {
                visitsCounter: {
                    id: 'visitsCounter',
                    type: 'stats-counter',
                    valueInstructions: 'set:config.target,var,statsCounters.visits.target; set:config.formatMode,var,statsCounters.visits.formatMode',
                    config: {
                        target: 0,
                        durationMs: 1600,
                        startOnVisible: true,
                        ariaLabel: 'Visits',
                        formatMode: 'prefix',
                        formatPrefix: '+',
                        formatSuffix: '',
                    },
                },
            },
        };

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('rejects stats-counter payloads with temporary config fields', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: TEST_DOMAIN,
            components: {
                avgTimeCounter: {
                    id: 'avgTimeCounter',
                    type: 'stats-counter',
                    config: {
                        target: 120,
                        rawTarget: 300,
                    },
                },
            },
        };

        expect(isComponentsPayload(invalid)).toBeFalse();
    });

    it('accepts tab-group payloads with split-detail authored icons', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: TEST_DOMAIN,
            components: {
                processTabs: {
                    id: 'processTabs',
                    type: 'tab-group',
                    config: {
                        layout: 'split-detail',
                        detailMetaIconName: 'schedule',
                        detailItemIconName: 'check_circle',
                        tabs: [
                            {
                                id: 'step-1',
                                label: 'Step 1',
                                summary: 'Summary',
                                content: 'Details',
                                meta: '48 hours',
                                detailItems: ['First action'],
                            },
                        ],
                    },
                },
            },
        };

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('rejects invalid input payload shape', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            components: {
                brokenField: {
                    id: 'brokenField',
                    type: 'input',
                    config: {
                        controlType: 'text',
                    },
                },
            },
        };

        expect(isComponentsPayload(invalid)).toBeFalse();
    });

    it('rejects generic-card payloads with runtime-only fields', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            components: {
                serviceCardTemplate: {
                    id: 'serviceCardTemplate',
                    type: 'generic-card',
                    config: {
                        variant: 'feature',
                        title: 'Launch faster',
                        onCta: 'not-allowed-in-json',
                    },
                },
            },
        };

        expect(isComponentsPayload(invalid)).toBeFalse();
    });

    it('validates variables payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                a: 1,
                ui: {
                    contact: {
                        whatsappPhone: '+525522699563',
                        whatsappMessageKey: 'ui.contact.whatsappMessage',
                        faqMessageKey: 'ui.sections.faq.subtitle',
                        finalCtaMessageKey: 'hero.subtitle',
                    },
                },
            },
            computed: { b: 2 },
        };
        expect(isVariablesPayload(valid)).toBeTrue();
    });

    it('rejects invalid optional variables.ui.contact message keys', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                ui: {
                    contact: {
                        whatsappPhone: '+525522699563',
                        faqMessageKey: 123,
                    },
                },
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });

    it('rejects invalid variables.ui.contact shape', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                ui: {
                    contact: {
                        whatsappPhone: '',
                    },
                },
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });
    it('accepts valid variables.statsCounters shape', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                statsCounters: {
                    visits: {
                        target: 12450,
                        durationMs: 1600,
                        formatPrefix: '+',
                        formatMode: 'number',
                        formatSuffix: '',
                    },
                    cta: {
                        target: 370,
                        durationMs: 1800,
                        formatMode: 'percent',
                        formatSuffix: '',
                    },
                    avgTime: {
                        target: 312,
                        durationMs: 2000,
                        min: 120,
                        max: 9999,
                        formatMode: 'suffix',
                        formatSuffix: 's',
                    },
                },
            },
        };

        expect(isVariablesPayload(valid)).toBeTrue();
    });

    it('accepts valid variables.theme shape', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                theme: {
                    defaultMode: 'dark',
                    palettes: {
                        light: {
                            bgColor: '#ffffff',
                            textColor: '#111111',
                            titleColor: '#222222',
                            linkColor: '#333333',
                            accentColor: '#444444',
                            secondaryBgColor: '#f5f5f5',
                            secondaryTextColor: '#555555',
                            secondaryTitleColor: '#666666',
                            secondaryLinkColor: '#777777',
                            secondaryAccentColor: '#888888',
                            successColor: '#198754',
                            onSuccessColor: '#052e1c',
                            errorColor: '#dc3545',
                            onErrorColor: '#3b0a10',
                            warningColor: '#f59e0b',
                            onWarningColor: '#3a2400',
                            infoColor: '#0d6efd',
                            onInfoColor: '#041b44',
                        },
                        dark: {
                            bgColor: '#000000',
                            textColor: '#fefefe',
                            titleColor: '#efefef',
                            linkColor: '#dddddd',
                            accentColor: '#cccccc',
                            secondaryBgColor: '#111111',
                            secondaryTextColor: '#bbbbbb',
                            secondaryTitleColor: '#aaaaaa',
                            secondaryLinkColor: '#999999',
                            secondaryAccentColor: '#888888',
                            successColor: '#32d583',
                            onSuccessColor: '#f3fff8',
                            errorColor: '#ff6b6b',
                            onErrorColor: '#fff5f5',
                            warningColor: '#f5b942',
                            onWarningColor: '#fff7e6',
                            infoColor: '#58a6ff',
                            onInfoColor: '#f5fbff',
                        },
                    },
                    ui: {
                        modalAccentColor: 'secondaryAccentColor',
                        legalModalAccentColor: 'secondaryAccentColor',
                        demoModalAccentColor: 'accentColor',
                    },
                },
            },
        };

        expect(isVariablesPayload(valid)).toBeTrue();
    });

    it('accepts valid variables.ui.modals shape', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                socialLinks: [
                    {
                        url: 'https://example.com/facebook',
                        icon: '📘',
                        labelKey: 'footer.social.facebook.label',
                        ariaLabelKey: 'footer.social.facebook.ariaLabel',
                    },
                ],
                ui: {
                    contact: {
                        whatsappPhone: '+525522699563',
                    },
                    modals: {
                        _default: {
                            closeOnBackdrop: true,
                            showCloseButton: true,
                            panelClasses: 'modal-shell',
                            closeButtonClasses: 'modal-close-btn',
                        },
                        'terms-of-service': {
                            size: 'lg',
                            ariaLabelKey: 'footer.legal.terms.title',
                            showCloseButton: true,
                            panelDialogClasses: 'modal-panel-dialog',
                        },
                        'data-use': {
                            size: 'md',
                            ariaLabel: 'Data Use',
                            closeOnBackdrop: true,
                            accentColor: 'secondaryAccentColor',
                            ariaDescribedBy: 'data-use-description',
                        },
                    },
                    toast: {
                        hostClasses: 'toast-host',
                        itemClasses: 'toast-item',
                        hoveredItemClasses: 'toast-hovered',
                        levelSuccessClasses: 'toast-success',
                        iconSurfaceClasses: 'toast-icon-surface',
                        progressBarSurfaceClasses: 'toast-progress-surface',
                        iconErrorClasses: 'toast-icon-error-anim',
                        dismissButtonClasses: 'toast-dismiss',
                    },
                },
            },
        };

        expect(isVariablesPayload(valid)).toBeTrue();
    });

    it('rejects variables.theme with missing palette keys', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                theme: {
                    palettes: {
                        light: {
                            bgColor: '#ffffff',
                        },
                        dark: {
                            bgColor: '#000000',
                            textColor: '#fefefe',
                            titleColor: '#efefef',
                            linkColor: '#dddddd',
                            accentColor: '#cccccc',
                            secondaryBgColor: '#111111',
                            secondaryTextColor: '#bbbbbb',
                            secondaryTitleColor: '#aaaaaa',
                            secondaryLinkColor: '#999999',
                            secondaryAccentColor: '#888888',
                            successColor: '#32d583',
                            onSuccessColor: '#f3fff8',
                            errorColor: '#ff6b6b',
                            onErrorColor: '#fff5f5',
                            warningColor: '#f5b942',
                            onWarningColor: '#fff7e6',
                            infoColor: '#58a6ff',
                            onInfoColor: '#f5fbff',
                        },
                    },
                },
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });

    it('rejects variables.theme with invalid defaultMode', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                theme: {
                    defaultMode: 'sepia',
                    palettes: {
                        light: {
                            bgColor: '#ffffff',
                            textColor: '#111111',
                            titleColor: '#222222',
                            linkColor: '#333333',
                            accentColor: '#444444',
                            secondaryBgColor: '#f5f5f5',
                            secondaryTextColor: '#555555',
                            secondaryTitleColor: '#666666',
                            secondaryLinkColor: '#777777',
                            secondaryAccentColor: '#888888',
                            successColor: '#198754',
                            onSuccessColor: '#052e1c',
                            errorColor: '#dc3545',
                            onErrorColor: '#3b0a10',
                            warningColor: '#f59e0b',
                            onWarningColor: '#3a2400',
                            infoColor: '#0d6efd',
                            onInfoColor: '#041b44',
                        },
                        dark: {
                            bgColor: '#000000',
                            textColor: '#fefefe',
                            titleColor: '#efefef',
                            linkColor: '#dddddd',
                            accentColor: '#cccccc',
                            secondaryBgColor: '#111111',
                            secondaryTextColor: '#bbbbbb',
                            secondaryTitleColor: '#aaaaaa',
                            secondaryLinkColor: '#999999',
                            secondaryAccentColor: '#888888',
                            successColor: '#32d583',
                            onSuccessColor: '#f3fff8',
                            errorColor: '#ff6b6b',
                            onErrorColor: '#fff5f5',
                            warningColor: '#f5b942',
                            onWarningColor: '#fff7e6',
                            infoColor: '#58a6ff',
                            onInfoColor: '#f5fbff',
                        },
                    },
                },
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });

    it('rejects invalid variables.ui.modals shape', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                ui: {
                    modals: {
                        'terms-of-service': {
                            size: 'xl',
                        },
                    },
                },
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });

    it('rejects invalid variables.socialLinks shape', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                socialLinks: [
                    {
                        icon: '📘',
                    },
                ],
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });

    it('rejects invalid variables.statsCounters shape', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                statsCounters: {
                    visits: {
                        target: 'not-a-number',
                        durationMs: 1600,
                    },
                },
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });

    it('rejects invalid statsCounters min/max values', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                statsCounters: {
                    avgTime: {
                        target: 312,
                        min: 'bad-min',
                        max: 9999,
                    },
                },
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });

    it('rejects non-string formatPrefix in statsCounters', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                statsCounters: {
                    visits: {
                        target: 100,
                        formatPrefix: 123,
                    },
                },
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });

    it('validates angora combos payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: { btn: ['ank-p-1rem'] },
        };
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: { btn: 'ank-p-1rem' },
        };

        expect(isAngoraCombosPayload(valid)).toBeTrue();
        expect(isAngoraCombosPayload(invalid)).toBeFalse();
    });

    it('validates i18n payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            lang: 'es',
            dictionary: { hero: { title: 'Hola' } },
        };
        expect(isI18nPayload(valid)).toBeTrue();
    });

    it('validates seo payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
        };
        expect(isSeoPayload(valid)).toBeTrue();
    });

    it('validates structured data payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            entries: [],
        };
        expect(isStructuredDataPayload(valid)).toBeTrue();
    });

    it('validates analytics config payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            sectionIds: ['home'],
            scrollMilestones: [10, 20],
            events: {
                page_view: 'page_view',
            },
            categories: {
                navigation: 'navigation',
            },
            quickStatsCtaEvents: ['cta_click'],
        };
        expect(isAnalyticsConfigPayload(valid)).toBeTrue();
    });
});
