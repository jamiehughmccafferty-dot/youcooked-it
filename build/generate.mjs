// You Cooked It - static page generator
// Run:  node build/generate.mjs   (from the youcooked.it folder)
// Reads recipes-200.csv + authored content in recipes-data.mjs (+ any existing
// published records in recipes.json) and writes:
//   index.html                       the home page (filterable browse grid)
//   recipes.json                     master data, one record per slug
//   recipes/<slug>.html  x200        each recipe page (data-driven engine)
//   recipes/index.html               redirect up to the home page
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import authored from './recipes-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...a) => path.join(ROOT, ...a);

function stub(rec){
  return {
    slug:rec.slug, title:rec.recipe, category:rec.category, cuisine:'', hero:rec.slug+'.png',
    status:'stub', tag:rec.tag||'evergreen',
    story:"We're writing this one up in the You Cooked It kitchen. The photo and colour are ready to go, full ingredients and method are on the way.",
    meta:{ total_time:'', marinate_time:null, serves:4, heat:'', skill:'' },
    macros:{ protein_g:null, fat_g:null, carbs_g:null, estimate:true },
    ingredient_groups:[], spice_mix:[], method:[], serving_ideas:[]
  };
}

function publish(rec, a){
  return {
    slug:rec.slug, title:rec.recipe, category:rec.category, tag:rec.tag||'evergreen',
    cuisine:a.cuisine||'', hero:a.hero||(rec.slug+'.png'), status:'published',
    story:a.story||'', meta:a.meta||{serves:4}, macros:a.macros||{estimate:true},
    ingredient_groups:a.ingredient_groups||[], spice_mix:a.spice_mix||[],
    method:a.method||[], serving_ideas:a.serving_ideas||[]
  };
}

// ---- parse CSV ----
const csv = fs.readFileSync(p('recipes-200.csv'),'utf8').trim().split(/\r?\n/);
const header = csv.shift().split(',');
const rows = csv.map(line=>{ const c=line.split(','); const o={}; header.forEach((h,i)=>o[h]=c[i]); return o; });

// ---- preserve previously published content on re-run ----
let existing = {};
if(fs.existsSync(p('recipes.json'))){
  try{ JSON.parse(fs.readFileSync(p('recipes.json'),'utf8')).forEach(r=>existing[r.slug]=r); }catch(e){}
}

const records = rows.map(r=>{
  if(authored[r.slug]) return publish(r, authored[r.slug]);
  if(existing[r.slug] && existing[r.slug].status==='published') return existing[r.slug];
  return stub(r);
});

// ---- write recipes.json ----
fs.writeFileSync(p('recipes.json'), JSON.stringify(records,null,2));

// ---- site config, accent palette, hero-image set, helpers (used by page + browse) ----
const SITE='https://youcooked-it.com';
// content-hash the assets so a deploy busts browser caches immediately (the files aren't renamed)
const ver = f => { try { return crypto.createHash('md5').update(fs.readFileSync(p('assets',f))).digest('hex').slice(0,8); } catch(e){ return '1'; } };
const cssVer = ver('styles.css'), jsVer = ver('recipe-engine.js');
const CAT={curry:'#e8991c',rice:'#b7923c',chicken:'#e2561f',dessert:'#ff4d6d',cake:'#ef5fa0',baking:'#b86a4a',
  salad:'#4f8a3a',veg:'#6fae3c',vegetarian:'#3c9e74',breakfast:'#e9a72f',brunch:'#d98a52',pasta:'#c0341a',
  seafood:'#2f9bb0',soup:'#cf7b2a',stew:'#9c5526',bread:'#c98a3a',drinks:'#8a5cc4',sauce:'#cf3636'};
const imgFiles = new Set(fs.existsSync(p('images')) ? fs.readdirSync(p('images')).map(f=>f.toLowerCase()) : []);
const thumbFiles = new Set(fs.existsSync(p('images','thumb')) ? fs.readdirSync(p('images','thumb')).map(f=>f.toLowerCase()) : []);
const imaged = {};   // slug -> the (small) image path used on the browse card
records.forEach(r=>{ const f=(r.slug+'.png').toLowerCase();
  if(imgFiles.has(f)) imaged[r.slug] = thumbFiles.has(f) ? 'images/thumb/'+r.slug+'.png' : 'images/'+r.slug+'.png'; });
