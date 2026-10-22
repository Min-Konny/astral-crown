# Local QoL follow-up

Published baseline: a2406b683a33ccf33c0bedd756610ffad9ea4e68. CI 39712981781 completed successfully, including Pages deploy. All 14 served files match the committed sources/generated dependencies; THIRD-PARTY-NOTICES.txt matches after CRLF/LF normalization. The initial local app.js mismatch was Windows checkout line endings; comparison against Git blob bytes succeeded. Live isolated preview verified summon, result reload and garden victory/reward.

Unpublished QoL changes:
- Promotion-ready and skill-training-ready filters use current ownership, thresholds, unlocks and material costs. No automatic team changes or sort changes. Empty results explicitly offer reset to all characters.
- Selected filter and patrol remain in memory during training/navigation. A training modal remains open on the selected character when upgrading removes it from the underlying filtered list. Existing team persistence is unchanged; this adds no reload persistence for UI filters.
- Collection and training modal offer return to the selected named garden.
- Campaign results offer direct retry, including defeat and restored receipts. Commit occurs before closing the previous modal, so a storage error preserves both the result and resources. Existing playback lock and campaign-run/reward checks remain in force.

Brave desktop and 390x844 preview verification: promotion filter→promote guard→return→empty result; training filter→train guard→return to second garden; victory→direct retry→zero duplicate reward→reload same result. Team remained the initial trio. The local QA injection button overlaps pointer skip on mobile; focused Enter was used for skip, while new retry/return buttons were clicked normally. Screenshot: artifacts/qol-retry-mobile.png. Public screenshot: artifacts/live-garden-a2406b6.png.

Added tests cover filter mutation boundaries, team preservation, actual playBattle entry with input lock and failed storage, saved result interruption/reload, repeated free defeat retries and no duplicate rewards. Physical devices/full-frame luminance remain unverified. No QoL push, commit, server lifecycle operation, real save mutation or balance/currency changes.
