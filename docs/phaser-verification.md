# Phaser presentation verification — 2026-10-21

## Scope

Original illustrated home, summon charge/cut-in/results, and event-driven auto battle. Existing economy, collection, shop, ranking and reincarnation remain in game.js. Phaser 3.90.0 is installed from npm and bundled locally for static Pages hosting. No new hosting permissions or services.

## Verified

- 21 Node tests pass: original rules, complete progression to reincarnation, v1 save compatibility, JSON roundtrip, atomic summon/save receipt, storage failure rollback, persisted battle reward, duplicate reward rejection, and reconstruction of HP from structured events.
- Static build succeeds with 13 whitelisted files. No test saves or screenshots are published.
- Brave desktop 1920x951: illustrated home and summon, automatic battle completion to victory (95th place), persisted result on reload. Original localStorage key remains astral-crown-save-v1.
- Brave viewport 390x844: home navigation, 10-pull result grid, result restored unchanged after reload, battle attack/HP display, victory, defeat, and skip. Materials 380 -> 560 after victory and remain 560 after reload.
- Mobile battle labels overlapped; fixed with separate vertical lanes. Rechecked screenshot shows distinct labels and HP bars.
- Sound checkbox enabled then disabled; reduced-motion checkbox enabled. Settings now redraw the idle stage immediately. Actual audio output has not been listened to.
- QA uses ?preview=1 and sessionStorage, leaving live localStorage untouched. This is a disposable tab session, not a migration of the player's save.

## Remaining limits

- Browser export event timed out; no downloaded file path was confirmed. Import attempt stopped because the ChatGPT Brave extension has file URL access disabled. No permissions changed. UI file export/import roundtrip is unverified; data-level compatibility/roundtrip tests pass.
- Physical Android/iOS devices, OS reduced-motion preference, and actual speaker output are untested. Responsive validation uses desktop Brave viewport emulation.
- Four chibi archetypes are shared across the roster, with one full-size character portrait. Idle/attack movement uses tweens, not skeletal animation. No voices/BGM.

## Screenshots (local, excluded from Pages)

- artifacts/phaser-home.jpg
- artifacts/phaser-mobile-home.jpg
- artifacts/phaser-mobile-gacha.jpg
- artifacts/phaser-mobile-battle.jpg

## Asset provenance

Generated with the built-in image generation tool for this project. No external character, franchise logo, or reference artwork was imported.

- assets/luna.png: original adult lunar astronomer mage, silver-lavender hair, blue eyes, ivory/navy/gold coat and blue dress, crescent brooch, star-glass wand; full body, relaxed three-quarter stance, premium anime illustration, transparent background. No school uniform, halo, text, or logos.
- assets/garden.png: original celestial observatory terrace above clouds, white stone arches, glass domes, floating islands, blue flowering trees, golden astronomical instruments and reflecting pool; cyan/ivory/lavender, open foreground, no people or UI.
- assets/party.png: four separate transparent chibi figures facing right: lunar mage, blue-haired shield guardian, auburn green archer, pink-haired priestess. Original designs, clean anime lines, full bodies, no text or logos.

The atlas is cut into four Phaser frames without modifying the generated source image.
