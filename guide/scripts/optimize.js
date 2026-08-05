// assets/<folder> 내 jpg를 최대 폭 1600px, 품질 80으로 리사이즈/압축 (원본 크기 초과 시에만 축소)
const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

const MAX_W = 1600;
const QUALITY = 80;

async function run() {
  const folder = process.argv[2];
  if (!folder) {
    console.error('사용법: node scripts/optimize.js assets/01');
    process.exit(1);
  }
  const dir = path.join(__dirname, '..', folder);
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.jpg'));
  for (const f of files) {
    const fp = path.join(dir, f);
    const img = await Jimp.read(fp);
    if (img.bitmap.width > MAX_W) {
      img.resize({ w: MAX_W });
    }
    await img.write(fp, { quality: QUALITY });
    const kb = (fs.statSync(fp).size / 1024).toFixed(0);
    console.log(`${f}: ${kb} KB`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
