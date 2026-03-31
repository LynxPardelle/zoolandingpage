# Example: Landing Page Config (Data-First)

This is an _illustrative_ example showing the intended shape for API storage.

It is written in a JSON-ish style, but references existing component types.

## Root list (page-config payload)

```json
{
  "seo": {
    "title": "Example | Landing Page",
    "description": "An example page-level SEO payload.",
    "canonical": "https://example.com/"
  },
  "structuredData": {
    "entries": []
  },
  "analytics": {
    "sectionIds": ["hero", "features", "contact"],
    "scrollMilestones": [25, 50, 75, 100]
  },
  "rootIds": ["skipToMainLink", "siteHeader", "landingPage", "siteFooter"],
  "modalRootIds": ["modalAnalyticsConsentRoot", "modalDemoRoot", "modalTermsRoot", "modalDataUseRoot"]
}
```

## Components (map form)

A map is the easiest API payload, since `id` is the natural key:

```json
{
  "components": {
    "heroContainer": {
      "id": "heroContainer",
      "type": "container",
      "config": {
        "tag": "section",
        "classes": "ank-px-1rem ank-py-3rem",
        "components": ["heroTitle", "heroSubtitle", "heroCtas"]
      }
    },

    "heroTitle": {
      "id": "heroTitle",
      "type": "text",
      "valueInstructions": "set:config.text,i18n,hero.title",
      "config": {
        "tag": "h1",
        "text": "",
        "classes": "ank-fontSize-2rem ank-fontWeight-700"
      }
    },

    "heroSubtitle": {
      "id": "heroSubtitle",
      "type": "text",
      "valueInstructions": "set:config.text,i18n,hero.subtitle",
      "config": {
        "tag": "p",
        "text": "",
        "classes": "ank-opacity-0_9"
      }
    },

    "heroCtas": {
      "id": "heroCtas",
      "type": "container",
      "config": {
        "tag": "div",
        "classes": "ank-display-flex ank-gap-1rem",
        "components": ["primaryCTA", "secondaryCTA"]
      }
    },

    "primaryCTA": {
      "id": "primaryCTA",
      "type": "button",
      "meta_title": "hero_primary_click",
      "eventInstructions": "openWhatsApp:event.meta_title,hero_primary,hero",
      "valueInstructions": "set:config.label,i18n,hero.primary.label",
      "config": {
        "label": "",
        "classes": "btnBaseVALSVL1_25remVL0_75remVL btnTypePrimaryVALSVLsecondaryLinkColorVLtextColorVL"
      }
    },

    "secondaryCTA": {
      "id": "secondaryCTA",
      "type": "button",
      "meta_title": "hero_secondary_click",
      "eventInstructions": "trackEvent:event.meta_title,cta,hero:secondary,location,hero;navigationToSection:features-section",
      "valueInstructions": "set:config.label,i18n,hero.secondary.label",
      "config": {
        "label": "",
        "classes": "btnBaseVALSVL1_25remVL0_75remVL btnTypeOutlineVALSVLsecondaryLinkColorVLtextColorVL"
      }
    }
  }
}
```

## Notes

- The exact `config` keys depend on the specific generic component type.
- In API mode, any field that needs runtime values should be populated via `valueInstructions` and left as a placeholder in `config`.

## Example: loopConfig-driven section

```json
{
  "components": {
    "featuresSectionGrid": {
      "id": "featuresSectionGrid",
      "type": "container",
      "loopConfig": {
        "source": "i18n",
        "path": "features",
        "templateId": "featuresCardTemplate",
        "idPrefix": "featuresCard"
      },
      "config": {
        "tag": "div",
        "classes": "gridCol2",
        "components": []
      }
    },
    "featuresCardTemplate": {
      "id": "featuresCardTemplate",
      "type": "generic-card",
      "config": {
        "variant": "feature",
        "icon": "",
        "title": "",
        "description": "",
        "benefits": []
      }
    }
  }
}
```

## Example: API-owned footer contract

This project now treats footer, legal modal, accessibility, and debug-panel content as draft/API-only. Do not rely on local fallback dictionaries.

### Variables payload

