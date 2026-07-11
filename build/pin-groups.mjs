// File the flat pins/ folder into colour-accent groups (rainbow order) for
// Pinterest scheduling: schedule folder 01, then 02, ... for a colour flow.
// New pins from a friday drop land flat in pins/ and get filed on next run.
//
// Run:  node build/pin-groups.mjs   (or npm run pingroups)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...a) => path.join(ROOT, ...a);

// rainbow order; each group = one scheduling block of matching accents
const GROUPS = [
  ['01-red',    ['pasta', 'sauce']],                                  // #c0341a #cf3636
  ['02-orange', ['chicken']],                                         // #e2561f
  ['03-amber',  ['curry', 'breakfast']],                              // #e8991c #e9a72f
  ['04-earth',  ['soup', 'brunch', 'bread', 'rice', 'baking', 'stew']], // warm browns, light->dark
  ['05-green',  ['veg', 'salad', 'vegan']],                                    // #6fae3c #4f8a3a
  ['06-teal',   ['vegetarian', 'seafood']],                           // #3c9e74 #2f9bb0
  ['07-purple', ['drinks']],                                          // #8a5cc4
  ['08-pink',   ['dessert', 'cake']],                                 // #ff4d6d #ef5fa0
];

const records = JSON.parse(fs.readFileSync(p('recipes.json'), 'utf8'));
const catOf = {}; records.forEach((r) => (catOf[r.slug] = r.category));
const groupOf = {}; GROUPS.forEach(([g, cats]) => cats.forEach((c) => (groupOf[c] = g)));

const pinsDir = p('pins');
const flat = fs.readdirSync(pinsDir).filter((f) => f.endsWith('.jpg'));
if (!flat.length) { console.log('No unfiled pins in pins/ root.'); }

const counts = {};
for (const f of flat) {
  const slug = f.replace(/\.jpg$/, '');
  const g = groupOf[catOf[slug]];
  if (!g) { console.log('  ?? no group for', f, '(category ' + catOf[slug] + ') — left in root'); continue; }
  fs.mkdirSync(p('pins', g), { recursive: true });
  fs.renameSync(p('pins', f), p('pins', g, f));
  counts[g] = (counts[g] || 0) + 1;
}

console.log('Filed ' + flat.length + ' pin(s) into colour groups:');
for (const [g] of GROUPS) {
  const total = fs.existsSync(p('pins', g)) ? fs.readdirSync(p('pins', g)).filter((f) => f.endsWith('.jpg')).length : 0;
  console.log('  ' + g.padEnd(10) + ' ' + String(total).padStart(3) + ' pins' + (counts[g] ? '  (+' + counts[g] + ' new)' : ''));
}
