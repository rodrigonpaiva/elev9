# Flow

1. Read models are persisted once per day when possible.
2. “Current” queries first attempt to read the record for today.
3. If today’s record does not exist, the engine may fall back to the latest canonical record.
4. History reads use the same ordering rules as the current/latest read path.
5. Replay uses the stored record and the stored ordering contract, not live heuristics.
