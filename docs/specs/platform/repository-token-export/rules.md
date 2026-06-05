# Rules

- module ownership stays with the bounded context that owns the data
- repository tokens should not be duplicated across unrelated modules
- application services should depend on contracts, not concrete Mongoose classes
- cross-module wiring should remain explicit

