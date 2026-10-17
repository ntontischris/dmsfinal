This repo is public. Never write secrets (keys, tokens, passwords) or real client data into files, commits, issues, or PRs. Use made-up examples.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on ntontischris/dmsfinal, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### CI

Draft PR first, `gh pr ready` when checks and database are green, e2e runs only then. Tests must not depend on today's date. See `docs/agents/ci.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/`, plus the relevant `docs/blueprint/` chapters. See `docs/agents/domain.md`.
