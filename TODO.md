# Ashfall — TODO

Kept accurate enough that a fresh session can resume mid-milestone. Update before stopping, every time.

## Status
- Current milestone: **6 — Save system**
- Last completed: Milestone 5 (Region 1, Eskel, Hanged Pilgrim, boss souls, spell bar).

## Milestone 6 checklist
- [ ] `src/engine/save.ts`: serialize (Decimals → strings), versioned schema, migration chain, checksum
- [ ] Autosave every 10s + visibilitychange + beforeunload; rolling backup slot; recovery on bad load
- [ ] Export/import base64 with checksum and clear corruption error
- [ ] Hard delete with typed confirmation
- [ ] Offline progress: closed-form from `savedAt`, capped (12h base), "while you were away" summary UI
- [ ] Tests: round-trip every schema version, migration chain, offline cap, corrupted import

## Deferred / known gaps
- Level-up UI, weapon panel, zone/tier navigation UI (Milestone 4/5)
- `scripts/smoke.ts` is a throwaway; delete once the sim exists
- Enemy sprites are dark on dark; polish pass (M12)
