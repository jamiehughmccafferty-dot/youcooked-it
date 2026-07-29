// Render "the friday five" newsletter — email-safe HTML in the pin design
// language (accent cards, plate-on-colour, Title Case, time | skill, domain pill).
// Images are absolute URLs to the live site; the HTML is self-contained and
// ready to paste into a MailerLite custom-HTML campaign.
//
// Run:
//   node build/newsletter.mjs slug1 slug2 slug3 slug4 slug5
//   node build/newsletter.mjs --sample          (5 varied recipes, for design review)
// Output: newsletters/<yyyy-mm-dd>.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...a) => path.join(ROOT, ...a);
const SITE = 'https://youcooked-it.com';
const CAT = { curry:'#e8991c',rice:'#b7923c',chicken:'#e2561f',dessert:'#ff4d6d',cake:'#ef5fa0',baking:'#b86a4a',
  salad:'#4f8a3a',veg:'#6fae3c',vegetarian:'#3c9e74',vegan:'#9bb020',breakfast:'#e9a72f',brunch:'#d98a52',pasta:'#c0341a',
  seafood:'#2f9bb0',soup:'#cf7b2a',stew:'#9c5526',bread:'#c98a3a',drinks:'#8a5cc4',sauce:'#cf3636',grill:'#a8402a',steak:'#8e2434' };
const INK = '#241712', CREAM = '#f6edda';
const esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const records = JSON.parse(fs.readFileSync(p('recipes.json'), 'utf8'));
const bySlug = {}; records.forEach((r) => (bySlug[r.slug] = r));

let slugs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (process.argv.includes('--sample')) slugs = ['marry-me-chicken','tiramisu','ramen','caesar-salad','sourdough-bread'];
const picks = slugs.map((s) => bySlug[s]).filter(Boolean);
if (!picks.length) { console.error('No valid slugs. Usage: node build/newsletter.mjs slug1 slug2 ...'); process.exit(1); }

const metaLine = (rec) => {
  const t = (rec.meta && rec.meta.total_time || '').replace(/\bmin\b/, 'mins');
  return [t, rec.meta && rec.meta.skill].filter(Boolean).join(' | ');
};
const hook = (rec) => { const s = (rec.story || '').split('. ')[0]; return s ? s + '.' : ''; };

const card = (rec) => {
  const accent = CAT[rec.category] || '#e2561f';
  const url = SITE + '/recipes/' + rec.slug;
  return `
  <tr><td style="padding:0 0 18px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${accent};border-radius:22px;">
      <tr>
        <td style="padding:26px 8px 26px 28px;vertical-align:middle;">
          <div style="font-family:Poppins,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:2px;color:${CREAM};text-transform:uppercase;">${esc(rec.category)}</div>
          <div style="font-family:Poppins,Arial,sans-serif;font-size:26px;line-height:1.15;font-weight:700;color:#ffffff;padding:6px 0 4px 0;"><a href="${url}" style="color:#ffffff;text-decoration:none;">${esc(rec.title)}</a></div>
          <div style="font-family:Poppins,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;padding-bottom:14px;">${esc(metaLine(rec))}</div>
          <a href="${url}" style="font-family:Poppins,Arial,sans-serif;font-size:14px;font-weight:600;color:${accent};background:#ffffff;text-decoration:none;padding:9px 20px;border-radius:999px;display:inline-block;">cook it</a>
        </td>
        <td width="170" style="padding:14px 18px 14px 0;vertical-align:middle;">
          <a href="${url}"><img src="${SITE}/images/thumb/${rec.slug}.png" width="170" alt="${esc(rec.title)}" style="display:block;width:170px;height:auto;border:0;"/></a>
        </td>
      </tr>
    </table>
  </td></tr>`;
};

// optional themed intro: --intro "text" or NL_INTRO env; falls back to the standard line
const introIdx = process.argv.indexOf('--intro');
const INTRO = (introIdx !== -1 && process.argv[introIdx + 1]) || process.env.NL_INTRO || '';

