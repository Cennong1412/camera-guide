// md 파일들을 PDF로 변환 (파트별 개별 PDF + 전체 통합 PDF)
// 원본 md 파일은 건드리지 않고, 임시 html을 생성했다가 변환 후 삭제한다.
const { marked } = require('marked');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 본문에서 "1부~3부"처럼 범위 표시로 쓴 물결표(~)를 취소선 문법으로 오인하는 문제 방지
marked.use({ tokenizer: { del() { return undefined; } } });

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'pdf');

const ORDER = [
  '00_들어가며.md',
  '01_카메라의_기본_원리.md',
  '02_구도와_시각언어.md',
  '03_빛_다루기.md',
  '04_스마트폰_사진_실전.md',
  '05_장르별_촬영가이드_1.md',
  '05_장르별_촬영가이드_2.md',
  '05_장르별_촬영가이드_3.md',
  '06_후반작업_보정.md',
  '07_나만의_스타일_만들기.md',
  '08_연습과_성장.md',
];

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
    font-size: 24px;
    color: #16324f;
    border-bottom: 3px solid #16324f;
    padding-bottom: 10px;
    margin-top: 0;
    page-break-before: always;
  }
  body > h1:first-child { page-break-before: avoid; }
  h2 {
    font-size: 19px;
    color: #1c4e80;
    border-bottom: 1px solid #d8dde3;
    padding-bottom: 6px;
    margin-top: 34px;
  }
  h3 {
    font-size: 16px;
    color: #35618f;
    margin-top: 26px;
  }
  p, li { color: #2a2d31; }
  strong { color: #b5730a; }
  img {
    max-width: 100%;
    display: block;
    margin: 10px auto;
    border-radius: 6px;
    page-break-inside: avoid;
  }
  p:has(> img) {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  sub {
    color: #798089;
    font-size: 11px;
    display: block;
    margin-top: -4px;
    margin-bottom: 14px;
  }
  blockquote {
    border-left: 3px solid #1c4e80;
    padding-left: 14px;
    color: #454a50;
    background: #f2f5f8;
    margin-left: 0;
    padding: 10px 14px;
  }
  a { color: #1c4e80; }
  hr { border: none; border-top: 1px solid #d8dde3; margin: 24px 0; }
  code { background: #f0f2f4; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
  pre { background: #f0f2f4; padding: 12px; border-radius: 6px; overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; margin: 14px 0; }
  th, td { border: 1px solid #d8dde3; padding: 6px 10px; font-size: 13px; text-align: left; }
  th { background: #f2f5f8; }
  .id-photo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 16px;
    margin: 14px 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .id-photo-grid figure {
    margin: 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .id-photo-grid img {
    max-width: 100%;
    max-height: 160px;
    width: auto;
    margin: 0 auto 6px;
  }
  .id-photo-grid figcaption {
    font-size: 12px;
    color: #454a50;
    text-align: left;
  }
  .id-photo-grid-lg {
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
    margin: 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .id-photo-grid-lg figure {
    margin: 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .id-photo-grid-lg img {
    max-width: 100%;
    max-height: 500px;
    width: auto;
    margin: 0 auto 4px;
  }
  .id-photo-grid-lg figcaption {
    font-size: 12px;
    color: #454a50;
    text-align: left;
  }
`;

// 통합 PDF 맨 앞에만 붙는 표지 페이지 (책 표지 느낌의 감성적인 디자인)
const COVER_HTML = `
<div style="page-break-after:always; page-break-inside:avoid; height:229mm; box-sizing:border-box; border:1.5px solid #c9a86a; padding:16mm 14mm; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
  <img src="assets/00/cover.png" alt="사진 공부 표지" style="width:105mm; border-radius:6px; box-shadow:0 10px 30px rgba(20,30,40,0.3); margin:0 0 14mm;">
  <div style="font-size:11px; letter-spacing:5px; color:#a68a5b; margin-bottom:8mm;">PHOTOGRAPHY MANUAL</div>
  <div style="font-size:42px; font-weight:700; color:#1c2b3a; letter-spacing:3px; margin-bottom:8mm;">사진 공부</div>
  <div style="width:44mm; height:1px; background:#c9a86a; margin-bottom:8mm;"></div>
  <div style="font-size:13px; color:#5a6068; line-height:1.8;">스마트폰으로 시작하는 사진 이론 매뉴얼</div>
</div>
`;

function wrapHtml(bodyHtml, title) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>${CSS}</style>
</head><body>${bodyHtml}</body></html>`;
}

function slugOf(relFile) {
  return relFile.replace(/\.md$/, '');
}

function mdBody(relFile) {
  const md = fs.readFileSync(path.join(ROOT, relFile), 'utf8');
  let html = marked.parse(md);
  // 첫 h1에 파일명 기반 앵커 id 부여 (통합 PDF 내부 링크 대상)
  html = html.replace('<h1>', `<h1 id="${slugOf(relFile)}">`);
  return html;
}

// marked가 href를 퍼센트 인코딩해두므로, 앵커/파일명과 정확히 일치시키기 위해 디코딩한다
function decodeHref(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

// 개별(standalone) PDF: 다른 챕터로의 md 링크를 같은 폴더의 형제 PDF로 연결
function rewriteLinksToSiblingPdf(html) {
  return html.replace(/href="([^"#]+?)\.md"/g, (_, p1) => `href="${decodeHref(p1)}.pdf"`);
}

// 통합 PDF: 다른 챕터로의 md 링크를 문서 내부 앵커로 연결
function rewriteLinksToAnchor(html) {
  return html.replace(/href="([^"#]+?)\.md"/g, (_, p1) => `href="#${decodeHref(p1)}"`);
}

// 임시 html을 pdf/ 폴더 안에 만들기 때문에, assets 경로를 한 단계 상위로 보정
function fixImagePaths(html) {
  return html.replace(/src="assets\//g, 'src="../assets/');
}

async function printPdf(page, htmlPath, pdfPath) {
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    footerTemplate: `<div style="width:100%;font-size:9px;color:#999;text-align:center;">
      <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
    headerTemplate: `<div></div>`,
    margin: { top: '20mm', bottom: '16mm', left: '18mm', right: '18mm' },
  });
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // CLI 인자로 특정 챕터 md 파일명(또는 'README.md', 'combined')을 주면 그 항목들만 재생성한다.
  // 인자가 없으면 기존처럼 전체(챕터 전부 + README + 통합)를 빌드한다.
  const requested = process.argv.slice(2);
  const buildAll = requested.length === 0;
  const filesToBuild = buildAll ? ORDER : requested.filter((f) => ORDER.includes(f));
  const buildReadme = buildAll || requested.includes('README.md');
  const buildCombined = buildAll || requested.includes('combined');

  // 1) 파트별 개별 PDF
  for (const file of filesToBuild) {
    const body = fixImagePaths(rewriteLinksToSiblingPdf(mdBody(file)));
    const html = wrapHtml(body, file);
    const tmpHtml = path.join(OUT_DIR, '_tmp_' + file.replace('.md', '.html'));
    fs.writeFileSync(tmpHtml, html);
    const pdfName = file.replace('.md', '.pdf');
    await printPdf(page, tmpHtml, path.join(OUT_DIR, pdfName));
    fs.unlinkSync(tmpHtml);
    console.log('생성됨:', pdfName);
  }

  if (buildReadme) {
    // 2) README(목차) 개별 PDF
    const body = fixImagePaths(rewriteLinksToSiblingPdf(mdBody('README.md')));
    const html = wrapHtml(body, 'README.md');
    const tmpHtml = path.join(OUT_DIR, '_tmp_README.html');
    fs.writeFileSync(tmpHtml, html);
    await printPdf(page, tmpHtml, path.join(OUT_DIR, '00_README_목차.pdf'));
    fs.unlinkSync(tmpHtml);
    console.log('생성됨: 00_README_목차.pdf');
  }

  if (buildCombined) {
    // 3) 전체 통합 PDF (표지 + README 목차 + 00~08 전체)
    const parts = ['README.md', ...ORDER];
    const combinedBody = fixImagePaths(
      COVER_HTML + rewriteLinksToAnchor(parts.map((f) => mdBody(f)).join('\n<hr>\n'))
    );
    const combinedHtml = wrapHtml(combinedBody, '사진 종합 매뉴얼 전체');
    const tmpCombined = path.join(OUT_DIR, '_tmp_combined.html');
    fs.writeFileSync(tmpCombined, combinedHtml);
    await printPdf(page, tmpCombined, path.join(OUT_DIR, '사진_종합_매뉴얼_전체.pdf'));
    fs.unlinkSync(tmpCombined);
    console.log('생성됨: 사진_종합_매뉴얼_전체.pdf');
  }

  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
