// generate-heroes.mjs — TRANSPARENT cut-out hero images, landscape, for the recipe-page
// blob and the full-bleed "you cooked it" payoff screen. Sibling to generate.mjs.
//
// Run:
//   node generate-heroes.mjs --tag trender   make the 7 trending ones first (edge-quality test)
//   node generate-heroes.mjs                 the full 200
//   node generate-heroes.mjs --limit 5       first 5 only
//   node generate-heroes.mjs --only-failures retry just the ones that errored
//   node generate-heroes.mjs --force         regenerate even if a PNG already exists
//
// Requires: OPENAI_API_KEY in the environment, and `npm install` already done.

import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";

// ─── Config ───────────────────────────────────────────────────────────────
const MODEL       = "gpt-image-2";    // same model as the cards
const SIZE        = "1024x1024";      // square — one transparent set used as BOTH grid card and hero/wide
const QUALITY     = "medium";         // medium is plenty on a coloured blob; bump to "high" only if edges/detail need it
const BACKGROUND  = "transparent";    // the whole point — cut-out food on alpha
const FORMAT      = "png";            // PNG carries the alpha channel
const CONCURRENCY = 3;
const RETRIES     = 4;

const RECIPES_PATH = "./recipes.csv";
const OUT_DIR      = "./out-heroes";   // separate folder so it never clashes with the cards
const MANIFEST     = "./manifest-heroes.json";

// Same category-aware plating + real-camera look as the cards, but the background
// instruction is flipped: NO black, a clean isolated cut-out on transparency so the
// site's category colour shows through behind it.
const PRESENTATION = {
  curry:      "served in a plain white ceramic bowl, shot from directly overhead",
  soup:       "served in a plain white ceramic bowl, shot from directly overhead",
  stew:       "served in a plain white ceramic bowl, shot from directly overhead",
  rice:       "served in a plain white ceramic bowl, shot from directly overhead",
  veg:        "served in a plain white ceramic bowl, shot from directly overhead",
  pasta:      "served in a shallow white pasta bowl, shot from directly overhead",
  salad:      "served in a shallow white bowl, shot from directly overhead",
  sauce:      "in a small white ceramic bowl, shot from directly overhead",
  chicken:    "plated on a plain white ceramic plate, shot from directly overhead",
  seafood:    "plated on a plain white ceramic plate, shot from directly overhead",
  vegetarian: "plated on a plain white ceramic plate, shot from directly overhead",
  breakfast:  "plated on a plain white ceramic plate, shot from directly overhead",
  brunch:     "plated on a plain white ceramic plate, shot from directly overhead",
  dessert:    "plated on a small white dessert plate, shot from directly overhead",
  baking:     "arranged on a plain white plate, shot from directly overhead",
  cake:       "a single slice on a white plate, shot at a 45-degree angle",
  bread:      "on a small wooden board, shot at a 45-degree angle",
  drinks:     "served in an appropriate glass, garnished, shot straight-on",
};
const DEFAULT_PRESENTATION = "plated on a plain white ceramic plate, shot from directly overhead";

const buildPrompt = (dish) => {
  const vessel = PRESENTATION[dish.category] || DEFAULT_PRESENTATION;
  return (
    `Editorial food photography of ${dish.name}, ${vessel}, centred, isolated as a clean cut-out ` +
    `on a fully transparent background — the dish and its vessel only, nothing else, no surface, ` +
    `no shadow on the ground, no plate rim shadow, no props, no text. Crisp clean silhouette edges. ` +
    `Shot on a DSLR with an 85mm lens, shallow depth of field with soft natural focus falloff. ` +
    `Soft diffused lighting, gentle realistic highlights on the food itself. ` +
    `Matte natural food textures (not wet, not glossy, not lacquered), true-to-life muted colour, ` +
    `relaxed slightly imperfect plating with natural irregularity. ` +
    `Looks like a real photograph, not a render. ` +
    `Avoid: glossy, plastic, CGI, oversaturated, over-sharpened, background, halo, fringe.`
  );
};
// ──────────────────────────────────────────────────────────────────────────

