# AI Authoring Checklist (Configuration Only)

Use this checklist when asking an AI assistant to generate a new landing page configuration.

## Hard rules (must follow)

- Only author configuration objects (`TGenericComponent` entries).
- No inline functions inside `config.*`.
- Dynamic values MUST use `valueInstructions` with allowlisted resolver IDs.
- Conditions MUST use the `condition` DSL with allowlisted handler IDs.
- Repeated components should use `loopConfig` (object model) instead of hardcoded `Array.from(...)` IDs.
- Dynamic accordion items should use `config.itemsSource` (`i18n` or `var`) instead of inline `items: () => ...` lambdas.
- Reuse existing generic component types only.
- Use existing class tokens / Angora design system conventions.
- Put global palette data in `variables.theme.palettes.light` and `variables.theme.palettes.dark`.
- Keep modal accent defaults in `variables.theme.ui` when a draft needs them to differ from the default brand behavior.
- Put reusable visual class bundles in `angora-combos.json` instead of hardcoding repeated appearance strings in app code.
- Footer and footer legal modal content must be API-owned (no local fallback assumptions).
- Do not author hardcoded footer/legal text in app source when generating payload instructions.

## Naming / structure

- Use stable IDs with clear prefixes by section: `hero*`, `features*`, `services*`, `faq*`, `footer*`.
- One root container per section.
- Containers should list children by ID in `config.components`.

## Dynamic text

- For translated strings: use `i18n` / `i18nParams`.
  - Example: `set:config.text,i18n,hero.title`
- For language toggles (2 strings): use `langPick` only when API cannot provide key-based text.
  - Preferred approach: `set:config.label,i18n,<key>`
- For i18n arrays with index: use `i18nGetIndex`.
- For footer social links from variables, prefer `labelKey` and `ariaLabelKey` in payload entries.

## Events

- Put all interaction wiring in `eventInstructions`.
- Prefer semicolon-separated composed instructions.

## Loops

- Use `loopConfig` on containers that must generate child components from payload data.
- Current supported sources: `var`, `i18n`, `repeat`.
- Example:

```ts
{
  id: 'featuresSectionGrid',
  type: 'container',
  loopConfig: { source: 'i18n', path: 'features', templateId: 'featuresCardTemplate', idPrefix: 'featuresCard' },
  config: { tag: 'div', classes: 'gridCol2', components: [] }
}
```

## Conditions

- Use the condition DSL (no inline lambdas).
- Prefer `all:` unless you need `any:` or `not:`.
- Allowed handler IDs: env, i18n, footerConfig, footerSocialLinks, navigation, modalRefId, host, hostEq, hostNeq, hostIncludes, hostGt, hostGte, hostLt, hostLte, hostStartsWith, hostEndsWith, hostRegex, hostLenEq, hostLenGt, hostLenGte, hostLenLt, hostLenLte, var, varEq, varNeq, varGt, varGte, varLt, varLte, varIncludes, varLenEq, varLenGt, varLenGte, varLenLt, varLenLte, true, false, always, never, exists, empty, eq, neq, gt, lt, gte, lte, type.

## Validation steps (developer)

- Render locally with the wrapper orchestrator.
- Ensure there are no missing IDs.
- Ensure `valueInstructions` only uses allowlisted IDs.
- Ensure no config contains function values.
- Verify `variables.theme` includes complete `light` and `dark` palettes when the draft owns branding.
- Verify footer/legal modal sections can render from API payload only.
- Verify local fallback dictionaries are not required for footer/legal behavior.

## Footer and legal modal API-only checklist

- `page-config.rootIds` includes `siteFooter` only when footer should render.
- Footer structure is provided in `components` payload (`siteFooter`, `siteFooterContent`, legal/social/copyright blocks).
- `variables.footerConfig` exists and follows the expected boolean/text contract.
- `variables.footerSocialLinks[]` entries include `url`, `icon`, and key-based labels (`labelKey`, `ariaLabelKey`).
- i18n includes required legal keys:
  - `footer.legal.title`
  - `footer.legal.terms.link`, `footer.legal.terms.title`, `footer.legal.terms.intro`, `footer.legal.terms.sections`
  - `footer.legal.data.link`, `footer.legal.data.title`, `footer.legal.data.intro`, `footer.legal.data.points`, `footer.legal.data.consentNote`
  - `footer.actions.close`
  - `footer.legal.terms.icon`, `footer.legal.data.icon`

## Prompt template for an AI assistant

Copy/paste and fill in:

---

You are generating a landing page configuration for Zoolandingpage.

Constraints:

- Output only `TGenericComponent` configs.
- No inline functions in config.
- Use `valueInstructions` for any dynamic values.
- Allowed resolver IDs: i18n, i18nParams, i18nGetIndex, literal, concat, coalesce, upper, lower, language, langPick, theme, themePick, env, envOr, var, varOr.
- Use existing generic components only.

Deliverable:

- A list (or map) of components with stable IDs.
- Provide a root ID list for the page.

Landing page content:

- Language: es + en
- Sections: Hero, Benefits, Process, Services, FAQ, Final CTA, Footer
- CTAs: WhatsApp + secondary scroll

---
