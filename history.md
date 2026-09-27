# history.md — Sparrow CRM

Session log, newest first. One entry per working session: what changed and
why, in enough detail that the next session doesn't have to re-learn it.

---

## Session — 2026-09-27 (3) · PRD audit + roadmap (docs only, no code)

**Input.** The original PRD & implementation guide (v1.2, dated 2023-10-26)
was provided out-of-band at `Sparrow_Offline_CRM/
PRD_and_Implimentation_guide.txt` (not in the repo). The product has pivoted
from it in places; this session audited PRD-vs-app and re-sequenced the
backlog. No code changed.

**Audit result (verified in `src/`, not assumed).** Most of the PRD already
ships: F-01..F-10 and F-17..F-23 are implemented — including several things
the guide calls "steps" (smart updates, on-the-fly fields, relationships,
deep linking, ghost mode, confirmations). The real gaps:

- **F-15** custom activity types: the settings list renders but there is no
  UI to add/remove types — a visible dead end.
- **F-12** tasks lack the PRD's `description` and `isImportant` fields.
- **F-13** the centralized task view has no filter and no bulk edit.
- **F-11** signature parsing was never built.
- **F-14** task templating was never built.
- **F-16** links & documents was never built; `links[]` was actually removed
  as dead code in v1.1.0 (dead since the relationships rewrite).
- **F-06** divergence: PRD wants one flat CSV; we ship three per-type CSVs.
- **F-07** partial: tags render on cards but there is no tag *filter*.

**Accepted data-model divergence (documented, intentional).** The PRD's
`settings.fields[]` (with numeric `order`) became `fieldDefinitions{}` +
ordered `sections[]` during the v24.x iterations — strictly more capable
(grouping, visibility, per-section ordering) and already load-bearing. We
will not migrate back; tasks will gain the missing PRD fields instead.

**Prioritization (YAGNI × audience).** The audience is freelancers and small
shops downgrading from expensive CRMs (PRD §2). Ranked by (a) closes a
currently-visible gap, (b) small diff, (c) daily-use value:

1. **v1.3.0** = F-15 + F-12 + F-13 filter-only + F-07 tag-filter. All four
   are small, touch existing screens, and remove a dead end (F-15) plus
   complete the task model (F-12/F-13) that two later features depend on.
2. **v1.4.x** = F-11 signature parsing (genuinely differentiated, pure
   client-side regex per the guide) + F-06 flat "export everything" CSV.
3. **Deferred** = F-14 templating and F-16 links. F-14 is a bulk power
   feature whose wall small users haven't hit yet and which needs F-12's
   task model first. F-16 fights the single-file promise: URL fields already
   cover web links, local paths can't be validated offline. Both stay in
   the doc with explicit revisit conditions rather than deleted, so the
   next session knows they were considered, not forgotten.

`todo.md` now carries the full PRD status snapshot, the three-tier roadmap,
and the divergence notes.

---

## Session — 2026-09-26 (2) · v1.2.0 (restructure, CI, headed test pass, features)

**Release.** Published the missing GitHub Release for tag `v1.1.0` (the tag
existed from the previous session but no Release object; README/index download
links pointed at it). Asset: `Sparrow.CRM.v1.1.0.html`.

**No PRD found.** Searched the repo (glob for PRD/roadmap/spec, all markdown)
— none exists. Worked from `todo.md` backlog instead.

**Restructure.** Repo now builds the product from `src/`:
`head.html` / `styles.css` / `shell.html` / `data.json` / `utils.js` / `core.js`
/ `ui.js` / `events.js` / `main.js`. `tools/build.py` bundles them into
`Sparrow CRM v<APP_VERSION>.html`, replacing the `<style>` block, collapsing
duplicate favicon links, and refusing (`--check`) to build with user data in
`data.json`. `tools/extract_src.py` is the one-time migration from the release
file (kept for reference; do NOT re-run it against a rebuilt file — the
release file is an output now). Two build gotchas hit and fixed:
- The favicon `<link>` sat between `</style>` and `<body>` — head capture now
  spans everything before `<body>`.
- Anchoring the JS split on `APP_VERSION` dropped the IIFE opener
  `(function() { "use strict";` just above it, leaving `main.js`'s closer
  unbalanced. Anchor on the IIFE line instead.
- The released v1.1.0 file carried **4 favicon links concatenated on one
  line** (a `grep -c` line-count had masked this for two sessions).
  `build.py` now collapses runs of favicon links to the first.

**CI.** `.github/workflows/ci.yml`: on push/PR builds with `--check`,
`node --check`s the bundled JS, uploads the artifact; on `v*` tags it attaches
the bundle to the GitHub Release automatically.

**Headed test pass (real browser, screenshots at each step).** Found and
fixed 4 issues:
1. Notes placeholder showed literal `<i>No notes yet...</i>` — the empty-state
   markup itself was being escaped. Only user content is escaped now.
2. **Data-loss risk:** closing *any* modal cleared the unsaved-changes flag,
   so committing a task/activity then closing the modal un-marked real
   unsaved data (reminder vanished, footer save disabled). `hideModal` no
   longer touches the flag; comment documents why.
3. No responsive CSS at all — modal 2-column grid + action buttons overflowed
   at 390px with horizontal scroll. Added a 768px breakpoint (stacked modal,
   wrapped buttons, single-column grid, single-column settings rows).
4. The confirm modal's runtime text (`Are you sure you want to permanently
del   ete Amelia?` — a real contact name) leaked into saved files;
   `generateHtmlToSave` resets it to pristine defaults now.

**Features (from todo.md backlog).**
- Contact-grid sort: header dropdown (import order / A→Z / Z→A / recently
  added). Mode lives in transient `AppState.ui.sortMode`, never saved.
- Import type detection: `Core.detectFieldType` probes up to 20 non-empty
  values per new column; email/phone/url/currency/number/date/boolean only
  when every sampled value matches. Verified: detected email, phone,
  currency, url, boolean on a mixed CSV.
- Search+sort now share one header row (flex wrap).

**Release.** v1.2.0: `APP_VERSION` bump rebuilds to `Sparrow CRM v1.2.0.html`,
snapshot copied to `Versions/sparrow_offline_crm(v33).html`, README/index
links updated, tag `v1.2.0` pushed (CI attaches the bundle).

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
