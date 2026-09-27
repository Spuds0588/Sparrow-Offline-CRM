# todo.md — Sparrow CRM

Working backlog. Move items here as they're picked up; keep `history.md` as
the session log and `agents.md` as the standing context.

## In progress

- (nothing — pick from Backlog)

## Backlog

- [ ] Export: contacts CSV should escape header injection
- [ ] Import: per-contact confirm prompts are tedious on large CSVs — batch confirm or "update all / skip all" choice
- [ ] Delete-all-data should also offer "reset settings only" vs "wipe everything"
- [ ] Landing page (`index.html`): favicon data-URI is duplicated inline — extract if it grows
- [ ] E2E smoke test in CI (Playwright: boot, import, save, assert pristine markup)
- [ ] Date-timezone display: `formatFieldValue` applies a UTC offset correction — verify across timezones

## Done

- [x] v1.2.0 — src/ multi-file layout + `tools/build.py` bundler + GitHub Actions release workflow; sort options; import type detection; mobile-responsive CSS; fixes: notes placeholder over-escaped, save-reminder cleared by modal close (data-loss risk), confirm-modal text leaked into saved files, favicon dedupe (4 links on one line)
- [x] v1.1.0 — privacy fix (baked-in render data stripped), RFC-4180 CSV parser, escaping/XSS hardening, import fixes, duplicate-listener fix, agents/todo/history docs

## Done

- [x] v1.1.0 — privacy fix (baked-in render data stripped from the shipped template; `sanitizeForSave` prevents recurrence), RFC-4180 CSV parser, escaping/XSS hardening, import tag/metadata fixes, duplicate-listener fix, `AppState.links` removed, `APP_VERSION` single-sourced, agents.md/todo.md/history.md added — see `history.md`
