// Reports which recipe hero images are present/missing in images/.
// Run:  node build/check-images.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const recs = JSON.parse(fs.readFileSync(path.join(ROOT, 'recipes.json'), 'utf8'));
const imgDir = path.join(ROOT, 'images');
const have = new Set(fs.existsSync(imgDir) ? fs.readdirSync(imgDir).map(f => f.toLowerCase()) : []);

const missing = [], present = [];
recs.forEach(r => (have.has((r.hero || r.slug + '.png').toLowerCase()) ? present : missing).push(r.slug));

console.log(`Hero images: ${present.length}/${recs.length} present, ${missing.length} missing.`);
if (missing.length) {
  console.log('\nMissing:');
  missing.forEach(s => console.log('  images/' + s + '.png'));
}
// Flag any stray images that don't match a recipe slug
const slugs = new Set(recs.map(r => (r.hero || r.slug + '.png').toLowerCase()));
const stray = [...have].filter(f => /\.(png|jpg|jpeg|webp)$/.test(f) && !slugs.has(f));
if (stray.length) { console.log('\nStray images (no matching recipe):'); stray.forEach(f => console.log('  images/' + f)); }
