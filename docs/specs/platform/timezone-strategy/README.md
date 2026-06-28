# Timezone Strategy

## Overview

This spec defines the platform policy for daily partitioning and day boundaries.

## Goal

Keep all daily engines aligned on a single timezone strategy until the platform is ready to migrate.

## Scope

Included:

- daily boundary policy
- migration considerations
- replay/backfill implications

Not included:

- timezone-aware implementation
- per-user timezone resolution
- date storage schema changes
