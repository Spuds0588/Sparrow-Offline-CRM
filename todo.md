# todo.md — Sparrow CRM

Working backlog. Move items here as they're picked up; keep `history.md` as
the session log and `agents.md` as the standing context.

Backlog items referencing `F-xx` map to the PRD (`Sparrow_Offline_CRM/
PRD_and_Implimentation_guide.txt`, v1.2). PRD audit done 2026-09-27 — see
`history.md` for the full already-shipped vs missing breakdown.

## PRD status snapshot (2026-09-27)

**Shipped:** F-01..F-10, F-17..F-23 (import, smart updates, tagging, saving
paths, exports, gallery+search+sort, detail view, inline editing, field
customization, deep links, URL search, contextual actions, ghost mode,
delete confirmations, on-the-fly fields, relationships).

**Missing / partial:** F-11 (signature parsing — not built), F-12 (tasks lack
`description`/`isImportant`), F-13 (task view has no filter or bulk edit),
F-14 (task templating — not built), F-15 (custom activity types have no
management UI), F-16 (links & documents — not built; `links[]` was removed as
dead code in v1.1.0), F-06 (PRD asks for one flat CSV; we ship three per-type
CSVs), F-07 (tags render but there's no tag *filter*).

**Accepted divergence from the PRD data model:** `settings.fields[]` with
numeric `order` became `settings.fieldDefinitions{}` + ordered `sections[]`
(more powerful, already shipped). Task objects will gain `description` /
`isImportant` with the F-12 work; `links[]` stays absent until F-16 is
reconsidered.

## Next up — v1.3.0 (small, high-value, closes visible gaps)

- [ ] **F-15** Custom activity types UI: add/remove types in Settings
      (currently the list is rendered but uneditable — a visible dead end)
- [ ] **F-12** Task model completion: add optional `description` (and
      `isImportant`) to tasks; description box in the add-task modal;
      render in task lists
- [ ] **F-13 (partial)** Task view filter: To-Do / Overdue / Completed chips
      over the existing sort; skip bulk-edit for now (YAGNI — see rationale
      in history)
- [ ] **F-07 (partial)** Tag filter: click a tag on a card to filter the
      gallery by it (complements search; no new UI chrome)

## Later — v1.4.x (moderate size, strong audience pull)

- [ ] **F-11** Signature parsing: paste an email signature into the
      new-contact flow; regex-extract name/email/phone/company and prefill
      the form for review (pure client-side, per PRD §Step 5)
- [ ] **F-06** "Export everything" single flat CSV alongside the existing
      per-type exports (contacts joined with tasks/activities/relationships)
- [ ] **F-13 (remainder)** Task bulk-edit — only if task lists in practice
      grow past what per-item toggling serves

## Deliberately deferred (YAGNI — revisit only on user demand)

- [ ] **F-14** Task templating (`{{First Name}}` placeholders, bulk task
      creation): power-feature for large books of business; the target
      audience (freelancers, small shops) hasn't hit the wall it solves.
      Blocked on real usage signals, and on F-12's task model landing first.
- [ ] **F-16** Links & documents: URL-type fields already cover web links;
      local file paths can't be validated offline and break the
      copy-one-file-anywhere promise. Reintroduce `links[]` only if users
      ask for attachment-style reference tracking.

## General backlog

- [ ] E2E smoke test in CI (Playwright: boot, import, save, assert pristine markup)
- [ ] Date-timezone display: `formatFieldValue` applies a UTC offset correction — verify across timezones
- [ ] Landing page (`index.html`): favicon data-URI is duplicated inline — extract if it grows
- [ ] Import: per-contact confirm prompts are tedious on large CSVs — batch confirm or "update all / skip all" choice
- [ ] Export: contacts CSV should escape header injection

## Done

- [x] v1.2.0 — src/ multi-file layout + `tools/build.py` bundler + GitHub Actions release workflow; sort options; import type detection; mobile-responsive CSS; fixes: notes placeholder over-escaped, save-reminder cleared by modal close (data-loss risk), confirm-modal text leaked into saved files, favicon dedupe (4 links on one line)
- [x] v1.1.0 — privacy fix (baked-in render data stripped), RFC-4180 CSV parser, escaping/XSS hardening, import fixes, duplicate-listener fix, agents/todo/history docs
