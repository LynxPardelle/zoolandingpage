# Private inline image rendering without forced change detection

The private Journal editor could retain its transparent image placeholder after a successful upload and save. Reloading the editor displayed the saved image correctly.

The rich text configuration uses runtime signal thunks. Updating those values reran the component effect, but its plain `quillModel` property did not notify the OnPush template when the private preview arrived. Existing component tests replaced the configuration input and explicitly ran change detection, masking this runtime path.

The model now uses a backing signal while preserving its existing getter/setter interface. The template reads that signal through the getter, so an accepted private preview schedules rendering. Private Blob allowlists, dirty text protection, upload authorization and stored asset references are unchanged.

Regression coverage exercises stable configuration thunks, automatic change detection, the upload read-only transition, the interim asset placeholder and its replacement by a registered private Blob preview. Additional coverage retains typed text and an existing image through the preview transition.

The correction requires a new frontend artifact before it can affect TEST. Local validation is not deployment evidence; the existing active artifact and TEST acceptance results remain separately recorded.
