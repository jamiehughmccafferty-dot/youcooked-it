// webp.mjs — generate WebP variants for every hero image and thumbnail.
// Heroes get three widths for srcset (480 / 768 / 1024), thumbs get one (256).
// Skips files whose .webp is already newer than the source .png, so re-runs
// are cheap and the friday pipeline can call this every week.
//
// Run: node build/webp.mjs        (or via friday.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...a) => path.join(ROOT, ...a);

const fresh = (src, dst) => {
  try { return fs.statSync(dst).mtimeMs >= fs.statSync(src).mtimeMs; } catch { return false; }
};

const jobs = [];
const queue = (src, dst, width, quality) => {
  if (fresh(src, dst)) return;
  jobs.push(async () => {
    await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality }).toFile(dst);
  });
};

for (const f of fs.readdirSync(p('images')).filter(f => /\.png$/i.test(f))) {
  const slug = f.replace(/\.png$/i, '');
  const src = p('images', f);
  queue(src, p('images', slug + '.webp'), 1024, 78);
  queue(src, p('images', slug + '-768.webp'), 768, 78);
  queue(src, p('images', slug + '-480.webp'), 480, 76);
}
for (const f of fs.readdirSync(p('images', 'thumb')).filter(f => /\.png$/i.test(f))) {
  const slug = f.replace(/\.png$/i, '');
  queue(p('images', 'thumb', f), p('images', 'thumb', slug + '.webp'), 256, 80);
}

const CONC = 8;
let i = 0, done = 0;
await Promise.all(Array.from({ length: CONC }, async () => {
  while (i < jobs.length) { const j = jobs[i++]; await j(); done++; }
}));
console.log('webp: ' + done + ' file(s) generated' + (done ? '' : ' (all up to date)') + '.');
