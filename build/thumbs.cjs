// Generate small card thumbnails from the full hero images.
// The home grid shows each plate at ~110px but was downloading the full 1024px PNG.
// This writes a 256px version (retina-sharp at that size) to images/thumb/<slug>.png,
// keeping transparency. The full image is still used on the recipe hero page.
//
// Run:  node build/thumbs.cjs
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'images');
const DST = path.join(ROOT, 'images', 'thumb');
const SIZE = 256;

(async () => {
  if (!fs.existsSync(SRC)) { console.log('no images/ folder'); return; }
  fs.mkdirSync(DST, { recursive: true });
  const files = fs.readdirSync(SRC).filter((f) => /\.png$/i.test(f));
  let n = 0, bytes = 0;
  for (const f of files) {
    const img = await Jimp.read(path.join(SRC, f));
    img.resize(SIZE, Jimp.AUTO, Jimp.RESIZE_BICUBIC); // square sources stay square; alpha preserved
    const out = path.join(DST, f.toLowerCase());
    await img.writeAsync(out);
    bytes += fs.statSync(out).size;
    process.stdout.write(`\r  thumb ${++n}/${files.length}: ${f}                 `);
  }
  console.log(`\nDone. ${n} thumbnails -> images/thumb/  (avg ${n ? Math.round(bytes / n / 1024) : 0} KB each)`);
})().catch((e) => { console.error(e); process.exit(1); });
