// The film's motion on the page, the way a product page does it: the SCROLL is the playhead.
//
// A scene is a tall section whose stage is pinned (position: sticky) while the reader scrolls through it; how far they
// have scrolled — 0 at its top, 1 at its end — drives every move in it, forwards and back. Elsewhere, an element's
// passage through the screen drives a slow parallax. Only transform and opacity change, set once a frame from one
// passive scroll listener; nothing hijacks the scroll and nothing runs on a timer except the strip's count-up.
//
// Pure enhancement: without this script — or under prefers-reduced-motion — nothing is pinned and the page is drawn
// whole and still. No text is ever changed: headings' words are wrapped, never rewritten.
(function () {
  'use strict';
  // ── the highlights: a gallery that moves sideways (native scroll and snap); its dots say where it is and take you
  // there, and while it is on the screen it moves on by itself every 6 s until paused or touched ──
  var gal = document.querySelector('[data-gallery]');
  if (gal) {
    var track = gal.querySelector('.caps'), cards = Array.prototype.slice.call(track.children);
    var dots = gal.querySelector('.gal-dots'), playB = gal.querySelector('.gal-play');
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var cur = 0, paused = calm, inView = false, timer = 0;
    cards.forEach(function (c, k) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', (c.querySelector('h3') || {}).textContent || ('Highlight ' + (k + 1)));
      b.addEventListener('click', function () { show(k); tick(); });
      dots.appendChild(b);
    });
    var marks = Array.prototype.slice.call(dots.children);
    var mark = function (k) { cur = k; marks.forEach(function (m, j) { m.setAttribute('aria-selected', j === k ? 'true' : 'false'); }); };
    var show = function (k) { var c = cards[k]; if (!c) return; track.scrollTo({ left: c.offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft), behavior: calm ? 'auto' : 'smooth' }); mark(k); };
    var tick = function () {
      clearTimeout(timer);
      var on = !paused && inView;
      gal.classList.toggle('playing', on);
      // restart the active dot's fill, so it fills over the six seconds the card is shown
      marks.forEach(function (m) { m.classList.remove('run'); });
      if (on) { void dots.offsetWidth; marks[cur].classList.add('run'); timer = setTimeout(function () { show((cur + 1) % cards.length); tick(); }, 6000); }
    };
    var stop = function () { paused = true; playB.setAttribute('aria-pressed', 'true'); playB.setAttribute('aria-label', 'Play the highlights'); tick(); };
    playB.addEventListener('click', function () {
      if (paused) { paused = false; playB.setAttribute('aria-pressed', 'false'); playB.setAttribute('aria-label', 'Pause the highlights'); tick(); } else stop();
    });
    if (calm) { playB.setAttribute('aria-pressed', 'true'); playB.setAttribute('aria-label', 'Play the highlights'); }
    var settle = 0;
    track.addEventListener('scroll', function () {
      clearTimeout(settle);
      settle = setTimeout(function () {
        var x = track.scrollLeft, best = 0, d = 1e9;
        cards.forEach(function (c, k) { var e = Math.abs(c.offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft) - x); if (e < d) { d = e; best = k; } });
        mark(best);
      }, 90);
    }, { passive: true });
    // a reader's own hand on the gallery stops it — a mouse press, a key, a sideways swipe or a sideways wheel; a page
    // scrolled past over it does not, by wheel or by thumb (a phone's gallery is the screen's whole width, so a touch
    // that starts on it is usually the page being scrolled: only one that then moves sideways is the reader's)
    var hand = function () { if (!paused) stop(); };
    track.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' || e.pointerType === 'pen') hand(); }, { passive: true });
    track.addEventListener('keydown', hand);
    var t0 = null;
    track.addEventListener('touchstart', function (e) { var t = e.touches[0]; t0 = t ? { x: t.clientX, y: t.clientY } : null; }, { passive: true });
    track.addEventListener('touchmove', function (e) {
      var t = e.touches[0]; if (!t0 || !t) return;
      var dx = Math.abs(t.clientX - t0.x), dy = Math.abs(t.clientY - t0.y);
      if (dx > 10 && dx > dy) { hand(); t0 = null; } else if (dy > 10) t0 = null;
    }, { passive: true });
    track.addEventListener('wheel', function (e) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) hand(); }, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[0].isIntersecting; tick(); }, { threshold: .5 }).observe(track);
    mark(0);
    gal.classList.add('live');
  }

  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || !('IntersectionObserver' in window)) return;
  var root = document.documentElement;
  root.classList.add('motion');
  // the rest after the first paint: nothing here may delay the opening's headline
  var go = function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a)); }; // p's progress through [a, b]
  var ramp = function (t) { return 1 - Math.pow(1 - t, 3); }; // fast in, long tail
  var wrapWords = function (node, cls) {
    Array.prototype.slice.call(node.childNodes).forEach(function (c) {
      if (c.nodeType === 3) {
        var frag = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(function (p) {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          var w = document.createElement('span'); w.className = cls.w;
          if (cls.i) { var i = document.createElement('i'); i.textContent = p; w.appendChild(i); } else w.textContent = p;
          frag.appendChild(w);
        });
        node.replaceChild(frag, c);
      } else if (c.nodeType === 1 && c.tagName !== 'CODE') wrapWords(c, cls);
    });
  };

  // ── headings rise out of their masks as they come into view (the h1 paints at once: the page's largest paint) ──
  var heads = $$('main h2:not(.say)');
  heads.forEach(function (h) {
    wrapWords(h, { w: 'w', i: true });
    h.classList.add('split');
    var ws = $$('.w > i', h);
    ws.forEach(function (i, k) { i.style.transitionDelay = (k * 45) + 'ms'; });
    // the gradient a statement carries, laid across its words: each word takes its colour from where it sits
    if (h.classList.contains('grad')) {
      var A = [238, 244, 243], B = [158, 240, 227], C = [116, 199, 255];
      ws.forEach(function (i, k) {
        var t = ws.length > 1 ? k / (ws.length - 1) : 0, P = t < .5 ? A : B, Q = t < .5 ? B : C, u = t < .5 ? t * 2 : (t - .5) * 2;
        i.style.color = 'rgb(' + [0, 1, 2].map(function (c) { return Math.round(P[c] + (Q[c] - P[c]) * u); }).join(',') + ')';
      });
    }
  });
  var seen = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('on'); seen.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px' });
  heads.forEach(function (h) { seen.observe(h); });

  // ── the strip counts up to the figure already printed, once, when seen ──
  var count = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      count.unobserve(e.target);
      var b = e.target, to = parseInt(b.textContent, 10), t0 = performance.now();
      if (!(to > 1)) return;
      var step = function (now) {
        var p = Math.min(1, (now - t0) / 1100);
        b.textContent = String(Math.round(to * ramp(p)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: .6 });
  $$('.stat b').forEach(function (b) { count.observe(b); });

  // ── scenes ──
  var scenes = [];
  // progress through a pinned scene: 0 when its top meets the screen's, 1 when its bottom does
  var pinned = function (sec) {
    var r = sec.getBoundingClientRect(), travel = sec.offsetHeight - innerHeight;
    return travel > 0 ? clamp(-r.top / travel) : 0;
  };
  // progress of an element across the screen: 0 entering at the bottom, 1 leaving at the top
  var across = function (el) {
    var r = el.getBoundingClientRect();
    return clamp((innerHeight - r.top) / (innerHeight + r.height));
  };
  var near = function (el, margin) {
    var r = el.getBoundingClientRect();
    return r.bottom > -margin && r.top < innerHeight + margin;
  };

  // The break: "No AI in the reading." — each word arrives out of the depth, AI turns red, the line under it is lit
  // word by word as it is read, and the whole of it recedes as the next act comes up.
  var brk = $('.break');
  if (brk) {
    var words = $$('.sw', brk), lit = $('.lit', brk), inner = $('.break-pin > .wrap', brk), ai = $('em', brk);
    wrapWords(lit, { w: 'lw' });
    var lws = $$('.lw', lit);
    scenes.push({ el: brk, run: function () {
      var p = pinned(brk);
      words.forEach(function (w, k) {
        var t = ramp(seg(p, 0.04 + k * 0.08, 0.2 + k * 0.08));
        w.style.opacity = t.toFixed(3);
        w.style.transform = 'translate3d(0,' + ((1 - t) * 40).toFixed(1) + 'px,0) scale(' + (1.5 - 0.5 * t).toFixed(3) + ')';
      });
      ai.style.color = p > 0.42 ? '' : 'var(--fg)';
      var lp = seg(p, 0.46, 0.76);
      lws.forEach(function (w, k) { w.style.color = (k / lws.length) < lp ? 'var(--fg)' : 'rgba(238, 244, 243, .2)'; });
      var out = seg(p, 0.84, 1);
      inner.style.opacity = (1 - out).toFixed(3);
      inner.style.transform = 'scale(' + (1 - out * 0.08).toFixed(3) + ')';
    } });
  }

  // The finale, cut as the film ends: "Kubernetes auditing," comes in out of the depth; "re-engineered." assembles out
  // of scrambled glyphs; the line leaves and the word holds the screen alone; it goes to black; then the mark is drawn by
  // light seen from very close, and the camera glides back to the whole lockup, the name arriving beside it — and the
  // offer rises over the black as the scene lets go.
  var fin = $('.finale');
  if (fin) {
    var line = $('.fin-line', fin), word = $('.fin-word', fin), text = word.getAttribute('data-word');
    var lock = $('.fin-lock', fin), name = $('.fin-name', fin), markEl = $('.fin-mark', fin);
    var strokes = ['.fm-a', '.fm-b'].map(function (q) { return $(q, fin); }), heads = ['.fm-ha', '.fm-hb'].map(function (q) { return $(q, fin); });
    var G = 'abcdefghijklmnopqrstuvwxyz0123456789-/:.';
    var spans = text.split('').map(function (ch) { var s = document.createElement('span'); s.textContent = ch; return s; });
    word.textContent = '';
    spans.forEach(function (s) { word.appendChild(s); });
    var last = -1, geo = null;
    var measure = function () {
      var t = lock.style.transform; lock.style.transform = 'none';
      var lb = lock.getBoundingClientRect(), mb = markEl.getBoundingClientRect();
      geo = { lw: lb.width, mw: mb.width, mh: mb.height, lh: lb.height, z: parseFloat(getComputedStyle(lock).getPropertyValue('--z')) || 1 };
      lock.style.transform = t;
    };
    var glide = function (t) { // the camera's pull: slow to leave the macro, a long glide in
      var x1 = 0.5, x2 = 0.12; // a bezier(.5,0,.12,1) solved by a few steps of bisection
      var lo = 0, hi = 1, u = t;
      for (var k = 0; k < 18; k++) { u = (lo + hi) / 2; var x = 3 * u * (1 - u) * (1 - u) * x1 + 3 * u * u * (1 - u) * x2 + u * u * u; if (x < t) lo = u; else hi = u; }
      return 3 * u * u * (1 - u) + u * u * u;
    };
    window.addEventListener('resize', function () { geo = null; }, { passive: true });
    scenes.push({ el: fin, run: function () {
      if (!geo) measure();
      var p = pinned(fin);
      var a = ramp(seg(p, 0.01, 0.1));
      var leave = ramp(seg(p, 0.26, 0.36));
      line.style.opacity = (a * (1 - leave)).toFixed(3);
      line.style.transform = 'translate3d(0,' + (-leave * 60).toFixed(1) + 'px,0) scale(' + (1.25 - 0.25 * a).toFixed(3) + ')';
      var b = seg(p, 0.08, 0.24);
      var settled = Math.floor(b * (spans.length + 1));
      var tick = Math.floor(p * 500);
      if (tick !== last) {
        last = tick;
        spans.forEach(function (s, k) { var ok = k < settled; s.textContent = ok ? text[k] : G[(k * 7 + tick * 13) % G.length]; s.className = ok ? '' : 'g'; });
      }
      var hold = ramp(seg(p, 0.26, 0.4));
      var dark = seg(p, 0.4, 0.47);
      word.style.opacity = (Math.min(1, b * 3) * (1 - dark)).toFixed(3);
      word.style.transform = 'translate3d(0,' + ((1 - Math.min(1, b * 2)) * 30 - hold * 20).toFixed(1) + 'px,0) scale(' + (1 + hold * 0.1).toFixed(3) + ')';
      // the mark, drawn by light: each stroke traced by a bright head that shows only while it moves
      var d1 = seg(p, 0.48, 0.6), d2 = seg(p, 0.51, 0.63);
      [d1, d2].forEach(function (d, k) {
        var e = d * d * (3 - 2 * d);
        strokes[k].style.strokeDashoffset = (1 - e).toFixed(4);
        heads[k].style.strokeDashoffset = (0.05 - e).toFixed(4);
        heads[k].style.opacity = d <= 0 || d >= 1 ? '0' : String(Math.min(1, d * 12, (1 - d) * 5));
      });
      var t = glide(seg(p, 0.6, 0.86));
      var sc = (3.2 + (1 - 3.2) * t) / geo.z; // 3.2 times the resting size at the macro, 1 at rest — only ever scaled down
      // The name arrives as the camera pulls back, once the whole lockup fits the screen's width (on a phone it is wider
      // than the screen until late in the glide); the frame holds the mark at its centre until then and moves over to
      // centre the whole lockup as the name comes in — the mark makes room for it, never sits alone off centre.
      // fits: 1 once the lockup at this size is no wider than the screen, rising over the last few percent of the scale
      // before; at rest (su = 1 <= fit) it is always 1. The frame centres the lockup a beat before the name fades in.
      var fit = Math.max(1, innerWidth * 0.92 / (geo.lw / geo.z)), su = sc * geo.z;
      var fits = su <= fit ? 1 : clamp(1 - (su - fit) / 0.12);
      var c = Math.min(fits, ramp(seg(p, 0.66, 0.8))), n = Math.min(fits, ramp(seg(p, 0.68, 0.82)));
      var fx = geo.mw / 2 + (geo.lw / 2 - geo.mw / 2) * c;
      fx = Math.min(fx, Math.max(geo.mw / 2, (innerWidth / 2 - 16) / sc));
      var lift = seg(p, 0.9, 1) * innerHeight * 0.16;
      lock.style.opacity = p < 0.47 ? '0' : '1';
      lock.style.transform = 'translate3d(' + (-sc * fx).toFixed(1) + 'px,' + (-sc * geo.mh / 2 - lift).toFixed(1) + 'px,0) scale(' + sc.toFixed(4) + ')';
      name.style.opacity = n.toFixed(3);
      name.style.transform = 'translate3d(' + ((1 - n) * 24).toFixed(1) + 'px,0,0)';
    } });
  }

  // Read-only: the headline held, the counts taken one after another as the page scrolls.
  var ro = $('.ro');
  if (ro) {
    var stats = $$('.ro-stat', ro);
    scenes.push({ el: ro, run: function () {
      var p = pinned(ro), k = Math.min(stats.length - 1, Math.floor(seg(p, 0.06, 0.9) * stats.length));
      stats.forEach(function (s, j) { s.classList.toggle('on', j === k); s.classList.toggle('past', j < k); });
    } });
  }

  // The opening: the promise drifts up slower than the page; the reading below it rises from its tilt to face the
  // reader as the page is scrolled — a device turned toward the camera.
  var hero = $('.hero'), copy = $('.hero-copy'), card = $('.dv-lid'), dev = $('.device');
  if (hero && copy && card && dev) {
    var lines = Array.prototype.slice.call(copy.children);
    scenes.push({ el: hero, run: function () {
      var p = clamp(window.scrollY / (innerHeight * 0.8));
      // each line at its own depth: the name nearest the page, the way in furthest from it, so the copy comes apart
      // as it leaves and the device rises through it; the further a line lags, the sooner it is gone, so nothing is
      // still legible where the device passes over it (on a phone the spread is narrower: the lines are closer)
      var spread = innerWidth < 760 ? 0.55 : 1;
      lines.forEach(function (l, k) {
        l.style.transform = 'translate3d(0,' + (p * (36 + k * 38) * spread).toFixed(1) + 'px,0)';
        l.style.opacity = clamp(1 - p * (0.45 + k * 0.3)).toFixed(3);
      });
      // the lid: leaning back at first, turned to face the reader by the time the page has moved half a screen
      var t = ramp(clamp(window.scrollY / (innerHeight * 0.6)));
      card.style.transform = 'perspective(1800px) rotateX(' + ((1 - t) * 24).toFixed(2) + 'deg)';
      dev.style.transform = 'translate3d(0,' + ((1 - t) * 30).toFixed(1) + 'px,0) scale(' + (0.93 + 0.07 * t).toFixed(3) + ')';
    } });
  }

  // A live frame opens like a laptop's lid as it rises into view.
  $$('.live-main, .app-live, .compare-flip figure').forEach(function (f) {
    scenes.push({ el: f, run: function () {
      var t = ramp(seg(across(f), 0.04, 0.42));
      f.style.transformOrigin = '50% 100%';
      f.style.transform = 'perspective(1600px) rotateX(' + ((1 - t) * 24).toFixed(2) + 'deg) scale(' + (0.92 + 0.08 * t).toFixed(3) + ')';
    } });
  });

  // The pipeline: GitHub's two pages float at their own depths as the scene crosses the screen, the card tilting toward
  // the reader as it rises (the pages are drawn late, by gh-scene.js, so they are looked up each frame).
  var ci = $('.isc-card[aria-labelledby="isc-ci-t"]');
  if (ci) scenes.push({ el: ci, run: function () {
    var v = across(ci), t = ramp(seg(v, 0.02, 0.4));
    ci.style.transform = 'perspective(1800px) rotateX(' + ((1 - t) * 10).toFixed(2) + 'deg) scale(' + (0.96 + 0.04 * t).toFixed(3) + ')';
    $$('.gh-pane', ci).forEach(function (pane, k) { pane.style.transform = 'translate3d(0,' + ((0.5 - v) * (k ? -46 : 34)).toFixed(1) + 'px,0)'; });
  } });
  var ag = $('.isc-card[aria-labelledby="isc-agent-t"]');
  if (ag) scenes.push({ el: ag, run: function () {
    var t = ramp(seg(across(ag), 0.02, 0.4));
    ag.style.transform = 'perspective(1800px) rotateX(' + ((1 - t) * 10).toFixed(2) + 'deg) scale(' + (0.96 + 0.04 * t).toFixed(3) + ')';
  } });
  // A statement grows into its full size as it rises into view.
  $$('.band-head h2, .flow-head h2').forEach(function (h) {
    scenes.push({ el: h, run: function () { var t = ramp(seg(across(h), 0, 0.32)); h.style.transform = 'scale(' + (0.9 + 0.1 * t).toFixed(3) + ')'; h.style.transformOrigin = getComputedStyle(h).textAlign === 'center' ? '50% 100%' : '0 100%'; } });
  });
  // The numbers: each rises at its own pace.
  $$('.stat').forEach(function (c, k) {
    scenes.push({ el: c, run: function () { c.style.transform = 'translate3d(0,' + ((0.5 - across(c)) * (40 + k * 22)).toFixed(1) + 'px,0)'; } });
  });

  // Acts arrive out of the depth and recede once passed, as a product page's do: each section's content rises and
  // clears as it enters, and dims back as it leaves (the pinned scenes move by their own scripts and are left out).
  $$('main > section.band, main > section.strip').forEach(function (sec) {
    var inner = sec.querySelector(':scope > .wrap') || sec.firstElementChild;
    if (!inner || sec.classList.contains('ro')) return;
    scenes.push({ el: sec, run: function () {
      var r = sec.getBoundingClientRect();
      var enter = clamp((innerHeight - r.top) / (innerHeight * 0.7)), leave = clamp(-r.bottom / innerHeight + 1);
      leave = clamp((innerHeight * 0.35 - r.bottom) / (innerHeight * 0.35));
      var e = ramp(enter);
      inner.style.opacity = (e * (1 - leave * 0.75)).toFixed(3);
      inner.style.transform = 'translate3d(0,' + ((1 - e) * 90 - leave * 60).toFixed(1) + 'px,0) scale(' + (0.96 + 0.04 * e).toFixed(3) + ')';
    } });
  });
  // The gallery's cards slide in from the side as it rises into view, the later ones further.
  var galT = $('.gallery .caps');
  if (galT) {
    var gcards = $$('.cap-card', galT);
    scenes.push({ el: galT, run: function () {
      var t = ramp(seg(across(galT), 0.02, 0.38));
      gcards.forEach(function (c, k) { c.style.transform = 'translate3d(' + ((1 - t) * (160 + k * 90)).toFixed(1) + 'px,0,0)'; c.style.opacity = (0.35 + 0.65 * t).toFixed(3); });
    } });
  }
  // The stage's light moves with the page, slower than it: the room has depth.
  var key = $('.stage .key'), rim = $('.stage .rim');
  if (key && rim) scenes.push({ el: document.body, run: function () {
    var y = window.scrollY;
    key.style.translate = '0 ' + (-(y * 0.04) % 400).toFixed(1) + 'px';
    rim.style.translate = (Math.sin(y / 1800) * 220).toFixed(1) + 'px 0';
  } });

  // Depth: a section's heading travels slower than the page, its tiles at their own pace.
  $$('.band-head, .flow-head').forEach(function (h) {
    scenes.push({ el: h, run: function () { h.style.transform = 'translate3d(0,' + ((0.5 - across(h)) * 70).toFixed(1) + 'px,0)'; } });
  });
  $$('.int, .plan, .os, .faq details, .more-ways > div').forEach(function (c, k) {
    var depth = [0.6, 1, 1.4][k % 3];
    scenes.push({ el: c, run: function () { c.style.transform = 'translate3d(0,' + ((0.5 - across(c)) * 46 * depth).toFixed(1) + 'px,0)'; } });
  });

  // ── more depth (founder, 2026-10-21: "все ще якось мало паралаксу на лендінгу як у apple"). A product page moves
  // in layers everywhere, not only in its pinned scenes: what is read comes up at one pace, what is shown at another.

  // A section's lead is read as it comes up: its words light one after another, as a product page's paragraphs do,
  // and every word is whole by the time the paragraph is half way up the screen.
  $$('.band-head > p').forEach(function (para) {
    wrapWords(para, { w: 'lw' });
    var ws = $$('.lw', para);
    scenes.push({ el: para, run: function () {
      var r = para.getBoundingClientRect(), n = clamp((innerHeight * 0.94 - r.top) / (innerHeight * 0.44)) * ws.length;
      ws.forEach(function (w, k) { var o = clamp(n - k); w.style.opacity = o >= 1 ? '' : (0.2 + 0.8 * o).toFixed(3); });
    } });
  });
  // The preflight's terminal turns to face the reader as it rises, as the pipeline's card does.
  var panes = $('.panes');
  if (panes) scenes.push({ el: panes, run: function () {
    var t = ramp(seg(across(panes), 0.02, 0.4));
    panes.style.transformOrigin = '50% 100%';
    panes.style.transform = 'perspective(1800px) rotateX(' + ((1 - t) * 14).toFixed(2) + 'deg) scale(' + (0.94 + 0.06 * t).toFixed(3) + ')';
  } });
  // The comparison's rows come up one after another as the table rises, each from a little below its place. A row's
  // place is read from the grid's own box (its cells are moved, so their boxes are not where they belong).
  var cmpHost = $('#compare');
  if (cmpHost) scenes.push({ el: cmpHost, run: function () {
    var grid = $('.cmp-grid', cmpHost); if (!grid) return;
    var rows = $$('.cmp-row:not(.cmp-head)', grid), g = grid.getBoundingClientRect();
    rows.forEach(function (r, k) {
      var y = g.top + g.height * (k + 1.5) / (rows.length + 1);
      var t = ramp(clamp((innerHeight * 0.98 - y) / (innerHeight * 0.3)));
      Array.prototype.forEach.call(r.children, function (c) {
        c.style.transform = t >= 1 ? '' : 'translate3d(0,' + ((1 - t) * 36).toFixed(1) + 'px,0)';
        c.style.opacity = t >= 1 ? '' : (0.12 + 0.88 * t).toFixed(3);
      });
    });
  } });
  // The zone scene's camera: a slow push in on the drawing while the story is told.
  var zsec = $('#zone'), zart = $('#scene');
  if (zsec && zart) scenes.push({ el: zsec, run: function () {
    if (!zsec.classList.contains('pinned')) { zart.style.transform = ''; return; }
    var t = pinned(zsec);
    zart.style.transformOrigin = '50% 40%';
    zart.style.transform = 'scale(' + (0.94 + 0.06 * ramp(t)).toFixed(4) + ')';
  } });
  // The phone's stage: preflight's three answers, a finding's evidence, a comparison, one after another in one pinned
  // frame; each panel is drawn from the top down as it is scrolled to, and gives way to the next.
  var st = $('#ph-stage');
  if (st && st.offsetHeight) {
    var steps = $$('.ph-step', st);
    scenes.push({ el: st, run: function () {
      var p = pinned(st) * steps.length, k = Math.min(steps.length - 1, Math.floor(p)), t = p - k;
      steps.forEach(function (s, j) {
        var r = j < k ? 1 : j > k ? 0 : ramp(seg(t, 0.04, 0.55));
        var o = j !== k ? 0 : j < steps.length - 1 ? 1 - seg(t, 0.88, 1) : 1;
        s.style.opacity = o.toFixed(3);
        s.style.transform = 'translate3d(0,' + ((1 - ramp(seg(t, 0, 0.3))) * (j === k ? 18 : 0)).toFixed(1) + 'px,0)';
        s.style.setProperty('--r', r.toFixed(3));
      });
    } });
  }
  // Inside each highlight the drawing floats at its own depth, behind the words over it.
  $$('.gallery .cap-card').forEach(function (c) {
    var sc = $('.cap-scene', c); if (!sc) return;
    scenes.push({ el: c, run: function () { sc.style.transform = 'translate3d(0,' + ((0.5 - across(c)) * 34).toFixed(1) + 'px,0)'; } });
  });

  var ticking = false;
  var frame = function () {
    ticking = false;
    for (var i = 0; i < scenes.length; i++) if (near(scenes[i].el, 300)) scenes[i].run();
  };
  var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  frame();
  };
  if (document.readyState === 'complete') requestAnimationFrame(function () { setTimeout(go, 0); });
  else window.addEventListener('load', function () { requestAnimationFrame(function () { setTimeout(go, 0); }); }, { once: true });
})();
