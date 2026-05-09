Date: 2026-05-09 (Central Time)
Scope: Cross-workstream TODO list for Zoolandingpage project follow-up.
Status: Active
Applies To: Zoolandingpage project sessions, active workstreams, future handoffs
Source Of Truth:

- [Project Session Memorandum](./project-session-memorandum.md)
- `Codex.md`
- User-approved follow-up items from active sessions.
  Confidence: High
  Last Reviewed: 2026-05-09 (Central Time)

# Project TODOs

Use this file as the project-level TODO list for follow-ups that span sessions or may matter to future Zoolandingpage work. Add new sections by workstream and keep items actionable. Move completed items into the matching `Completed` section instead of deleting them when the history is useful.

Do not store secrets, tokens, raw environment variable values, signed URLs, private customer data, or other sensitive data here.

## TIDAL Runtime API Workstream

Reference:

- Memorandum entry: [2026-05-09 CT - TIDAL Runtime API Workstream](./project-session-memorandum.md#2026-05-09-ct---tidal-runtime-api-workstream)
- Public support thread: `https://github.com/orgs/tidal-music/discussions/318`

Open:

- [ ] Monitor GitHub Discussion #318 for a response from TIDAL.
- [ ] If TIDAL confirms an additional catalog/API access flag or review path is required, update the TIDAL Developer Portal app and record the non-secret decision in the memorandum.
- [ ] Add or publish a privacy-policy URL for `music.lynxpardelle.com`, then set it in the TIDAL Developer Portal app settings.
- [ ] After TIDAL responds or access changes, retest:
  - `GET https://openapi.tidal.com/v2/albums/59727856?countryCode=US`
  - `GET https://openapi.tidal.com/v2/artists/10212180/relationships/albums?countryCode=MX&include=albums`
  - `/api-proxy/read` with `sourceId: "tidalArtistAlbums"` and `countryCode: "MX"`
- [ ] If the real TIDAL response shape differs from the current draft assumptions, update:
  - `drafts/music.lynxpardelle.com/server/integrations.json`
  - `drafts/music.lynxpardelle.com/site-config.json`
  - `drafts/music.lynxpardelle.com/default/variables.json`
  - relevant docs under `docs/api-driven-config/`
- [ ] Republish `music.lynxpardelle.com` after any TIDAL policy or mapper change.
- [ ] Run desktop and mobile browser QA on `https://music.lynxpardelle.com/?debugWorkspace=false` after live TIDAL data works.
- [ ] Verify album links, cover art, fallback behavior, console logs, failed requests, broken images, overflow, and hidden skip-link behavior.
- [ ] Consider adding a small public debug draft/page only if it can show API proxy status without exposing secrets or upstream credential details.

Completed:

- [x] Create AWS Secrets Manager placeholder `zoolanding/api/music/tidal`.
- [x] Add repeatable credential placeholder workflow in `zoolanding-api-proxy`.
- [x] Add TIDAL OAuth client-credentials support to `zoolanding-api-proxy`.
- [x] Add runtime API album-card rendering support to `zoolandingpage`.
- [x] Publish fallback TIDAL album section in `music.lynxpardelle.com`.
- [x] Create TIDAL GitHub Discussion #318 with sanitized diagnostic details.

## Future Workstreams

Open:

- [ ] Add new workstream sections here as soon as a follow-up becomes durable beyond the current session.

Completed:

- [ ] None yet.
