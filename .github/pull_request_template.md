## Summary

## Type of change

- [ ] feat
- [ ] fix
- [ ] refactor
- [ ] docs
- [ ] test
- [ ] ci
- [ ] chore
- [ ] style

## Scope

- [ ] api
- [ ] mobile
- [ ] web
- [ ] packages/types
- [ ] packages/api-client
- [ ] packages/ui
- [ ] docs/specs
- [ ] docs/adr
- [ ] docker/runtime
- [ ] ci

## Validation

- [ ] npm run format:check
- [ ] npm run lint
- [ ] npm exec nx test api
- [ ] npm exec nx build api
- [ ] npm exec nx build types
- [ ] npm exec nx build api-client
- [ ] npm exec nx build mobile
- [ ] npm exec nx export mobile
- [ ] docker compose config
- [ ] docker compose build api
- [ ] docker compose up -d

Only check commands that were actually executed.

## Documentation impact

- [ ] No documentation impact
- [ ] Spec updated
- [ ] ADR updated/created
- [ ] README updated
- [ ] docs/ci.md updated
- [ ] docs/specs/GOVERNANCE.md updated

Related specs/ADRs:

## API/contract impact

- [ ] No public API impact
- [ ] Public API changed
- [ ] packages/types updated
- [ ] packages/api-client updated
- [ ] Backward compatible
- [ ] Breaking change

If public API changed, explain the contract change and update specs.

## Docker/runtime impact

- [ ] No Docker/runtime impact
- [ ] Dockerfile changed
- [ ] docker-compose.yml changed
- [ ] .env.docker.example changed
- [ ] Runtime env changed
- [ ] Local Docker startup validated

## Security and data exposure

- [ ] No sensitive data added
- [ ] No secrets committed
- [ ] No raw auth/session data exposed
- [ ] No raw prompts exposed
- [ ] No raw UserHealthContext exposed
- [ ] Debug endpoint remains internal/inspection-only

## Checklist

- [ ] PR is small and focused
- [ ] Code follows deterministic-first architecture
- [ ] Public contracts are updated if needed
- [ ] Specs are updated if behavior changed
- [ ] ADR is updated if architecture changed
- [ ] CI-relevant commands were run locally when applicable
- [ ] No future capability is documented as already implemented
