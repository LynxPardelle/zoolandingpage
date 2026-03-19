# Example: Landing Page Config (Data-First)

This is an _illustrative_ example showing the intended shape for API storage.

It is written in a JSON-ish style, but references existing component types.

## Root list (page-config payload)

```json
{
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
      "eventInstructions": "trackCTAClick:event.meta_title,secondary,hero;navigationToSection:features-section",
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
      "type": "feature-card",
      "config": {
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

This project now treats footer and legal modal content as API-only. Do not rely on local fallback dictionaries.

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
    "footerConfig": {
      "showLegalLinks": true,
      "showSocialLinks": true,
      "showCopyright": true,
      "copyrightText": "© 2026 Zoo Landing Page. All rights reserved."
    },
    "footerSocialLinks": [
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
```

Use `variables.theme.palettes` for global semantic colors only. Keep reusable class bundles in `angora-combos.json`, section/component layout in `components.json`, and text/icon copy in `i18n`.

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
      "condition": "all:footerConfig,showSocialLinks; all:footerSocialLinks,exists",
      "loopConfig": {
        "source": "var",
        "path": "footerSocialLinks",
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
- Temporary compatibility is available during rollout: `labelEs` / `labelEn` / `label`.
- After rollout stabilization, remove compatibility fields and keep key-only payloads.

## Example: Variable-driven interactive process

Interactive process content is now controlled by `variables.processSection` and resolved through
`valueInstructions` + i18n keys.

### Variables payload fragment

```json
{
  "variables": {
    "processSection": {
      "titleKey": "processSection.title",
      "sidebarTitleKey": "processSection.sidebarTitle",
      "detailedDescriptionLabelKey": "processSection.detailedDescriptionLabel",
      "deliverablesLabelKey": "processSection.deliverablesLabel",
      "steps": [
        {
          "step": 1,
          "icon": "assignment",
          "titleKey": "process.0.title",
          "descriptionKey": "process.0.description",
          "detailedDescriptionKey": "process.0.detailedDescription",
          "durationKey": "process.0.duration",
          "deliverablesKey": "process.0.deliverables"
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
      "type": "container",
      "condition": "all:host,hasValidInteractiveProcessConfig",
      "config": {
        "id": "process-section",
        "tag": "div",
        "components": ["interactiveProcess"]
      }
    },
    "interactiveProcess": {
      "id": "interactiveProcess",
      "type": "interactive-process",
      "valueInstructions": "set:config.process,var,processSection.steps; set:config.sectionTitleKey,varOr,processSection.titleKey,landing.processSection.title; set:config.sectionSidebarTitleKey,varOr,processSection.sidebarTitleKey,landing.processSection.sidebarTitle; set:config.sectionDetailedDescriptionLabelKey,varOr,processSection.detailedDescriptionLabelKey,landing.processSection.detailedDescriptionLabel; set:config.sectionDeliverablesLabelKey,varOr,processSection.deliverablesLabelKey,landing.processSection.deliverablesLabel",
      "config": {
        "process": [],
        "sectionTitleKey": "landing.processSection.title",
        "sectionSidebarTitleKey": "landing.processSection.sidebarTitle",
        "sectionDetailedDescriptionLabelKey": "landing.processSection.detailedDescriptionLabel",
        "sectionDeliverablesLabelKey": "landing.processSection.deliverablesLabel"
      }
    }
  }
}
```

Notes:

- If `variables.processSection.steps` is missing or invalid, the section stays hidden.
- Keep step content in i18n and pass only keys from variables.
- `deliverablesKey` should point to an i18n string array.
