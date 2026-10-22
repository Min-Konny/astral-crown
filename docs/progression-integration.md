# Integrated progression verification — unpublished

No gameplay feature or balance change was made in this verification pass. Added `test/progression-integration.test.js` and this record. Existing recovery and progression work remains uncommitted.

## End-to-end synthetic checks

- Started with the real initial state and memory-backed saves. Cleared patrols 1 and 2, spent earned materials on the starter trio, cleared patrol 3 in 14 turns without its optional reward. Trained Iris's skill using earned materials; replay took 12 turns and earned the one-time 120-material objective. Reload retained the receipt and reward; another replay awarded zero. Free focus switching retained the balance.
- Migrated a synthetic old save with 300,000 copies of every character and no new fields. Manually promoted each to stage 9, saved and reloaded after each operation. Every count remained 300,000, and the preexisting collection bonus was unchanged. The old implementation did not have a universal 300,000 threshold; the actual C/UC passive caps remain 100,000/30,000. This check covers preservation of user-described large-count progress rather than asserting a nonexistent old milestone.
- Exercised every promotion threshold: each manual hero promotion increased effective stats. Existing boundary tests cover just below/at/above and repeated clicks. Skill strength uses derived current stage/mastery rather than an accumulated bonus.

## Bounded support and balance

Six C/UC characters exist. Each is included once, independent of copies beyond capped progression:

- At stage 9/mastery 2, power focus gives 8×0.5% + 2×1.5% = 7% per character, or +42% attack across six.
- Guard focus gives 8×0.75% + 2×2% = 10% per character, or +60% HP across six.
- Those two maxima are alternatives, not simultaneous bonuses; mixed focus partitions the six supports. The original collection attack bonus remains a separate capped factor (+180% total).
- Increasing counts from 300,000 to 10^15, repeatedly switching focus, restoring saves and simulating battles did not increase the final stats further.
- Maximum hero promotion contributes a 1.16 stat multiplier, plus the selected 1.08 attack or 1.12 HP focus. Maximum skill potency adds 54 percentage points (8×3 + 2×15). Defender next-hit mitigation reaches 60% at the current legal maximum, below the defensive 65% safety cap. These are finite per-hit effects, not stackable repeated shields.

Repeated the 30-case rank sample (ranks 100/75/50/25/1 × hero levels 1/5/10/20/35/50), with capped legacy collection counts. Published implementation won 20; current unpromoted/untrained version won 20 with zero changed outcomes. Maximum support/mastery with power focus won 22; guard focus won 24. Growth therefore helps but did not make every sampled rank trivial. This is a limited deterministic sample, not proof of universal balance, optimality or acceptable long-term pacing.

## Results and browser limit

63/63 tests pass; build produces 14 files; diff whitespace check passes. Actual game/session modules were used for synthetic transactions; no real player save was accessed.

Browser inventory showed no existing QA tab, and the previously owned server was stopped. Started only the same dedicated fixture on 127.0.0.1:4193 and attempted the ordinary Brave connection once at `http://127.0.0.1:4193/?preview=1`. It returned `net::ERR_CONNECTION_TIMED_OUT` for tab 1526989474. This was a normal navigation timeout, not a new explicit diagnostic denial. Stopped the dedicated server immediately afterwards. Did not run the previously denied socket diagnostic, CIM, change security settings or use another connection route.

PC/mobile-width promotion, skip, reload and training layout remain unverified in a real browser. No new screenshots could be obtained. What is missing is a functioning allowed browser-to-local-server connection; its failure cause remains undetermined. There was no push or publication.

## Resume attempt — 2026-10-22

- Confirmed the existing uncommitted implementation/test files were still present; no gameplay files changed.
- Started `node artifacts/recovery-server.mjs` once. Session 9180 emitted `QA only http://127.0.0.1:4193/?preview=1` from its listen-completion callback. Binding is explicitly IPv4 127.0.0.1, port 4193.
- Browser inventory succeeded and contained no existing local QA tab. A single ordinary Brave navigation to that URL failed with `net::ERR_CONNECTION_TIMED_OUT`, tab 1526989476.
- Stopped the dedicated server with Ctrl+C; session exited. Did not retry navigation, run socket/CIM diagnostics, modify security or use another route.
- Read the fixture code: root HTML maps to workspace index.html, assets/modules use ordinary relative paths, and request-handler errors return HTTP 404. The fixture has no request-access log, so the absence of request output cannot prove that no request reached it. The evidence establishes listen completion and navigation timeout, but not network namespace equivalence or the underlying failure cause. No page content or application runtime error was obtained.
- Missing prerequisite remains a successful allowed browser-to-server connection. Promotion, skip, reduced motion, reload, PC/mobile layout and screenshots could not be checked. No real save was accessed. No new implementation changes required a repeated test/build; last verified result remains 63 passing tests and a successful 14-file build. Publication remains on hold.
# Real browser follow-up (2026-10-22)

Used the user-started loopback server and a fresh Brave `?preview=1` tab (sessionStorage only). Completed all three patrols with the initial trio, spending earned materials through actual level-up buttons. First rewards were 360, 480 and 600 materials; the first two included their 120-material objectives. Boss first clear took 14 turns with all three alive. Trained Iris's skill for 150 materials, then replayed on a 390x844 viewport: 12 turns, all three alive, and the previously missed objective awarded 120. Reload restored the saved result. A further replay awarded 0; another reload retained 660 materials and the completed objective. This supersedes the earlier absence of a real-browser garden-loop check.

The QA server's injected context-loss button overlaps the battle skip control at this narrow width. An attempted pointer skip armed that QA button; the battle completed normally without another click or context loss. After reload, a focused Enter on the game's skip button completed the later replay. This is a QA-only overlay, not a shipped game control; the running user-owned server was not modified or stopped. Full battle rendering and result transitions were observed, but a smartphone touch skip under this injected overlay is not verified.

Rechecked final desktop training and mobile promotion screenshots after the prior scoped CSS corrections. Saved local evidence in `artifacts/training-desktop.png`, `artifacts/promotion-mobile.png`, and `artifacts/garden-objective-mobile.png`. Library upload did not reach preparation/finalization: the current official helper failed its hosted-app discovery with DNS failure, so no Library IDs or attachment readiness are claimed. No alternate upload route used.

No game-code changes were needed during this follow-up. No real saves, server lifecycle changes, commits, pushes or deployments. Physical smartphone testing and full-frame luminance measurement remain out of scope of this desktop viewport pass.

