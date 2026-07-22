// Build the Pinterest scheduling queue: one folder (pins/queue/) of numbered
// copies where consecutive pins cycle through the accent rainbow
// (red -> orange -> amber -> earth -> green -> teal -> purple -> pink -> red...).
// Schedule them in filename order and the profile flows like a rainbow.
//
// Rerunnable: already-queued pins keep their numbers; new pins (friday drops)
// are appended, continuing the cycle. State in build/pin-queue-log.json.
//
// Run:  node build/pin-queue.mjs   (or npm run pinqueue; friday runs it too)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...a) => path.join(ROOT, ...a);

const RAINBOW = [
  ['red',    ['pasta', 'sauce', 'grill', 'steak']],
  ['orange', ['chicken']],
  ['amber',  ['curry', 'breakfast']],
  ['earth',  ['soup', 'brunch', 'bread', 'rice', 'baking', 'stew']],
  ['green',  ['veg', 'salad', 'vegan']],
  ['teal',   ['vegetarian', 'seafood']],
  ['purple', ['drinks']],
  ['pink',   ['dessert', 'cake']],
];

const records = JSON.parse(fs.readFileSync(p('recipes.json'), 'utf8'));
const catOf = {}; records.forEach((r) => (catOf[r.slug] = r.category));

// find every pin file (flat root + colour-group folders), slug -> path
const pinsDir = p('pins');
const sources = {};
const scan = (dir) => fs.readdirSync(dir).forEach((f) => {
  const full = path.join(dir, f);
  if (fs.statSync(full).isDirectory()) { if (f !== 'queue') scan(full); }
  else if (f.endsWith('.jpg')) sources[f.replace(/\.jpg$/, '')] = full;
});
scan(pinsDir);

const logPath = p('build', 'pin-queue-log.json');
const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : { queued: [], next: 1 };
const done = new Set(log.queued);
const fresh = Object.keys(sources).filter((s) => !done.has(s) && catOf[s]);

if (!fresh.length) { console.log('Queue up to date: nothing new to add.'); process.exit(0); }

// bucket fresh slugs: group -> category -> [slugs]
const buckets = new Map(RAINBOW.map(([g]) => [g, new Map()]));
const groupOfCat = {}; RAINBOW.forEach(([g, cats]) => cats.forEach((c) => (groupOfCat[c] = g)));
for (const slug of fresh.sort()) {
  const g = groupOfCat[catOf[slug]];
  if (!g) continue;
  const gm = buckets.get(g);
  const cat = catOf[slug];
  if (!gm.has(cat)) gm.set(cat, []);
  gm.get(cat).push(slug);
}

// interleave: cycle groups in rainbow order; within a group, rotate its categories
const order = [];
let remaining = fresh.length;
const catCursor = new Map(RAINBOW.map(([g]) => [g, 0]));
while (remaining > 0) {
  for (const [g] of RAINBOW) {
    const gm = buckets.get(g);
    const cats = [...gm.keys()].filter((c) => gm.get(c).length);
    if (!cats.length) continue;
    const idx = catCursor.get(g) % cats.length;
    const cat = cats[idx];
    catCursor.set(g, catCursor.get(g) + 1);
    order.push(gm.get(cat).shift());
    remaining--;
  }
}

fs.mkdirSync(p('pins', 'queue'), { recursive: true });
let n = log.next;
for (const slug of order) {
  const name = String(n).padStart(4, '0') + '__' + slug + '.jpg';
  fs.copyFileSync(sources[slug], p('pins', 'queue', name));
  log.queued.push(slug);
  n++;
}
log.next = n;
fs.writeFileSync(logPath, JSON.stringify(log, null, 2));

console.log('Queued ' + order.length + ' pin(s) -> pins/queue/ (total ' + log.queued.length + ')');
console.log('Pattern preview (first 16 of this batch):');
order.slice(0, 16).forEach((s, i) => console.log('  ' + String(log.next - order.length + i).padStart(4, '0') + '  ' + (groupOfCat[catOf[s]] || '?').padEnd(7) + s));
console.log('Schedule pins/queue/ in filename order; destination link = youcooked-it.com/recipes/<slug after __>.');
