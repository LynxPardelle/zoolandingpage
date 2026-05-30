# Roberto Rodriguez Psychology Draft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a draft-local Zoositioweb site for Roberto Rodriguez Rodriguez's online psychology consultation using the approved calm editorial design, SEO structure, public assets, and safety guardrails.

**Architecture:** Use a new draft domain folder and sibling draft repo for the provisional managed alias `roberto-rodriguez-rodriguez.zoolandingpage.com.mx`. Keep all site content, images, SEO, legal pages, and QA evidence draft-local; only update hub documentation/registry/changelog when the draft lifecycle requires it.

**Tech Stack:** Zoolandingpage draft JSON, Angora utility classes, local Angular preview, `tools/config-draft-sync.mjs`, `tools/draft-public-safety-audit.mjs`, `tools/draft-smoke-check.mjs`, public image upload API, and manual AI image generation saved under `C:\Users\lince\.codex\memories\Output\`.

---

## File Structure

Hub repo files:

- Modify: `C:\Users\lince\Documents\GitHub\zoolandingpage\docs\drafts-registry.json`
- Modify: `C:\Users\lince\Documents\GitHub\zoolandingpage\changelog\drafts\2026-05.md`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\site-config.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\components.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\variables.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\angora-combos.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\i18n\es.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\default\page-config.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\default\components.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\default\variables.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\default\angora-combos.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\default\i18n\es.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\privacidad\page-config.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\privacidad\components.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\privacidad\variables.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\privacidad\i18n\es.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\terminos\page-config.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\terminos\components.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\terminos\variables.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\terminos\i18n\es.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\not-found\page-config.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\not-found\components.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\not-found\variables.json`
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\not-found\i18n\es.json`

Sibling draft repo files:

- Create: `C:\Users\lince\Documents\GitHub\draft-roberto-rodriguez-rodriguez-zoolandingpage-com-mx\draft-repo.config.json`
- Create: `C:\Users\lince\Documents\GitHub\draft-roberto-rodriguez-rodriguez-zoolandingpage-com-mx\.gitignore`
- Create: `C:\Users\lince\Documents\GitHub\draft-roberto-rodriguez-rodriguez-zoolandingpage-com-mx\README.md`
- Create/copy: sanitized draft JSON files from the hub `drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\` tree.

Local-only assets:

- Use existing portrait: `C:\Users\lince\.codex\memories\Output\roberto-rodriguez-rodriguez-psychologytoday-profile.jpeg`
- Generated candidate folder: `C:\Users\lince\.codex\memories\Output\roberto-psychology-draft\`

---

### Task 1: Preflight And Provisional Domain Setup

**Files:**
- Read: `C:\Users\lince\Documents\GitHub\zoolandingpage\docs\superpowers\specs\2026-05-29-roberto-rodriguez-psychology-draft-design.md`
- Read: `C:\Users\lince\Documents\GitHub\zoolandingpage\docs\11-draft-lifecycle.md`
- Read: `C:\Users\lince\Documents\GitHub\zoolandingpage\docs\12-public-assets-and-file-uploads.md`
- Modify: `C:\Users\lince\Documents\GitHub\zoolandingpage\docs\drafts-registry.json`

- [ ] **Step 1: Confirm hub repo state**

Run:

```powershell
git status --short --branch
```

Expected: only intentional plan/spec commits are ahead of origin; no unrelated unstaged changes.

- [ ] **Step 2: Check registered draft repos without overwriting dirty work**

Run:

```powershell
node tools/draft-repo-preflight.mjs --pull=true
```

Expected: registered clean draft repos pull successfully; dirty repos are reported and not overwritten.

- [ ] **Step 3: Record provisional domain**

Use this fixed provisional domain for the first implementation:

```text
roberto-rodriguez-rodriguez.zoolandingpage.com.mx
```

Use this sibling repo path:

```text
C:\Users\lince\Documents\GitHub\draft-roberto-rodriguez-rodriguez-zoolandingpage-com-mx
```

- [ ] **Step 4: Confirm target paths do not already exist**

Run:

```powershell
Test-Path drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx
Test-Path ..\draft-roberto-rodriguez-rodriguez-zoolandingpage-com-mx
```

Expected: both return `False`. If either returns `True`, inspect that path and continue only if it is the intended Roberto draft workspace.

---

### Task 2: Create Draft Scaffold From A Known Healthcare-Like Template

**Files:**
- Create: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\`
- Source reference only: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\zoositioweb.com.mx\sector-consultorios\`

- [ ] **Step 1: Create draft directories**

Run:

```powershell
New-Item -ItemType Directory -Force `
  drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx, `
  drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\i18n, `
  drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\default\i18n, `
  drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\privacidad\i18n, `
  drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\terminos\i18n, `
  drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\not-found\i18n
