# Latest Ordering Standardization

## Overview

This spec defines the platform-wide rule for “current” and “latest” reads across daily read models.

## Goal

Make all engines use the same ordering semantics for current reads, history reads, and replay comparisons.

## Scope

Included:

- ordering standardization for daily read models
- current/latest semantics
- migration guidance for existing engines

Not included:

- formula changes
- persistence schema changes
- backfill execution
