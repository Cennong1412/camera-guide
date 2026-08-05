// Pexels API 헬퍼: 검색 미리보기 / 다운로드
// 사용법:
//   node scripts/pexels.js search "query" [per_page]
//   node scripts/pexels.js download <photo_id> <output_relative_path> [size]
//     size: original|large2x|large|medium|small (기본 large2x)

const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

loadEnv();
const API_KEY = process.env.PEXELS_API_KEY;
if (!API_KEY) {
  console.error('PEXELS_API_KEY not found in .env');
  process.exit(1);
}

async function search(query, perPage = 8) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: API_KEY } });
  if (!res.ok) {
    console.error('Search failed:', res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  if (!data.photos || data.photos.length === 0) {
    console.log('결과 없음');
    return;
  }
  for (const p of data.photos) {
    console.log(`id=${p.id} | ${p.width}x${p.height} | photographer=${p.photographer} | alt="${p.alt}" | url=${p.url}`);
  }
}

async function download(photoId, outRelPath, size = 'large2x') {
  const url = `https://api.pexels.com/v1/photos/${photoId}`;
  const res = await fetch(url, { headers: { Authorization: API_KEY } });
  if (!res.ok) {
    console.error('Fetch photo failed:', res.status, await res.text());
    process.exit(1);
  }
  const photo = await res.json();
  const srcUrl = photo.src[size] || photo.src.large2x;
  const imgRes = await fetch(srcUrl);
  if (!imgRes.ok) {
    console.error('Image download failed:', imgRes.status);
    process.exit(1);
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const outPath = path.join(__dirname, '..', outRelPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  console.log(`저장됨: ${outRelPath} (${(buf.length / 1024).toFixed(0)} KB)`);
  console.log(`크레딧: Photo by ${photo.photographer} on Pexels (${photo.url})`);
}

const [, , cmd, ...args] = process.argv;

if (cmd === 'search') {
  const [query, perPage] = args;
  search(query, perPage ? Number(perPage) : 8);
} else if (cmd === 'download') {
  const [photoId, outRelPath, size] = args;
  download(photoId, outRelPath, size);
} else {
  console.log('사용법: node scripts/pexels.js search "query" [per_page]');
  console.log('       node scripts/pexels.js download <photo_id> <output_relative_path> [size]');
}