```

Expected: every directory exists.

- [ ] **Step 2: Seed valid JSON shapes from existing draft files**

Run these copy commands, then edit the copied payloads with `apply_patch`:

```powershell
Copy-Item drafts\zoositioweb.com.mx\site-config.json drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\site-config.json
Copy-Item drafts\zoositioweb.com.mx\components.json drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\components.json
Copy-Item drafts\zoositioweb.com.mx\variables.json drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\variables.json
Copy-Item drafts\zoositioweb.com.mx\angora-combos.json drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\angora-combos.json
Copy-Item drafts\zoositioweb.com.mx\i18n\es.json drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\i18n\es.json
Copy-Item drafts\zoositioweb.com.mx\sector-consultorios\page-config.json drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\default\page-config.json
Copy-Item drafts\zoositioweb.com.mx\sector-consultorios\components.json drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\default\components.json
Copy-Item drafts\zoositioweb.com.mx\sector-consultorios\variables.json drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\default\variables.json
Copy-Item drafts\zoositioweb.com.mx\sector-consultorios\angora-combos.json drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\default\angora-combos.json
Copy-Item drafts\zoositioweb.com.mx\sector-consultorios\i18n\es.json drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\default\i18n\es.json
Copy-Item drafts\zoositioweb.com.mx\privacidad\* drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\privacidad\ -Recurse
Copy-Item drafts\zoositioweb.com.mx\terminos\* drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\terminos\ -Recurse
Copy-Item drafts\zoositioweb.com.mx\not-found\* drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\not-found\ -Recurse
```

Expected: the new draft contains JSON files with valid platform shapes before custom edits begin.

- [ ] **Step 3: Parse all scaffolded JSON files**

Run:

```powershell
Get-ChildItem drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx -Recurse -Filter *.json | ForEach-Object {
  node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); console.log('json ok', process.argv[1])" $_.FullName
}
```

Expected: every line starts with `json ok`.

- [ ] **Step 4: Commit scaffold**

Run:

```powershell
git add drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx
git commit -m "feat: scaffold roberto psychology draft"
```

Expected: one commit containing only the new draft scaffold.

---

### Task 3: Upload And Select Visual Assets

**Files:**
- Read: `C:\Users\lince\.codex\memories\Output\roberto-rodriguez-rodriguez-psychologytoday-profile.jpeg`
- Create: `C:\Users\lince\.codex\memories\Output\roberto-psychology-draft\calm-online-therapy-workspace.png`
- Modify: draft JSON files that reference final public asset URLs.

- [ ] **Step 1: Create local output folder for generated candidates**

Run:

```powershell
New-Item -ItemType Directory -Force C:\Users\lince\.codex\memories\Output\roberto-psychology-draft
```

Expected: folder exists and remains outside the repo.

- [ ] **Step 2: Generate one non-identifying supporting image candidate**

Use image generation for this prompt and save the result under `C:\Users\lince\.codex\memories\Output\roberto-psychology-draft\calm-online-therapy-workspace.png`:

```text
Editorial website image for an online psychology consultation practice in Mexico. Calm warm paper background, soft sage and mist blue accents, a tidy wooden desk with a notebook, pen, small plant, warm indirect light, and a laptop showing an abstract video-call interface with no visible people. Professional, quiet, human, clinical-study feeling, premium but approachable, no text, no logos, no certificates, no medical equipment, no patient, no crisis scene, no exaggerated stock-photo pose.
```

Expected: one generated image candidate suitable for process or emotional-bridge support.

- [ ] **Step 3: Do not generate Roberto likeness scenes until consent is explicit**

Record this implementation rule in the task notes before generating any identity-based image:

```text
Use Roberto's supplied portrait directly for verified likeness. Generate new scenes with Roberto's likeness only after explicit approval for AI-generated marketing imagery beyond the original portrait.
```

Expected: implementation continues with the verified portrait plus non-identifying generated imagery unless explicit likeness approval is available.

- [ ] **Step 4: Upload Roberto portrait through direct public asset flow**

Run:

```powershell
$portraitPath = "C:\Users\lince\.codex\memories\Output\roberto-rodriguez-rodriguez-psychologytoday-profile.jpeg"
$portraitBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($portraitPath))
$portraitBody = @{
  domain = "roberto-rodriguez-rodriguez.zoolandingpage.com.mx"
  pageId = "shared"
  assetKind = "profile-images"
  assetId = "roberto-profile-portrait"
  fileName = "roberto-profile-portrait.jpeg"
  contentType = "image/jpeg"
  maxWidth = 1000
  maxHeight = 1200
  quality = 84
  imageBase64 = $portraitBase64
} | ConvertTo-Json -Compress
$portraitUpload = Invoke-RestMethod -Method Post -Uri "https://api.zoolandingpage.com.mx/image-upload/presign" -ContentType "application/json" -Body $portraitBody
$portraitUpload | ConvertTo-Json -Depth 10
```

Expected: response includes `ok: true`, `uploadStrategy: direct`, and a `publicUrl` under `https://assets.zoolandingpage.com.mx/roberto-rodriguez-rodriguez.zoolandingpage.com.mx/shared/profile-images/roberto-profile-portrait.jpeg`.

