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

    it('validates variables payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                a: 1,
                contact: {
                    whatsappPhone: '+525522699563',
                },
            },
            computed: { b: 2 },
        };
        expect(isVariablesPayload(valid)).toBeTrue();
    });

    it('rejects invalid variables.contact shape', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                contact: {
                    whatsappPhone: '',
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
                ui: {
                    mobileMenuAriaLabel: 'Open navigation',
                    brandTextFallback: 'Zoo Landing',
                    modals: {
                        'terms-of-service': {
                            size: 'lg',
                            ariaLabelKey: 'footer.legal.terms.title',
                            showCloseButton: true,
                        },
                        'data-use': {
                            size: 'md',
                            ariaLabel: 'Data Use',
                            closeOnBackdrop: true,
                            accentColor: 'secondaryAccentColor',
                        },
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
        };
        expect(isAnalyticsConfigPayload(valid)).toBeTrue();
    });
});
