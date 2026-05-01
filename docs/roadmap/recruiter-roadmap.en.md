# Recruiter Roadmap

## Positioning

This roadmap is written for recruiters and technical interviewers who want to understand where Elev9 Coach is today and how it is expected to evolve.

The project is currently an MVP with a working backend foundation, a shared-contract monorepo setup, and an initial mobile client.

## Short Term

- stabilize the current mobile experience beyond login and dashboard
- improve developer ergonomics around local setup and demos
- expand client-side flows for profile creation and training visibility
- keep strengthening API and use-case coverage
- refine shared UI primitives without over-abstracting

## Mid Term

- introduce a minimal web surface for landing and internal tooling
- improve end-to-end testing reliability in less restricted environments
- add richer progress and training interactions on mobile
- strengthen cross-package conventions for contracts, API access, and presentation
- improve observability and runtime diagnostics

## Long Term

- evolve toward broader coaching workflows across mobile and web
- introduce more advanced analytics and personalization surfaces
- support stronger operational tooling, monitoring, and deployment discipline
- reassess whether some modules should remain in a modular monolith or be extracted later

## Engineering Direction

The roadmap stays anchored in a few principles:

- keep the backend as the source of truth for business logic
- share contracts, clients, and simple UI only when it reduces duplication
- preserve modular boundaries while the MVP grows
- prefer incremental evolution over large rewrites

## Current Signal

For a recruiter or tech lead, the current repository demonstrates:

- architecture-first thinking
- spec-driven implementation
- clean monorepo organization
- pragmatic mobile and backend integration
- engineering restraint around MVP scope
