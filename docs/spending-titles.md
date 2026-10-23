# Cosmetic simulated-spending titles — local candidate

Requirements §6 explicitly names 初課金, 太客 and 伝説の支援者 but gives no numeric thresholds. This implementation proposes three milestones based on existing pack prices:

| Title | Cumulative simulated spending | Basis |
|---|---:|---|
| 初課金 |480|One smallest pack|
| 太客 |10000|One largest pack|
| 伝説の支援者 |100000|Ten largest packs|

These are implementation choices, not previously agreed numerical requirements. Only existing spent is read; no title save fields, currency, ability, reward or progression advantage. All amounts are game money, with no real payment or outside service.

Shop summary shows acquired titles and the next threshold/remaining amount. Successful purchase results show only titles crossed by that committed purchase, consolidating multiple milestones into one static panel. Failed writes do not advance spent or unlock titles. Old saves restore the display from their cumulative value, ascension retains it, and reload never replays an acquisition popup. The new panel has no animation, including reduced motion.

QA identified an older dark purchase-modal background under dark heading text. Scoped the purchase completion dialog to an opaque light background, preserving readable dark text and the existing transaction controls. Existing purchase decorative movement is disabled under reduced motion/quick/soft settings.

110 tests pass,28-file build. Threshold−1/exact/+1, zero/large totals, legacy restore, ascension, failed purchase/retry are covered. Isolated Chrome at1280/390/320 checks unowned/next1 remaining, write failure, single and all-three acquisitions, reload with acquired badges and no repeated acquisition UI. No horizontal overflow or page errors. Actual image pixels inspected; QA artifacts remain excluded from dist. Real saves untouched; no commit/push/publication in this pass. Physical phones/audio/full-frame luminance unverified.
