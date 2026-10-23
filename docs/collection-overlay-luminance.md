# Collection overlay contrast transition — local candidate

Scope: only training/promotion dialogs while on collection. Opaque panel changes from dark blue to pale blue (#e1eff8), with dark readable text (#203d59). Backdrop dark tint decreases from #1029479c to rgba(16,41,71,.06), blur8→3px. Character-art inset and dark stage badges retain their existing treatment. Other pages/modal themes unchanged. No new fade, flash, delay or animation; reduced motion uses the same colors. No game/save/economy changes.

QA also reproduced loss of keyboard return focus after closing training (including after rerendering a level upgrade). A close listener restores the current character's training button, or the existing filter/navigation fallback if unavailable. It does not steal focus when a replacement dialog is already open. Escape, close button, three repeated open/close cycles, promotion skip→training→level→Escape, and unrelated shop checkout cancellation passed at1280/390 in normal/reduced modes.

## Matched screenshot comparison

Same synthetic Noel fixture, same viewport, same session. Old styling was temporarily injected into the isolated QA page only, then removed for current styling.14 samples per condition, two widths×two motion modes×before/after=112 screenshots. Linearized RGB luminance at160px downsample width. Large change means individual pixel rise>0.35; reported area is largest consecutive-sample proportion. Mean delta is settled minus before close.

| Width / motion | Large-rise area before→after | Mean luminance delta before→after |
|---|---:|---:|
|1280 normal|91.75%→17.33%|0.751→0.217|
|1280 reduced|91.74%→17.33%|0.751→0.217|
|390 normal|96.05%→22.42%|0.824→0.249|
|390 reduced|96.05%→22.43%|0.824→0.249|

Mean delta reduced about70–71%; not eliminated. Dark character inset still contributes to the remaining brightness change. Body text contrast13.88:1 before and9.56:1 after. Opaque panel colors confirmed from computed styles; screenshots visually inspected. New design retains readable text rather than relying on a translucent text background.

Original seven-path sampling was also rerun after CSS adjustment atPC/390. No full-white/transient-over-endpoint heuristic flags. Matched comparison maximum sample gaps345–378ms; original broader run has larger gaps. Sampling/downsizing can miss brief/small flashes and affects timing. This is not proof about all frames, GPUs, real phones or clinical sensitivity.

110 tests and28-file build pass. Browser scripts are ignored artifacts/overlay-qa.mjs and overlay-luminance.mjs with JSON/contact sheets; no page errors. All owned QA contexts/temporary servers closed, user saves/tabs/audio untouched. No commit/push/publication. Physical phones, audio and full-frame luminance remain unverified.
