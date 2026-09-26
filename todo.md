# todo.md — Sparrow CRM

Working backlog. Move items here as they're picked up; keep `history.md` as
the session log and `agents.md` as the standing context.

## In progress

- (nothing — pick from Backlog)

## Backlog

- [ ] Export: contacts CSV should escape header injection; add a test-coverage story (no tests exist today)
- [ ] Import: probe the first row to auto-detect `number`/`email`/`date` field types instead of defaulting everything to `text`
- [ ] Import: per-contact confirm prompts are tedious on large CSVs — batch confirm or "update all / skip all" choice
- [ ] Sort options for the contact grid (currently only search + import order)
- [ ] Delete-all-data should also offer "reset settings only" vs "wipe everything"
- [ ] Landing page (`index.html`): favicon data-URI is duplicated inline — extract if it grows
- [ ] Consider a tiny smoke-test harness (headless open file, assert console clean) runnable before releases

## Done

- [x] v1.1.0 — privacy fix (baked-in render data stripped from the shipped template; `sanitizeForSave` prevents recurrence), RFC-4180 CSV parser, escaping/XSS hardening, import tag/metadata fixes, duplicate-listener fix, `AppState.links` removed, `APP_VERSION` single-sourced, agents.md/todo.md/history.md added — see `history.md`
