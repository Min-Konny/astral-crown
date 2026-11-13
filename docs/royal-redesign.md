# ASTRAL CROWN ビジュアル改修 — 2026-11-13

買い切りインクリメンタルの主ループ「稼ぐ → 疑似課金 → 大量召喚 → 強化 → NPC対戦 → 転生」を、承認された紺・金・青緑のコンセプトに合わせて画面化。

## 実装

- ナビゲーションを拠点・稼ぐ・課金・召喚・仲間・闘技場に整理。
- 稼ぐ画面を追加。仕事、現在の毎秒収入、設備投資前後の収入、残高不足と待ち時間、放置収入の反映済み表示。
- 円表示の疑似課金パック、まとめ買い、架空の決済方法、購入前後の残高、購入完了と称号を表示。個人情報入力・実決済・外部決済接続は追加していない。
- 新しいリュネ、仕事部屋、夜の天文台、闘技場、3種類の課金パックを追加。
- 図鑑をコンパクトなキャラカードに変更。編成はカード上、詳しいスキルとレベル強化は展開欄および育成ダイアログから操作できる。
- 大量召喚結果はレア別集計を先に表示。キャラ別の獲得数は展開して確認する。
- 転生の維持・初期化対象と永続倍率の前後差を表示。
- 仕事も既存の保存トランザクションで確定し、保存失敗時に成功表示しない。

`src/royal-ui.js` は表示を担当。操作と保存は既存の `src/app.js` / `src/session.js` を使用し、`src/game.js` の経済・抽選・戦闘ルールとセーブ形式は変更していない。既存の作業中の育成・戦闘改修も維持。

## 画像

`assets/redesign/` の7種類は今回GPT Imageで生成したオリジナル素材。PNGを制作元として残し、ブラウザにはWebP版を配信する。文字・数値・操作ボタンは画像に焼き込まずHTMLで描画。既存の庭園・13人の戦闘用デフォルメ素材は再利用する。コンセプト内の仮の数値や新キャラはゲームデータに追加していない。

PNGからWebPへのエンコードのみを行い、透明背景を保持している。`scripts/build.mjs` の明示的なファイルリストに配信用素材と表示モジュールを追加。

## 確認

- `npm test`：既存の経済・保存・育成・戦闘等の118件。
- `npm run build`：公開用ファイル生成。
- `qa/royal-ui.spec.js`：1440×900、1280×720、390×844、320×740。
- 6画面の横はみ出し・画像読み込み、仕事と設備投資、支払方法選択、購入額と石数、10,000連の集計、育成導線、NPC戦闘、再読込、残高不足からの復帰、保存失敗時の購入非確定、転生を確認。
- QAは `?preview=1` のセッション専用セーブとローカルファイルのルーティングを使用。通常プレイのセーブと実ネットワークを使用しない。

Playwrightテストは `qa/data/*.json`（データ）、`qa/pages/*.js`（要素・操作）、`qa/*.spec.js`（テスト）に分離。

Playwrightを導入した開発環境では `npx playwright test --config=qa/playwright.config.js` で実行する。管理された環境では `ASTRAL_PLAYWRIGHT` にPlaywrightのtestモジュール、必要に応じて `ASTRAL_CHROME` にChrome実行ファイルを指定できる。テストランナーは本番依存に含めない。

## 今回の範囲

ローカル実装とビルドまで。外部公開・デプロイは行っていない。キャラ全員の新規等身立ち絵、戦闘モデルの3D化、Live2D、音声・BGMは含まない。

## 引き継ぎ後の再確認（2026-11-13）

既存の改修コードと7種類の素材を作業フォルダから復元確認。新たな画面変更は加えず、現状の `npm test` 118件、ビルド37ファイル、4サイズのPlaywright 16ケースを再実行して全成功。PCの拠点・購入画面とスマホ拠点のスクリーンショットも確認した。

確認は隔離プレビューとローカルファイルルーティングで実施。本プレイのセーブは使用していない。プレビュー用に既存の `node server.mjs` を起動し4173番で待受開始のログを確認したが、PowerShellからのHTTP確認は環境のソケットアクセス制限で失敗したため、実サーバー経由の到達確認とは区別する。公開・pushは未実施。

## ホーム画面の構図調整（2026-11-13）

ユーザーの「1画面ずつ」方針に合わせホームのみ追加調整。タイトル背景を外して縦の金線と余白を採用。台詞パネルを右上のキャラ紹介に移動し、中央の立ち絵を遮らない配置へ変更。立ち絵のPC位置を幅52%へ移動。収入欄は二重金枠、召喚導線は既存の星晶石画像を用いたバナーに変更。既存のキャラ・粒子アニメーションと低モーション設定を維持。経済・保存・他画面の挙動は変更しない。

