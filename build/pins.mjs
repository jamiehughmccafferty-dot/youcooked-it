// Render 1000x1500 Pinterest pins, one per recipe, matching the established
// pin design on pinterest.com/YouCookedIt (white top tab + logo chip, Title Case
// title, "35 mins | easy", plate on an organic accent curve, dotted grid,
// NO MORE DOOM SCROLLING tagline, youcooked-it.com pill).
//
// Run:
//   node build/pins.mjs                    all recipes with a hero image
//   node build/pins.mjs marry-me-chicken   just these (samples)
// Output: pins/<slug>.jpg  (local asset for Pinterest uploads; gitignored)
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...a) => path.join(ROOT, ...a);

const CAT = { curry:'#e8991c',rice:'#b7923c',chicken:'#e2561f',dessert:'#ff4d6d',cake:'#ef5fa0',baking:'#b86a4a',
  salad:'#4f8a3a',veg:'#6fae3c',vegetarian:'#3c9e74',breakfast:'#e9a72f',brunch:'#d98a52',pasta:'#c0341a',
  seafood:'#2f9bb0',soup:'#cf7b2a',stew:'#9c5526',bread:'#c98a3a',drinks:'#8a5cc4',sauce:'#cf3636' };
const esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const records = JSON.parse(fs.readFileSync(p('recipes.json'), 'utf8'));
const have = new Set(fs.existsSync(p('images')) ? fs.readdirSync(p('images')).map((f) => f.toLowerCase()) : []);
const argSlugs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
let targets = records.filter((r) => have.has((r.slug + '.png').toLowerCase()));
if (argSlugs.length) targets = targets.filter((r) => argSlugs.includes(r.slug));

const metaLine = (rec) => {
  const t = (rec.meta && rec.meta.total_time || '').replace(/\bmin\b/, 'mins');
  const s = rec.meta && rec.meta.skill || '';
  return [t, s].filter(Boolean).join(' | ');
};

// deterministic per-slug variance so pins posted side by side don't share one identical curve
const seeded = (slug) => { let h = 0; for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pick = (min, max) => { h = (h * 1103515245 + 12345) >>> 0; return min + (h % 1000) / 1000 * (max - min); };
  return {
    brX: pick(40, 58).toFixed(0), brY: pick(42, 60).toFixed(0),      // bottom curve horizontal radii
    brA: pick(24, 36).toFixed(0), brB: pick(34, 46).toFixed(0),      // bottom curve vertical radii
    blobTop: pick(600, 760).toFixed(0), blobSize: pick(360, 470).toFixed(0), blobRight: pick(-200, -130).toFixed(0),
    dotsTop: pick(930, 1030).toFixed(0)
  };
};

const pinHtml = (rec) => {
  const accent = CAT[rec.category] || '#e2561f';
  const v = seeded(rec.slug);
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}
html,body{width:1000px;height:1500px}
body{background:#fff;font-family:'Poppins',sans-serif;overflow:hidden;position:relative}
.top{position:absolute;left:-24%;top:-46%;width:148%;height:114%;background:${accent};border-radius:0 0 ${v.brX}% ${v.brY}%/0 0 ${v.brA}% ${v.brB}%}
.sideblob{position:absolute;right:${v.blobRight}px;top:${v.blobTop}px;width:${v.blobSize}px;height:${v.blobSize}px;background:${accent};border-radius:50%}
.tab{position:absolute;top:0;left:50%;transform:translateX(-50%);width:370px;height:200px;background:#fff;border-radius:0 0 52px 52px;display:flex;align-items:flex-start;justify-content:center}
.chip{margin-top:30px;width:142px;height:142px;background:${accent};border-radius:34px;color:#fff;display:flex;align-items:center;justify-content:center}
.chip div{font-weight:700;font-size:31px;line-height:1.04;letter-spacing:-.01em}
.title{position:absolute;top:236px;left:60px;right:60px;text-align:center;color:#fff;font-weight:700;font-size:76px;line-height:1.05}
.meta{position:absolute;top:0;left:0;right:0;text-align:center;color:#fff;font-weight:600;font-size:30px}
.plate{position:absolute;left:50%;top:790px;transform:translate(-50%,-50%);width:700px;filter:drop-shadow(0 30px 36px rgba(40,20,10,.30));z-index:2}
.dots{position:absolute;right:120px;top:${v.dotsTop}px;width:130px;height:130px;z-index:1;
  background-image:radial-gradient(${accent} 4.5px, transparent 5px);background-size:26px 26px}
.tagline{position:absolute;top:1218px;left:0;right:0;text-align:center;color:${accent};font-weight:700;font-size:31px;letter-spacing:.04em;text-transform:uppercase}
.pill{position:absolute;top:1300px;left:50%;transform:translateX(-50%);background:${accent};color:#fff;border-radius:999px;
  padding:16px 36px;font-weight:600;font-size:29px;display:flex;align-items:center;gap:12px}
.pill svg{width:26px;height:26px}
</style></head><body>
<div class="top"></div>
<div class="sideblob"></div>
<div class="tab"><div class="chip"><div>you<br>cooked<br>it.</div></div></div>
<div class="title" id="t">${esc(rec.title)}</div>
<div class="meta" id="m">${esc(metaLine(rec))}</div>
<div class="dots"></div>
<img class="plate" src="../images/${rec.slug}.png">
<div class="tagline">no more doom scrolling</div>
<div class="pill"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9s1.3-6.4 3.9-9z"/></svg>youcooked-it.com</div>
</body></html>`;
};

(async () => {
  fs.mkdirSync(p('pins'), { recursive: true });
  const tmp = p('build', '_pin.html');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 1500, deviceScaleFactor: 1 });
  let n = 0;
  for (const rec of targets) {
    fs.writeFileSync(tmp, pinHtml(rec));
    await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle0' });
    await page.evaluate(() => (document.fonts ? document.fonts.ready : null));
    // fit title (max 2 lines), then sit the meta line just below it
    await page.evaluate(() => {
      const t = document.getElementById('t'), m = document.getElementById('m');
      let s = 76; t.style.fontSize = s + 'px';
      while ((t.scrollWidth > 880 || t.scrollHeight > 170) && s > 40) { s -= 2; t.style.fontSize = s + 'px'; }
      m.style.top = (236 + t.getBoundingClientRect().height + 26) + 'px';
    });
    await new Promise((r) => setTimeout(r, 80));
    await page.screenshot({ path: p('pins', rec.slug + '.jpg'), type: 'jpeg', quality: 90 });
    process.stdout.write(`\r  pin ${++n}/${targets.length}: ${rec.slug}                 `);
  }
  await browser.close();
  try { fs.unlinkSync(tmp); } catch (e) {}
  console.log(`\nDone. ${n} pin(s) 1000x1500 -> pins/`);
})().catch((e) => { console.error(e); process.exit(1); });
