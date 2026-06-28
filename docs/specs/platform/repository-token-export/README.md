# Repository Token Export Strategy

## Overview

This spec defines how modules expose repository implementations and tokens across the monolith.

## Goal

Reduce local repository registration and make cross-module dependencies explicit and stable.

## Scope

Included:

- repository token ownership
- module export strategy
- dependency direction

Not included:

- repository implementation changes
- persistence schema changes
