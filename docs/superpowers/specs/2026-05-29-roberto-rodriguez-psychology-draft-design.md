# Roberto Rodriguez Rodriguez Psychology Draft Design Spec

Last updated: 2026-05-29 23:42 Central Time

## Status

Approved design direction from companion flow:

- Homepage architecture: approved.
- Hero direction: visual style from option B, copy hierarchy from option A.
- Interior page rhythm: approved.
- Component rules: approved with stricter, near-straight cards and open content.

This document is a design/spec handoff only. It does not authorize app-level changes.

## Scope

Create a new draft for Roberto Rodriguez Rodriguez under the Zoolandingpage draft workflow, as a Zoositioweb website product draft for online psychological consultation.

The work must stay draft-local. Platform capabilities that are not already available must be documented as future work, not implemented inside the app.

## Sources Used

Client/project sources:

- Google Drive folder `RobertoRodriguezRodriguez`, including the requirement and product/service idea docs.
- Public profile supplied by the user: https://www.psychologytoday.com/mx/psicologos/roberto-rodriguez-rodriguez-ciudad-de-mexico-df/1311560
- Public portrait supplied by the user and downloaded locally for future asset upload.

Design and content references:

- Sentia: https://www.sentia.com.mx/
- Vimuti: https://www.vimuti.com.mx/
- Sentio Psicologia: https://www.sentiopsicologia.com/

SEO references:

- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google people-first content guidance: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google FAQ structured data guidance: https://developers.google.com/search/docs/appearance/structured-data/faqpage

These references are inspiration and research inputs only. Do not copy their copy, layout, claims, testimonials, prices, contact details, or visual identity.

## Non Goals

- No app/runtime/platform changes for this draft pass.
- No Pexels or Pixabay API integration in this draft pass.
- No new font-family switching unless it is already supported by draft-local config.
- No hidden FAQ accordions, dropdowns, or tabs for important content.
- No unsupported medical, crisis, cure, outcome, diagnosis, or guarantee claims.
- No raw phone, email, private notes, credentials, signed URLs, API keys, or private customer data in committed docs or public draft config.

## Content Positioning

Primary offer:

- Online psychological therapy/consultation in Mexico.
- Professional, confidential, respectful, human, and non-judgmental.
- For adults and adolescents, using conservative wording until legal/guardian-consent boundaries are confirmed.

Core phrases to include:

- "Esta bien pedir ayuda."
- "Pedir ayuda es el primer paso."
- "Psicologo clinico con cedula profesional vigente."

Therapeutic framing:

- Psychodynamic + cognitive behavioral therapy.
- Explain in plain language: understand emotional patterns and work with practical tools.
- Avoid overclaiming efficacy or outcomes.

Primary CTA:

- "Agendar cita por WhatsApp."

Pricing:

- Consultation: `$300`.
- Specialty/autism: `$400`.
- Present pricing as information, not pressure.

## Visual Direction

The approved direction combines:

- Vimuti-style calm, soft, atmospheric first impression.
- Sentia-style clarity, trust, direct CTA, and professional service structure.

The draft should feel like a quiet clinical study: warm, calm, clear, open, and trustworthy. It must not feel like a SaaS landing page, a legal/corporate site, a sales-heavy funnel, or a generic therapist directory.

Suggested palette:

- Warm paper base.
- Soft sage.
- Mist blue.
- Deep ink green.
- Muted clay or rose accent.

Avoid repeating existing Zoolanding draft palettes:

- No Zoosite tech/WhatsApp-green emphasis.
- No Sulanding gold/sales palette.
- No Pamela terracotta personal-brand style.
- No Astralex legal navy/gold feel.

## Component Rules

Cards and content blocks:

- Use low radius, roughly 4-8px.
- Avoid large rounded "bubble" cards.
- Prefer sober editorial blocks and open bands.

Content visibility:

- FAQ answers must be visible by default.
- Process, pricing, approach, trust points, and legal disclaimers must not be hidden behind accordions, tabs, or dropdowns.
- The page should feel open and readable without requiring interaction.

Allowed softer shapes:

- Roberto's portrait may stay circular or softly cropped.
- Buttons may be slightly rounded if needed for CTA contrast, but should not make the page feel bubbly.

## Homepage Architecture