// partner slot: native cards after the five, links tagged clickref=newsletter.
// Edit per edition (or empty the array to skip the section).
const NL_PARTNERS = [
  { // Tower Pay Day Event banner (their creative; swap out when the promo ends)
    banner: SITE + '/partners/tower-payday.jpg', alt: 'Tower Pay Day Event: save 20% with code PAYDAY',
    link: 'https://www.awin1.com/cread.php?awinmid=20823&awinaffid=2918949&clickref=newsletter',
    note: 'code PAYDAY · 20% off full price Tower kit when you spend £40 or more' },
  { // Abel & Cole native card in the recipe-card style
    accent: '#eab308', label: 'partner · abel & cole', title: 'salad season, sorted.',
    meta: '50% off your 1st box | code ACVEG26', cta: 'get 50% off',
    img: SITE + '/partners/abel-and-cole-box.jpg', alt: 'Abel and Cole veg box',
    link: 'https://www.awin1.com/awclick.php?gid=385402&mid=6388&awinaffid=2918949&linkid=2603115&clickref=newsletter' },
];
const partnerRows = !NL_PARTNERS.length ? '' : `
  <tr><td align="center" style="font-family:Poppins,Arial,sans-serif;font-weight:700;font-size:15px;letter-spacing:1.5px;color:${INK};text-transform:uppercase;padding:26px 0 14px 0;">from our kitchen partners</td></tr>
  ${NL_PARTNERS.map((pt) => pt.banner ? `
  <tr><td style="padding:0 0 8px 0;">
    <a href="${pt.link}"><img src="${pt.banner}" width="600" alt="${esc(pt.alt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:22px;"/></a>
  </td></tr>
  <tr><td align="center" style="font-family:Poppins,Arial,sans-serif;font-size:13px;font-weight:600;color:#6b574a;padding:0 26px 18px 26px;">${esc(pt.note || '')}</td></tr>` : `
  <tr><td style="padding:0 0 18px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${pt.accent};border-radius:22px;">
      <tr>
        <td style="padding:26px 8px 26px 28px;vertical-align:middle;">
          <div style="font-family:Poppins,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:2px;color:${CREAM};text-transform:uppercase;">${esc(pt.label)}</div>
          <div style="font-family:Poppins,Arial,sans-serif;font-size:26px;line-height:1.15;font-weight:700;color:#ffffff;padding:6px 0 4px 0;"><a href="${pt.link}" style="color:#ffffff;text-decoration:none;">${esc(pt.title)}</a></div>
          <div style="font-family:Poppins,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;padding-bottom:14px;">${esc(pt.meta)}</div>
          <a href="${pt.link}" style="font-family:Poppins,Arial,sans-serif;font-size:14px;font-weight:600;color:${pt.accent};background:#ffffff;text-decoration:none;padding:9px 20px;border-radius:999px;display:inline-block;">${esc(pt.cta)}</a>
        </td>
        <td width="170" style="padding:14px 18px 14px 0;vertical-align:middle;">
          <a href="${pt.link}"><img src="${pt.img}" width="170" alt="${esc(pt.alt)}" style="display:block;width:170px;height:auto;border:0;border-radius:16px;"/></a>
        </td>
      </tr>
    </table>
  </td></tr>`).join('')}
  <tr><td align="center" style="font-family:Poppins,Arial,sans-serif;font-size:11px;color:#6b574a;padding:0 26px 6px 26px;">partner links · they help keep the recipes free</td></tr>`;

const today = new Date();
const stamp = today.toISOString().slice(0, 10);
const nice = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>the friday five — You Cooked It</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;">${esc(INTRO) || picks.length + ' new recipes just landed in the kitchen.'}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:34px 14px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <tr><td align="center" style="padding-bottom:8px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="background:${INK};border-radius:20px;padding:16px 18px;font-family:Poppins,Arial,sans-serif;font-weight:700;font-size:17px;line-height:1.1;color:#ffffff;">you<br>cooked<br>it.</td>
    </tr></table>
  </td></tr>

  <tr><td align="center" style="font-family:Poppins,Arial,sans-serif;font-weight:700;font-size:34px;color:${INK};padding:18px 0 4px 0;">the friday five</td></tr>
  <tr><td align="center" style="font-family:Poppins,Arial,sans-serif;font-weight:600;font-size:14px;color:#6b574a;padding-bottom:8px;">${nice}</td></tr>
  <tr><td align="center" style="font-family:Poppins,Arial,sans-serif;font-size:16px;line-height:1.55;color:${INK};padding:0 26px 28px 26px;">${esc(INTRO) || picks.length + " new recipes just landed in the kitchen. Pick one for the weekend, we'll walk you through it."}</td></tr>

  ${picks.map(card).join('')}
${partnerRows}
  <tr><td align="center" style="font-family:Poppins,Arial,sans-serif;font-weight:700;font-size:15px;letter-spacing:1.5px;color:${INK};text-transform:uppercase;padding:26px 0 16px 0;">no more doom scrolling</td></tr>

  <tr><td align="center" style="padding-bottom:30px;">
    <a href="${SITE}" style="font-family:Poppins,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;background:${INK};text-decoration:none;padding:12px 28px;border-radius:999px;display:inline-block;">youcooked-it.com</a>
  </td></tr>

  <tr><td align="center" style="font-family:Poppins,Arial,sans-serif;font-size:12px;line-height:1.7;color:#6b574a;padding:0 26px 34px 26px;">
    You're getting this because you signed up at youcooked-it.com.<br/>
    <a href="{$unsubscribe}" style="color:#6b574a;">unsubscribe</a> anytime, no hard feelings.
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

fs.mkdirSync(p('newsletters'), { recursive: true });
const out = p('newsletters', stamp + '.html');
fs.writeFileSync(out, html);
console.log('Newsletter (' + picks.length + ' recipes) -> newsletters/' + stamp + '.html');
console.log('Featured: ' + picks.map((r) => r.slug).join(', '));