const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const metaDesc = rec => { const s=(rec.story||'').trim(); if(s){ const first=s.split('. ')[0]; return first.length>20?first+'.':s.slice(0,155); } return rec.title+' — an immersive cook-along recipe from You Cooked It.'; };

// ---- recipe page template ----
const page = (rec)=>{
  const url=SITE+'/recipes/'+rec.slug, accent=CAT[rec.category]||'#e2561f';
  const desc=metaDesc(rec), ogImage=imaged[rec.slug]?SITE+'/images/'+rec.slug+'.png':'';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>You Cooked It — ${esc(rec.title)}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="${url}"/>
<meta property="og:type" content="article"/>
<meta property="og:site_name" content="You Cooked It"/>
<meta property="og:title" content="${esc(rec.title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:url" content="${url}"/>
${ogImage?`<meta property="og:image" content="${ogImage}"/>
<meta property="og:image:width" content="1024"/>
<meta property="og:image:height" content="1024"/>`:''}
<meta name="twitter:card" content="${ogImage?'summary_large_image':'summary'}"/>
<meta name="theme-color" content="${accent}"/>
<link rel="icon" href="/favicon.ico" sizes="48x48"/>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<link rel="manifest" href="/site.webmanifest"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;600;700;800&family=Hanken+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/styles.css?v=${cssVer}">
</head>
<body data-category="${rec.category}">
  <div id="pre"><div class="mark"><span style="color:var(--accent)">prepping</span> it</div><div class="pct" id="pct">0%</div><div class="barwrap"><div class="bar" id="prebar"></div></div></div>

  <nav><a class="brand" href="../index.html"><span style="color:var(--accent)">cooking</span> it</a><div class="nl"><a href="../index.html">all recipes</a><a href="#story">story</a><a href="#ingredients">ingredients</a><a href="#method">method</a><a href="#finale">serve</a></div></nav>

  <section id="hero"><div class="wrap"><div class="grid">
    <div>
      <div class="eyebrow up" id="heroEyebrow"></div>
      <h1 class="display up" id="heroTitle"></h1>
      <p class="sub up" id="heroSub"></p>
      <div class="meta up" id="heroMeta"></div>
      <div class="row up"><a class="pill pop" href="#method">start cooking</a><a class="pill ghost" href="#ingredients">ingredients</a></div>
    </div>
    <div class="art up">
      <div class="blob"></div>
      <svg class="badge" viewBox="0 0 100 100"><defs><path id="circ" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0"/></defs>
        <text><textPath href="#circ">fresh · made from scratch · </textPath></text><circle class="dot" cx="50" cy="50" r="5"/></svg>
      <img class="heroimg" id="heroimg" alt=""/>
    </div>
  </div></div></section>

  <div class="marquee" id="marquee"></div>

  <section id="story"><div class="wrap">
    <div class="eyebrow up">the story</div>
    <h2 class="display up" id="storyTitle"></h2>
    <p class="up" id="storyText"></p>
  </div></section>

  <section id="ingredients"><div class="wrap">
    <div class="ing-top">
      <div><div class="eyebrow up">ingredients</div><h2 class="display up">what you'll<br>need</h2></div>
      <div class="scaler up"><button id="minus">–</button><div class="val"><span id="sv">4</span><small>servings</small></div><button id="plus">+</button></div>
    </div>
    <div class="gathered up" id="gathered"></div>
    <div class="ing-cols" id="ingCols"></div>
  </div></section>

  <section id="method"><div class="wrap">
    <div class="eyebrow up">the method</div>
    <h2 class="display up">cook it<br>with us</h2>
    <div class="steps" id="steps"><div class="rail"></div><div class="railfill" id="railfill"></div></div>
  </div></section>

  <section id="finale"><div class="wrap">
    <img class="rev" id="rev" alt=""/>
    <h2 class="display up">you cooked it.</h2>
    <p class="up" id="finaleText"></p>
    <div class="serveideas up" id="serveideas"></div>
    <a class="pill" href="#" id="printBtn">save the recipe ⤓</a>
  </div></section>

  <section id="foot"><div class="wrap">
    <div class="display" style="font-size:clamp(34px,7vw,72px);font-weight:800">you <span style="color:var(--accent)">cooked</span> it.</div>
    <div class="mono">an immersive recipe · kitchen by croft &amp; hugh · © 2026</div>
  </div></section>

  <div id="hud"><span id="hudtxt">method · 0/0 done</span><div class="hb"><div class="hbf" id="hbf"></div></div></div>

  <script>window.RECIPE=${JSON.stringify(rec).replace(/</g,'\\u003c')};</script>
  <script src="../assets/recipe-engine.js?v=${jsVer}"></script>
</body>
</html>`;
};

const outDir = p('recipes');
fs.mkdirSync(outDir,{recursive:true});
records.forEach(rec=>fs.writeFileSync(path.join(outDir,rec.slug+'.html'), page(rec)));

// ---- home page (browse grid) ----
const cats = [...new Set(records.map(r=>r.category))].sort();
const cards = records.map(r=>({slug:r.slug,title:r.title,category:r.category,cuisine:r.cuisine||'',tag:r.tag||'evergreen',published:r.status==='published'}));

const browse = (assetPrefix, linkPrefix)=>`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>You Cooked It — every recipe, one kitchen</title>
<meta name="description" content="${records.length} immersive cook-along recipes from You Cooked It. Pick a lane and cook with us."/>
<link rel="canonical" href="${SITE}/"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="You Cooked It"/>
<meta property="og:title" content="You Cooked It — every recipe, one kitchen"/>
<meta property="og:description" content="${records.length} immersive cook-along recipes. Pick a lane and cook with us."/>
<meta property="og:url" content="${SITE}/"/>
${imaged['marry-me-chicken']?`<meta property="og:image" content="${SITE}/images/marry-me-chicken.png"/>`:''}
<meta name="twitter:card" content="summary_large_image"/>
<meta name="theme-color" content="#ffffff"/>
<link rel="icon" href="/favicon.ico" sizes="48x48"/>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<link rel="manifest" href="/site.webmanifest"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;600;700;800&family=Hanken+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${assetPrefix}assets/styles.css?v=${cssVer}">
</head>
<body>
  <nav><a class="brand" href="${assetPrefix||'./'}">you <span style="color:var(--accent)">cook</span> it</a><div class="nl"><a href="${assetPrefix||'./'}">all recipes</a></div></nav>
  <section id="browse"><div class="wrap">
    <div class="head">
      <h1 class="display">every recipe.<br>one kitchen.</h1>
      <p class="lead">${records.length} recipes, each an immersive cook-along. Pick a lane, or filter by what you're in the mood for.</p>
    </div>
    <div class="filters" id="filters"></div>
    <div class="grid" id="grid"></div>
    <div class="count" id="count"></div>
  </div></section>
  <script>
    var CARDS=${JSON.stringify(cards).replace(/</g,'\\u003c')};
    var CAT=${JSON.stringify(CAT)};
    var CATS=${JSON.stringify(cats)};
    var LINK=${JSON.stringify(linkPrefix)};
    var ASSET=${JSON.stringify(assetPrefix)};
    // recipes with a hero image on disk (derived at build time)
    var IMAGED=${JSON.stringify(imaged)};
    var grid=document.getElementById('grid'),count=document.getElementById('count'),filters=document.getElementById('filters');
    var active='all',query='';
    // similar-word map (UK/US + common variants) so a search finds the dish either way
    var SYN={prawn:'shrimp',shrimp:'prawn',prawns:'shrimp',aubergine:'eggplant',eggplant:'aubergine',courgette:'zucchini',zucchini:'courgette',
      coriander:'cilantro',cilantro:'coriander',cookie:'biscuit',biscuit:'cookie',cookies:'biscuit',chips:'fries',fries:'chips',
      pudding:'dessert',mince:'beef',rocket:'arugula',arugula:'rocket',pepper:'capsicum',capsicum:'pepper',chickpea:'garbanzo',garbanzo:'chickpea',
      starter:'side',spicy:'hot',sweet:'dessert',veggie:'vegetarian',veg:'vegetable',noodle:'noodles'};
    CARDS.forEach(function(c){c._s=(c.title+' '+c.category+' '+(c.cuisine||'')).toLowerCase();c._w=c._s.split(/[^a-z0-9]+/).filter(Boolean);});
    function lev(a,b){var m=a.length,n=b.length,d=[],i,j;for(i=0;i<=m;i++)d[i]=[i];for(j=0;j<=n;j++)d[0][j]=j;
      for(i=1;i<=m;i++)for(j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n];}
    function tokenHit(tok,c){
      if(c._s.indexOf(tok)>-1)return true;                              // substring (keywords)
      var s=SYN[tok];if(s&&c._s.indexOf(s)>-1)return true;              // similar word
      if(tok.length>=4){for(var i=0;i<c._w.length;i++){var w=c._w[i];if(Math.abs(w.length-tok.length)<=1&&lev(tok,w)<=1)return true;}}  // typo
      return false;
    }
    function matchesQuery(c){if(!query)return true;var toks=query.split(/\s+/).filter(Boolean);for(var i=0;i<toks.length;i++)if(!tokenHit(toks[i],c))return false;return true;}
    function chip(label,val){var b=document.createElement('button');b.className='fchip cat'+(val===active?' on':'');b.textContent=label;b.onclick=function(){active=val;drawFilters();renderGrid();};return b;}
    // search pill — built once, kept across redraws so it never loses focus/value
    var searchChip=document.createElement('label');searchChip.className='fchip fsearch';
    searchChip.innerHTML='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M11 11l3.5 3.5"/></svg>';
    var qi=document.createElement('input');qi.type='search';qi.placeholder='search';qi.setAttribute('autocomplete','off');qi.setAttribute('aria-label','search recipes');
    searchChip.appendChild(qi);
    qi.addEventListener('input',function(){query=qi.value.toLowerCase().trim();renderGrid();});
    function drawFilters(){
      [].slice.call(filters.querySelectorAll('.fchip.cat')).forEach(function(b){b.remove();});
      var frag=document.createDocumentFragment();frag.appendChild(chip('all','all'));CATS.forEach(function(c){frag.appendChild(chip(c,c));});
      filters.insertBefore(frag,searchChip);
    }
    function renderGrid(){
      grid.innerHTML='';
      var list=CARDS.filter(function(c){return (active==='all'||c.category===active)&&matchesQuery(c);});
      if(active==='all'&&!query)list=list.slice().sort(function(a,b){return (b.tag==='trender')-(a.tag==='trender');});
      list.forEach(function(c){
        var col=CAT[c.category]||'#e2561f';
        var hasImg=!!IMAGED[c.slug];
        var a=document.createElement('a');a.className='card'+(hasImg?' has-img':'');a.href=LINK+c.slug+'.html';a.style.setProperty('--c',col);
        var art=hasImg?'<div class="cglow"></div><img class="cimg" alt="" loading="lazy" decoding="async" width="256" height="256" onerror="this.previousSibling.style.display=\\'none\\';this.style.display=\\'none\\'" src="'+ASSET+IMAGED[c.slug]+'">':'<div class="cblob"></div>';
        a.innerHTML=art+(c.tag==='trender'?'<div class="tag">trending</div>':'')+
          '<div class="inner"><div class="ccat">'+c.category+'</div><div class="ctitle">'+c.title.toLowerCase()+'</div></div>';
        grid.appendChild(a);
      });
      if(!list.length)grid.innerHTML='<div class="noresults">no recipes match that yet — try another word.</div>';
      count.textContent=query?(list.length+' result'+(list.length===1?'':'s')):(list.length+' of '+CARDS.length+' recipes');
    }
    filters.appendChild(searchChip);
    drawFilters();renderGrid();
  </script>
</body>
</html>`;

// home page at root
fs.writeFileSync(p('index.html'), browse('', 'recipes/'));
// keep the old /recipes/index.html path working
fs.writeFileSync(path.join(outDir,'index.html'),
  '<!DOCTYPE html>\n<meta charset="utf-8">\n<title>You Cooked It</title>\n<meta http-equiv="refresh" content="0; url=../index.html">\n<a href="../index.html">browse all recipes →</a>\n');

// ---- sitemap.xml (clean URLs) + robots.txt ----
const urls = ['<url><loc>'+SITE+'/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>']
  .concat(records.map(r=>'<url><loc>'+SITE+'/recipes/'+r.slug+'</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>'));
fs.writeFileSync(p('sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.join('\n')+'\n</urlset>\n');
fs.writeFileSync(p('robots.txt'),
  '# You Cooked It\nUser-agent: *\nAllow: /\n\nDisallow: /recipe.html\n\nSitemap: '+SITE+'/sitemap.xml\n');

const published = records.filter(r=>r.status==='published').length;
console.log('Home page + '+records.length+' recipe pages ('+published+' published, '+(records.length-published)+' stubbed).');
console.log('SEO: sitemap.xml ('+(records.length+1)+' urls) + robots.txt written. Canonical host '+SITE+'.');
