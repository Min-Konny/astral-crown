# ASTRAL CROWN のローカル相互レビュー

PCにログイン済みのClaude Codeが画面を実装し、Codexが参考画像・実キャプチャ・差分をレビューする。指摘は次のClaude実行へ渡す。画面ごとに最大3回で停止し、公開モードでは変更を下書きPRに記録してからレビューする。PCの起動とログイン状態が必要。常駐監視や定期実行ではなく、下記コマンドで1件を開始する。

## 共有基点

- 基点はGitHubの `master`。参考画像の初期版は [PR #2](https://github.com/Min-Konny/astral-crown/pull/2)。
- 参考画像: [一覧](design-references/README.md)。画面の完成イメージであり、実キャプチャや確定した経済仕様ではない。
- 画面別Issue: #3 拠点、#4 召喚、#5 仲間、#6 闘技場、#7 交換所案、#8 育成・探索・戦闘、#9 疑似決済、#10 購入パック、#11 稼ぐ、#12 大量召喚結果、#13 継承強化、#14 転生。

## 実行

PowerShellでプロジェクトから実行する。初回は接続先・対象を確認するdry-runを使う。

```powershell
./scripts/factory/run.ps1 -Issue 8 -Screen training-exploration-battle -DryRun
./scripts/factory/run.ps1 -Issue 8 -Screen training-exploration-battle -MaxRounds 3 -Publish
# 保持した変更を引き継ぎ、再検証とレビューから再開する
./scripts/factory/run.ps1 -Issue 8 -Screen training-exploration-battle -ResumeFrom '.factory/issue-8-実行日時' -Publish
```

`-Publish` を付けると、最新の `master` を起点に `claude/*` の下書きPRを作る。変更前後の実キャプチャをコミットし、push済みのSHAを確認してからCodexがレビューする。投稿直前にも同じSHAを確認して `[レビュー] pass` または `[レビュー] revise` のコメントを付ける。途中で基点が進んだ場合は新しい基点で検証し直す。ローカルのみの実行ではGitHubへ書き込まない。

CLIの `claude auth status`、`codex login status`、`gh auth status` が成功すること。認証情報のファイルをコピーしたり、GitHub Secretsに保存したりしない。

Playwrightはプロジェクトに導入済みのもの、またはCodexの同梱ランタイムを検出する。別環境では `ASTRAL_PLAYWRIGHT` にtestモジュール、`ASTRAL_PLAYWRIGHT_CLI` にCLI、必要なら `ASTRAL_CHROME` にChrome実行ファイルを指定する。

## 判定と証跡

1. `.factory/issue-番号-日時/work/` にGitの専用コピーを作る。元の作業フォルダを実装エージェントへ渡さない。
2. 変更前の隔離ブラウザテストを実行して画像を保存する。
3. Claudeに対象Issue、参考画像、前回の指摘を渡す。編集範囲はUIファイルと画像素材に限定する。テストや依存関係、保存・経済のモデルは変更させない。
4. 親プロセスが単体テスト、ビルド、4サイズのPlaywrightテストを実行する。失敗はログを添えて差し戻す。
5. Codexが参考画像と変更前後の4サイズの実キャプチャ、親が収集した差分・変更ファイル全文・検証結果を見て `pass` / `revise` / `blocked` を返す。レビュー側でシェルを起動する必要はない。画像未確認・不正な判定・レビュー中のファイル変更は合格にしない。
6. `revise` なら次ラウンド、`pass` または `blocked` なら終了する。上限到達でも合格にはしない。

ログと各回の証跡は `.factory/` に保持する。公開モードのレビュー対象の画像はPRの `docs/visual-verification/` に残す。高さの低い375×667の検証は現在の自動ファイルに含まれないため、レイアウト変更時は別途実測してPRで記録する。保存先は開始時に表示する。`result.json` に結果、`history.json` にレビュー経過を記録する。異常終了時は最後のログを確認する。

中止は実行中のターミナルでCtrl+C。次ラウンド開始前に止める場合は表示された実行フォルダに空の `STOP` ファイルを作る。同時起動は `.factory/loop.lock` で拒否する。PC終了などでロックが残った場合は、記録されたPIDが終了したことを確認してからそのロックだけを削除する。

新規画像生成はこのCLIループには接続していない。既存素材では届かない美術は不足素材を明記して停止し、GPT Imageで素材を用意してから再実行する。継承強化は専用のQAキャプチャ追加が必要。複数画面のIssueでは全対象を撮影できたことも確認する。

CLIの仕様: [Codex非対話実行](https://learn.chatgpt.com/docs/non-interactive-mode)、[Claude Code非対話実行](https://code.claude.com/docs/en/headless)。モデルはそれぞれのCLIの既定設定を使用する。
