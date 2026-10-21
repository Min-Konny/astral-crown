# Bundled-code notice sources

The game distributes the unmodified Phaser 3.90.0 npm browser bundle. Its minified distribution omits notices present in the corresponding non-minified distribution and package sources.

`scripts/notices.mjs` preserves all copyright/license block comments from that non-minified distribution, inline credits, Phaser's MIT license, EventEmitter3's MIT license, and Matter.js's package license. This includes Earcut (ISC), Simplify (BSD), Photon Storm, RoboWhale, Stefan Hedman, and other original package credits.

The three text files here are verbatim license downloads from the authors' URLs referenced by the bundled code (Matt DesLauriers, Gavin Kistner, and Minko Gechev). URLs and SHA-256 fingerprints are in sources.json; fingerprints normalize CRLF to LF only. These files are retained locally so future builds need no network. Original inline credits and modification notes remain in the generated notice. We make no modifications to their code.

The build ships `vendor/THIRD-PARTY-NOTICES.txt` and `vendor/PHASER-LICENSE.md`. Dependency version changes require a notice review. The test rebuilds the site, checks original notices survive, and verifies the distributed engine is byte-identical to the npm package.

These notices apply to bundled software only, not the game's images or names. Optional Spine plugins in the npm package are not included in the distributed browser bundle or this game.
