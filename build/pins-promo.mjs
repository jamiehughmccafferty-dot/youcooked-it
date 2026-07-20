// Render 1000x1500 Pinterest promo pins for the friday five club.
// Same design language as pins.mjs (tab + chip, accent wash, plate on curve,
// dotted grid) but promo copy and the pill links to /friday-five.
//
// Run: node build/pins-promo.mjs
// Output: pins/promo/friday-five-NN.jpg + captions.txt (local, gitignored)
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...a) => path.join(ROOT, ...a);
const esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// one pin per accent, each fronted by a different hero dish
const PROMOS = [
  { n:'01', accent:'#c0341a', slug:'creamy-tuscan-pasta',     title:'The Friday Five' },
  { n:'02', accent:'#e2561f', slug:'jerk-chicken',            title:'5 New Recipes Every Friday' },
  { n:'03', accent:'#e8991c', slug:'chicken-tikka-masala',    title:'Dinner, Decided' },
  { n:'04', accent:'#a8402a', slug:'bbq-ribs',                title:'Your Fridge Has Ideas' },
  { n:'05', accent:'#4f8a3a', slug:'smashed-cucumber-salad',  title:'Five Recipes. Zero Doom Scrolling.' },
  { n:'06', accent:'#9bb020', slug:'vegan-mac-and-cheese',    title:"What's For Dinner? Sorted." },
  { n:'07', accent:'#2f9bb0', slug:'seafood-paella',          title:"Never Wonder What's For Tea" },
  { n:'08', accent:'#8a5cc4', slug:'pimms-cup',               title:'The Best Email Of The Week' },
  { n:'09', accent:'#ff4d6d', slug:'frozen-yogurt-bark',      title:'Cook Something New This Week' },
  { n:'10', accent:'#ef5fa0', slug:'victoria-sponge',         title:'New Recipes Every Friday' },
];
const META = '5 new recipes | every friday | free';
const TAGLINE = 'join the friday five club';

const seeded = (slug) => { let h = 0; for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pick = (min, max) => { h = (h * 1103515245 + 12345) >>> 0; return min + (h % 1000) / 1000 * (max - min); };
  return {
    brX: pick(40, 58).toFixed(0), brY: pick(42, 60).toFixed(0),
    brA: pick(24, 36).toFixed(0), brB: pick(34, 46).toFixed(0),
    blobTop: pick(600, 760).toFixed(0), blobSize: pick(360, 470).toFixed(0), blobRight: pick(-200, -130).toFixed(0),
    dotsTop: pick(930, 1030).toFixed(0)
  };
};

const pinHtml = (pr) => {
  const accent = pr.accent, v = seeded(pr.slug + pr.n);
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
  padding:16px 34px;font-weight:600;font-size:26px;display:flex;align-items:center;gap:12px;white-space:nowrap}
.pill svg{width:26px;height:26px}
</style></head><body>
<div class="top"></div>
<div class="sideblob"></div>
<div class="tab"><div class="chip"><div>you<br>cooked<br>it.</div></div></div>
<div class="title" id="t">${esc(pr.title)}</div>
<div class="meta" id="m">${esc(META)}</div>
<div class="dots"></div>
<img class="plate" src="../images/${pr.slug}.png">
<div class="tagline">${esc(TAGLINE)}</div>
<div class="pill"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9s1.3-6.4 3.9-9z"/></svg>youcooked-it.com/friday-five</div>
</body></html>`;
};

(async () => {
  const outDir = p('pins', 'promo');
  fs.mkdirSync(outDir, { recursive: true });
  const tmp = p('build', '_pin-promo.html');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 1500, deviceScaleFactor: 1 });
  let n = 0;
  for (const pr of PROMOS) {
    fs.writeFileSync(tmp, pinHtml(pr));
    await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle0' });
    await page.evaluate(() => (document.fonts ? document.fonts.ready : null));
    await page.evaluate(() => {
      const t = document.getElementById('t'), m = document.getElementById('m');
      let s = 76; t.style.fontSize = s + 'px';
      while ((t.scrollWidth > 880 || t.scrollHeight > 170) && s > 40) { s -= 2; t.style.fontSize = s + 'px'; }
      m.style.top = (236 + t.getBoundingClientRect().height + 26) + 'px';
    });
    await new Promise((r) => setTimeout(r, 80));
    await page.screenshot({ path: path.join(outDir, 'friday-five-' + pr.n + '.jpg'), type: 'jpeg', quality: 90 });
    process.stdout.write(`\r  promo pin ${++n}/${PROMOS.length}          `);
  }
  await browser.close();
  try { fs.unlinkSync(tmp); } catch (e) {}

  const captions = PROMOS.map((pr) => [
    `friday-five-${pr.n}.jpg`,
    `Title: ${pr.title} · You Cooked It`,
    `Link: https://youcooked-it.com/friday-five`,
    `Board: the friday five`,
    `Description: Five new recipes in your inbox every Friday morning, free. Step-by-step cook-alongs with timers from the You Cooked It kitchen. Join the friday five club.`,
    ''
  ].join('\n')).join('\n');
  fs.writeFileSync(path.join(outDir, 'captions.txt'), captions);
  console.log(`\nDone. ${n} promo pins + captions.txt -> pins/promo/`);
})().catch((e) => { console.error(e); process.exit(1); });
