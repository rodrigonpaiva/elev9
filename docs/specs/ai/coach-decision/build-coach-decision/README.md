# Build Coach Decision

## Overview

Deterministically builds the daily `CoachDecision` for the authenticated user.

```txt
Bounded Context: AI
Module: ai
Use-case: build-coach-decision
Canonical name: ai.coach-decision.build
```

## Goal

Produce a single coaching decision from the current recovery, nutrition, training, and progress signals.

## MVP Scope

Included:

- deterministic priority selection
- deterministic headline and summary
- deterministic action items
- influence generation
- persisted daily upsert
- optional LLM-assisted wording only

Not included:

- chat replacement
- plan rewriting
- medical guidance
- autonomous workout scheduling

