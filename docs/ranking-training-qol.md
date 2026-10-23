# Ranking and training QoL — local candidate

No economy, rewards, save schema, manual promotion or purchase confirmation changes.

- Ranking result offers one explicit launch to the next opponent after victory, or the same opponent after defeat. Rank1 victory offers no nonexistent next rank. A receipt/serial/rank check rejects stale controls, and the existing atomic battle-start transaction prevents duplicate starts or consuming the receipt on failed writes. No automatic battle chain.
- Normal level controls use shared levelInfo, levelUp and levelTransaction in collection and training detail. Cost remains current level×30. A stale button's level token cannot spend twice. Detail refresh keeps the user in training, restores scroll, and restores focus to the level button or close button when leveling becomes unavailable.
- Both locations show level/next level, required and owned materials, shortage, or maximum level before input. Disabled text uses the existing opaque palette. Effective measured foreground rgb(67,90,110), background rgb(225,234,240), opacity1: contrast5.89:1. Labels wrap and remain13px, including the collection's older mobile small-text rule.
- QA found a preexisting320px overflow in the three-person collection formation (party-card right edge350px). At widths≤360px only, formation becomes one column; PC and390 retain their layout.

## Verification

108 tests pass,28-file build and whitespace checks pass. New tests cover next/retry/final rank, stale result, pending battle/reload, failed start/retry, level insufficient/exact/max/unowned, repeated stale clicks, failed writes and restored resources.

Fresh headless Chrome preview1280/390/320: defeat→retry with failed write then repeated old-button clicks starts only one battle; detail level failed write leaves resources intact, retry advances once, next paid level reaches exact zero materials and disables control with shortage; reload retains levels/materials/serial. All three widths had no page errors. Separate six width/rank combinations confirm95→90 victory with a single launch and one reward, rank1 no next button, and maximum-level controls disabled in both locations. Keyboard focus and narrow wrapped text inspected.

Measured path savings: ranking result close→launch2 clicks becomes1 explicit launch (skip optional unchanged). Training detail close→collection-level2 clicks becomes1 level action without leaving the detail. Optional promotion return path and deliberate manual confirmations remain.

QA scripts/results/screenshots in ignored artifacts/ranking-training-* and ranking-victory-*; no QA or private paths in dist. Initial victory QA caught formation overflow and was rerun successfully after the scoped fix. Real saves and user processes untouched; owned QA servers/contexts close automatically. Physical mobile, audible effects and full-frame luminance remain unverified. No commit/push/publication in this pass.
