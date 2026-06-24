// Make black-background hero photos transparent.
// Flood-fills the connected dark region inward from the image border, so dark
// spots INSIDE the food (sauces, char, chocolate) are never keyed out.
// A luminance ramp between LOW and HIGH gives a soft, anti-aliased edge.
//
// Usage:
//   node build/transparent.cjs               process images/ in place
//   node build/transparent.cjs <src> <dst>   process all PNGs src -> dst
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const LOW = 16;    // <= this luma  -> fully transparent
const HIGH = 70;   // >= this luma  -> treated as subject (stops the fill)
const CHROMA = 10; // >= this colour (max-min channel) -> subject, even if dark
                   // (the black studio background is neutral grey; food carries colour,
                   //  so this protects dark-on-black dishes like chocolate cake)

async function keyBlack(srcPath, dstPath) {
  const img = await Jimp.read(srcPath);
  const { width: w, height: h, data } = img.bitmap; // data = RGBA Buffer
  const luma = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  const chroma = (i) => Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);

  const visited = new Uint8Array(w * h);
  const stack = [];
  const pushIf = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    if (luma(p * 4) >= HIGH || chroma(p * 4) >= CHROMA) return; // hit the subject, stop
    visited[p] = 1;
    stack.push(p);
  };
  // seed from every border pixel
  for (let x = 0; x < w; x++) { pushIf(x, 0); pushIf(x, h - 1); }
  for (let y = 0; y < h; y++) { pushIf(0, y); pushIf(w - 1, y); }

  while (stack.length) {
    const p = stack.pop();
    const x = p % w, y = (p / w) | 0;
    pushIf(x + 1, y); pushIf(x - 1, y); pushIf(x, y + 1); pushIf(x, y - 1);
  }

  // apply alpha to the background region only
  const span = HIGH - LOW;
  for (let p = 0; p < w * h; p++) {
    if (!visited[p]) continue;
    const l = luma(p * 4);
    const a = l <= LOW ? 0 : Math.min(255, Math.round(((l - LOW) / span) * 255));
    data[p * 4 + 3] = a;
  }

  await img.writeAsync(dstPath);

  // also write a 256px card thumbnail (alpha preserved) so the home grid stays light
  const thumbDir = path.join(path.dirname(dstPath), 'thumb');
  fs.mkdirSync(thumbDir, { recursive: true });
  await img.clone().resize(256, Jimp.AUTO, Jimp.RESIZE_BICUBIC).writeAsync(path.join(thumbDir, path.basename(dstPath)));
}

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const src = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'images');
  const dst = process.argv[3] ? path.resolve(process.argv[3]) : path.join(ROOT, 'images');
  fs.mkdirSync(dst, { recursive: true });
  const files = fs.readdirSync(src).filter((f) => /\.png$/i.test(f));
  let n = 0;
  for (const f of files) {
    await keyBlack(path.join(src, f), path.join(dst, f.toLowerCase()));
    process.stdout.write(`\r  keyed ${++n}/${files.length}: ${f}            `);
  }
  console.log(`\nDone. ${n} image(s) made transparent -> ${path.relative(ROOT, dst) || '.'}`);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
