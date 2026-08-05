// Snapseed_완벽가이드_한글정리.md 를 PDF로 변환 (사진앱 루트 기준 별도 자료, 6부 빌드 파이프라인과 무관)
const { marked } = require('marked');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

marked.use({ tokenizer: { del() { return undefined; } } });

const APP_ROOT = path.join(__dirname, '..', '..'); // 사진앱/
const MD_PATH = path.join(APP_ROOT, 'Snapseed_완벽가이드_한글정리.md');
const OUT_PDF = path.join(APP_ROOT, 'guide', 'pdf', 'Snapseed_완벽가이드.pdf');
const TMP_HTML = path.join(APP_ROOT, '_tmp_snapseed.html');

const CSS = `
  @page { margin: 20mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
    color: #202225;
    line-height: 1.7;
    font-size: 14px;
  }
  h1 {
    font-size: 22px;
    color: #16324f;
    border-bottom: 3px solid #16324f;
    padding-bottom: 10px;
    margin-top: 0;
  }
  h2 {
    font-size: 18px;
    color: #1c4e80;
    border-bottom: 1px solid #d8dde3;
    padding-bottom: 6px;
    margin-top: 30px;
  }
  h3 { font-size: 15px; color: #35618f; margin-top: 22px; }
  p, li { color: #2a2d31; }
  strong { color: #b5730a; }
  em { color: #5a6272; font-style: normal; background: #f2f5f8; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
  img {
    max-width: 70%;
    display: block;
    margin: 10px auto;
    border-radius: 8px;
    border: 1px solid #d8dde3;
    page-break-inside: avoid;
  }
  p:has(> img) { page-break-inside: avoid; break-inside: avoid; }
  blockquote {
    border-left: 3px solid #1c4e80;
    padding: 8px 14px;
    color: #454a50;
    background: #f2f5f8;
    margin: 8px 0;
    font-size: 12.5px;
  }
  hr { border: none; border-top: 1px solid #d8dde3; margin: 22px 0; }
  a { color: #1c4e80; }
`;

async function run() {
  const md = fs.readFileSync(MD_PATH, 'utf8');
  const body = marked.parse(md);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Snapseed 완벽 가이드</title><style>${CSS}</style></head><body>${body}</body></html>`;
  fs.writeFileSync(TMP_HTML, html);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('file:///' + TMP_HTML.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  fs.mkdirSync(path.dirname(OUT_PDF), { recursive: true });
  await page.pdf({
    path: OUT_PDF,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    footerTemplate: `<div style="width:100%;font-size:9px;color:#999;text-align:center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
    headerTemplate: `<div></div>`,
    margin: { top: '20mm', bottom: '16mm', left: '18mm', right: '18mm' },
  });
  await browser.close();
  fs.unlinkSync(TMP_HTML);
  console.log('생성됨:', OUT_PDF);
}

run().catch((e) => { console.error(e); process.exit(1); });