```json
{
  "variables": {
    "theme": {
      "defaultMode": "dark",
      "palettes": {
        "light": {
          "bgColor": "#f0ede7",
          "textColor": "#2e2d2d",
          "titleColor": "#292929",
          "linkColor": "#ffe819",
          "accentColor": "#c1a42f",
          "secondaryBgColor": "#e5d2bf",
          "secondaryTextColor": "#19363f",
          "secondaryTitleColor": "#163038",
          "secondaryLinkColor": "#c33361",
          "secondaryAccentColor": "#199f96"
        },
        "dark": {
          "bgColor": "#1a1a1a",
          "textColor": "#ffffff",
          "titleColor": "#d8dadb",
          "linkColor": "#66b3ff",
          "accentColor": "#225783",
          "secondaryBgColor": "#2d2d2d",
          "secondaryTextColor": "#d9dcdf",
          "secondaryTitleColor": "#6cc3e6",
          "secondaryLinkColor": "#30a464",
          "secondaryAccentColor": "#20673c"
        }
      },
      "ui": {
        "modalAccentColor": "secondaryAccentColor",
        "legalModalAccentColor": "secondaryAccentColor",
        "demoModalAccentColor": "accentColor"
      }
    },
    "ui": {
      "contact": {
        "whatsappPhone": "+525522699563",
        "whatsappMessageKey": "ui.contact.whatsappMessage",
        "faqMessageKey": "ui.sections.faq.subtitle",
        "finalCtaMessageKey": "hero.subtitle"
      },
      "footer": {
        "socialLinks": [
          {
            "id": "facebook",
            "url": "https://facebook.com/zoolanding",
            "target": "_blank",
            "rel": "noopener noreferrer",
            "icon": "📘",
            "labelKey": "footer.social.facebook.label",
            "ariaLabelKey": "footer.social.facebook.ariaLabel"
          },
          {
            "id": "instagram",
            "url": "https://instagram.com/zoolanding",
            "target": "_blank",
            "rel": "noopener noreferrer",
            "icon": "📸",
            "labelKey": "footer.social.instagram.label",
            "ariaLabelKey": "footer.social.instagram.ariaLabel"
          }
        ]
      }
    }
  }
}
```

Use `site-config.json.site.theme.palettes` for global semantic colors only. Keep reusable class bundles in `angora-combos.json`, section/component layout in `components.json`, and text/icon copy in `i18n`.

### Components payload (footer + legal modal icon examples)

```json
{
  "components": {
    "siteFooter": {
      "id": "siteFooter",
      "type": "container",
      "config": {
        "id": "contact-section",
        "tag": "footer",
        "classes": "ank-width-100per ank-bg-secondaryBgColor ank-borderTop-1px ank-borderColor-secondaryBgColor ank-marginTop-auto ank-display-flex ank-justifyContent-center ank-paddingInline-16px ank-paddingBlock-24px",
        "components": ["siteFooterContent"]
      }
    },
    "siteFooterContent": {
      "id": "siteFooterContent",
      "type": "container",
      "config": {
        "tag": "div",
        "classes": "ank-display-flex ank-flexDirection-column ank-alignItems-center ank-justifyContent-center ank-gap-16px ank-width-100per ank-maxWidth-1200px ank-flexDirectionMd-row ank-justifyContentMd-spaceBetween ank-alignItemsMd-center",
        "components": ["footerLegalSection", "footerSocialSection", "footerCopyrightSection"]
      }
    },
    "footerSocialSection": {
      "id": "footerSocialSection",
      "type": "container",
      "condition": "all:varLenGt,socialLinks,0",
      "loopConfig": {
        "source": "var",
        "path": "socialLinks",
        "templateId": "footerSocialLinkTemplate",
        "idPrefix": "footerSocialLink"
      },
      "config": {
        "tag": "div",
        "classes": "ank-display-flex ank-gap-16px ank-alignItems-center",
        "components": []
      }
    },
    "footerSocialLinkTemplate": {
      "id": "footerSocialLinkTemplate",
      "type": "link",
      "config": {
        "id": "footerSocialLinkTemplate",
        "href": "#",
        "text": "",
        "ariaLabel": "",
        "target": "_blank",
        "rel": "noopener noreferrer",
        "classes": "ank-color-secondaryTextColor ank-textDecoration-none ank-fontSize-lg ank-padding-8px ank-borderRadius-md ank-transition-colors"
      }
    },
    "modalTermsHeaderIconGlyph": {
      "id": "modalTermsHeaderIconGlyph",
      "type": "text",
      "valueInstructions": "set:config.text,i18n,footer.legal.terms.icon",
      "config": { "tag": "span", "text": "" }
    },
    "modalDataHeaderIconGlyph": {
      "id": "modalDataHeaderIconGlyph",
      "type": "text",
      "valueInstructions": "set:config.text,i18n,footer.legal.data.icon",
      "config": { "tag": "span", "text": "" }
    }
  }
}
```

### i18n payload fragment (required footer/legal keys)

