# CI Validation Flow

## 1. CI Philosophy

The repository CI is lightweight, deterministic, and CI-only.

It exists to validate the workspace in a stable order without introducing deployment, preview, or release concerns.

---

## 2. Validation Order

The current validation flow is:

```txt
npm ci --legacy-peer-deps
→ format:check
→ lint
→ API tests
→ API build
→ shared package builds
→ mobile build
→ mobile export validation
```

The workflow is intentionally linear and avoids speculative steps.

---

## 3. Current Lint Scope

Lint currently covers only the stable shared packages:

- `packages/types`
- `packages/api-client`

This keeps the quality gate small, deterministic, and low-noise.

---

## 4. Current Limitations

The CI does not include:

- deployment
- CD
- preview environments
- Nx Cloud

These are intentionally out of scope for the current pipeline.

---

## 5. Deterministic-First CI

The pipeline avoids speculative tooling and unstable workspace targets.

It uses lockfile-first installation, the existing workspace commands, and explicit validation steps that are already supported by the repository.

`npm ci --legacy-peer-deps` is used for now because the workspace still has a known React/@types peer-dependency mismatch that has not been normalized yet.

---

## 6. Governance Alignment

This CI flow follows [Documentation Governance](./specs/GOVERNANCE.md), which defines the repository rules for spec-driven documentation, deterministic-first wording, navigation consistency, placeholders, and debug documentation boundaries.

---

## 7. Future Evolution

Possible future extensions, not currently implemented, may include:

- expanded lint coverage
- Docker validation
- deployment workflows

These are roadmap possibilities, not current CI behavior.

---

## 8. Summary

`docs/ci.md` documents the current quality-gate flow for contributors and keeps the repository CI expectations aligned with the workspace’s deterministic-first architecture.

For local Docker runtime, use `.env.docker.example` separately from the standard application environment flow. That setup stays local-first and development-oriented.
