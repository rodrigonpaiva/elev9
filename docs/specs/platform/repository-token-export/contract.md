# Contract

## Current Problem

Some modules register repository implementations locally because their tokens are not exported upstream.

## Target Architecture

- repository tokens should be exported from the module that owns the contract
- consuming modules should depend on contracts, not implementation details
- repository implementations should remain in infrastructure layers

## Affected Areas

- Recovery
- Adaptive Training
- Goals
- AI
