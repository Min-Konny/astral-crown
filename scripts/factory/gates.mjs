export function allowedChange(file){
  return /^(src\/(royal-ui\.(js|css)|illustrated-ui\.css|game-ui\.css|scenes\.js|app\.js)|index\.html|assets\/redesign\/[a-zA-Z0-9_.-]+\.(png|webp))$/.test(file);
}

export function reviewDecision(review){
  if(!review||!['pass','revise','blocked'].includes(review.verdict)||typeof review.summary!=='string'||!Array.isArray(review.findings)||review.findings.some(f=>typeof f!=='string'))throw Error('Invalid reviewer result.');
  if(review.referenceViewed!==true||review.screenshotsViewed!==true)return {...review,verdict:'blocked'};
  if(review.verdict==='pass'&&review.findings.length)return {...review,verdict:'revise'};
  return review;
}

export function reviewComment(review,sha,evidenceUrl){
  if(!/^[0-9a-f]{40}$/.test(sha))throw Error('Expected the reviewed commit SHA.');
  const verdict=review.verdict==='pass'?'pass':'revise';
  const pending=review.verdict==='blocked'?'未確認の受入条件があり、ループを停止しました。':'';
  return [
    `[レビュー] ${verdict}`,`対象コミット: \`${sha}\``,'',review.summary,pending,
    ...review.findings.map(f=>`- ${f}`),'',`[変更前後の実キャプチャ](${evidenceUrl})`
  ].join('\n');
}