- [ ] **Step 5: Upload selected generated support image through direct public asset flow**

Run:

```powershell
$workspacePath = "C:\Users\lince\.codex\memories\Output\roberto-psychology-draft\calm-online-therapy-workspace.png"
$workspaceBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($workspacePath))
$workspaceBody = @{
  domain = "roberto-rodriguez-rodriguez.zoolandingpage.com.mx"
  pageId = "default"
  assetKind = "section-images"
  assetId = "calm-online-therapy-workspace"
  fileName = "calm-online-therapy-workspace.png"
  contentType = "image/png"
  maxWidth = 1600
  maxHeight = 1200
  quality = 82
  imageBase64 = $workspaceBase64
} | ConvertTo-Json -Compress
$workspaceUpload = Invoke-RestMethod -Method Post -Uri "https://api.zoolandingpage.com.mx/image-upload/presign" -ContentType "application/json" -Body $workspaceBody
$workspaceUpload | ConvertTo-Json -Depth 10
```

Expected: response includes a public URL under `https://assets.zoolandingpage.com.mx/roberto-rodriguez-rodriguez.zoolandingpage.com.mx/default/section-images/calm-online-therapy-workspace.png`.

- [ ] **Step 6: Verify public assets load**

Run:

```powershell
Invoke-WebRequest -UseBasicParsing "https://assets.zoolandingpage.com.mx/roberto-rodriguez-rodriguez.zoolandingpage.com.mx/shared/profile-images/roberto-profile-portrait.jpeg" | Select-Object StatusCode,Headers
Invoke-WebRequest -UseBasicParsing "https://assets.zoolandingpage.com.mx/roberto-rodriguez-rodriguez.zoolandingpage.com.mx/default/section-images/calm-online-therapy-workspace.png" | Select-Object StatusCode,Headers
```

Expected: both return HTTP `200`.

---

### Task 4: Author Site-Level Configuration

**Files:**
- Modify: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\site-config.json`
- Modify: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\components.json`
- Modify: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\variables.json`
- Modify: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\i18n\es.json`

- [ ] **Step 1: Replace site identity and canonical host**

Edit `site-config.json` so the site identity uses:

```json
{
  "domain": "roberto-rodriguez-rodriguez.zoolandingpage.com.mx",
  "aliases": ["roberto-rodriguez-rodriguez.zoolandingpage.com.mx"],
  "site": {
    "name": "Roberto Rodriguez Rodriguez",
    "seo": {
      "canonicalOrigin": "https://roberto-rodriguez-rodriguez.zoolandingpage.com.mx",
      "defaultImage": "https://assets.zoolandingpage.com.mx/roberto-rodriguez-rodriguez.zoolandingpage.com.mx/shared/seo-images/default-og-card.jpg"
    }
  }
}
```

Preserve required existing keys that the runtime expects, and replace only the domain, alias, name, SEO, theme, navigation, and CTA values.

- [ ] **Step 2: Set palette tokens**

Use these color values in the draft theme fields available in the copied `site-config.json`:

