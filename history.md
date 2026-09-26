# history.md — Sparrow CRM

Session log, newest first. One entry per working session: what changed and
why, in enough detail that the next session doesn't have to re-learn it.

---

## Session — 2026-09-26 · v1.1.0 (YAGNI refactor + privacy fix)

**Context.** Repo is the public home of a single-file offline CRM. The
shipped release file `Sparrow CRM v1.0.0.html` was byte-identical to
`Versions/sparrow_offline_crm(v24.018).html` — a file that had been *saved
from a live session*. Because `generateHtmlToSave()` serializes the live
DOM, every rendered artifact of that session was baked into the template:

- ~4,200 lines of static HTML: 50 real contact cards (names, APRs, ARIVE
  loan IDs), 3 tasks, 2 relationships, a fully rendered contact-detail
  modal, filled `newContactModal`, a live relationship-target UUID, and the
  complete settings page (field rows + jump links for "Primary Details",
  "Additional Details", "import 2").
- Embedded data JSON: `contacts: []` (harmless) but `settings` carried the
  author's field definitions and `ghostMode: true`.

**Privacy fix.** Rebuilt the template from the app skeleton + empty data:
`Sparrow CRM v1.1.0.html`. All leaked PII removed from the shipped file.
(The old v1.0.0 remains in git history and in `Versions/` as a record;
public exposure of those contacts is historical and unfixable from here.)

**Root-cause fix.** `generateHtmlToSave()` now calls `sanitizeForSave(doc)`
which resets all dynamic regions before serialization, so future saves
always produce a pristine file: contact grid, task view, settings
management, jump links, every modal body (except the confirm modal's
skeleton), `data-contact-id`/`data-field-name`/`data-original-value`
attributes, relationship-target value, new-contact fields container, and
welcome/app/task/settings screen visibility back to a clean boot state.

**Bugs fixed along the way.**
- XSS/HTML injection: `escapeHTML`/`escapeAttr` added and used for all
  interpolated user values (card fields, tags, notes preview, tasks,
  activities, settings rows, modal editors, copy buttons' data attributes).
- CSV parser: now handles quoted fields containing commas *and* newlines,
  and quoted headers — previously any quoted comma or embedded newline
  corrupted the row (and the header split stripped quotes per-cell, so
  `sparrow_contact_id` in quoted headers never matched).
- Import: no longer writes `sparrow_contact_id` / `tags` columns into
  contact `fields`; import-tag `prompt()` can be cancelled (previously
  null fell through to 'New Import' only via `||` on the empty string —
  now a cancel is a cancel, with a notice).
- Save reminder: all "discard" paths (close/cancel/back-drop/Escape) clear
  `AppState.ui.unsavedChanges` — previously the reminder stayed lit after
  discarding.
- Duplicate tasks/activities/fields/relationships: secondary-modal submit
  handlers were re-bound with `{once:true}` on every contact-modal render, so a
  modal opened and closed without submitting stacked another listener and the
  next submit fired twice (two identical tasks). Handlers are now bound exactly
  once at init; the per-render contact-modal listeners use a replaceListener
  pattern instead of stacking.
- Single source of truth for the version (`APP_VERSION` const) — the console
  prefix derives from it, and it is surfaced to users as a chip in the contact
  modal footer.
- YAGNI: removed unused `AppState.links` (dead since the relationships
  rewrite); `handleModalFormSubmit` no longer re-binds per render.

**Verification.** Live preview: clean console on boot; CSV import exercising
quoted commas, embedded newlines, escaped quotes and `tags` columns; XSS
payload (`<img onerror>`) rendered inert through the real inline-edit path;
save via stubbed File System Access picker produced a file whose static markup
contains zero user data (grid/tasks/settings/modals reset, one favicon,
welcome screen active) while the embedded JSON round-trips; a saved-file
equivalent booted independently showed both contacts, merged tags and intact
multiline notes; the duplicate-submit regression test (open task modal,
abandon it twice, submit once) now creates exactly one task.

**Tooling.** `tools/build_release.py` scaffolds a release file from a previous
one by stripping render artifacts — it was used once to produce the v1.1.0
markup skeleton; the JS refactor was applied directly afterwards with
`str_replace` edits (do not re-run the script expecting to preserve them).

**Process.** Added `agents.md` (standing context + gotchas for agents),
`todo.md` (backlog), `history.md` (this file). Released as v1.1.0: bumped
download links in `README.md`/`index.html`, copied snapshot to
`Versions/sparrow_offline_crm(v32).html`, tagged `v1.1.0`.

**Known remnants.** The `?q=` deep link handling duplicates the search
listener's URL sync (harmless); contact grid sorts only by import order
(backlog); CSV export still quotes values but not header injection.