```json
{
  "dictionary": {
    "footer": {
      "actions": { "close": "Close" },
      "legal": {
        "title": "Legal",
        "terms": {
          "icon": "⚖️",
          "link": "Terms of Service",
          "title": "Terms of Service",
          "intro": "These Terms of Service govern your use...",
          "sections": [{ "title": "Purpose", "text": "..." }]
        },
        "data": {
          "icon": "🔒",
          "link": "Data Privacy",
          "title": "Data Privacy",
          "intro": "Analytics are enabled by default...",
          "points": ["..."],
          "consentNote": "..."
        }
      },
      "social": {
        "facebook": {
          "label": "Facebook",
          "ariaLabel": "Visit our Facebook page"
        },
        "instagram": {
          "label": "Instagram",
          "ariaLabel": "Visit our Instagram profile"
        }
      }
    }
  }
}
```

## Notes for migration

- Preferred social label resolution: `labelKey` / `ariaLabelKey`.
- If a payload entry must carry text directly, use `label` as a plain string or locale map.
- Avoid legacy compatibility fields such as `labelEs` and `labelEn`.

## Example: Variable-driven interactive process

Interactive process content is now controlled by `variables.processSection.steps` using the canonical
accordion/tab item fields, and rendered through `itemsSource` / `tabsSource` plus i18n keys.

### Variables payload fragment

```json
{
  "variables": {
    "processSection": {
      "steps": [
        {
          "step": 1,
          "icon": "assignment",
          "titleKey": "process.0.title",
          "summaryKey": "process.0.summary",
          "contentKey": "process.0.content",
          "metaKey": "process.0.meta",
          "detailItemsKey": "process.0.detailItems"
        }
      ]
    }
  }
}
```

### Component payload fragment

```json
{
  "components": {
    "interactiveProcessSection": {
      "id": "interactiveProcessSection",
      "type": "interaction-scope",
      "condition": "all:varLenGt,processSection.steps,0",
      "config": {
        "scopeId": "interactiveProcessSection",
        "id": "process-section",
        "tag": "section",
        "initialValues": {
          "activeStepId": "1"
        },
        "components": ["interactiveProcessTitle", "interactiveProcessMobileAccordion", "interactiveProcessDesktopTabs"]
      }
    },
    "interactiveProcessTitle": {
      "id": "interactiveProcessTitle",
      "type": "text",
      "valueInstructions": "set:config.text,i18n,processSection.title",
      "config": {
        "tag": "h2",
        "text": ""
      }
    },
    "interactiveProcessMobileAccordion": {
      "id": "interactiveProcessMobileAccordion",
      "type": "accordion",
      "eventInstructions": "setScopeValue:activeStepId,event.eventData.activeId;trackNumericSuffixEvent:process_step_change,process,event.eventData.activeId",
      "valueInstructions": "set:config.activeId,scope,values.activeStepId; set:config.detailContentLabel,i18n,processSection.detailedDescriptionLabel; set:config.detailItemsLabel,i18n,processSection.deliverablesLabel",
      "config": {
        "itemsSource": { "source": "var", "path": "processSection.steps" },
        "renderMode": "detail",
        "mode": "single",
        "allowToggle": true,
        "detailMetaIconName": "schedule",
        "detailItemIconName": "check_circle"
      }
    },
    "interactiveProcessDesktopTabs": {
      "id": "interactiveProcessDesktopTabs",
      "type": "tab-group",
      "eventInstructions": "setScopeValue:activeStepId,event.eventData.id;trackNumericSuffixEvent:process_step_change,process,event.eventData.id",
      "valueInstructions": "set:config.activeId,scope,values.activeStepId; set:config.listHeaderLabel,i18n,processSection.sidebarTitle; set:config.detailContentLabel,i18n,processSection.detailedDescriptionLabel; set:config.detailItemsLabel,i18n,processSection.deliverablesLabel",
      "config": {
        "tabsSource": { "source": "var", "path": "processSection.steps" },
        "layout": "split-detail",
        "orientation": "vertical",
        "detailMetaIconName": "schedule",
        "detailItemIconName": "check_circle"
      }
    }
  }
}
```

Notes:

- The process section is now authored as shared composition, not a dedicated `interactive-process` runtime type.
- Keep step content in i18n and pass only canonical item keys plus stable item IDs from variables.
- `variables.processSection.steps[*].id` should be stable so accordion, tab-group, and analytics stay synchronized.
- `detailItemsKey` should point to an i18n string array.
- Since the runtime is draft-only, the `processSection.*` keys shown above must exist in the active draft dictionary.
