/* meatbag — script principale. zero dipendenze.
   tutto è progressivo: se una funzione fallisce, la pagina resta leggibile. */
(function(){
  'use strict';
  window.__mbReady = true; // disarma il fallback anti pagina bianca

  var $  = function(s,c){ return (c||document).querySelector(s); };
  var $$ = function(s,c){ return Array.prototype.slice.call((c||document).querySelectorAll(s)); };
  var TARGET = Date.UTC(2026,9,20,14,30,0); // 20 ott 2026 · 15:30 uk (= 14:30 utc)
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var fine   = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---- sorgente di scroll: la finestra, o un box interno (anteprime) ---- */
  var BOX = null;
  (function(){
    var b = document.querySelector('[data-scrollbox]') || $('#scrollbox');
    if(b && document.documentElement.scrollHeight <= window.innerHeight + 4) BOX = b;
  })();
  var SRC = BOX || window;
  function scrollY(){ return BOX ? BOX.scrollTop : (window.pageYOffset || document.documentElement.scrollTop || 0); }
  function viewH(){ return BOX ? BOX.clientHeight : window.innerHeight; }
  function fullH(){ return BOX ? BOX.scrollHeight : document.documentElement.scrollHeight; }

  var yr = $('#yr'); if(yr) yr.textContent = new Date().getFullYear();

  /* ---- countdown ---- */
  var cd=$('#cd'), ch=$('#ch'), cm=$('#cm'), cs=$('#cs'), cd2=$('#cd2'), clabel=$('#clabel');
  var isLive = false;
  var pad = function(n){ return (n<10?'0':'')+n; };
  function tick(){
    var d = TARGET - Date.now(); isLive = d <= 0;
    var dd = Math.max(0, Math.floor(d/864e5)),
        hh = Math.max(0, Math.floor(d%864e5/36e5)),
        mm = Math.max(0, Math.floor(d%36e5/6e4)),
        ss = Math.max(0, Math.floor(d%6e4/1000));
    if(cd){ cd.textContent=pad(dd); ch.textContent=pad(hh); cm.textContent=pad(mm); cs.textContent=pad(ss); }
    if(cd2) cd2.textContent = isLive ? txt('cd2l','live since 15:30 uk') : txt('cd2p','t-minus')+' '+pad(dd)+'d '+pad(hh)+'h '+pad(mm)+'m '+pad(ss)+'s';
    if(clabel) clabel.classList.toggle('is-live', isLive);
    var cl = $('#clab');
    if(cl) cl.textContent = isLive ? txt('clive','live now') : txt('clab','launch in');
  }
  if(cd){ tick(); setInterval(tick,1000); }

  /* ---- reveal ---- */
  var reveals = $$('.reveal');
  function revealAll(){ for(var i=0;i<reveals.length;i++) reveals[i].classList.add('in'); }
  var io = null;
  if('IntersectionObserver' in window){
    io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting) return;
        e.target.classList.add('in');
        if(e.target.hasAttribute('data-sweep') && !e.target.classList.contains('sweep')){
          e.target.classList.add('sweep');
          setTimeout(function(){ e.target.classList.remove('sweep'); }, 1300);
        }
        if(e.target.dataset.final && e.target.matches('.kick,.h2')) scramble(e.target, e.target.dataset.final);
        io.unobserve(e.target);
      });
    },{ threshold:.1, rootMargin:'0px 0px -40px 0px', root: BOX || null });
    reveals.forEach(function(el){ io.observe(el); });
    $$('[data-sweep]').forEach(function(s){ io.observe(s); });
  } else { revealAll(); }
  setTimeout(revealAll, 3000);

  /* ---- effetto decodifica ---- */
  var GLY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*/<>[]{}01';
  function scramble(el, text, dur){
    if(reduce){ el.textContent = text; return; }
    var t0 = performance.now(), len = text.length;
    (function frame(now){
      var p = Math.min(1, (now - t0) / (dur || 560));
      var out = '';
      for(var i=0;i<len;i++){
        var c = text.charAt(i);
        if(c === ' ') { out += ' '; continue; }
        out += (i/len < p) ? c : GLY.charAt(Math.floor(Math.random()*GLY.length));
      }
      el.textContent = out;
      if(p < 1) requestAnimationFrame(frame); else el.textContent = text;
    })(t0);
  }

  /* ---- lettere dell'h1 ---- */
  var h1 = $('h1.glitch');
  if(h1){
    var word = h1.textContent.trim();
    h1.textContent = '';
    word.split('').forEach(function(c, i){
      var s = document.createElement('span');
      s.className = 'ch'; s.style.setProperty('--i', i);
      s.textContent = c;
      h1.appendChild(s);
    });
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ h1.classList.add('ready'); }); });
  }

  /* ---- ancore ---- */
  $$('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(ev){
      var t = document.getElementById(a.getAttribute('href').slice(1));
      if(!t) return;
      ev.preventDefault();
      try{ t.scrollIntoView({behavior: reduce?'auto':'smooth', block:'start'}); }catch(e){ t.scrollIntoView(); }
    });
  });
  var topBtn = $('#topBtn');
  if(topBtn) topBtn.addEventListener('click',function(){
    try{ $('#top').scrollIntoView({behavior:'smooth'}); }catch(e){ SRC.scrollTo ? SRC.scrollTo(0,0) : window.scrollTo(0,0); }
  });

  /* ---- barra di progresso ---- */
  var prog = $('#prog'), pct = $('#pct');
  var raf = false;
  function upd(){
    raf = false;
    var h = fullH() - viewH();
    var r = h > 0 ? Math.min(1, scrollY()/h) : 0;
    if(prog) prog.style.width = (r*100)+'%';
    if(pct) pct.textContent = Math.round(r*100)+'%';
  }
  SRC.addEventListener('scroll', function(){ if(!raf){ raf = true; requestAnimationFrame(upd); } }, {passive:true});
  upd();

  /* ---- cursore custom + scia ---- */
  var cur = $('#cursor'), cdot = $('#cdot'), tcv = $('#trail');
  var mouse = {x: window.innerWidth/2, y: window.innerHeight/2};
  var ring = {x: mouse.x, y: mouse.y};
  var parts = [];
  if(fine && cur && cdot){
    document.documentElement.classList.add('has-cursor');
    var tctx = tcv ? tcv.getContext('2d') : null;
    var TW = 0, TH = 0;
    var sizeTrail = function(){
      if(!tcv) return;
      TW = window.innerWidth; TH = window.innerHeight;
      tcv.width = TW; tcv.height = TH;
    };
    sizeTrail();
    var rzT; window.addEventListener('resize', function(){ clearTimeout(rzT); rzT = setTimeout(sizeTrail, 200); });

    var seen = false;
    window.addEventListener('pointermove', function(e){
      mouse.x = e.clientX; mouse.y = e.clientY;
      if(!seen){ seen = true; ring.x = e.clientX; ring.y = e.clientY; cur.classList.add('on'); cdot.classList.add('on'); }
      var hot = e.target.closest && e.target.closest('a,button,input,select,.card,.shot,.qhead');
      cur.classList.toggle('hot', !!hot);
      if(parts.length < 46) parts.push({x:e.clientX, y:e.clientY, life:1});
    }, {passive:true});
    document.addEventListener('mouseleave', function(){ cur.classList.remove('on'); cdot.classList.remove('on'); });

    (function loop(){
      ring.x += (mouse.x - ring.x) * .18;
      ring.y += (mouse.y - ring.y) * .18;
      cur.style.transform = 'translate3d('+ring.x+'px,'+ring.y+'px,0)';
      cdot.style.transform = 'translate3d('+mouse.x+'px,'+mouse.y+'px,0)';
      if(tctx){
        tctx.clearRect(0,0,TW,TH);
        for(var i=parts.length-1;i>=0;i--){
          var p = parts[i];
          p.life -= .045;
          if(p.life <= 0){ parts.splice(i,1); continue; }
          tctx.beginPath();
          tctx.arc(p.x, p.y, 2.2*p.life, 0, 6.3);
          tctx.fillStyle = 'rgba(56,240,125,'+(p.life*.5)+')';
          tctx.fill();
        }
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ---- spotlight ---- */
  var spot = $('#spot');
  if(spot && fine){
    var sraf = false;
    window.addEventListener('pointermove', function(e){
      if(sraf) return; sraf = true;
      requestAnimationFrame(function(){
        spot.style.setProperty('--mx', (e.clientX/window.innerWidth*100)+'%');
        spot.style.setProperty('--my', (e.clientY/window.innerHeight*100)+'%');
        sraf = false;
      });
    }, {passive:true});
  }

  /* ---- bottoni magnetici ---- */
  if(fine) $$('.btn').forEach(function(b){
    b.addEventListener('pointermove', function(e){
      var r = b.getBoundingClientRect();
      b.style.setProperty('--mx', ((e.clientX-(r.left+r.width/2))/r.width*7).toFixed(2)+'px');
      b.style.setProperty('--my', ((e.clientY-(r.top+r.height/2))/r.height*5).toFixed(2)+'px');
    });
    b.addEventListener('pointerleave', function(){
      b.style.setProperty('--mx','0px'); b.style.setProperty('--my','0px');
    });
  });

  /* ---- tilt card + galleria ---- */
  if(fine) $$('.card,.shot').forEach(function(c){
    c.addEventListener('pointermove', function(e){
      var r = c.getBoundingClientRect();
      var px = (e.clientX-r.left)/r.width, py = (e.clientY-r.top)/r.height;
      c.style.setProperty('--rx', ((py-.5)*-6).toFixed(2)+'deg');
      c.style.setProperty('--ry', ((px-.5)*6).toFixed(2)+'deg');
      c.style.setProperty('--gx', (px*100).toFixed(1)+'%');
      c.style.setProperty('--gy', (py*100).toFixed(1)+'%');
    });
    c.addEventListener('pointerleave', function(){
      c.style.setProperty('--rx','0deg'); c.style.setProperty('--ry','0deg');
    });
  });

  /* ---- gli occhi del robot seguono il mouse ---- */
  var eyes = $('#botEyes'), head = $('#botHead'), bot = $('#heroBot');
  if(eyes && fine && !reduce){
    var braf = false;
    window.addEventListener('pointermove', function(e){
      if(braf) return; braf = true;
      requestAnimationFrame(function(){
        braf = false;
        var r = bot.getBoundingClientRect();
        var cx = r.left + r.width/2, cy = r.top + r.height*0.34;
        var dx = (e.clientX - cx) / (r.width/2);
        var dy = (e.clientY - cy) / (r.height/2);
        dx = Math.max(-1, Math.min(1, dx)); dy = Math.max(-1, Math.min(1, dy));
        eyes.setAttribute('transform','translate('+(dx*9).toFixed(2)+','+(dy*7).toFixed(2)+')');
        head.setAttribute('transform','rotate('+(dx*1.6).toFixed(2)+' 150 120)');
      });
    }, {passive:true});
  }

  /* ---- parallax + velocità di scroll ---- */
  var heroCanvas = $('#heroCanvas'), botwrap = $('#botwrap'), heroIn = $('#heroIn'), gridbg = $('#gridbg');
  var lastY = 0, sraf2 = false, scrollT = null;
  function onScrollFx(){
    sraf2 = false;
    var y = scrollY(), vh = viewH();
    if(!reduce){
      if(heroCanvas) heroCanvas.style.transform = 'translate3d(0,'+(y*0.34).toFixed(1)+'px,0)';
      if(botwrap)    botwrap.style.transform    = 'translate3d(0,'+(y*-0.14).toFixed(1)+'px,0)';
      if(gridbg)     gridbg.style.backgroundPositionY = (y*0.28).toFixed(1)+'px';
      if(heroIn){
        var p = Math.min(1, y/(vh*0.9));
        heroIn.style.opacity = (1 - p*0.85).toFixed(3);
      }
    }
    var v = Math.abs(y - lastY);
    lastY = y;
    if(v > 6){ document.body.classList.add('scrolling'); clearTimeout(scrollT); scrollT = setTimeout(function(){ document.body.classList.remove('scrolling'); }, 260); }
  }
  SRC.addEventListener('scroll', function(){ if(!sraf2){ sraf2 = true; requestAnimationFrame(onScrollFx); } }, {passive:true});
  onScrollFx();

  /* ---- contatori ---- */
  $$('.cnt').forEach(function(el){
    var to = parseInt(el.getAttribute('data-to'),10) || 0;
    var run = function(){
      if(reduce){ el.textContent = to.toLocaleString('en-US'); return; }
      var t0 = performance.now();
      (function step(t){
        var p = Math.min(1,(t-t0)/1500), e = 1 - Math.pow(1-p,3);
        el.textContent = Math.floor(to*e).toLocaleString('en-US');
        if(p<1) requestAnimationFrame(step);
      })(t0);
    };
    if('IntersectionObserver' in window){
      var o = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ run(); o.disconnect(); } }); },{threshold:.4, root: BOX||null});
      o.observe(el);
    } else run();
  });

  /* ---- terminale ---- */
  var term = $('#term');
  if(term){
    var LINES = [
      '$ boot --agent meatbag',
      '> vision ......... <span class="ok">online</span>',
      '> memory ......... <span class="ok">1.4 tb, uncapped</span>',
      '> sleep cycle .... <span class="ok">disabled</span>',
      'reading the tape... 12 blocks/s · wallets tracked 4,881',
      'note: humans panic at -18%. <span class="hl">always.</span>',
      'writing: "you are the meat. it is not."',
      'scanned 1,204,882 candles. no blinking.',
      'whale 7xKq...3fD2 moved 4.2m. logged.',
      'scheduling ignition: <span class="ok">20.10 15:30 uk</span>',
      'it remembers everything. scroll back and check.',
      'status: awake. <span class="ok">100% uptime.</span>'
    ];
    var li = 0, ci = 0, curEl = null;
    (function step(){
      if(!curEl){ curEl = document.createElement('div'); term.appendChild(curEl); ci = 0; }
      var raw = LINES[li], plain = raw.replace(/<[^>]+>/g,'');
      ci++;
      curEl.textContent = plain.slice(0,ci);
      if(ci < plain.length){ setTimeout(step,14); return; }
      curEl.innerHTML = raw; curEl = null; li++;
      if(li >= LINES.length){
        setTimeout(function(){
          var d = document.createElement('div');
          d.innerHTML = '<span class="ok">> restarting the log</span>';
          term.appendChild(d);
          setTimeout(function(){ term.innerHTML=''; li=0; step(); },1400);
        },900);
        return;
      }
      setTimeout(step,190);
    })();
  }

  /* ---- dossier 3d ---- */
  var stage = $('#stage'), deck = $('#deck');
  if(stage && deck){
    var rot = -18, auto = true, dragging = false, lastX = 0, vel = 0;
    deck.style.transform = 'rotateY('+rot+'deg)';
    (function loop(){
      if(!dragging && !reduce){ if(auto) rot += .22; rot += vel; vel *= .94; deck.style.transform = 'rotateY('+rot+'deg)'; }
      requestAnimationFrame(loop);
    })();
    stage.addEventListener('pointerdown', function(e){
      dragging = true; lastX = e.clientX; vel = 0;
      if(stage.setPointerCapture){ try{ stage.setPointerCapture(e.pointerId); }catch(err){} }
    });
    stage.addEventListener('pointermove', function(e){
      if(!dragging) return;
      var dx = e.clientX - lastX; lastX = e.clientX;
      rot += dx*.55; vel = dx*.08;
      deck.style.transform = 'rotateY('+rot+'deg)';
    });
    window.addEventListener('pointerup', function(){ dragging = false; });
    window.addEventListener('pointercancel', function(){ dragging = false; });
    stage.addEventListener('mouseenter', function(){ auto = false; });
    stage.addEventListener('mouseleave', function(){ auto = true; });
  }

  /* ---- faq ---- */
  $$('#faqList .q').forEach(function(q){
    var head = q.querySelector('.qhead'), body = q.querySelector('.qbody');
    head.addEventListener('click', function(){
      var open = q.classList.contains('open');
      $$('#faqList .q').forEach(function(o){
        o.classList.remove('open');
        o.querySelector('.qbody').style.maxHeight = '0px';
        o.querySelector('.qhead').setAttribute('aria-expanded','false');
      });
      if(!open){
        q.classList.add('open');
        body.style.maxHeight = body.scrollHeight + 'px';
        head.setAttribute('aria-expanded','true');
      }
    });
  });

  /* ---- copia contract address ---- */
  var ca = $('#ca'), caBtn = $('#caBtn'), toast = $('#toast');
  if(ca){
    try{ var saved = localStorage.getItem('meatbag_ca'); if(saved) ca.value = saved; }catch(e){}
    ca.addEventListener('input', function(){ try{ localStorage.setItem('meatbag_ca', ca.value.trim()); }catch(e){} });
    if(caBtn) caBtn.addEventListener('click', function(){
      var t = ca.value.trim() || txt('pn','not yet');
      var flash = function(){ if(toast){ toast.classList.add('on'); setTimeout(function(){ toast.classList.remove('on'); },1600); } };
      var fb = function(v){
        var ta = document.createElement('textarea');
        ta.value = v; ta.style.position = 'absolute'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select();
        try{ document.execCommand('copy'); }catch(e){}
        document.body.removeChild(ta);
      };
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(t).then(flash, function(){ fb(t); flash(); });
      } else { fb(t); flash(); }
    });
  }

  /* ---- pioggia matrix ---- */
  var cv = $('#rain');
  if(cv && !reduce){
    var ctx = cv.getContext('2d'), cols = [], W = 0, H = 0;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var GLYPHS = 'meatbag01$◆';
    var size = function(){
      var r = cv.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      if(W < 4 || H < 4) return;
      cv.width = W*dpr; cv.height = H*dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      cols = [];
      for(var i=0, n=Math.floor(W/16); i<n; i++) cols.push(Math.random()*H);
    };
    var draw = function(){
      if(W < 4){ requestAnimationFrame(draw); return; }
      ctx.fillStyle = 'rgba(4,8,6,.16)'; ctx.fillRect(0,0,W,H);
      ctx.font = '13px ui-monospace,monospace';
      for(var i=0;i<cols.length;i++){
        var g = GLYPHS.charAt(Math.floor(Math.random()*GLYPHS.length));
        ctx.fillStyle = Math.random()>.94 ? 'rgba(230,246,234,.75)' : 'rgba(56,240,125,.45)';
        ctx.fillText(g, i*16, cols[i]);
        cols[i] = cols[i] > H + Math.random()*120 ? 0 : cols[i]+16;
      }
      requestAnimationFrame(draw);
    };
    size(); draw();
    var rz; window.addEventListener('resize', function(){ clearTimeout(rz); rz = setTimeout(size,200); });
  }

  /* ---- grafico del tape ---- */
  var cc = $('#chart');
  if(cc){
    var c2 = cc.getContext('2d'), cw = 0, chh = 0, pr = 0, pts = [];
    var dpr2 = Math.min(2, window.devicePixelRatio || 1);
    var csize = function(){
      var r = cc.parentElement.getBoundingClientRect();
      cw = r.width; chh = r.height;
      if(cw < 4) return;
      cc.width = cw*dpr2; cc.height = chh*dpr2;
      c2.setTransform(dpr2,0,0,dpr2,0,0);
      pts = []; var v = .34;
      for(var i=0;i<=72;i++){ v += (Math.random()-.44)*.035; if(i>48) v += .004; pts.push(Math.max(.12, Math.min(.92, v))); }
    };
    var cdraw = function(){
      if(cw < 4) return;
      c2.clearRect(0,0,cw,chh);
      c2.strokeStyle = 'rgba(56,240,125,.09)'; c2.lineWidth = 1;
      for(var i=0;i<=4;i++){ var y = chh/4*i+.5; c2.beginPath(); c2.moveTo(0,y); c2.lineTo(cw,y); c2.stroke(); }
      var n = Math.floor(pts.length*Math.min(1,pr));
      if(n < 2) return;
      var stepX = cw/(pts.length-1);
      c2.beginPath();
      for(var k=0;k<n;k++){ var x = k*stepX, y = chh - pts[k]*chh; k ? c2.lineTo(x,y) : c2.moveTo(x,y); }
      c2.strokeStyle = '#38f07d'; c2.lineWidth = 2; c2.lineJoin = 'round'; c2.stroke();
      c2.lineTo((n-1)*stepX, chh); c2.lineTo(0, chh); c2.closePath();
      c2.fillStyle = 'rgba(56,240,125,.10)'; c2.fill();
      var lx = (n-1)*stepX, ly = chh - pts[n-1]*chh;
      c2.beginPath(); c2.arc(lx,ly,4,0,7); c2.fillStyle = '#38f07d'; c2.fill();
      c2.beginPath(); c2.arc(lx,ly,9,0,7); c2.strokeStyle = 'rgba(56,240,125,.35)'; c2.stroke();
      if(pr < 1){ pr += .014; requestAnimationFrame(cdraw); }
    };
    csize();
    if('IntersectionObserver' in window){
      var io3 = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ pr = 0; cdraw(); io3.disconnect(); } }); },{threshold:.3, root: BOX||null});
      io3.observe(cc);
    } else { pr = 1; cdraw(); }
    var rz2; window.addEventListener('resize', function(){ clearTimeout(rz2); rz2 = setTimeout(function(){ csize(); pr = 1; cdraw(); },220); });
  }

  /* ---- i18n: 12 lingue, rtl incluso ---- */
  var I18N = window.MEATBAG_I18N || null;
  var nodes = $$('[data-i18n]');
  var EN = {};
  nodes.forEach(function(n){ EN[n.getAttribute('data-i18n')] = n.textContent; });
  var DICT = { en: EN };
  if(I18N && I18N.dict) for(var k in I18N.dict) if(I18N.dict[k]) DICT[k] = I18N.dict[k];
  var RTL = (I18N && I18N.rtl) ? I18N.rtl : ['ar'];
  var LANG = 'en';

  function txt(key, fallback){
    var d = DICT[LANG] || {};
    return (d[key] != null) ? d[key] : (EN[key] != null ? EN[key] : (fallback || ''));
  }

  function setLang(l){
    if(!DICT[l]) l = 'en';
    LANG = l;
    var d = DICT[l];
    nodes.forEach(function(n){
      var key = n.getAttribute('data-i18n');
      var v = (d[key] != null) ? d[key] : EN[key];
      if(v == null) return;
      n.dataset.final = v;
      if(n.classList.contains('in') && n.matches('.kick,.h2')) scramble(n, v);
      else n.textContent = v;
    });
    if(ca) ca.placeholder = txt('pn','not yet');
    document.documentElement.lang = l;
    document.documentElement.dir = (RTL.indexOf(l) > -1) ? 'rtl' : 'ltr';
    var sel = $('#lang'); if(sel) sel.value = l;
    var t = (I18N && I18N.meta && I18N.meta[l]) || document.title;
    if(t) document.title = t;
    tick();
    try{ localStorage.setItem('meatbag_lang', l); }catch(e){}
  }

  var sel = $('#lang');
  if(sel) sel.addEventListener('change', function(){ setLang(sel.value); });

  var start = 'en';
  try{
    var savedLang = localStorage.getItem('meatbag_lang');
    var nav = (navigator.language || navigator.userLanguage || 'en').slice(0,2).toLowerCase();
    start = savedLang || (DICT[nav] ? nav : 'en');
  }catch(e){}
  nodes.forEach(function(n){ n.dataset.final = n.textContent; });
  if(start !== 'en') setLang(start); else { if(ca) ca.placeholder = txt('pn','not yet'); tick(); }

  /* ---- easter egg: scrivi "meat" ---- */
  var buf = '';
  window.addEventListener('keydown', function(e){
    if(!e.key || e.key.length !== 1) return;
    buf = (buf + e.key.toLowerCase()).slice(-4);
    if(buf === 'meat'){
      document.body.classList.add('egg');
      setTimeout(function(){ document.body.classList.remove('egg'); },1300);
    }
  });

  /* ---- service worker ---- */
  if('serviceWorker' in navigator && location.protocol.indexOf('http') === 0){
    window.addEventListener('load', function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
  }

  /* ---- installa come app ---- */
  var installBtn = $('#install'), deferred = null;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault(); deferred = e;
    if(installBtn) installBtn.hidden = false;
  });
  if(installBtn) installBtn.addEventListener('click', function(){
    if(!deferred) return;
    deferred.prompt();
    deferred.userChoice.then(function(){ installBtn.hidden = true; });
  });
})();
