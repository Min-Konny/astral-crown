# Render failure follow-up — local only, 2026-10-21

Baseline: 016eeacf6fba265e9715059d0394738bb3269e48. Working tree was clean. No publication, commit, title, economy or save format changes. No other project/server was modified.

## Findings and correction

The loader's `loaderror` handler only displayed a toast, then `create()` attempted to construct frames from the missing party texture. Phaser context loss had no application handler to end presentation and release the HTML input lock. These were identified by code inspection and exercised with injected loader/canvas events, not a reproduced physical GPU failure.

`src/scenes.js` now enters a result-only fallback on image load error or canvas context loss. It hides the canvas (retaining the dark stage background), invalidates stale callbacks, cancels timers/tweens and finishes the current presentation exactly once. Subsequent actions display results without animation. It never reruns the transaction, lottery or reward application. An image failure before scene creation skips atlas setup. Event listeners are removed on destroy.

Fallback is intentionally retained until page reload, even if the browser restores the context. Reload can initialize a fresh stage while the existing persisted receipt supplies the same result. There is no automatic engine rebuild, retry loop or full-screen flash.

## Verification

- `npm test`: 40/40 pass, including 15 new failure tests in `test/recovery.test.js`.
- Injected image failure and context loss during summons and battles, normal and reduced motion; repeated errors/skips and stale timer callbacks produce one completion.
- Real game/session modules with in-memory storage verify one transaction write, no extra random draws, unchanged resource/reward/receipt data and reload compatibility. Fresh stage initialization after failure is tested.
- Existing no-camera-flash/single-engine regression passes.
- `npm run build`: 14 files; `git diff --check` passes.
- Real user save/storage was not accessed or changed.

## Browser verification blocker

A dedicated loopback QA server on port 4193 was started with optional image 404 injection and a test-only button using WEBGL_lose_context. A new Brave tab to `http://127.0.0.1:4193/?preview=1` returned `net::ERR_CONNECTION_TIMED_OUT`; the page did not load. A read-only `Invoke-WebRequest` to that same URL was denied with a socket access-permissions error. No retry, escalation or alternate connection route was attempted after the denial. The QA server was stopped. Its script is ignored under artifacts/ and is not included in the build.

Therefore browser interaction, actual WEBGL_lose_context injection, screenshots and visual recovery remain unverified in this follow-up. Physical-device recovery and full-frame luminance measurement also remain unverified. Unit tests use Phaser doubles for presentation and do not establish actual GPU restoration behavior. Changes are local and unpublished pending browser verification.

## Additional code review

An explicit stale-callback test failed before the correction: after skipping a summon, returning home and starting another summon, the old cut-in completion callback ended the new presentation. The timer now checks the presentation sequence before completing. The same test passes after the one-line correction. This is a deterministic forced callback race in a mock, not evidence of its frequency in a real Phaser scheduler.

Added checks for skip-before-failure, failure-before-skip and normal battle completion followed by failure; repeated mixed failure events notify once. Retained battle tween callbacks do not mutate a later home presentation. Save-quota failures for both action types leave original state and previous persisted receipt unchanged and do not enter presentation. These exercise the real transaction code with mock storage, not the browser dialog/input wiring. Fresh stage initialization and successful animation completion after a simulated reload are covered. Error wording no longer asserts a saved result when no action was in progress.

Final scope: `src/scenes.js`, `test/recovery.test.js`, this document. Game/session logic, names, balance, save format and deployment configuration are unchanged. No additional network attempts were made during this review.

## Application and remaining verification

The changes are already applied in the local working tree; no patch import is required. Run `npm test`, `npm run build`, and `git diff --check` to repeat offline validation. Do not push or publish this revision yet.

Only after browser access is legitimately available and verification is authorized, use an isolated `?preview=1` tab and the local-only failure fixture (never a real save):

1. Fail image requests and check that home/navigation and summon results remain readable and operable without placeholder textures or white flashes.
2. Lose the actual WebGL context during summon charge/cut-in and battle, including immediately before/after skip; check result, input unlock and one resource/reward change.
3. Return home, start another action and check no old result interrupts it. Reload with healthy assets and confirm the same persisted result/resources and restored normal rendering.
4. Check normal/reduced motion at desktop/mobile widths, errors and DOM dialogs; inject a storage write failure and confirm the error leaves the existing save intact and no new result is shown.

This checklist has not been executed in a browser and does not remove the recorded access blocker.

## Authorized single retry — 2026-10-21

After explicit user approval to retry the same loopback browser connection without changing security settings, the dedicated QA server was restarted and reported listening on 127.0.0.1:4193. One Brave navigation to `http://127.0.0.1:4193/?preview=1` was attempted. It again returned `net::ERR_CONNECTION_TIMED_OUT` (tab 1526989306). This result is a connection timeout, not a new explicit policy denial; the underlying cause is not established. The page did not load, and none of the browser failure-injection or save tests ran. No additional connection attempt, alternate route or security change was made. The dedicated server was stopped. Source changes and the preceding 40-test/build results remain unchanged; publication is still on hold.

## PC verification resumed — 2026-10-21

Following authorization to resume verification on the PC, confirmed the same three-file working-tree scope and reran tests (40/40 pass), build (14 files) and diff whitespace validation (pass). No game or test code changes were needed.

Started only the dedicated existing 127.0.0.1:4193 QA fixture. The browser create-tab operation timed out after 30 seconds with `js execution timed out; kernel reset`; this is a tool execution timeout, not a confirmed page/network error. A read-only browser inventory afterwards contained no QA/local tab. Whether the navigation was ever dispatched is uncertain; it was not repeated. No socket diagnostic, alternate route, security setting change or external write was performed. Stopped the dedicated server. Actual image/context fault injection and browser save/reload checks remain unexecuted. Real saves were untouched, and publication remains on hold.
