# Training and manual promotion — local, unpublished

## Existing data and interpretation

The actual rarities are C, UC, R, SR, SSR. C/UC already grant party attack bonuses without occupying a team slot; R+ are combat heroes with levels and duplicate awakening. Existing cap values are C=100,000 and UC=30,000 per character, not 300,000. No 300,000 constant was found in the implementation before this addition. Counts are never spent in the existing game and therefore act as cumulative acquisition counts.

The user's 10 and 50 examples are cumulative thresholds, not costs of an extra 10 then 50 cards. Cards are NOT consumed. Nine stages use thresholds 1, 10, 50, 200, 1,000, 5,000, 20,000, 100,000, 300,000. The early intervals make small summon batches meaningful; later intervals accommodate existing 100/1,000/10,000-pull options. C characters each average 1/6 of pulls and UC each about 1/10.7, so ten copies average about 60/107 pulls respectively, without guarantees. Rare heroes naturally reach later duplicate milestones more slowly; their material-based skill training is independent of acquiring huge duplicate counts. Long-run pacing remains provisional.

Reaching a threshold only enables the promotion button. Clicking commits all currently eligible stages in one operation. Owned old-save characters start at stage 1 while retaining every old count, awakening and passive bonus; they can immediately promote to earned stages. No old progress is taken away and no unsolicited migration animation runs.

## Effects and training choices

- Combat heroes: each promoted stage after the first adds 2% to base combat stats and 3 percentage points of skill potency; defender shields instead gain 1 percentage point per stage (total shield capped at 65%). The first promotion or mastery also enables the chosen focus: +8% attack or +12% HP.
- C/UC: each extra stage adds +0.5% party attack or +0.75% party HP according to focus, in addition to the original count-based bonus. They still cost no team slot. This creates a concrete use for a common defender/herbalist's durability focus against the patrol archer.
- All owned characters have two material-training ranks, costing 150 then 300 existing materials. They require patrol 1/2 cleared; combat heroes also require level 3/6. Combat skills gain 15 percentage points of potency per rank (defenders gain 6 points of shield mitigation). C/UC training adds 1.5% party attack or 2% HP per rank.
- Attack/durability focus is free and reversible after promotion/training. No new currency. Promotions, training and choices persist through ascension; ordinary levels retain their existing reset behavior.

## Presentation and persistence

Collection cards show stage, promotion availability or remaining cards. A character-led dark training dialog reuses existing art (including the existing shared portraits), with role, skill, before/after values, material sources and unlock conditions. Promotion has its own dark dialog with portrait/frame/aura, a stage jump badge and potency comparison. Stages beyond five retain the gold frame and show their numeric stage; no new illustration is claimed.

The full promotion is saved with a receipt before presentation. Reload shows a static receipt, not a new promotion. Multiple stages use one animation. Animation is CSS transform/opacity only, with no timers or completion callbacks; skip removes motion, and app/OS reduced-motion settings disable it. There is no full-screen white fade/flash. Closing a result or opening new training cannot let an old timer overwrite state because this view schedules none.

Training and ordinary level-up now clone state and save before replacing the live state, so failed storage does not consume materials. Promotion uses the existing transaction/receipt mechanism. No migration changes the save key or version.

## Rank combat scope

The prior local role-skill expansion affected ranking opponents too. To avoid imposing the patrol-specific enemy behaviors on the existing league, ranking enemies now retain published single-target attacker/healer skills and passive defender mitigation. Patrol enemies use new role skills; player heroes use their new skills/training in both modes.

Compared published HEAD, the pre-training local version, and this version using the starter trio at ranks 100/75/50/25/1 and levels 1/5/10/20/35/50. Each won 12/30 conditions. Published vs final had zero changed win/loss outcomes in that sample. This does not establish equivalent turn counts or universal balance; training is intentionally able to improve outcomes.

## Verification and limits

### Browser follow-up (2026-10-22)

The user manually started `node artifacts/recovery-server.mjs`. The normal Brave connection to `http://127.0.0.1:4193/?preview=1` succeeded. This supersedes the browser-access limitation below; the earlier timeout cause is still undetermined. The user-owned server was neither started nor stopped by this verification pass.

Used a dedicated tab and the ignored `artifacts/promotion-qa.html` fixture, which seeds only sessionStorage in preview mode. Verified desktop and 390x844 viewport: 10 cards stage 1→2, 50 cards stage 2→3, 200 cards stage 1→4, 300000 cards stage 1→9, repeated skip, reload and return to training with unchanged card counts and correct next thresholds. Verified one material upgrade and free switch to HP support. Reduced-motion promotion had `promotion-view still` and computed badge animation `none`.

Actual screenshots exposed dark text inherited from general dialog rules and a horizontally compressed training portrait. Fixed the scoped text colors and portrait dimensions/background sizing in `src/game-ui.css`, then visually rechecked desktop and mobile. Screenshots: `artifacts/training-desktop.png`, `artifacts/promotion-desktop-reload.png`, `artifacts/training-mobile.png`, `artifacts/promotion-mobile.png`.

Final verification: 63/63 tests, build (14 public files), and `git diff --check` pass. No real localStorage saves, commits, push or publication. Physical smartphones, full-frame luminance measurement, long-run pacing, and the complete garden reward/training/replay flow in the browser remain unverified (the latter is covered by synthetic integration tests). Browser viewport override was reset. No socket/process diagnostics or security changes were used.

59 tests pass, build produces 14 files, syntax and diff checks pass. New tests cover every threshold just before/at/after, huge counts, manual activation, no card consumption, batched progression, duplicate promotion rejection, old saves, failed storage, reload receipts, material gates, repeated upgrades, free focus reversal, low-rarity party effects, trained skill damage and ranking enemy scope. A mocked execution of the real promotion view checks normal/reduced/reload modes, repeated skip, no scheduled work and unchanged state. This is not a real browser/DOM integration test.

Earlier recovery, stale summon callbacks, campaign rewards and full-trio order tests remain in the suite. No real save touched, no browser connection/diagnostic retry, no server started, no push or publication. Actual layout, animation timing, click interaction, mobile width and long-run pacing are still unverified because browser access remains unresolved. Next browser pass should explicitly cover promotion-enabled cards, multi-stage promotion/skip/reload, material failure, switching focus and both battle modes.