```json
{
  "background": "#faf7ef",
  "surface": "#ffffff",
  "secondaryBackground": "#edf4f0",
  "primaryText": "#1c2d28",
  "secondaryText": "#53645b",
  "accent": "#315546",
  "secondaryAccent": "#bdd0dc",
  "mutedAccent": "#c98f84"
}
```

Expected: draft reads warm paper, sage, mist blue, ink green, and muted clay/rose without reusing prior draft palettes.

- [ ] **Step 3: Author shared navigation and footer**

Set visible navigation labels to:

```json
[
  { "label": "Inicio", "href": "/" },
  { "label": "Proceso", "href": "/#proceso" },
  { "label": "Enfoque", "href": "/#enfoque" },
  { "label": "Precios", "href": "/#precios" },
  { "label": "Preguntas", "href": "/#preguntas" }
]
```

Set legal footer links:

```json
[
  { "label": "Aviso de privacidad", "href": "/privacidad" },
  { "label": "Terminos y condiciones", "href": "/terminos" }
]
```

Expected: no authored navigation uses `draftDomain` or `draftPageId` query parameters.

- [ ] **Step 4: Commit site-level config**

Run:

```powershell
node -e "JSON.parse(require('fs').readFileSync('drafts/roberto-rodriguez-rodriguez.zoolandingpage.com.mx/site-config.json','utf8')); console.log('site-config json ok')"
git add drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\site-config.json drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\components.json drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\variables.json drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\i18n\es.json
git commit -m "feat: configure roberto psychology site shell"
```

Expected: JSON parse passes and commit contains only site-shell files.

---

### Task 5: Author The Home Page Content And Layout

**Files:**
- Modify: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\default\page-config.json`
- Modify: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\default\components.json`
- Modify: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\default\variables.json`
- Modify: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\default\i18n\es.json`

- [ ] **Step 1: Set SEO metadata**

Set the home page SEO fields to this content:

```json
{
  "title": "Terapia psicologica online en Mexico | Roberto Rodriguez",
  "description": "Acompanamiento psicologico online, confidencial y humano para adultos y adolescentes en Mexico. Agenda una cita por WhatsApp con Roberto Rodriguez Rodriguez.",
  "canonical": "https://roberto-rodriguez-rodriguez.zoolandingpage.com.mx/",
  "robots": "index,follow,max-image-preview:large"
}
```

Expected: title stays under roughly 65 characters and description stays within the 100-170 character target.

- [ ] **Step 2: Author visible section order**

Ensure the home page renders these sections in order:

```text
hero
emotional-bridge
online-process
clinical-approach
professional-profile
prices-open-faq
final-cta
```

Expected: each section is visible in the page without dropdowns, accordions, or tabs.

- [ ] **Step 3: Author approved hero copy**

Use this copy:

```text
Kicker: Terapia psicologica online en Mexico
Headline: Acompanamiento psicologico claro, confidencial y humano
Lead: Un espacio profesional para trabajar ansiedad, estres, autoestima, relaciones y procesos emocionales desde una atencion cercana, respetuosa y sin juicio.
Primary CTA: Agendar cita por WhatsApp
Secondary CTA: Conocer el enfoque
Trust chips: Psicologo clinico con cedula vigente | Psicodinamico + TCC | Adultos y adolescentes
```

Expected: hero uses the uploaded portrait URL, the generated/non-identifying supporting image only as subtle atmosphere, and no fake session imagery.

- [ ] **Step 4: Author open interior sections**

Use this section content map:

```text
Emotional bridge H2: Esta bien pedir ayuda
Emotional bridge body: Si estas viviendo ansiedad, estres, cansancio emocional, dificultades en tus relaciones, duelo o pensamientos que se repiten, la terapia puede ser un espacio para ordenar lo que pasa y empezar a trabajarlo con acompanamiento profesional.

Process H2: Como iniciar terapia online
Step 1: Agenda tu cita por WhatsApp
Step 2: Ten una primera sesion para hablar de lo que estas viviendo
Step 3: Define un plan de trabajo a tu ritmo

Approach H2: Profundidad psicodinamica + herramientas TCC
Approach body: El proceso combina comprension de patrones emocionales con herramientas practicas para observar pensamientos, decisiones, limites y formas de relacionarte.

Profile H2: Roberto Rodriguez Rodriguez
Profile body: Psicologo clinico con cedula profesional vigente. Atencion online para adultos y adolescentes desde un espacio confidencial, profesional y sin juicio.

Prices H2: Precios claros antes de agendar
Price 1: Consulta psicologica online - $300
Price 2: Especialidad/autismo - $400

Final CTA H2: Pedir ayuda es el primer paso
Final CTA body: Puedes escribir por WhatsApp para consultar disponibilidad y agendar una primera sesion online.
```