1. Hero
   - Kicker or H1 should include the main SEO term: "Terapia psicologica online en Mexico".
   - Approved headline direction: "Acompanamiento psicologico claro, confidencial y humano".
   - Include Roberto's portrait, CTA, and trust chips.
   - Trust chips: cedula vigente, online in Mexico, psychodynamic + TCC, adults and adolescents.

2. Emotional Bridge
   - Use "Esta bien pedir ayuda".
   - Name likely pains: anxiety, stress, self-esteem, relationships, grief, emotional fatigue, boundaries, dependency, recurring thoughts.
   - Keep the language calm and non-diagnostic.

3. Online Therapy Process
   - Three visible steps:
     - Schedule by WhatsApp.
     - First session.
     - Personalized work plan.
   - Keep all steps open and scannable.

4. Clinical Approach
   - Explain psychodynamic + TCC in plain language.
   - Show areas Roberto can accompany without creating medical guarantees.
   - Use open cards or rows with low radius.

5. Professional Profile
   - Roberto's bio and portrait.
   - Include "Psicologo clinico con cedula profesional vigente".
   - Keep biography brief, warm, and evidence-aware.

6. Prices and FAQ
   - Show prices openly.
   - FAQ should be visible, not collapsed.
   - Useful questions:
     - Como es la primera sesion?
     - La terapia es confidencial?
     - La consulta es 100% online?
     - Cuanto cuesta una sesion?
     - Atiende adolescentes?
     - Que pasa si necesito atencion urgente?

7. Final CTA
   - Use "Pedir ayuda es el primer paso".
   - Repeat WhatsApp CTA with low-pressure copy.
   - Add legal/privacy checklist before public release.

## SEO Requirements

Primary keyword target:

- `Terapia psicologica online en Mexico`

Secondary topic clusters:

- Psicologo clinico online.
- Terapia para ansiedad y estres.
- Terapia para autoestima y relaciones.
- Terapia online confidencial.
- Primera sesion psicologica online.

Draft-local SEO targets:

- Meta title and description should be specific, human, and not keyword-stuffed.
- H1 should be unique and aligned with the primary keyword.
- H2s should map to service, process, approach, profile, prices, and FAQ.
- Image alt text should describe the image plainly.
- FAQ content must be visible in the HTML/page content.
- FAQ structured data can be used only if the existing draft system supports it without app changes.
- Open Graph image should use a public assets URL.

## Assets

Roberto portrait:

- Downloaded source image is available locally at `C:\Users\lince\.codex\memories\Output\roberto-rodriguez-rodriguez-psychologytoday-profile.jpeg`.
- Before the draft uses it, upload it to the Zoolandingpage public assets bucket and store only the final public URL in draft config.

Decorative images:

- Can be used only if sourced/licensed safely and uploaded through the existing public asset flow.
- Pexels/Pixabay provider API sourcing is future platform work, already documented separately.
- Do not store provider API keys, private URLs, signed URLs, or raw provider responses in draft files.

## Legal, Privacy, And Safety

Before public release, verify:

- Phone and email are explicitly approved for public display.
- Privacy notice and terms pages exist and are linked.
- Any adolescent wording is legally acceptable for the service scope.
- If needed, include a clear non-emergency statement and crisis redirection wording.
- The draft does not imply medical emergency support, guaranteed improvement, diagnosis, cure, or psychiatric treatment.

## Implementation Boundary

Allowed in this phase:

- Draft-local config/content/component changes.
- Draft-local notes, findings, and spec files.
- Public asset upload and draft config public URL references.

Not allowed in this phase:

- App source changes.
- Platform font picker implementation.
- Provider API integrations.
- Shared runtime behavior changes.

If a desired capability requires app work, create a handoff note with problem, desired behavior, constraints, security boundaries, acceptance criteria, and affected future workflows.

## Acceptance Criteria

- The draft uses the approved hero hybrid: calm atmospheric visual treatment plus clear professional copy.
- Cards and blocks use near-straight low-radius edges.
- No dropdowns, accordions, or tabs hide important draft content.
- FAQ content is visible by default.
- SEO basics are present: title, description, H1, H2 structure, alt text, public OG/social image.
- No private contact data is introduced without explicit public-use confirmation.
- No secrets, API keys, signed URLs, or private Drive details are committed.
- Public images use `https://assets.zoolandingpage.com.mx/...` URLs.
- Desktop and mobile browser QA pass without overlap, broken images, missing CTA, or unreadable text.
