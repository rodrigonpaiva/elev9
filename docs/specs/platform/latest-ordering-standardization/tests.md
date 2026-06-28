# Tests

Future validation should cover:

- current and history return the same record ordering
- ties on the same date resolve deterministically
- replay uses the same ordering as read models
- backfilled historical records do not break current/latest behavior
