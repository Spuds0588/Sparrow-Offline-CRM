# agents.md — Sparrow CRM

Notes for AI coding agents (and humans) working on this repo. Read this before changing anything.

## What this project is

Sparrow CRM is an **offline-first, single-file CRM**. The product is one
portable `.html` file that contains:

1. The application (CSS + JS, no build step, no dependencies, no CDN).
2. The user's data, embedded in `<script id="sparrow-data" type="application/json">`.

**The file is the database.** Saving = rewriting the app file with updated
JSON. Everything else (CSV import/export, File System Access API vs. blob
download) is detail around that one idea.

## Core principles (non-negotiable)

- **Privacy first** — the app must never ship, cache, or leak user data into
  the public template. See "The template/data rule" below.
- **Vanilla everything** — no frameworks, no build step, no external requests.
  The shipped file must work offline, from `file://`, forever.
- **YAGNI** — the codebase is ~1,300 lines of JS on purpose. Don't add
  abstraction, config, or features "for later". `AppState.links` was removed
  in v1.1.0 for exactly this reason.
- **The file outlives the repo** — users keep old saved copies for years.
  `init()` must tolerate old state shapes (missing keys), and shipped data
  JSON must stay forward-compatible.

## Repo layout

| Path | What it is |
| --- | --- |
| `Sparrow CRM v1.1.0.html` | **The product.** Pristine template users download. |
| `index.html` | Landing page (GitHub Pages). |
| `Versions/*.html` | Historical snapshots. Never edit; copy new ones in. |
| `Assets/` | Logo + screenshots. |
| `agents.md` / `todo.md` / `history.md` | Cross-session tracking. Update every session. |

## The template/data rule (most important gotcha)

`generateHtmlToSave()` clones the live DOM to produce the saved file. The
live DOM contains **rendered state** (contact cards, task list, settings
rows, modal content, open modals). If that rendered state is written back
into the saved file:

- The next version's template ships the author's real contacts (this
  happened in v1.0.0 — 50 real mortgage contacts were published).
- Saved files bloat to megabytes with duplicated data.

`sanitizeForSave(doc)` in the app resets every dynamic region (`#contactGrid`,
`#all-tasks-list`, `#global-task-container`, `#sections-management-container`,
`#settings-jump-links`, modal bodies, `data-contact-id`/value attributes,
`#new-contact-fields-container`) before serialization. **Any new dynamic DOM
region must be added there.** Verify with: save → reopen the saved file →
its static markup contains no contact names.

## Architecture map (all inside the product file's main `<script>`)

- `Utils` — uuid, modal show/hide, debounce, confirm dialog, field
  formatting (`formatFieldValue`), display-name fallbacks.
- `Core` — state mutations + persistence: CSV parse/import, `saveData`
  (FSA API or blob fallback), `generateHtmlToSave`, CSV export, CRUD for
  contacts/tasks/activities/relationships/fields, `deleteAllData`.
- `UI` — all rendering: notifications, welcome/app/tasks/settings screens,
  contact grid (paginated, `CONTACTS_PER_PAGE`), contact modal, settings
  page, secondary modal prefill.
- `Events` — DOM cache (`populateDomObject`), one delegated listener per
  region, modal form routing (`handleModalFormSubmit`), inline editing,
  relationship search.
- `init()` — builds default `AppState`, merges embedded JSON **or**
  localStorage cache (ghost mode decides retention), guarantees settings
  keys exist (old-file tolerance), boots screens, deep-links (`?q=`, `#id`).

State shape: `{ contacts, tasks, activities, relationships, settings:
{ fieldDefinitions, sections, customActivityTypes, ghostMode }, ui (transient,
never saved) }`. Contact = `{ sparrow_contact_id, tags[], fields{}, notes }`.
Field names are the join key between `contacts.fields` and
`settings.fieldDefinitions` / `sections[].fields` — keep the three in sync
whenever a field is created, moved, or deleted.

## Conventions

- Version string appears **once** (`APP_VERSION`) and drives the console
  prefix and welcome screen.
- All rendered values go through `escapeHTML` (or `escapeAttr` for quoted
  attributes) — field values are user input and can contain `<`, quotes.
- Event handling is delegated per container; per-modal form submits are
  registered once at init, not on every render.
- Keep `LOG_PREFIX` quiet and honest; console is a debugging aid, not UI.

## How to verify changes (no test suite exists)

1. Open the product file in a browser (or the Preview tab); watch the
   console — it must be clean on load.
2. Import a small CSV with quoted commas/newlines; check grid + detail view.
3. Edit inline, toggle a task, add a relationship; confirm the unsaved-changes
   reminder appears.
4. Save, then open the **saved** file: data loads, static markup is clean
   (no contact names), console clean.
5. Reopen after hard refresh with ghost mode on and off.

## Release process

1. Do the work; bump `APP_VERSION` and copy the file into `Versions/`.
2. Update `todo.md` (done items) and `history.md` (session entry).
3. Update download links in `index.html` + `README.md`.
4. Commit on `main`, push, tag `vX.Y.Z` and push the tag.
