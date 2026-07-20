// temp utility: extract review frames from a generated video via system Chrome
import puppeteer from 'puppeteer';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const src = process.argv[2];
const dir = path.join(os.tmpdir(), 'ffshots');
fs.mkdirSync(dir, { recursive: true });
// serve through the local static server so Chrome will play it
const url = 'http://localhost:8099/' + src.split(path.sep).join('/').split('/').map(encodeURIComponent).join('/');

const b = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await b.newPage();
page.on('console', (m) => console.log('PAGE:', m.text()));
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://localhost:8099/404', { waitUntil: 'domcontentloaded' });
await page.setContent(`<body style="margin:0;background:#000"><video id="v" style="width:100%;height:100vh;object-fit:contain" muted></video></body>`);
await page.evaluate((u) => {
  const v = document.getElementById('v');
  v.onerror = () => console.log('VIDEO ERROR code=' + (v.error && v.error.code));
  v.onloadeddata = () => console.log('LOADED dur=' + v.duration);
  v.src = u;
}, url);
await new Promise((r) => setTimeout(r, 4000));
const state = await page.evaluate(() => {
  const v = document.getElementById('v');
  return { ready: v.readyState, err: v.error ? v.error.code : null, dur: v.duration };
});
console.log('state:', JSON.stringify(state));
if (state.ready >= 2) {
  for (const t of [0.1, state.dur * 0.3, state.dur * 0.55, state.dur * 0.8, state.dur - 0.15]) {
    await page.evaluate(async (tt) => {
      const v = document.getElementById('v');
      v.currentTime = tt;
      await new Promise((r) => { v.onseeked = r; });
    }, t);
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: path.join(dir, 'vid-' + t.toFixed(1).replace('.', '_') + '.png') });
  }
  console.log('frames extracted to ' + dir);
}
await b.close();
