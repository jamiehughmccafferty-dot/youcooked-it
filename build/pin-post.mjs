// Post the next pins from the rainbow queue (pins/queue/) to Pinterest.
// Keeps a pointer in build/pin-post-log.json so each run continues the cycle.
// Boards are matched (or created) per recipe category.
//
//   node build/pin-post.mjs             post the next 4
//   node build/pin-post.mjs --count 2   post the next 2
//   node build/pin-post.mjs --dry       show what would be posted
//
// Credentials: env PINTEREST_CLIENT_ID / _SECRET / _REFRESH_TOKEN (CI) or
// build/pinterest-auth.json (local, created by pinterest-auth.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...a) => path.join(ROOT, ...a);
const API = 'https://api.pinterest.com/v5';
const SITE = 'https://youcooked-it.com';

const argVal = (n, d) => { const i = process.argv.indexOf(n); return i !== -1 ? +process.argv[i + 1] : d; };
const COUNT = argVal('--count', 4);
const DRY = process.argv.includes('--dry');

// ---- credentials ----
let creds = null;
if (process.env.PINTEREST_CLIENT_ID && process.env.PINTEREST_CLIENT_SECRET && process.env.PINTEREST_REFRESH_TOKEN) {
  creds = { client_id: process.env.PINTEREST_CLIENT_ID, client_secret: process.env.PINTEREST_CLIENT_SECRET, refresh_token: process.env.PINTEREST_REFRESH_TOKEN };
} else if (fs.existsSync(p('build', 'pinterest-auth.json'))) {
  creds = JSON.parse(fs.readFileSync(p('build', 'pinterest-auth.json'), 'utf8'));
}
if (!creds) { console.log('No Pinterest credentials configured yet — skipping (run build/pinterest-auth.mjs first).'); process.exit(0); }

// ---- next pins from the queue ----
const queueDir = p('pins', 'queue');
const logPath = p('build', 'pin-post-log.json');
const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : { posted: [] };
const done = new Set(log.posted);
const queue = fs.readdirSync(queueDir).filter((f) => f.endsWith('.jpg')).sort();
const batch = queue.filter((f) => !done.has(f)).slice(0, COUNT);
if (!batch.length) { console.log('Queue exhausted: all ' + queue.length + ' pins posted.'); process.exit(0); }

const records = JSON.parse(fs.readFileSync(p('recipes.json'), 'utf8'));
const bySlug = {}; records.forEach((r) => (bySlug[r.slug] = r));

if (DRY) {
  console.log('Would post ' + batch.length + ' pin(s):');
  batch.forEach((f) => { const s = f.replace(/^\d+__/, '').replace(/\.jpg$/, ''); console.log('  ' + f + '  ->  board: ' + (bySlug[s] ? bySlug[s].category : '?')); });
  process.exit(0);
}

// ---- access token ----
const basic = Buffer.from(creds.client_id + ':' + creds.client_secret).toString('base64');
const tokRes = await fetch(API + '/oauth/token', {
  method: 'POST',
  headers: { Authorization: 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: creds.refresh_token }),
});
const tok = await tokRes.json();
if (!tok.access_token) { console.error('Token refresh failed:', JSON.stringify(tok)); process.exit(1); }
const H = { Authorization: 'Bearer ' + tok.access_token, 'Content-Type': 'application/json' };

// ---- boards (match by name containing the category, else create "<Category> Recipes") ----
const boardsRes = await fetch(API + '/boards?page_size=100', { headers: H });
const boards = (await boardsRes.json()).items || [];
const boardFor = async (category) => {
  const hit = boards.find((b) => (b.name || '').toLowerCase().includes(category.toLowerCase()));
  if (hit) return hit.id;
  const name = category[0].toUpperCase() + category.slice(1) + ' Recipes';
  const mk = await fetch(API + '/boards', { method: 'POST', headers: H, body: JSON.stringify({ name, description: 'Immersive ' + category + ' cook-alongs from You Cooked It.' }) });
  const j = await mk.json();
  if (!j.id) throw new Error('board create failed for ' + category + ': ' + JSON.stringify(j));
  boards.push(j);
  console.log('  created board: ' + name);
  return j.id;
};

// ---- post ----
let ok = 0;
for (const f of batch) {
  const slug = f.replace(/^\d+__/, '').replace(/\.jpg$/, '');
  const rec = bySlug[slug];
  if (!rec) { console.log('  ?? no recipe for ' + f + ', skipping'); log.posted.push(f); continue; }
  try {
    const boardId = await boardFor(rec.category);
    const story = (rec.story || '').split('. ').slice(0, 2).join('. ');
    const description = (story.endsWith('.') ? story : story + '.') + ' Cook it step by step, with timers and a live serving scaler.';
    const body = {
      board_id: boardId,
      title: (rec.title + ' · You Cooked It').slice(0, 100),
      description: description.slice(0, 500),
      link: SITE + '/recipes/' + slug,
      alt_text: (rec.title + ', ' + rec.category + ' recipe').slice(0, 480),
      media_source: { source_type: 'image_base64', content_type: 'image/jpeg', data: fs.readFileSync(path.join(queueDir, f)).toString('base64') },
    };
    const res = await fetch(API + '/pins', { method: 'POST', headers: H, body: JSON.stringify(body) });
    const j = await res.json();
    if (!j.id) throw new Error(JSON.stringify(j).slice(0, 300));
    log.posted.push(f);
    ok++;
    console.log('  ✓ pinned ' + f + ' -> ' + rec.category + ' (pin ' + j.id + ')');
  } catch (e) {
    console.error('  ✗ ' + f + ': ' + e.message);
    break; // stop the batch on error; pointer stays put for retry
  }
}
fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
console.log('Posted ' + ok + '/' + batch.length + '. Progress: ' + log.posted.length + '/' + queue.length + ' pins.');
