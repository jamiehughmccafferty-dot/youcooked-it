(function(){
  window.addEventListener('error',function(e){var b=document.getElementById('eb')||(function(){var d=document.createElement('div');d.id='eb';d.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#3a0d0d;color:#fdd;font:12px/1.4 monospace;padding:10px;white-space:pre-wrap;max-height:40%;overflow:auto';document.body.appendChild(d);return d;})();b.textContent='ERROR: '+(e.message||'')+(e.error&&e.error.stack?'\n'+e.error.stack:'');});
  var R=window.RECIPE||{};
  var $=function(s){return document.querySelector(s);},$$=function(s){return [].slice.call(document.querySelectorAll(s));};
  var CAT={curry:'#e8991c',rice:'#b7923c',chicken:'#e2561f',dessert:'#ff4d6d',cake:'#ef5fa0',baking:'#b86a4a',
    salad:'#4f8a3a',veg:'#6fae3c',vegetarian:'#3c9e74',breakfast:'#e9a72f',brunch:'#d98a52',pasta:'#c0341a',
    seafood:'#2f9bb0',soup:'#cf7b2a',stew:'#9c5526',bread:'#c98a3a',drinks:'#8a5cc4',sauce:'#cf3636'};
  var ACCENT=CAT[R.category]||'#e2561f';
  document.documentElement.style.setProperty('--accent',ACCENT);
  document.title='You Cooked It — '+(R.title||'Recipe');

  function setText(id,t){var el=document.getElementById(id);if(el)el.textContent=t;}
  function setHTML(id,h){var el=document.getElementById(id);if(el)el.innerHTML=h;}
  function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  var meta=R.meta||{};
  var baseServes=(meta.serves)||4;
  var titleLc=(R.title||'').toLowerCase();

  /* hero */
  setHTML('heroEyebrow','the recipe · serves '+baseServes);
  (function(){
    // tighten the thin lowercase 'i' (Unbounded gives it loose sidebearings, so it floats)
    var tightenI=function(s){return s.replace(/i/g,'<span class="tin">i</span>');};
    var w=titleLc.split(' ');if(w.length<2){setHTML('heroTitle','<span class="em">'+tightenI(esc(titleLc))+'</span>');}
    else{var last=w.pop();setHTML('heroTitle',tightenI(esc(w.join(' ')))+'<br><span class="em">'+tightenI(esc(last))+'</span>');}})();
  // shrink the title to fit its column so a long word can't squeeze the photo
  (function(){var h1=document.getElementById('heroTitle');if(!h1)return;
    function fit(){h1.style.fontSize='';var s=parseFloat(getComputedStyle(h1).fontSize),g=0;
      while(h1.scrollWidth>h1.clientWidth+1&&s>28&&g++<80){s-=2;h1.style.fontSize=s+'px';}}
    fit();addEventListener('resize',fit);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);})();
  setText('heroSub',(R.story||'').split('. ')[0].replace(/\.$/,'')+((R.story||'').indexOf('.')>-1?'.':''));
  var mi=[];
  if(meta.total_time)mi.push(['total',meta.total_time]);
  if(meta.marinate_time)mi.push(['marinate',meta.marinate_time]);
  if(meta.heat)mi.push(['heat',meta.heat]);
  if(meta.skill)mi.push(['skill',meta.skill]);
  setHTML('heroMeta',mi.map(function(m){return '<div><b>'+esc(m[1])+'</b><span>'+esc(m[0])+'</span></div>';}).join(''));
  var hero=document.getElementById('heroimg'),rev=document.getElementById('rev');
  function hideOnError(img){if(img)img.addEventListener('error',function(){img.style.visibility='hidden';});}
  hideOnError(hero);hideOnError(rev);
  if(R.hero){if(hero){hero.src='../images/'+R.hero;hero.alt=R.title||'';}if(rev){rev.src='../images/'+R.hero;rev.alt=R.title||'';}}

  /* marquee */
  var mq=[R.category,R.cuisine||'home cooking','made from scratch','no jar, no shortcut'].filter(Boolean).map(esc);
  var span='<span>'+mq.join(' <i>·</i> ')+' <i>·</i> </span>';
  setHTML('marquee','<div class="track">'+span+span+'</div>');

  /* story */
  (function(){var w=titleLc.split(' ');var h=w.length<2?'<span class="hl">'+esc(titleLc)+'</span>':esc(w.slice(0,-1).join(' '))+' <span class="hl">'+esc(w[w.length-1])+'</span>';setHTML('storyTitle',h);})();
  setText('storyText',R.story||'');

  /* finale text + serving ideas */
  var ideas=R.serving_ideas||[];
  setText('finaleText',(R.method&&R.method.length)?'Plate it up, add the trimmings and dig in. Better than any takeaway.':'Full recipe write-up coming soon.');
  setHTML('serveideas',ideas.map(function(s){return '<div class="si"><div class="e">'+esc(s.emoji||'✨')+'</div><b>'+esc(s.label||'')+'</b></div>';}).join(''));

  /* reveals */
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12});
  $$('.up').forEach(function(el,i){el.style.transitionDelay=(i%3*0.05)+'s';io.observe(el);});

  /* preloader */
  var pre=$('#pre'),pct=$('#pct'),pbar=$('#prebar'),v=0;
  var iv=setInterval(function(){v=Math.min(v+Math.random()*9+3,100);pct.textContent=Math.floor(v)+'%';pbar.style.width=v+'%';
    if(v>=100){clearInterval(iv);setTimeout(function(){pre.classList.add('done');},250);}},90);
  setTimeout(function(){pre.classList.add('done');},5000);

  /* hero parallax */
  if(hero)addEventListener('pointermove',function(e){var dx=(e.clientX/innerWidth-.5),dy=(e.clientY/innerHeight-.5);
    hero.style.transform='translate('+(dx*14)+'px,'+(dy*12)+'px) rotate('+(dx*2)+'deg)';},{passive:true});

  /* ---------- INGREDIENTS ---------- */
  var BASE=baseServes,serv=baseServes;
  document.getElementById('sv').textContent=serv;
  var groups=(R.ingredient_groups||[]).map(function(g){return [g.name,(g.items||[]).map(function(it){return [it.qty,it.unit,it.name,it.countable];})];});
  var spiceMix=R.spice_mix||[];
  var palette=['#d23a1e','#9c3b1b','#b5651d','#e9a72f','#c97b2a','#2f9bb0','#4f8a3a','#8a5cc4','#c0341a'];
  function frac(a){var w=Math.floor(a),r=a-w,m={0:'',0.25:'¼',0.5:'½',0.75:'¾'};var key=Math.round(r*4)/4;var f=m[key];if(f!==undefined)return (w?w:'')+f||'0';return (Math.round(a*10)/10)+'';}
  function fmt(base,count){var a=base*serv/BASE;if(count)return Math.max(1,Math.round(a));if(a<10)return frac(a);return Math.round(a);}
  var cols=$('#ingCols'),total=0;
  function render(){
    cols.innerHTML='';total=0;
    if(!groups.length){cols.innerHTML='<div class="ing-group"><p class="soon">Ingredients are being written up in the You Cooked It kitchen. Check back soon.</p></div>';countGathered();return;}
    groups.forEach(function(g){
      var wrap=document.createElement('div');wrap.className='ing-group';
      wrap.innerHTML='<h3>'+esc(g[0])+'</h3>';
      g[1].forEach(function(it){
        total++;var base=it[0],unit=it[1],name=it[2],count=it[3];
        var q=base==null?'':('<span class="qty">'+fmt(base,count)+(unit?' '+esc(unit):'')+'</span> ');
        var row=document.createElement('div');row.className='ing';
        row.innerHTML='<div class="box"><svg viewBox="0 0 14 14" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M2 7l3.5 4L12 3"/></svg></div><div class="txt">'+q+esc(name)+'</div>';
        row.addEventListener('click',function(){row.classList.toggle('checked');countGathered();});
        wrap.appendChild(row);
      });
      cols.appendChild(wrap);
    });
    if(spiceMix.length){
      var sw=document.createElement('div');sw.className='ing-group';sw.innerHTML='<h3>the spice mix</h3>';
      var cw=document.createElement('div');cw.className='spicechips';
      spiceMix.forEach(function(s,i){var chip=document.createElement('span');chip.className='chip';chip.style.background=palette[i%palette.length];
        chip.textContent=s.name||'';if(s.note)chip.innerHTML+='<span class="tip">'+esc(s.note)+'</span>';cw.appendChild(chip);});
      sw.appendChild(cw);cols.appendChild(sw);
    }
    countGathered();
  }
  function countGathered(){var c=$$('.ing.checked').length;$('#gathered').textContent=c+' of '+total+' gathered'+(total&&c===total?' — all set! 🙌':(total?' — tap to check off':''));}
  function syncServes(){$('#sv').textContent=serv;var e=document.getElementById('heroEyebrow');if(e)e.textContent='the recipe · serves '+serv;}
  $('#plus').onclick=function(){serv=Math.min(serv+1,12);syncServes();render();};
  $('#minus').onclick=function(){serv=Math.max(serv-1,1);syncServes();render();};
  syncServes();render();

  /* ---------- METHOD ---------- */
  var steps=(R.method||[]).map(function(s){return [s.title,s.when,s.body,s.timer_seconds];});
  var wrap=$('#steps'),doneCount=0,N=steps.length;
  // soft two-note kitchen chime when a timer finishes (audio is unlocked by the tap that started it)
  var _actx;
  function ding(){try{_actx=_actx||new (window.AudioContext||window.webkitAudioContext)();var now=_actx.currentTime;
    [880,1318.5].forEach(function(f,i){var o=_actx.createOscillator(),g=_actx.createGain();o.type='sine';o.frequency.value=f;
      o.connect(g);g.connect(_actx.destination);var s=now+i*0.16;
      g.gain.setValueAtTime(0.0001,s);g.gain.exponentialRampToValueAtTime(0.22,s+0.02);g.gain.exponentialRampToValueAtTime(0.0001,s+0.45);
      o.start(s);o.stop(s+0.5);});}catch(e){}}
  var CK='<svg class="ck" width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l3.5 4L14 4"/></svg>';
  if(!N){wrap.insertAdjacentHTML('beforeend','<p class="soon" style="padding:18px 0 6px">The method for this recipe is coming soon. The photo and colour are ready, the step-by-step is on the way.</p>');}
  steps.forEach(function(s,i){
    var el=document.createElement('div');el.className='step up';
    var timer=s[3]?'<div class="tools"><button class="tmr" data-timer="'+s[3]+'">⏱ set a '+Math.round(s[3]/60)+'-min timer</button></div>':'';
    el.innerHTML='<div class="marker"><span class="n">'+(i+1)+'</span>'+CK+'</div>'+
      '<div class="body"><div class="when">'+esc(s[1]||'')+'</div><h3>'+esc(s[0]||'')+'</h3><p>'+esc(s[2]||'')+'</p>'+timer+'</div>';
    wrap.appendChild(el);io.observe(el);
    el.querySelector('.marker').addEventListener('click',function(){
      if(el.classList.contains('done'))return;el.classList.add('done');doneCount++;updateHUD();if(doneCount===N)finish();});
    var tb=el.querySelector('[data-timer]');
    if(tb){var int;tb.addEventListener('click',function(){
      if(tb.classList.contains('run'))return;
      var t=+tb.dataset.timer;tb.classList.add('run');
      var show=function(){tb.textContent='⏱ '+Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};show();
      int=setInterval(function(){t--;show();if(t<=0){clearInterval(int);
        tb.textContent='time’s up! ⏰';tb.classList.add('done');
        el.classList.add('timesup');setTimeout(function(){el.classList.remove('timesup');},1600);
        ding();confettiBurst(10);
      }},1000);});}
  });
  var railfill=$('#railfill'),hud=$('#hud'),hbf=$('#hbf'),hudtxt=$('#hudtxt');
  function updateHUD(){hudtxt.textContent='method · '+doneCount+'/'+N+' done';hbf.style.width=(doneCount/N*100)+'%';railfill.style.height=(doneCount/N*100)+'%';}
  if(N){updateHUD();var methodSec=$('#method');
    addEventListener('scroll',function(){var r=methodSec.getBoundingClientRect();
      hud.classList.toggle('show',r.top<innerHeight*.5&&r.bottom>innerHeight*.25&&doneCount<N);},{passive:true});}

  /* finale */
  var finished=false;
  function finish(){if(finished)return;finished=true;hud.classList.remove('show');$('#rev').classList.add('in');confettiBurst(60);location.hash='#finale';}
  new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)$('#rev').classList.add('in');});},{threshold:.4}).observe($('#finale'));
  // share: native share sheet on mobile (shows the OG card), copy-link fallback on desktop
  var sb=$('#shareBtn');
  if(sb)sb.addEventListener('click',function(e){e.preventDefault();
    var url=location.href, t=(R.title||'You Cooked It');
    var data={title:t+' · You Cooked It', text:'Cook '+t.toLowerCase()+' with You Cooked It', url:url};
    if(navigator.share){navigator.share(data).catch(function(){});return;}
    var ok=function(){var o=sb.textContent;sb.textContent='link copied ✓';setTimeout(function(){sb.textContent=o;},1800);};
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(ok,function(){window.prompt('Copy this link:',url);});}
    else window.prompt('Copy this link:',url);
  });

  /* confetti */
  function confettiBurst(n){for(var i=0;i<n;i++){var l=document.createElement('div');l.className='leaf';
    l.style.left=(Math.random()*innerWidth)+'px';l.style.background=Math.random()<.25?'#7cb24f':'#4f8a3a';l.style.top='-20px';
    document.body.appendChild(l);var dx=(Math.random()-.5)*240,dur=1.6+Math.random()*1.6,rot=Math.random()*720-360;
    l.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:'translate('+dx+'px,'+(innerHeight+60)+'px) rotate('+rot+'deg)',opacity:.9}],
      {duration:dur*1000,easing:'cubic-bezier(.3,.7,.5,1)'}).onfinish=function(){this.effect&&this.effect.target&&this.effect.target.remove();};}}
})();