Expected: no copy promises cure, emergency support, guaranteed improvement, diagnosis, or psychiatric treatment.

- [ ] **Step 5: Author open FAQ**

Render every question and answer visible by default:

```text
Q: Como es la primera sesion?
A: La primera sesion sirve para hablar de lo que estas viviendo, aclarar dudas y definir una forma de trabajo.

Q: La terapia es confidencial?
A: La consulta se maneja como un espacio profesional, privado y respetuoso.

Q: La consulta es 100% online?
A: Si. La atencion se realiza por llamada o videollamada para personas en Mexico.

Q: Cuanto cuesta una sesion?
A: La consulta psicologica online tiene un costo de $300. La consulta de especialidad/autismo tiene un costo de $400.

Q: Atiende adolescentes?
A: El draft usa la frase adultos y adolescentes. Antes de publicar, se debe confirmar el alcance legal y de consentimiento para pacientes menores de edad.

Q: Que pasa si necesito atencion urgente?
A: Este servicio no sustituye atencion de emergencia. Si estas en riesgo inmediato, busca apoyo de emergencias o una linea local de atencion urgente.
```

Expected: FAQ is not an accordion and the emergency wording is visible.

- [ ] **Step 6: Apply low-radius visual classes**

Keep section/card radius low by using existing Angora utility classes or draft combos that produce 4-8px corners. Remove copied classes that create large rounded bubbles.

Expected class intent:

```text
container radius: 4-8px
portrait: circular or soft crop allowed
buttons: pill allowed only for primary CTA contrast
cards: near-straight low radius
```

- [ ] **Step 7: Commit home page**

Run:

```powershell
Get-ChildItem drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\default -Recurse -Filter *.json | ForEach-Object {
  node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); console.log('json ok', process.argv[1])" $_.FullName
}
git add drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\default
git commit -m "feat: author roberto psychology home page"
```

Expected: JSON parse passes and commit contains only default page files.

---

### Task 6: Author Legal And Utility Pages

