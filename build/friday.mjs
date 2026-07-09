// THE FRIDAY DROP — one command for the weekly release.
//
//   npm run friday
//
// Finds every published recipe (with a hero image) that hasn't been featured
// in a newsletter yet, then:
//   1. rebuilds the site (new pages, sitemap, encore rows)
//   2. renders OG share cards + Pinterest pins for the new recipes
//   3. writes the newsletter HTML featuring them (newsletters/<date>.html)
//   4. records them in build/newsletter-log.json so they're never repeated
//   5. commits + pushes (Vercel deploys)
//
// Prereqs each week: new recipes authored in recipes-data.mjs + rows in
// recipes-200.csv, hero images keyed into images/ (npm run keyimages).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...a) => path.join(ROOT, ...a);
const run = (cmd) => { console.log('\n> ' + cmd); execSync(cmd, { cwd: ROOT, stdio: 'inherit' }); };

// 1. rebuild first so recipes.json reflects the latest data
run('node build/generate.mjs');

const records = JSON.parse(fs.readFileSync(p('recipes.json'), 'utf8'));
const imgs = new Set(fs.existsSync(p('images')) ? fs.readdirSync(p('images')).map((f) => f.toLowerCase()) : []);
const logPath = p('build', 'newsletter-log.json');
const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : { featured: [] };
const done = new Set(log.featured);

const fresh = records.filter((r) => r.status === 'published' && imgs.has((r.slug + '.png').toLowerCase()) && !done.has(r.slug));

if (!fresh.length) {
  console.log('\nNothing new to drop: every published recipe has already been featured.');
  console.log('(Add this week\'s recipes to recipes-200.csv + recipes-data.mjs, key their images, then re-run.)');
  process.exit(0);
}

const slugs = fresh.map((r) => r.slug);
console.log('\nThis week\'s drop (' + slugs.length + '): ' + slugs.join(', '));

// 2. cards + pins for just the new ones (pins auto-filed into colour groups)
run('node build/og-cards.mjs ' + slugs.join(' '));
run('node build/pins.mjs ' + slugs.join(' '));
run('node build/pin-groups.mjs');

// 3. newsletter
run('node build/newsletter.mjs ' + slugs.join(' '));

// 4. log them
log.featured = log.featured.concat(slugs);
log.lastDrop = { date: new Date().toISOString().slice(0, 10), slugs };
fs.writeFileSync(logPath, JSON.stringify(log, null, 2));

// 5. ship it
run('git add -A');
run('git -c user.name="Jamie McCafferty" -c user.email="jamiehughmccafferty@gmail.com" commit -m "Friday drop: ' + slugs.join(', ') + '"');
run('git push origin main');

console.log('\n──────── friday drop complete ────────');
console.log('Live in ~2 min. Remaining by hand:');
console.log('  1. MailerLite -> new campaign -> paste newsletters/' + log.lastDrop.date + '.html -> send/schedule');
console.log('  2. Pinterest  -> schedule the ' + slugs.length + ' new pins (filed in pins/<colour-group>/, link each to its recipe URL)');
