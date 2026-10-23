# ASTRAL CROWN 星冠の継承者

買い切りで大量課金プレイヤーの気分を味わう、ソシャゲ風インクリメンタルゲームのローカル試作です。実際の決済・通信対戦はありません。

## 起動

Node.jsが入った環境で、このフォルダから実行します。

```powershell
npm ci --ignore-scripts
npm start
```

ブラウザで http://127.0.0.1:4173 を開きます。初回は上記の npm ci で Phaser 3.90.0 をインストールしてください。終了はターミナルでCtrl+C。ポートが使用中なら `$env:PORT=4174` を設定して起動してください。

## 最初の遊び方

1. 拠点でお詫び石を受け取り、収入設備を強化します。
2. 星晶ショップでゲーム内のおこづかいを星晶石に交換します。
3. 星の召喚で10連。SSRは5凸、CとUCは編成外から全体攻撃を強化します。
4. 継承図鑑で主力を育成・編成します。防御役を前に置きます。
5. 闘技場のNPCと対戦して順位を上げます。
6. 50位以内で転生。所持数・凸・図鑑を維持して、収入と攻撃の永続倍率を得ます。

効果音は設定から有効にできます。ガチャ・戦闘はスキップでき、設定で演出短縮も可能です。保存先はブラウザ内。設定からJSONで書き出し・読み込みできます。同時利用は1タブを想定しています。

## 仕様と実装

- [要件定義](docs/requirements.md)：合意事項、仮決定、数式、画面、試作範囲、販売までの課題
- `src/game.js`：経済、抽選、育成、対戦、転生、セーブ検証
- `src/app.js`：画面、演出、合成音、保存
- `src/style.css`：PC・スマホ対応レイアウト
- `test/game.test.js`：ゲームルールの自動テスト

```powershell
npm test
```

## 静的サイトのビルド

`npm run build` で公開用の14ファイルを `dist/` にまとめます。HTMLの参照は相対パスなので、GitHub Pagesのプロジェクト配下でも動作します。セーブは公開先のブラウザ保存領域に分かれるため、ローカル版から移す場合は設定の書き出し・読み込みを利用してください。

GitHub Actionsはテストとビルドの成功後に `dist/` のみをPagesに配信します。検証画像、ローカルサーバー、テストファイルはサイトの配信対象に含めません。

立ち絵・庭園背景・4種類のちびキャラはオリジナルの生成画像です。全員分の固有画像・BGM・声・商用アプリ化・Steam連携はまだ含みません。経済は試作用の仮バランスで、販売版の長期進行は別途調整します。

## Phaser presentation

Home, summon and battle use Phaser 3.90.0. Accessible HTML handles navigation and results. The original v1 save key is preserved. Summons are saved before animation. Battles save each resolved action before its animation and resume from that action on reload; only the terminal action commits rewards and the result receipt, together in one write.

Skill mode defaults to AUTO. MANUAL pauses only before a living ally's ready skill: use it or hold it and make a normal attack. First readiness is turn 3; using a skill makes it ready again three turns later, while holding preserves readiness. Changing modes during animation affects the next unresolved action. Animation skip never chooses a manual skill. A failed battle write stops progress and offers retry without advancing combat or granting rewards.

- `src/scenes.js`: illustrated scenes and battle event playback
- `src/session.js`: atomic state persistence and presentation receipts
- `src/game-ui.css`: game HUD and mobile layout
- [Verification and asset provenance](docs/phaser-verification.md)

For disposable browser QA, use `?preview=1`. It uses tab-scoped sessionStorage and never touches the normal localStorage save. Do not use this mode for permanent progress.

Third-party software notices: [sources and build checks](licenses/README.md), [published notices](https://min-konny.github.io/astral-crown/vendor/THIRD-PARTY-NOTICES.txt).
