// Render "you cooked it." banners, one per category accent colour (cream on accent).
// Run:
//   node build/banners.mjs                 all colours
//   node build/banners.mjs stew chicken    just these (samples)
//   node build/banners.mjs --w 1600 --h 500   custom size
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...a) => path.join(ROOT, ...a);
const CAT = { chicken:'#e2561f',curry:'#e8991c',rice:'#b7923c',dessert:'#ff4d6d',cake:'#ef5fa0',baking:'#b86a4a',
  salad:'#4f8a3a',veg:'#6fae3c',vegetarian:'#3c9e74',breakfast:'#e9a72f',brunch:'#d98a52',pasta:'#c0341a',
  seafood:'#2f9bb0',soup:'#cf7b2a',stew:'#9c5526',bread:'#c98a3a',drinks:'#8a5cc4',sauce:'#cf3636' };
const CREAM = '#f6edda';

const argVal = (n, d) => { const i = process.argv.indexOf(n); return i !== -1 ? process.argv[i + 1] : d; };
const W = +argVal('--w', 1600), H = +argVal('--h', 500), OUTDIR = argVal('--dir', 'banners');
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--') && CAT[a]);
const cats = wanted.length ? wanted : Object.keys(CAT);

const stacked = W / H < 1.5;  // square/portrait -> stack the words to fill the frame
const html = (accent) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@800&display=swap" rel="stylesheet">
<style>*{margin:0}html,body{width:${W}px;height:${H}px}
body{background:${accent};display:flex;align-items:center;justify-content:center;overflow:hidden}
.t{font-family:'Unbounded';font-weight:800;color:${CREAM};text-transform:lowercase;letter-spacing:-.02em;text-align:center;line-height:${stacked ? '.92' : '1'};white-space:${stacked ? 'normal' : 'nowrap'}}</style></head>
<body><div class="t" id="t">${stacked ? 'you<br>cooked<br>it.' : 'you cooked it.'}</div></body></html>`;

(async () => {
  fs.mkdirSync(p(OUTDIR), { recursive: true });
  const cardPath = p('build', '_banner.html');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  let n = 0;
  for (const c of cats) {
    fs.writeFileSync(cardPath, html(CAT[c]));
    await page.goto(pathToFileURL(cardPath).href, { waitUntil: 'networkidle0' });
    await page.evaluate(() => (document.fonts ? document.fonts.ready : null));
    await page.evaluate((w, h, st) => { const t = document.getElementById('t'); let s = 40; t.style.fontSize = s + 'px';
      const fits = () => t.scrollWidth <= w * (st ? 0.84 : 0.88) && t.scrollHeight <= h * 0.86;
      while (fits() && s < 700) { s += 4; t.style.fontSize = s + 'px'; }
      while (!fits() && s > 16) { s -= 2; t.style.fontSize = s + 'px'; } }, W, H, stacked);
    await new Promise((r) => setTimeout(r, 60));
    await page.screenshot({ path: p(OUTDIR, c + '.png'), type: 'png' });
    process.stdout.write(`\r  banner ${++n}/${cats.length}: ${c}              `);
  }
  await browser.close();
  try { fs.unlinkSync(cardPath); } catch (e) {}
  console.log(`\nDone. ${n} banner(s) ${W}x${H} -> banners/`);
})().catch((e) => { console.error(e); process.exit(1); });