4サイズで6画面の読み込み・横はみ出し回帰が成功。PC/スマホのホーム画像を目視確認。37ファイルのビルド成功。元コンセプト画像そのものとの一致は未検証であり、既存素材を使ったホームの追加改善として扱う。

## 賑やかなソシャゲ風ホーム（2026-11-13）

ユーザー添付のホーム画像を基準に情報密度を再調整。丸型のメール・図鑑・設備強化メニュー、召喚・庭園・ショップのイラストバナー3枚、宝箱付き自動収入欄、装飾付きの冒険・闘技場導線、紋章付きロゴと金縁ナビゲーションを実装。ホームのキャラ表示を拡大。すべて既存素材を使用し、未実装イベントや期限を表示しない。メール通知は未受取時のみ。放置収入は自動加算であることを明記し、二重受取機能は追加しない。

4サイズの画面読み込みと横はみ出しテスト4件、PC/320pxで新導線とメール通知の操作テスト2件成功。PC1440・1280と390pxの実キャプチャを目視確認。ビルド37ファイル成功。背景の仲間や専用の彫刻風装飾画像は未追加のため、参考画像と同一の美術ではない。

## 召喚画面の再設計（2026-11-13）

ユーザー添付の召喚画面を基準に、左の絵入り召喚バナー、星の召喚タイトル、キャラ名・SSR・属性、確定までの回数表示、金色の大きな召喚ボタンを実装。回数は既存の10/100/1000/10000連を保持し、選択後に明示的に召喚する。ピックアップ/常設で名前と説明を切替。召喚表示をroyal-ui.jsのsummonViewへ分離。ホームと同じ金縁ナビを召喚にも適用。既存立ち絵の位置・サイズを調整し、抽選・天井・保存処理は維持。

単体118件と4サイズの表示/10000連/保存/育成のブラウザテスト8件成功。スマホの顔位置と説明領域を追加調整後、390/320pxの表示を再確認。専用の横向きキャライラストは新規生成しておらず、参考画像のポーズとは異なる。

## GPT Imageによる専用UI素材（2026-11-13）

専用素材を2点新規生成しゲームへ導入：summon-gold.png（金彫刻・星・青い宝石・象牙色の中央面を持つ召喚ボタン）、banner-frame.png（中央と外側が透明の装飾バナー枠）。召喚ボタンの背景を置換し、文字・価格はHTMLのまま維持。バナー枠は召喚とホームの既存バナーへ重ねて使用。生成PNGをそのまま保存し、公開用buildの明示リストにも追加。

生成素材は横幅に応じて表示し、押下・フォーカス・クリック処理は既存のbuttonを保持。画像だけをクリック領域にせず、装飾レイヤーはpointer-events:none。文字は描き込まないため回数・価格・選択状態が実データと一致する。

## Painted navigation and HUD (2026-11-13)
Generated and integrated nav-icons.png (six illustrated navigation icons), hud-plate.png (gold-rimmed midnight panels), and nav-active.png (teal selected plate). Added illustrated-ui.css after existing styles. Navigation, wallet, arena rank and summon controls retain live HTML and existing event handlers. Rank displays the real arena rank, with season beside its label. Build includes all new assets.
Validation: Playwright 8/8 passed across 1440, 1280, 390 and 320px viewports: six-screen layout/assets, earnings, investment, simulated purchase, 10000 summons, training and save. Desktop/home and desktop/mobile summon screenshots visually reviewed. Build: 43 files. Tests use local-file routing, not a live localhost connection.

## Continuous navigation refinement (2026-11-13)
Reused painted frame art as a single bottom rail; removed inactive individual hexagon plates and reserved the teal plate for the current screen. Reordered the rail to home, income, summon, collection, arena, shop. Reduced HUD height and width, joined currency panels into one rail, and added illustrated currency symbols from the existing atlas. Kept actual balances, rank and semantic controls. Validated all six pages at four viewport sizes with Playwright and reviewed rendered screenshots; build includes 43 files.

## Dedicated summon character (2026-11-13)
Generated transparent lune-summon.png: silver-haired moon witch reaching toward the lower-left foreground, blue orb staff on the right, close-up navy/ivory costume. Loaded as a separate Phaser texture used only on the summon backdrop; home retains court artwork. Responsive scaling prioritizes the face on portrait viewports. Pickup thumbnail uses the new art. Build includes the PNG (44 files). Reviewed desktop and mobile screenshots; eight Playwright layout and purchase/summon/save flow checks passed across four viewport sizes.
