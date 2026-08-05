const { marked } = require('marked');
const fs = require('fs');
const path = require('path');

// "1부~3부"처럼 범위 표시로 쓴 물결표(~)를 취소선 문법으로 오인하는 문제 방지
marked.use({ tokenizer: { del() { return undefined; } } });

const mdFile = process.argv[2];
const outFile = process.argv[3] || mdFile.replace(/\.md$/, '.preview.html');

const md = fs.readFileSync(path.join(__dirname, '..', mdFile), 'utf8');
const body = marked.parse(md);

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${path.basename(mdFile)}</title>
<style>
  body{background:#0f1117;color:#e6e8ee;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;line-height:1.7;max-width:820px;margin:0 auto;padding:40px 24px 120px}
  h1,h2,h3{color:#fff;border-bottom:1px solid #2a2e3a;padding-bottom:8px}
  img{max-width:100%;border-radius:8px;display:block;margin:14px 0}
  strong{color:#f2c14e}
  sub{color:#7c8698;font-size:12px}
  blockquote{border-left:3px solid #5eb0ef;padding-left:14px;color:#c7ccd6;background:#161925;margin-left:0}
  a{color:#5eb0ef}
  hr{border-color:#2a2e3a}
  code{background:#1c1f2b;padding:2px 6px;border-radius:4px}
</style>
</head><body>${body}</body></html>`;

fs.writeFileSync(path.join(__dirname, '..', outFile), html);
console.log('작성됨:', outFile);
