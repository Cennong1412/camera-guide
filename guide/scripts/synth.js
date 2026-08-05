// 같은 원본 사진에서 노출/ISO노이즈/화이트밸런스/RAW-JPEG 편집 느낌을 합성하는 스크립트
const { Jimp } = require('jimp');
const path = require('path');

function clamp(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function scanApply(img, fn) {
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
    const d = this.bitmap.data;
    const rgb = fn(d[idx], d[idx + 1], d[idx + 2], x, y);
    d[idx] = clamp(rgb[0]);
    d[idx + 1] = clamp(rgb[1]);
    d[idx + 2] = clamp(rgb[2]);
  });
}

function brightness(img, delta) {
  scanApply(img, (r, g, b) => [r + delta, g + delta, b + delta]);
}

function contrast(img, factor) {
  scanApply(img, (r, g, b) => [
    (r - 128) * factor + 128,
    (g - 128) * factor + 128,
    (b - 128) * factor + 128,
  ]);
}

function saturation(img, factor) {
  scanApply(img, (r, g, b) => {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return [lum + (r - lum) * factor, lum + (g - lum) * factor, lum + (b - lum) * factor];
  });
}

function tint(img, rD, gD, bD) {
  scanApply(img, (r, g, b) => [r + rD, g + gD, b + bD]);
}

function noise(img, amount) {
  scanApply(img, (r, g, b) => {
    const n1 = (Math.random() - 0.5) * amount;
    const n2 = (Math.random() - 0.5) * amount;
    const n3 = (Math.random() - 0.5) * amount;
    return [r + n1, g + n2, b + n3];
  });
}

async function run() {
  const outDir = path.join(__dirname, '..', 'assets', '01');
  const srcDir = path.join(outDir, '_source');

  // 1. 노출 3단 비교 (1.1)
  {
    const base = await Jimp.read(path.join(srcDir, 'exposure_base.jpg'));
    const correct = base.clone();
    await correct.write(path.join(outDir, '1-1_exposure-correct.jpg'));

    const under = base.clone();
    brightness(under, -85);
    contrast(under, 1.05);
    await under.write(path.join(outDir, '1-1_exposure-under.jpg'));

    const over = base.clone();
    brightness(over, 90);
    contrast(over, 0.9);
    await over.write(path.join(outDir, '1-1_exposure-over.jpg'));
    console.log('1.1 노출 3단 완료');
  }

  // 2. ISO 노이즈 비교 (1.4)
  {
    const base = await Jimp.read(path.join(srcDir, 'iso_base.jpg'));
    const low = base.clone();
    brightness(low, -10);
    await low.write(path.join(outDir, '1-4_iso-low.jpg'));

    const high = base.clone();
    brightness(high, 55);
    noise(high, 130);
    await high.write(path.join(outDir, '1-4_iso-high.jpg'));
    console.log('1.4 ISO 노이즈 완료');
  }

  // 3. 화이트밸런스 3단 비교 (1.7)
  {
    const base = await Jimp.read(path.join(srcDir, 'wb_base.jpg'));
    const neutral = base.clone();
    await neutral.write(path.join(outDir, '1-7_wb-neutral.jpg'));

    const warm = base.clone();
    tint(warm, 35, 12, -30);
    await warm.write(path.join(outDir, '1-7_wb-warm.jpg'));

    const cool = base.clone();
    tint(cool, -25, 0, 35);
    await cool.write(path.join(outDir, '1-7_wb-cool.jpg'));
    console.log('1.7 화이트밸런스 3단 완료');
  }

  // 4. RAW vs JPEG 편집 전후 (1.8)
  {
    const base = await Jimp.read(path.join(srcDir, 'rawjpeg_base.jpg'));
    const before = base.clone();
    contrast(before, 0.75);
    saturation(before, 0.55);
    brightness(before, -8);
    await before.write(path.join(outDir, '1-8_rawedit-before.jpg'));

    const after = base.clone();
    contrast(after, 1.18);
    saturation(after, 1.35);
    brightness(after, 6);
    await after.write(path.join(outDir, '1-8_rawedit-after.jpg'));
    console.log('1.8 RAW 편집 전후 완료');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
