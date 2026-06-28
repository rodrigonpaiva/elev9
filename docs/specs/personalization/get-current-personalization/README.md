# Get Current Personalization

## Overview

Returns the latest persisted `PersonalizationSnapshot` for the authenticated user.

```txt
Bounded Context: personalization
Module: personalization
Use-case: get-current-personalization
Canonical name: personalization.personalization.current.get
```

## Goal

Expose the canonical personalization read model without recalculating it.
