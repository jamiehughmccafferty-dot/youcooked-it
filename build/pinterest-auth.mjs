// One-time Pinterest OAuth setup. Produces the refresh token pin-post.mjs uses.
//
// Prereq: an app at developers.pinterest.com with redirect URI https://youcooked-it.com/
//
//   Step 1:  node build/pinterest-auth.mjs url <APP_ID>
//            -> prints the authorize URL. Open it, approve, you land on
//               youcooked-it.com/?code=XXXX  — copy the code from the address bar.
//   Step 2:  node build/pinterest-auth.mjs token <APP_ID> <APP_SECRET> <CODE>
//            -> exchanges the code, saves build/pinterest-auth.json (gitignored)
//               and prints the three values to add as GitHub Actions secrets.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REDIRECT = 'https://youcooked-it.com/';
const SCOPES = 'boards:read,boards:write,pins:read,pins:write';
const [mode, id, secret, code] = process.argv.slice(2);

if (mode === 'url' && id) {
  console.log('Open this URL, approve access, then copy the ?code= value from the address bar:\n');
  console.log('https://www.pinterest.com/oauth/?client_id=' + id +
    '&redirect_uri=' + encodeURIComponent(REDIRECT) +
    '&response_type=code&scope=' + encodeURIComponent(SCOPES));
} else if (mode === 'token' && id && secret && code) {
  const basic = Buffer.from(id + ':' + secret).toString('base64');
  const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT }),
  });
  const j = await res.json();
  if (!j.refresh_token) { console.error('Exchange failed:', JSON.stringify(j)); process.exit(1); }
  fs.writeFileSync(path.join(ROOT, 'build', 'pinterest-auth.json'),
    JSON.stringify({ client_id: id, client_secret: secret, refresh_token: j.refresh_token }, null, 2));
  console.log('Saved build/pinterest-auth.json (gitignored).');
  console.log('\nAdd these three GitHub Actions secrets (repo Settings -> Secrets and variables -> Actions):');
  console.log('  PINTEREST_CLIENT_ID     = ' + id);
  console.log('  PINTEREST_CLIENT_SECRET = (your app secret)');
  console.log('  PINTEREST_REFRESH_TOKEN = ' + j.refresh_token);
} else {
  console.log('Usage:\n  node build/pinterest-auth.mjs url <APP_ID>\n  node build/pinterest-auth.mjs token <APP_ID> <APP_SECRET> <CODE>');
}
