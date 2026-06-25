// Generate the full favicon set from the two brand masters.
//   branding/_master-white.png  (black mark on white)  -> default / light
//   branding/_master-black.png  (white mark on black)  -> dark mode
// Re-run after updating the source:  node build/favicons.cjs
// Then `node build/generate.mjs` to refresh the <head> references.
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const pngToIco = require('png-to-ico').default || require('png-to-ico');

const ROOT = path.resolve(__dirname, '..');
const B = (f) => path.join(ROOT, 'branding', f);
const out = (f) => path.join(ROOT, f);

(async () => {
  const white = await Jimp.read(B('_master-white.png'));
  const black = await Jimp.read(B('_master-black.png'));
  const png = async (img, size) => (await img.clone().resize(size, size, Jimp.RESIZE_BICUBIC).getBufferAsync(Jimp.MIME_PNG));
  const writePng = async (img, size, file) => { fs.writeFileSync(out(file), await png(img, size)); };

  // raster icons from the light (black-on-white) master
  await writePng(white, 180, 'apple-touch-icon.png');
  await writePng(white, 192, 'icon-192.png');
  await writePng(white, 512, 'icon-512.png');

  // multi-size favicon.ico (16/32/48) — Google's default lookup
  const ico = await pngToIco(await Promise.all([16, 32, 48].map((s) => png(white, s))));
  fs.writeFileSync(out('favicon.ico'), ico);

  // adaptive favicon.svg — light master by default, dark master under prefers-color-scheme: dark
  const w = (await png(white, 128)).toString('base64');
  const b = (await png(black, 128)).toString('base64');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">' +
    '<style>.d{display:none}@media (prefers-color-scheme:dark){.l{display:none}.d{display:inline}}</style>' +
    '<image class="l" width="128" height="128" href="data:image/png;base64,' + w + '"/>' +
    '<image class="d" width="128" height="128" href="data:image/png;base64,' + b + '"/>' +
    '</svg>\n';
  fs.writeFileSync(out('favicon.svg'), svg);

  console.log('favicon set: favicon.ico (16/32/48), favicon.svg (adaptive), apple-touch-icon.png (180), icon-192.png, icon-512.png');
})().catch((e) => { console.error(e); process.exit(1); });
