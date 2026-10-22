# Garden patrol — local implementation, 2026-10-21

## Existing game and scope

Before this change: 13 characters (7 combat heroes), four-unit ordered formations, levels 1–50, duplicate awakening, elemental advantage, defender damage reduction, attacker/healer skills every third turn, rank-based NPC combat and ascension. There were no authored progression stages. These systems remain in place. The uncommitted render-recovery code/tests/document were preserved.

Added one three-stage patrol inside the existing Phaser arena and HTML HUD, reached through the arena's 庭園巡回 button:

1. 庭園の門: Noel/Ash front-line encounter; first reward 240 materials and 2,000 cash.
2. 木陰の射線: Noel/Iris/Mira; enemy Iris shoots the last living ally. Formation order changes the threatened hero. First reward 360 materials and 3,500 cash.
3. 誓いの守り手: Sol/Ash/Flora; defender and healer sustain require trained damage output. First reward 600 materials and 5,000 cash.

Stages unlock sequentially. Existing training and formation screens are reused. Replays award no additional first-clear rewards (the optional objectives below can still be earned), losses consume nothing, and the rank league is unchanged. Patrol clear state survives ascension; there is no repeat first-clear reward per season. A tested starter-party path clears stage 1, trains all three units to level 4, clears stage 2, trains to level 5, then clears stage 3, without requiring a lucky summon. No new currencies, art, names for existing characters or external dependencies.

## Persistence and validation

Save version/key remain unchanged. Missing campaignCleared/campaignRuns fields in legacy saves default to zero; present fields are bounded integers. A monotonically increasing patrol run counter rejects stale/copied outcomes, and first-clear eligibility is checked against current state. The transaction saves resources, progress and result receipt before playback. Reload displays that receipt without running combat/rewards again. Presentation continues through the existing guarded scene lifecycle and render-failure fallback. Selecting a stage has no persistent effect; combat is committed on departure, so skipping presentation is not cancellation of the result.

## Verification and limits

- 46 tests pass: six new patrol tests plus the existing 40, including the unpublished render recovery and stale summon callback tests.
- Covered legacy saves, sequential unlock, starter growth loop, changed target after reordering, defeat/retry, abandoned pre-commit simulation, duplicate/copied results, interrupted playback receipt restoration and failed-save atomicity.
- Build: 14 public files; app syntax and diff whitespace checks pass.
- No real save accessed, no commit/push/deployment or external write. No server or security changes this iteration.
- Browser connection remains unresolved from prior attempts. Did not repeat denied diagnostics or change routes. New patrol HUD, narrow-screen layout, actual button mashing/cancel behavior and actual Phaser playback have NOT been visually verified. Unit tests establish model-level invariants, not DOM input behavior. Physical devices, GPU recovery and whole-frame luminance remain unverified.

Next authorized browser check: isolated preview save, arena -> patrol -> stage 1 -> train -> stage 2 (reorder last unit) -> train -> stage 3; reload during playback, skip repeatedly, return to rank league, and inspect mobile-width wrapping. Keep unpublished until this verification can be completed.

## Role skills and optional objectives follow-up

Role-based automatic combat remains automatic. Skills trigger every third turn: Noel/Sol shield each living ally against the next hit (40% reduction); Iris pierces the defender's passive reduction with a 1.8x strike; Mira heals the lowest HP-ratio ally for 1.8x ATK; Ash attacks every living enemy for 0.9x ATK; Flora heals every living ally for 0.9x ATK; Luna strikes one target for 2.2x ATK. The shield is distinct from passive defender mitigation. These skills apply to enemies too, including existing rank opponents; ranks/reward formulas are unchanged but battle outcomes can change. Skills appear in hero descriptions and battle event text, with GUARD shown on the stage. No camera flash was added.

Optional patrol objectives each award 120 materials once: stage 1 win with at least three heroes and no casualties; stage 2 win after both actual healing and actual shield mitigation; stage 3 win within 12 turns. A missed objective can be earned on a later replay. A 3-bit saved medal field defaults to zero in older saves and persists through ascension. Progress, bonus and receipt are committed together; the existing run counter rejects stale/copied outcomes. Result receipts retain a sanitized summary for reload. Results show turns, survivors, actual HP damage dealt (excluding overkill), healing and damage prevented. Enemy skill names and their cadence are shown before departure.

Validation: 51 tests pass, including all six permutations of the full starter trio completing all stages at level 15 (synthetic training, not a claim that every one/two-unit subset clears), starter growth loop without summoning, actual guard/heal/piercing effects, per-target area events, delayed optional reward after initial clear, no duplicate bonus after reload and save failure rollback. Existing skip/recovery/stale callback tests pass. Build produces 14 files; syntax and whitespace checks pass. The old level-5 route can now allocate extra objective materials differently; tests verify a working loop, not a universal optimal training plan.

No browser connection retries were attempted in this follow-up. Real frame playback, responsive HUD spacing, input mashing, and subjective balance remain unverified; unit tests do not replace them. No real save touched, no commit/push/publication. Next UI check also needs shield/area/heal animation, objective status and result-summary readability. This is a small local progression/role expansion, not a claim that long-term content or balance is complete.
