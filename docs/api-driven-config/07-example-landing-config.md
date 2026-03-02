# Example: Landing Page Config (Data-First)

This is an _illustrative_ example showing the intended shape for API storage.

It is written in a JSON-ish style, but references existing component types.

## Root list

```json
{
  "rootIds": ["heroContainer", "featuresContainer", "finalCtaContainer"]
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

## Example: variables-driven footer social links

```json
{
  "variables": {
    "footerSocialLinks": [
      {
        "id": "footerSocialFacebook",
        "name": "Facebook",
        "url": "https://facebook.com/zoolanding",
        "icon": "📘",
        "ariaLabel": "Visit our Facebook page"
      }
    ]
  }
}
```
