export function allowedChange(file){
  return /^(src\/(royal-ui\.(js|css)|illustrated-ui\.css|game-ui\.css|scenes\.js|app\.js)|index\.html|assets\/redesign\/[\w.-]+\.(png|webp)|docs\/art-provenance\/[\w-]+\.md|docs\/visual-verification\/[\w-]+\/[\w.-]+\.(png|webp))$/.test(file);
}

export function reviewDecision(review){
  const strings=list=>Array.isArray(list)&&list.every(item=>typeof item==='string'&&item.trim());
  if(!review||!['pass','revise','blocked'].includes(review.verdict)||typeof review.summary!=='string'||!review.summary.trim()||
    !strings(review.findings)||!strings(review.unverified))throw Error('Invalid reviewer result.');
  const findings=[...review.findings];
  if(review.referenceViewed!==true)findings.push('参考画像を確認できませんでした。参考画像を添付して再レビューしてください。');
  if(review.screenshotsViewed!==true)findings.push('実キャプチャを確認できませんでした。変更前後の画像を添付して再レビューしてください。');
  if(review.referenceViewed!==true||review.screenshotsViewed!==true||review.verdict==='blocked'||(review.verdict==='revise'&&!findings.length)){
    if(!findings.length)findings.push('差し戻しまたは停止の理由が示されていません。確認できない条件と再開に必要なものを再提示してください。');
    return {...review,verdict:'blocked',findings,needsDecision:true};
  }
  return {...review,verdict:findings.length?'revise':review.verdict,findings,needsDecision:false};
}

export function reviewComment(review,sha,evidenceUrl){
  if(!/^[0-9a-f]{40}$/.test(sha))throw Error('Expected the reviewed commit SHA.');
  const expected=`https://github.com/Min-Konny/astral-crown/tree/${sha}/docs/visual-verification/`;
  const suffix=typeof evidenceUrl==='string'&&evidenceUrl.startsWith(expected)?evidenceUrl.slice(expected.length):'';
  if(!/^[\w-]+(?:\/[\w-]+)*$/.test(suffix))throw Error('Expected the capture directory at the reviewed commit.');
  const list=items=>items.length?items.map(item=>`- ${item}`).join('\n'):'なし';
  const verdict=review.verdict==='pass'?'pass':'revise';
  return [
    `[レビュー] ${verdict}\n対象コミット: \`${sha}\``,
    `## 確認したもの\n${review.summary}`,
    `## 未確認のもの\n${list(review.unverified)}`,
    `## 指摘\n${list(review.findings)}`,
    ...(review.needsDecision?['停止しました。Issueの「社長判断」ラベルで確認を引き継ぎます。']:[]),
    `[変更前後の実キャプチャ](${evidenceUrl})`
  ].join('\n\n');
}
