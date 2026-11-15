# ASTRAL CROWN のローカル相互レビュー

ログイン済みのClaude Codeが画面を実装し、Codexが変更前後をレビューします。最大3回。コントローラーはマージやデプロイを行いません。

```powershell
./scripts/factory/run.ps1 -Issue 14 -Screen ascension -DryRun
./scripts/factory/run.ps1 -Issue 14 -Screen ascension -MaxRounds 3 -Publish
./scripts/factory/run.ps1 -Issue 14 -Screen ascension -ResumeFrom '.factory/issue-14-実行日時'
```

公開モードは最新の `master` を起点にします。合格したローカルテストの変更を `claude/*` の下書きPRへpushし、PRチェック成功後にCodexを実行します。投稿直前にもSHAを照合し、判定・未確認事項・指摘・実キャプチャへのリンクをコメントに残します。masterが進んだ場合は停止するので、新しい基点で再検証してください。

`-Publish` を付けない場合はローカル検証のみです。`-ResumeFrom` はローカル検証で使えます。公開済み下書きの再開は同じブランチを手動で続けてください。

`claude auth status`、`codex login status`、`gh auth status` を利用します。Playwrightの場所は `ASTRAL_PLAYWRIGHT` と `ASTRAL_PLAYWRIGHT_CLI`、Chromeは `ASTRAL_CHROME` で指定できます。同梱ランタイムを検出できる場合は指定不要です。

作業・停止理由・履歴・ログは `.factory/` に残ります。単体、ビルド、4サイズの操作テストを行い、375×667でも同じ状態を撮影します。公開レビューの実画像は `docs/visual-verification/` にコミットします。テストに失敗したラウンドの変更はローカルに残ります。

Ctrl+Cまたは実行フォルダーの `STOP` ファイルで停止できます。同時起動ロックのPIDが終了済みのときだけ、残った `.factory/loop.lock` を削除してください。画像生成は別工程です。
