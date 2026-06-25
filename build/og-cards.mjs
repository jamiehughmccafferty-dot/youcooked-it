// Render a 1200x630 social share card per recipe with Puppeteer (real Unbounded
// font + category blob + the recipe's plate). Cards are committed and served at
// /og/<slug>.jpg; generate.mjs points og:image at them.
//
// Run:
//   node build/og-cards.mjs                 all recipes that have a hero image
//   node build/og-cards.mjs marry-me-chicken tiramisu   just these (for samples)
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...a) => path.join(ROOT, ...a);

const CAT = { curry:'#e8991c',rice:'#b7923c',chicken:'#e2561f',dessert:'#ff4d6d',cake:'#ef5fa0',baking:'#b86a4a',
  salad:'#4f8a3a',veg:'#6fae3c',vegetarian:'#3c9e74',breakfast:'#e9a72f',brunch:'#d98a52',pasta:'#c0341a',
  seafood:'#2f9bb0',soup:'#cf7b2a',stew:'#9c5526',bread:'#c98a3a',drinks:'#8a5cc4',sauce:'#cf3636' };
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const records = JSON.parse(fs.readFileSync(p('recipes.json'), 'utf8'));
const have = new Set(fs.existsSync(p('images')) ? fs.readdirSync(p('images')).map((f) => f.toLowerCase()) : []);
const argSlugs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
let targets = records.filter((r) => have.has((r.slug + '.png').toLowerCase()));
if (argSlugs.length) targets = targets.filter((r) => argSlugs.includes(r.slug));

const cardHtml = (rec) => {
  const accent = CAT[rec.category] || '#e2561f';
  const serves = (rec.meta && rec.meta.serves) || 4;
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@800&family=Hanken+Grotesk:wght@400&family=Space+Mono:wght@400&display=swap" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}
html,body{width:1200px;height:630px}
body{background:#fff;font-family:'Hanken Grotesk',system-ui,sans-serif;overflow:hidden;position:relative}
.brand{position:absolute;top:60px;left:80px;font-family:'Unbounded';font-weight:800;font-size:28px;letter-spacing:-.02em;color:#241712;text-transform:lowercase}
.brand .em{color:${accent}}
.left{position:absolute;left:80px;top:0;height:630px;width:600px;display:flex;flex-direction:column;justify-content:center}
.eyebrow{font-family:'Space Mono';font-size:17px;letter-spacing:.22em;text-transform:uppercase;color:#241712;margin-bottom:16px}
.title{font-family:'Unbounded';font-weight:800;font-size:92px;line-height:.9;text-transform:lowercase;color:${accent};letter-spacing:-.01em;max-width:540px}
.art{position:absolute;right:-26px;top:50%;transform:translateY(-50%);width:560px;height:560px;display:grid;place-items:center}
.blob{position:absolute;width:100%;height:100%;background:${accent};border-radius:42% 58% 63% 37%/41% 44% 56% 59%}
.plate{position:relative;width:94%;z-index:2;filter:drop-shadow(0 26px 30px rgba(120,40,15,.35))}
</style></head><body>
<div class="brand">you <span class="em">cooked</span> it</div>
<div class="left"><div class="eyebrow">the recipe &middot; serves ${serves}</div><div class="title" id="t">${esc((rec.title || '').toLowerCase())}</div></div>
<div class="art"><div class="blob"></div><img class="plate" src="../images/${rec.slug}.png"></div>
</body></html>`;
};

(async () => {
  fs.mkdirSync(p('og'), { recursive: true });
  const cardPath = p('build', '_card.html');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  let n = 0;
  for (const rec of targets) {
    fs.writeFileSync(cardPath, cardHtml(rec));
    await page.goto(pathToFileURL(cardPath).href, { waitUntil: 'networkidle0' });
    await page.evaluate(() => (document.fonts ? document.fonts.ready : null));
    // fit the title to its column AFTER the webfont has loaded (else it measures the fallback)
    await page.evaluate(() => { const t = document.getElementById('t'); let s = 92; t.style.fontSize = s + 'px';
      while ((t.scrollWidth > 540 || t.scrollHeight > 376) && s > 38) { s -= 3; t.style.fontSize = s + 'px'; } });
    await new Promise((r) => setTimeout(r, 80));
    await page.screenshot({ path: p('og', rec.slug + '.jpg'), type: 'jpeg', quality: 90 });
    process.stdout.write(`\r  card ${++n}/${targets.length}: ${rec.slug}                 `);
  }
  await browser.close();
  try { fs.unlinkSync(cardPath); } catch (e) {}
  console.log(`\nDone. ${n} OG card(s) -> og/`);
})().catch((e) => { console.error(e); process.exit(1); });