const openai = new OpenAI();
const args = new Set(process.argv.slice(2));
const flag = (name) => args.has(name);
const argVal = (name) => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
};
const LIMIT = argVal("--limit") ? Number(argVal("--limit")) : Infinity;
const TAG = argVal("--tag");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const slugify = (s) =>
  s.toLowerCase().trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function loadRecipes() {
  const lines = fs.readFileSync(RECIPES_PATH, "utf8").trim().split(/\r?\n/);
  lines.shift();
  return lines.filter(Boolean).map((line) => {
    const [category, recipe, slug, tag] = line.split(",").map((s) => s.trim());
    return { name: recipe, slug: slug || slugify(recipe), category, tag };
  });
}

function loadManifest() {
  try {
    const m = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    return new Map(m.results.map((r) => [r.slug, r]));
  } catch {
    return new Map();
  }
}

function saveManifest(map) {
  const results = [...map.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  fs.writeFileSync(MANIFEST, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
}

async function withRetry(fn, label) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > RETRIES) throw err;
      const wait = Math.min(30000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 500);
      console.warn(`  ↻ ${label}: ${err.message} — retry ${attempt}/${RETRIES} in ${wait}ms`);
      await sleep(wait);
    }
  }
}

async function callImageAPI(prompt) {
  const res = await openai.images.generate({
    model: MODEL,
    prompt,
    size: SIZE,
    quality: QUALITY,
    background: BACKGROUND,
    output_format: FORMAT,
  });
  const b64 = res?.data?.[0]?.b64_json;
  if (!b64) throw new Error("no image data returned");
  return Buffer.from(b64, "base64");
}

async function generateOne(dish) {
  const file = path.join(OUT_DIR, `${dish.slug}.png`);
  const buf = await withRetry(() => callImageAPI(buildPrompt(dish)), dish.slug);
  fs.writeFileSync(file, buf);
  return { ...dish, status: "ok", file, ts: new Date().toISOString() };
}

async function runPool(items, worker, concurrency) {
  let i = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx], idx, items.length);
    }
  });
  await Promise.all(runners);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let recipes = loadRecipes();
  const manifest = loadManifest();

  if (TAG) recipes = recipes.filter((d) => d.tag === TAG);

  let pending;
  if (flag("--only-failures")) {
    pending = recipes.filter((d) => manifest.get(d.slug)?.status === "error");
  } else {
    pending = recipes.filter((d) => {
      if (flag("--force")) return true;
      const done =
        manifest.get(d.slug)?.status === "ok" &&
        fs.existsSync(path.join(OUT_DIR, `${d.slug}.png`));
      return !done;
    });
  }
  pending = pending.slice(0, LIMIT);

  if (pending.length === 0) {
    console.log("Nothing to do — everything already generated. Use --force to regenerate.");
    return;
  }

  console.log(`Generating ${pending.length} transparent cut-out(s) [cards + heroes] with ${MODEL} @ ${SIZE} ${QUALITY}, concurrency ${CONCURRENCY}.`);
  console.log(`(Output: ./out-heroes/  — transparent PNG. Cost reminder: high-quality landscape × ${pending.length}.)\n`);

  let ok = 0, fail = 0;
  await runPool(pending, async (dish, idx, total) => {
    const tag = `[${idx + 1}/${total}] ${dish.name} (${dish.category})`;
    try {
      const r = await generateOne(dish);
      manifest.set(dish.slug, r);
      saveManifest(manifest);
      ok++;
      console.log(`  ✓ ${tag} → ${path.basename(r.file)}`);
    } catch (err) {
      manifest.set(dish.slug, { ...dish, status: "error", error: err.message, ts: new Date().toISOString() });
      saveManifest(manifest);
      fail++;
      console.error(`  ✗ ${tag} — ${err.message}`);
    }
  }, CONCURRENCY);

  console.log(`\nDone. ${ok} succeeded, ${fail} failed.`);
  if (fail) console.log("Re-run with --only-failures to retry just the failures.");
}

main().catch((e) => { console.error(e); process.exit(1); });
