# Pull Request Guidelines

## 1. Pull Request Philosophy

Pull requests should be small, focused, and easy to review.

The repository works best when PRs stay spec-driven, deterministic-first, and architecture-aware:

- one logical change per PR
- behavior changes documented alongside the implementation
- architectural changes kept visible through ADRs
- docs changes kept explicit and lightweight

Avoid mixing formatting, docs, feature work, and refactors in the same PR unless the scope is truly inseparable.

---

## 2. Branch Naming

Use short, readable branch names that describe the unit of work:

- `feat/<short-name>`
- `fix/<short-name>`
- `docs/<short-name>`
- `ci/<short-name>`
- `chore/<short-name>`

Examples:

- `feat/coach-chat-memory`
- `fix/dashboard-nutrition-provider`
- `docs/ai-debug-spec`
- `ci/add-format-check`
- `chore/docker-runtime`

---

## 3. Commit Style

Prefer conventional commits:

- `feat(scope): ...`
- `fix(scope): ...`
- `docs(scope): ...`
- `ci(scope): ...`
- `chore(scope): ...`
- `style(scope): ...`
- `test(scope): ...`
- `refactor(scope): ...`

Keep commit messages aligned with the actual change. Do not use a feature commit type for a docs-only or style-only change.

---

## 4. PR Size

Prefer one logical change per PR.

Keep formatting-only PRs separate from functional PRs when possible. The same applies to docs-only PRs and architecture changes.

This makes review faster and keeps regressions easier to isolate.

---

## 5. Validation Expectations

Reviewers should be able to see which checks were run locally.

The expected CI flow is documented in [docs/ci.md](./ci.md):

- `npm run format:check`
- `npm run lint`
- `npm exec nx test api`
- `npm exec nx build api`
- `npm exec nx build types`
- `npm exec nx build api-client`
- `npm exec nx build mobile`
- `npm exec nx export mobile`

For Docker-related changes, validate the relevant local runtime commands as well:

- `docker compose config`
- `docker compose build api`
- `docker compose up -d`

Documentation-only PRs do not need every build if the change does not affect code, but they should still validate links and markdown and state that clearly in the PR description.

---

## 6. Specs and ADRs

Use the repository documentation model consistently:

- specs describe behavior, contracts, workflows, rules, and tests
- ADRs describe architectural decisions and the reason behind them

Rules of thumb:

- if behavior changes, update the relevant spec
- if architecture changes, update or add an ADR
- if only implementation details changed, an ADR may not be needed

Useful entry points:

- [System Specs](./specs/README.md)
- [AI Module Specs](./specs/ai/README.md)
- [ADR Index](./adr/README.md)
- [Documentation Governance](./specs/GOVERNANCE.md)

---

## 7. Public API Changes

If a public API request or response changes, update all relevant surfaces together:

- specs
- `packages/types`
- `packages/api-client`
- tests

If the change is not backward compatible, say so explicitly in the PR.

---

## 8. AI and Debug Surfaces

Debug endpoints must stay internal, sanitized, and inspection-only unless they are explicitly redesigned.

Do not expose:

- raw prompts
- raw `UserHealthContext`
- auth/session data
- OpenAI payloads

If a debug surface changes, update the spec and note the security boundary in the PR.

---

## 9. Docker and Runtime Changes

Docker changes should stay local-first unless the repository explicitly moves into deployment work later.

Validate Docker changes with:

- `docker compose config`
- `docker compose build api`
- `docker compose up -d`

If the Docker runtime changes, mention whether `.env.docker.example` or the compose file changed.

---

## 10. Documentation-Only PRs

Docs-only PRs should remain narrow.

They should:

- update the relevant spec, ADR, or README
- validate markdown and links
- avoid mixing in unrelated code changes
- state clearly that no functional workflow changed

---

## 11. Formatting-Only PRs

Formatting-only PRs should be isolated.

Do not combine them with feature work, contract changes, or architecture changes.

This keeps code review focused and makes the resulting diff easier to trust.

---

## 12. Review Checklist

Reviewers should ask:

- Is the PR focused?
- Are contracts and specs updated?
- Are tests aligned with the change?
- Is the change deterministic-first?
- Are debug and security boundaries preserved?
- Are future capabilities clearly marked as not implemented?

The PR template in [`.github/pull_request_template.md`](../.github/pull_request_template.md) follows this process.
