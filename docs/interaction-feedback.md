# 操作反応と育成の達成表示

既存の配色・13人の画像・昇格演出を維持し、次の2点だけを改善。

1. ボタンは押下時に即時に横102%・縦94%へ変形し、2px沈む。解除は260msの短いオーバーシュートで戻る。以前の65msの押下遷移は短いタップでほぼ変形しない場合があった。native `:active`を使い、タイマーや保持する押下フラグは追加しない。
2. 育成詳細の通常レベルアップは、既存の保存transaction成功後だけレベル・攻撃・HPの前後差を表示。表示は詳細内に限定し、280msの3px移動で落ち着く。入力待ち・画面flash・音は追加しない。再読込や詳細を開き直した場合は通常の説明へ戻る。既存のスクロール・focus保持を維持する。

OSのreduced-motion、既存soft/quick設定では両方の動きを停止。報酬、能力計算、費用、セーブ形式は変更しない。

## 適用した参考手順

- [create-game-assets](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/create-game-assets/SKILL.md): 既存画面を先に観察し、同じ配色・図形・実表示サイズで比較。今回はコードで表現できるUIだけなので画像生成は不要。既存素材の出所は変更なし。
- [game-feel](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/game-feel/SKILL.md): 入力と保存成功のイベントに局所的な反応を付け、短く元に戻す。ゲームの計算や操作受付を止めない。
- [game-ui-ux](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/game-ui-ux/SKILL.md): 文字・状態を色だけに依存させず、既存レイアウトの中で折り返す。focusと複数画面幅を検証。

参考文書のみ読取り。外部スクリプト実行・一括インストール・エンジン更新は行わない。

## 検証

PC 1280px、390px、320px × 通常/低モーションの隔離セーブで同一操作を比較。押下直後の旧scaleは約1、変更後は102%/94%。低モーションでは両版とも変形なし。保存失敗、古いボタン連打、再読込、タッチキャンセル、focus喪失とdisabledを確認。数値差は既存stats関数の保存前後の値。本文は#203d59/背景#d7e9f3でコントラストを回帰検査。

実機の触感・全GPU・全描画フレームを保証するものではない。QA画像や合成セーブは公開ビルドに含めない。