**Files:**
- Modify: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\privacidad\*`
- Modify: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\terminos\*`
- Modify: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\not-found\*`

- [ ] **Step 1: Replace legal page identity**

Use `Roberto Rodriguez Rodriguez` and `roberto-rodriguez-rodriguez.zoolandingpage.com.mx` throughout copied legal pages.

Expected: no Zoositioweb sales copy remains in legal pages.

- [ ] **Step 2: Add privacy-sensitive draft warning**

Include this visible plain-language statement in the privacy page:

```text
Antes de publicar este sitio, el telefono, correo y cualquier dato de contacto deben confirmarse como informacion publica autorizada para el draft.
```

Expected: the draft does not expose private contact data before approval.

- [ ] **Step 3: Add no-emergency service boundary**

Include this visible statement in terms:

```text
Este sitio presenta servicios de consulta psicologica online. No sustituye servicios de emergencia, atencion medica urgente ni atencion psiquiatrica.
```

Expected: public safety boundary is visible before publishing.

- [ ] **Step 4: Commit legal and utility pages**

Run:

```powershell
Get-ChildItem drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\privacidad,drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\terminos,drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\not-found -Recurse -Filter *.json | ForEach-Object {
  node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); console.log('json ok', process.argv[1])" $_.FullName
}
git add drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\privacidad drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\terminos drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\not-found
git commit -m "feat: add roberto draft legal pages"
```

Expected: JSON parse passes and commit contains only legal/utility pages.

---

### Task 7: Register And Bootstrap The Sibling Draft Repo

**Files:**
- Modify: `C:\Users\lince\Documents\GitHub\zoolandingpage\docs\drafts-registry.json`
- Create: `C:\Users\lince\Documents\GitHub\draft-roberto-rodriguez-rodriguez-zoolandingpage-com-mx\`

- [ ] **Step 1: Add draft registry entry**

Append this object to `docs\drafts-registry.json` in alphabetical or existing registry order:

```json
{
  "domain": "roberto-rodriguez-rodriguez.zoolandingpage.com.mx",
  "repo": "draft-roberto-rodriguez-rodriguez-zoolandingpage-com-mx",
  "githubUrl": "https://github.com/LynxPardelle/draft-roberto-rodriguez-rodriguez-zoolandingpage-com-mx.git",
  "localPath": "../draft-roberto-rodriguez-rodriguez-zoolandingpage-com-mx"
}
```

Expected: registry remains valid JSON.

- [ ] **Step 2: Bootstrap sibling draft repo**

Run:

```powershell
npm run drafts:repo-bootstrap -- --repo=../draft-roberto-rodriguez-rodriguez-zoolandingpage-com-mx --domain=roberto-rodriguez-rodriguez.zoolandingpage.com.mx --authoring-endpoint=https://api.zoolandingpage.com.mx/config-authoring
```

Expected: sibling repo folder exists with `draft-repo.config.json`, `.gitignore`, `.github\workflows\`, and no staged local-only folders.

- [ ] **Step 3: Copy sanitized draft payload into sibling repo**

Run:

```powershell
Copy-Item drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\* ..\draft-roberto-rodriguez-rodriguez-zoolandingpage-com-mx\ -Recurse -Force
```

Expected: sibling repo contains only sanitized draft files and ignores local-only folders.

- [ ] **Step 4: Commit registry and sibling repo bootstrap**

Run in hub repo:

```powershell
node -e "JSON.parse(require('fs').readFileSync('docs/drafts-registry.json','utf8')); console.log('registry json ok')"
git add docs\drafts-registry.json
git commit -m "docs: register roberto psychology draft repo"
```

Run in sibling repo:

```powershell
Set-Location ..\draft-roberto-rodriguez-rodriguez-zoolandingpage-com-mx
git status --short --branch
git add .
git commit -m "feat: add roberto psychology draft"
Set-Location ..\zoolandingpage
```

Expected: hub and sibling repo both have commits; no local-only ignored folders are staged.

---

### Task 8: Validate Draft JSON, Packaged Payload, And Public Safety

**Files:**
- Read: all JSON under `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\`
- Read: sibling repo files under `C:\Users\lince\Documents\GitHub\draft-roberto-rodriguez-rodriguez-zoolandingpage-com-mx\`

- [ ] **Step 1: Parse every draft JSON file**

Run:

```powershell
Get-ChildItem drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx -Recurse -Filter *.json | ForEach-Object {
  node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); console.log('json ok', process.argv[1])" $_.FullName
}
```

Expected: every file prints `json ok`.

- [ ] **Step 2: Pack the local draft**

Run:

```powershell
New-Item -ItemType Directory -Force logs\drafts | Out-Null
node tools/config-draft-sync.mjs pack --domain=roberto-rodriguez-rodriguez.zoolandingpage.com.mx --output=logs/drafts/roberto-rodriguez-draft-package.json
```

Expected: command exits `0` and writes `logs\drafts\roberto-rodriguez-draft-package.json`.

- [ ] **Step 3: Scan for forbidden private values**

Run:

```powershell
rg -n "uploadUrl|X-Amz-|BEGIN .*PRIVATE|api[_-]?key|secret|token|gmail|hotmail|@|\\b55\\d{8}\\b|PsychologyToday|photos\\.psychologytoday" drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx ..\draft-roberto-rodriguez-rodriguez-zoolandingpage-com-mx
```

Expected: no raw secrets, presigned URLs, private contact values, or raw source image URLs appear. Public `assets.zoolandingpage.com.mx` URLs are allowed.

- [ ] **Step 4: Run public safety audit**

Run:

```powershell
node tools/draft-public-safety-audit.mjs --history=true --repo=../draft-roberto-rodriguez-rodriguez-zoolandingpage-com-mx
```

Expected: `blockingRepoCount: 0`. Review findings for phone/email/identity terms and confirm they are intentional public draft content before publishing.

---

### Task 9: Local Browser QA

**Files:**
- Read/render: `C:\Users\lince\Documents\GitHub\zoolandingpage\drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx\`

- [ ] **Step 1: Start local dev server**

Run:

```powershell
npm run start:logged
```

Expected: Angular dev server serves on the configured local port, normally `http://localhost:4200/`.

- [ ] **Step 2: Open home page preview**

Open:

```text
http://127.0.0.1:4200/?draftDomain=roberto-rodriguez-rodriguez.zoolandingpage.com.mx&draftPageId=default
```

Expected: page renders Roberto draft, not unresolved draft fallback.

- [ ] **Step 3: Verify desktop and mobile manually in Browser**

Check these viewport conditions:

```text
desktop: 1440x1000
mobile: 390x844
```

Expected:

- Hero is visible without overlap.
- Portrait loads from public assets URL.
- Optional generated image loads from public assets URL.
- Cards and blocks have low-radius edges.
- FAQ answers are visible without clicks.
- CTA is visible and not overflowing.
- Legal links route to `/privacidad` and `/terminos`.
- No console errors, failed public asset requests, or horizontal overflow.

- [ ] **Step 4: Run smoke check narrowed to Roberto draft**

Run:

```powershell
node tools/draft-smoke-check.mjs --domain=roberto-rodriguez-rodriguez.zoolandingpage.com.mx --local-base-url=http://127.0.0.1:4200 --output=logs/drafts/roberto-smoke.json
```

Expected: smoke report passes for home, legal pages, and 404 route.

- [ ] **Step 5: Commit QA fixes**

If QA changes draft files, run:

```powershell
git add drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx
git commit -m "fix: polish roberto draft browser qa"
```

Expected: commit contains only QA-driven draft fixes.

---

### Task 10: Record Changelog And Closeout Evidence

**Files:**
- Modify: `C:\Users\lince\Documents\GitHub\zoolandingpage\changelog\drafts\2026-05.md`
- Read: `C:\Users\lince\Documents\GitHub\zoolandingpage\docs\superpowers\specs\2026-05-29-roberto-rodriguez-psychology-draft-design.md`
- Read: `C:\Users\lince\Documents\GitHub\zoolandingpage\docs\superpowers\plans\2026-05-29-roberto-rodriguez-psychology-draft.md`

- [ ] **Step 1: Add changelog entry**

Append this entry near the end of `changelog\drafts\2026-05.md` after implementation and QA:

```markdown
- 2026-05-29 CT Roberto Rodriguez Rodriguez draft planning/implementation: created provisional managed-alias draft `roberto-rodriguez-rodriguez.zoolandingpage.com.mx` for online psychology consultation, using a calm Sentia/Vimuti-inspired editorial direction, open FAQ/content rules, low-radius cards, public asset URLs, and draft-local legal/safety guardrails. Browser QA covered desktop and mobile local preview before closeout.
```

Expected: changelog records what changed and what was verified without storing private contact data or secrets.

- [ ] **Step 2: Commit changelog**

Run:

```powershell
git add changelog\drafts\2026-05.md
git commit -m "docs: record roberto draft implementation"
```

Expected: one changelog-only commit.

- [ ] **Step 3: Final clean state check**

Run in hub repo:

```powershell
git status --short --branch
```

Run in sibling draft repo:

```powershell
Set-Location ..\draft-roberto-rodriguez-rodriguez-zoolandingpage-com-mx
git status --short --branch
Set-Location ..\zoolandingpage
```

Expected: only intentional ahead commits remain; no unstaged draft files.

---

## Self-Review

Spec coverage:

- Draft-local boundary: covered by Tasks 1, 2, 7, and 8.
- Sentia/Vimuti-inspired design without copying: covered by Tasks 4 and 5.
- Open FAQ and no hidden content: covered by Task 5.
- Low-radius card rule: covered by Task 5.
- SEO title, description, H1/H2/FAQ: covered by Task 5.
- Public assets and generated image strategy: covered by Task 3.
- Legal/privacy/no-emergency guardrails: covered by Tasks 6 and 8.
- Browser QA desktop/mobile: covered by Task 9.
- Changelog and closeout: covered by Task 10.

Placeholder scan:

- The plan uses a fixed provisional domain and exact file paths.
- The only variable runtime value is the base64 bytes read from a local image file at execution time; the request shape is explicit and the bytes must not be committed.

Type and path consistency:

- Domain: `roberto-rodriguez-rodriguez.zoolandingpage.com.mx`
- Hub draft path: `drafts\roberto-rodriguez-rodriguez.zoolandingpage.com.mx`
- Sibling repo path: `..\draft-roberto-rodriguez-rodriguez-zoolandingpage-com-mx`
- Public asset base: `https://assets.zoolandingpage.com.mx/roberto-rodriguez-rodriguez.zoolandingpage.com.mx/`
