/* Shoalcheck — the landing's behaviour. Everything here is optional: without this script every section is
   visible, every link works and every figure is in the HTML. With it, things arrive as you reach them. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── arrivals ─────────────────────────────────────────────────────────── */
  var targets = $$('.reveal, .bars');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add('in'); });
  }

  var top = $('.top');
  var onScroll = function () { if (top) top.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── a terminal types itself, once ────────────────────────────────────
     The hero's, and each preflight question's the first time it is shown: the real output of the command, line by
     line at the pace a terminal prints it. Nothing is typed for anyone who asked for reduced motion. */
  var typeOut = function (term, delay) {
    if (!term || reduce || term.getAttribute('data-typed')) return;
    term.setAttribute('data-typed', '1');
    var lines = term.innerHTML.split('\n');
    term.innerHTML = '';
    var i = 0;
    var cursor = document.createElement('span');
    cursor.className = 'cursor';
    var step = function () {
      if (i >= lines.length) { term.appendChild(cursor); return; }
      var line = document.createElement('span');
      line.innerHTML = lines[i] + (i === lines.length - 1 ? '' : '\n');
      term.appendChild(line);
      var plain = line.textContent;
      i++;
      setTimeout(step, plain.indexOf('$') === 0 ? 420 : (plain.trim() ? 90 : 160));
    };
    setTimeout(step, delay);
  };
  typeOut($('[data-type]'), 500);

  /* ── tabs ─────────────────────────────────────────────────────────────── */
  var tabs = $$('.tab');
  var select = function (t) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute('aria-selected', on ? 'true' : 'false');
      var p = document.getElementById(x.getAttribute('aria-controls'));
      if (p) p.hidden = !on;
      if (on && p) typeOut(p.querySelector('pre.term-body'), 120);
    });
  };
  /* The question already open types when it is scrolled to, not while it is off screen. */
  var firstPane = $('.panes');
  if (firstPane && 'IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var open = firstPane.querySelector('.pane-q:not([hidden]) pre.term-body');
        typeOut(open, 200);
        seen.disconnect();
      });
    }, { threshold: 0.4 });
    seen.observe(firstPane);
  }
  tabs.forEach(function (t, k) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = tabs[(k + d + tabs.length) % tabs.length];
      select(n); n.focus();
    });
  });

  /* ── the scene: lose a zone ───────────────────────────────────────────── */
  var dataEl = $('#zone-scene'), svg = $('#scene'), tray = $('#tray');
  if (dataEl && svg) {
    var scene = JSON.parse(dataEl.textContent);
    var NS = 'http://www.w3.org/2000/svg';
    var el = function (name, attrs, parent) {
      var n = document.createElementNS(NS, name);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(n);
      return n;
    };
    var ZW = 200, NH = 58, GAP = 10, X0 = 10, Y0 = 46;
    var pods = [], survivors = [], stranded = [], allNodes = [], manual = false;
    // Three layers, so a pod moving into another zone is drawn over that zone's nodes, not under them.
    var gBack = el('g', {}), gPods;
    scene.zones.forEach(function (z, zi) {
      var x = X0 + zi * (ZW + 10), lost = z.z === scene.lost;
      var box = el('rect', { x: x, y: 22, width: ZW, height: 4 * (NH + GAP) + 40, rx: 14, 'class': 'zone-box' }, gBack);
      var lbl = el('text', { x: x + 14, y: 40, 'class': 'zone-lbl' }, gBack); lbl.textContent = z.z;
      z.box = box; z.lbl = lbl;
      z.nodes.forEach(function (n, ni) {
        var ny = Y0 + 4 + ni * (NH + GAP);
        var rect = el('rect', { x: x + 10, y: ny, width: ZW - 20, height: NH, rx: 9, 'class': 'node' }, gBack);
        var t = el('text', { x: x + 20, y: ny + 18, 'class': 'node-lbl' }, gBack); t.textContent = n.n + ' · ' + n.t;
        var node = { x: x + 10, y: ny, rect: rect, used: n.p.length, base: n.p.length, lost: lost, name: n.n, zone: z.z };
        allNodes.push(node);
        if (!lost) survivors.push(node);
        n.p.forEach(function (p, pi) {
          var cx = x + 24 + pi * 15, cy = ny + 38;
          var c = el('circle', { cx: cx, cy: cy, r: 5, 'class': 'pod' }, gPods || (gPods = el('g', {})));
          var pod = { c: c, cx: cx, cy: cy, key: p.k, why: p.why, bare: !!p.bare, lost: lost, node: node };
          pods.push(pod);
          if (lost && p.why) stranded.push(pod);
        });
        n.node = node;
      });
    });
    var floorY = Y0 + 4 * (NH + GAP) + 50;
    svg.setAttribute('viewBox', '0 0 640 ' + (floorY + 14));
    var floor = el('text', { x: X0 + 4, y: floorY, 'class': 'zone-lbl lost' }, gBack); floor.textContent = 'nowhere to go';
    floor.style.opacity = 0;
    // Where the eight that move go: the next free slot on a surviving node, round-robin. The reading says a
    // surviving node satisfies each; it does not say which — so the scene spreads them, and says so.
    // A BARE POD DOES NOT MOVE: no controller recreates it, so it fades where it was instead of being drawn
    // somewhere it will never run.
    var movers = pods.filter(function (p) { return p.lost && !p.why && !p.bare; }), r = 0;
    movers.forEach(function (p) {
      var n = survivors[r++ % survivors.length];
      p.tx = n.x + 14 + n.used * 15 - p.cx + 0; p.ty = n.y + 38 - p.cy;
      p.tx += 0; n.used++;
    });
    stranded.forEach(function (p, k) { p.sx = X0 + 120 + k * 22 - p.cx; p.sy = floorY - 4 - p.cy; });
    stranded.forEach(function (p) {
      var row = document.createElement('div');
      row.className = 't-row';
      row.innerHTML = '<i></i><span><b></b> — <span class="why"></span></span>';
      row.querySelector('b').textContent = p.key;
      row.querySelector('.why').textContent = p.why;
      tray.appendChild(row);
      p.row = row;
    });

    var storyRows = Array.prototype.slice.call(tray.children);
    var steps = $$('#scene-steps li'), shown = -1;
    var paint = function (s) {
      if (s === shown) return;
      shown = s;
      steps.forEach(function (li) { li.classList.toggle('on', Number(li.getAttribute('data-step')) === s); });
      scene.zones.forEach(function (z) {
        var lost = z.z === scene.lost && s >= 1;
        z.box.classList.toggle('lost', lost); z.lbl.classList.toggle('lost', lost);
        z.nodes.forEach(function (n) { n.node.rect.classList.toggle('dark', n.node.lost && s >= 1); });
      });
      pods.forEach(function (p) {
        var move = p.lost && !p.why && !p.bare && s >= 2, strand = p.why && s >= 3;
        p.c.classList.toggle('moved', move);
        p.c.classList.toggle('gone', p.bare && p.lost && s >= 2);
        p.c.classList.toggle('stranded', !!strand);
        p.c.style.transform = move ? 'translate(' + p.tx + 'px,' + p.ty + 'px)'
          : strand ? 'translate(' + p.sx + 'px,' + p.sy + 'px)' : '';
        if (p.row) p.row.classList.toggle('in', !!strand);
      });
      floor.style.opacity = s >= 3 ? 1 : 0;
    };
    var sec = $('#zone'), copyEl = $('#zone .scene-copy'), pinEl = $('#zone .scene-pin');
    /* PIN IT ONLY WHERE IT FITS (landing.css): the copy measured with every step's description folded, plus the
       tallest of them open — the most it ever needs while the story is told — against the frame under the bar. */
    var fit = function () {
      sec.classList.remove('pinned');
      sec.style.removeProperty('--copy-max');
      if (reduce || window.innerWidth <= 980) return;
      var asking = copyEl.classList.contains('asking');
      copyEl.classList.remove('asking');
      sec.classList.add('pinned', 'measuring');
      var open = Math.max.apply(null, $$('#scene-steps .sd > span').map(function (s) { return s.scrollHeight; }));
      var need = copyEl.offsetHeight + open;
      sec.classList.remove('measuring');
      if (asking) copyEl.classList.add('asking');
      if (need > pinEl.clientHeight - 24) { sec.classList.remove('pinned'); return; }
      sec.style.setProperty('--copy-max', need + 'px');
    };
    var pinned = function () { return sec.classList.contains('pinned'); };
    var onSceneScroll = function () {
      if (!pinned() || manual) return;
      var rect = sec.getBoundingClientRect(), span = sec.offsetHeight - window.innerHeight;
      var p = Math.min(1, Math.max(0, -rect.top / Math.max(1, span)));
      paint(Math.min(4, Math.floor(p * 5)));
    };
    fit();
    if (reduce) { paint(4); }
    else {
      var refit = function () { fit(); onSceneScroll(); };
      window.addEventListener('scroll', onSceneScroll, { passive: true });
      window.addEventListener('resize', refit);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
      onSceneScroll();
      if ('IntersectionObserver' in window) {
        // Not pinned — a phone, or a screen too short to hold the story — it plays through once when it comes into view.
        var played = false;
        new IntersectionObserver(function (es) {
          if (played || manual || pinned() || !es[0].isIntersecting) return;
          played = true;
          [0, 1, 2, 3, 4].forEach(function (k) { setTimeout(function () { if (!manual && !pinned()) paint(k); }, k * 1100); });
        }, { threshold: 0.35 }).observe(svg);
      }
      if (shown < 0) paint(0);
    }

    /* ── ask it yourself: the engine's own answer for any zone and any node ──
       testdata/golden/sample-preflight.json is internal/preflight asked about every zone and node of the sample;
       the page carries it verbatim (make site-data, gated). A pod whose eviction is refused — by a disruption budget,
       or by kubectl itself for a pod no controller manages — stays where it is, in amber; a pod with nowhere to go drops to the floor, in red; a bare pod fades; the rest are drawn on nodes
       that remain — where, exactly, is for the picture, as in the story above. */
    var verEl = $('#scene-verdicts'), tryBox = $('#scene-try');
    var V = verEl ? JSON.parse(verEl.textContent || '{}') : {};
    if (tryBox && V.zones && V.nodes) {
      var zBox = $('#st-zones'), nSel = $('#st-node'), vLine = $('#st-verdict'), back = $('#st-back');
      V.zones.forEach(function (a) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'st-z'; b.textContent = a.target; b.setAttribute('data-zone', a.target);
        b.setAttribute('aria-pressed', 'false');
        zBox.appendChild(b);
      });
      V.nodes.forEach(function (a) {
        var o = document.createElement('option'); o.value = a.target; o.textContent = a.target; nSel.appendChild(o);
      });
      var addRow = function (key, why, cls) {
        var row = document.createElement('div');
        row.className = 't-row in' + (cls ? ' ' + cls : '');
        row.innerHTML = '<i></i><span><b></b> — <span class="why"></span></span>';
        row.querySelector('b').textContent = key;
        row.querySelector('.why').textContent = why;
        tray.appendChild(row);
      };
      var play = function (kind, target) {
        var ans = (kind === 'zone' ? V.zones : V.nodes).filter(function (a) { return a.target === target; })[0];
        if (!ans) return;
        manual = true; shown = -1;
        tryBox.parentNode.classList.add('asking');
        steps.forEach(function (li) { li.classList.remove('on'); });
        $$('.st-z').forEach(function (b) { b.setAttribute('aria-pressed', String(kind === 'zone' && b.getAttribute('data-zone') === target)); });
        if (kind === 'zone') nSel.value = '';
        var lost = allNodes.filter(function (n) { return kind === 'zone' ? n.zone === target : n.name === target; });
        var isLost = function (n) { return lost.indexOf(n) >= 0; };
        var rest = allNodes.filter(function (n) { return !isLost(n); });
        rest.forEach(function (n) { n.used = n.base; });
        var strandedBy = {}, blockedBy = {};
        (ans.stranded || []).forEach(function (p) { strandedBy[p.pod] = p.why; });
        (ans.blocked || []).forEach(function (p) { blockedBy[p.pod] = p.why; });
        scene.zones.forEach(function (z) {
          var dark = kind === 'zone' && z.z === target;
          z.box.classList.toggle('lost', dark); z.lbl.classList.toggle('lost', dark);
        });
        allNodes.forEach(function (n) { n.rect.classList.toggle('dark', isLost(n)); });
        tray.innerHTML = '';
        var k = 0, floorK = 0;
        pods.forEach(function (p) {
          var tf = '', cls = '';
          if (isLost(p.node)) {
            if (blockedBy[p.key]) { cls = 'held'; addRow(p.key, blockedBy[p.key], 'held'); }
            else if (strandedBy[p.key]) {
              cls = 'stranded'; addRow(p.key, strandedBy[p.key]);
              tf = 'translate(' + (X0 + 120 + floorK * 22 - p.cx) + 'px,' + (floorY - 4 - p.cy) + 'px)'; floorK++;
            } else if (p.bare) { cls = 'gone'; }
            else if (rest.length) {
              var n = rest[k++ % rest.length];
              tf = 'translate(' + (n.x + 14 + n.used * 15 - p.cx) + 'px,' + (n.y + 38 - p.cy) + 'px)'; n.used++; cls = 'moved';
            }
          }
          p.c.classList.toggle('moved', cls === 'moved');
          p.c.classList.toggle('stranded', cls === 'stranded');
          p.c.classList.toggle('held', cls === 'held');
          p.c.classList.toggle('gone', cls === 'gone');
          p.c.style.transform = tf;
        });
        floor.style.opacity = floorK ? 1 : 0;
        vLine.hidden = false; back.hidden = false;
        vLine.innerHTML = '';
        var h = document.createElement('b'); h.textContent = ans.headline; h.className = ans.exit === 0 ? 'ok' : 'bad';
        var c = document.createElement('code'); c.textContent = 'shoalcheck preflight ' + kind + ' ' + target + ' — exit ' + ans.exit;
        vLine.appendChild(h); vLine.appendChild(document.createElement('br')); vLine.appendChild(c);
      };
      zBox.addEventListener('click', function (e) {
        var b = e.target.closest('[data-zone]'); if (b) play('zone', b.getAttribute('data-zone'));
      });
      nSel.addEventListener('change', function () { if (nSel.value) play('drain', nSel.value); });
      back.addEventListener('click', function () {
        manual = false; shown = -1;
        tryBox.parentNode.classList.remove('asking');
        vLine.hidden = true; back.hidden = true; nSel.value = '';
        $$('.st-z').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        allNodes.forEach(function (n) { n.used = n.base; });
        pods.forEach(function (p) { p.c.classList.remove('held'); });
        tray.innerHTML = ''; storyRows.forEach(function (r) { tray.appendChild(r); });
        if (pinned() && !reduce) onSceneScroll(); else paint(4);
      });
    }
  }

  /* ── the app video plays while it is on screen ────────────────────────────
     Muted and looped, and only while visible, so it never runs unseen. It always has its controls: a
     32-second loop that starts by itself must be stoppable (WCAG 2.2.2). Anyone who asked for reduced motion
     gets the poster and starts it themselves. */
  /* The four instrument loops play the same way: muted, looped, while on screen, and stoppable. */
  var playWhileSeen = function (vid) {
    if (reduce || !('IntersectionObserver' in window)) {
      vid.controls = true;
      return;
    }
    /* A pause the reader chose is kept: scrolling past and back does not start it again. */
    var ours = false, chosen = false;
    vid.addEventListener('pause', function () { if (!ours) chosen = true; ours = false; });
    vid.addEventListener('play', function () { chosen = false; });
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          if (chosen) return;
          var p = vid.play(); if (p && p.catch) p.catch(function () {});
        } else if (!vid.paused) { ours = true; vid.pause(); }
      });
    }, { threshold: 0.4 }).observe(vid);
  };
  var vid = $('#app-video');
  if (vid) playWhileSeen(vid);

  /* ── captions under the frame, not over it ────────────────────────────────
     Drawn by the player, a caption lies over the recording: at the top it printed over the window's own title, at
     the bottom it would cover the banner that says the demo is a replay, and on a phone it covers a third of the
     picture. The page prints the track's current cue on a line under the video instead — the same track, so the
     words are the recorder's — and hands the track back to the player in full screen, where there is no under.
     A reader who turns the captions off in the player's menu turns the line off with them. */
  var captionsUnder = function (v) {
    var t = [].filter.call(v.textTracks || [], function (x) { return x.kind === 'captions'; })[0];
    if (!t) return;
    var line = document.createElement('p');
    line.className = 'vcap';
    v.insertAdjacentElement('afterend', line);
    var full = function () { return (document.fullscreenElement || document.webkitFullscreenElement) === v; };
    var mine = true;
    var place = function () { if (mine) t.mode = full() ? 'showing' : 'hidden'; };
    var show = function () {
      var c = t.mode === 'hidden' && t.activeCues && t.activeCues[0];
      line.textContent = c ? c.text : '';
    };
    t.addEventListener('cuechange', show);
    v.textTracks.addEventListener('change', function () {
      if (t.mode === 'disabled') mine = false;
      else if (!mine && t.mode === 'showing' && !full()) { mine = true; t.mode = 'hidden'; }
      show();
    });
    document.addEventListener('fullscreenchange', place);
    document.addEventListener('webkitfullscreenchange', place);
    v.addEventListener('webkitbeginfullscreen', function () { if (mine) t.mode = 'showing'; });
    v.addEventListener('webkitendfullscreen', function () { if (mine) t.mode = 'hidden'; show(); });
    place();
  };
  [].forEach.call(document.querySelectorAll('#app-video, #ov-video'), captionsUnder);

  /* ── the overview: a dialog, on a click ──────────────────────────────────
     It plays when the reader opens it (unless they asked for reduced motion: then the controls start it), and it
     stops when the dialog closes, by the button, Escape or a click outside. */
  var ovDlg = $('#overview'), ovVid = $('#ov-video'), ovOpen = $('#ov-open');
  if (ovDlg && ovVid && ovOpen && ovDlg.showModal) {
    ovOpen.addEventListener('click', function () {
      ovDlg.showModal();
      if (!reduce) { var p = ovVid.play(); if (p && p.catch) p.catch(function () {}); }
    });
    $('#ov-close').addEventListener('click', function () { ovDlg.close(); });
    ovDlg.addEventListener('click', function (e) { if (e.target === ovDlg) ovDlg.close(); });
    ovDlg.addEventListener('close', function () { ovVid.pause(); });
  } else if (ovOpen) {
    ovOpen.hidden = true;
  }
  [].forEach.call(document.querySelectorAll('.loop video'), playWhileSeen);

  /* ── the arithmetic ───────────────────────────────────────────────────── */
  var priceEl = $('#agent-prices');
  if (priceEl && $('#calc')) {
    var P = JSON.parse(priceEl.textContent);
    var sel = $('#i-model');
    P.models.forEach(function (m, k) {
      var o = document.createElement('option');
      o.value = String(k); o.textContent = m.n.replace(/^Claude /, '') + ' — $' + m['in'] + ' per million input tokens';
      if (k === 1) o.selected = true;
      sel.appendChild(o);
    });
    var cost = function (tokens, m) {
      var rate = m.tier ? (tokens > m.tier ? m['in'] : m.small) : m['in'];
      return tokens * rate / 1e6;
    };
    /* EVERY FIGURE IS THE ONE BEFORE IT, MULTIPLIED OUT. Each was rounded from an unrounded figure, so none was
       the one before it times anything a reader could see: 1.1 M tokens printed as 114% of a 1 M window, 156 h a
       reading as 3,738 h for 24 readings, and those as $336,384 at $90. Now a token count is rounded once, to the
       unit it is printed in, and the window share and the price are worked from that; the hours for one reading
       are rounded once, and the month and the money are that figure times the readings, times the rate. */
    var tokShown = function (n) { return n >= 1e6 ? Math.round(n / 1e5) * 1e5 : Math.round(n / 1000) * 1000; };
    var fmtTok = function (n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + ' M' : Math.round(n / 1000) + ' k'; };
    /* "1.2–2.6 M", never "1.2 M–2.6 M": one unit for the range when both ends share it. */
    var tokRange = function (lo, hi) {
      if (hi >= 1e6 && lo >= 1e6) return (lo / 1e6).toFixed(1) + '–' + (hi / 1e6).toFixed(1) + ' M';
      if (1e6 > hi) return Math.round(lo / 1000) + '–' + Math.round(hi / 1000) + ' k';
      return fmtTok(lo) + '–' + fmtTok(hi);
    };
    var fmtUsd = function (x) { return x >= 100 ? '$' + Math.round(x).toLocaleString('en-US') : '$' + x.toFixed(2); };
    /* "$55–$110", never "$54.64–$110": a range is printed to one precision, the one its larger end needs. */
    var usdRange = function (lo, hi) {
      var whole = hi >= 100, f = function (x) { return whole ? '$' + Math.round(x).toLocaleString('en-US') : '$' + x.toFixed(2); };
      return f(lo) + '–' + f(hi);
    };
    var hoursShown = function (h) { return h >= 10 ? Math.round(h) : Math.round(h * 10) / 10; };
    var fmtHours = function (h, dp) {
      return h.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }) + ' h';
    };
    /* ONE MODEL FOR THE CHART AND THE CALCULATOR, calibrated on our kind test cluster (24 pods, 259 objects,
       287 KB, 1,894 checks): about 160 cluster-wide objects (nodes, namespaces, roles, bindings, CRDs) plus
       four per pod; a pod 5.4 KB as kubectl prints it, 9.3 KB with a mesh sidecar; everything else 0.67 KB;
       7.3 rule-by-object checks per object. The chart's 1,500-pod line is this function at 1,500, so the two
       cannot disagree; at 24 pods it gives the kind cluster's own 71 k tokens and about 16 hours. */
    var model = function (pods) {
      var objects = 160 + 4 * pods, others = objects - pods;
      return {
        objects: objects, checks: objects * 7.3,
        lo: (pods * 5400 + others * 670) / P.charsHi,
        hi: (pods * 9300 + others * 670) / P.charsLo
      };
    };
    var big = model(1500);
    if ($('#r-1500')) $('#r-1500').textContent = tokRange(big.lo, big.hi);
    var calc = function () {
      var pods = Number($('#i-pods').value), clusters = Number($('#i-clusters').value), reads = Number($('#i-reads').value);
      var sec = Number($('#i-sec').value), rate = Number($('#i-rate').value);
      var m = P.models[Number(sel.value)], c = model(pods);
      $('#o-pods').textContent = pods.toLocaleString('en-US');
      $('#o-clusters').textContent = clusters; $('#o-reads').textContent = reads;
      $('#o-sec').textContent = sec; $('#o-rate').textContent = '$' + rate;
      var perMonth = clusters * reads;
      var lo = tokShown(c.lo), hi = tokShown(c.hi);
      $('#r-tokens').textContent = tokRange(lo, hi);
      $('#r-ctx').textContent = Math.round(lo / P.context * 100) + '–' + Math.round(hi / P.context * 100) + '%';
      $('#r-agent').textContent = usdRange(cost(lo, m) * perMonth, cost(hi, m) * perMonth);
      /* A MONTH BESIDE A MONTH: the agent's figure is every reading of every cluster, so the hours are too. */
      var one = hoursShown(c.checks * sec / 3600), dp = one >= 10 ? 0 : 1;
      var hours = Number((one * perMonth).toFixed(dp));
      $('#r-hours').textContent = fmtUsd(hours * rate);
      $('#r-hours-month').textContent = fmtHours(hours, dp);
      $('#r-hours-one').textContent = fmtHours(one, dp);
    };
    ['#i-pods', '#i-clusters', '#i-reads', '#i-model', '#i-sec', '#i-rate'].forEach(function (s) { $(s).addEventListener('input', calc); });
    calc();
  }

  /* ── deadlines ────────────────────────────────────────────────────────
     The support windows and the extended-support rate every reading uses (make site-data writes them; a gate
     holds them equal). Days are counted from the visitor's own clock; the dates are as the source published them. */
  var supEl = $('#support-windows');
  if (supEl && $('#dl-calc')) {
    var T = JSON.parse(supEl.textContent || '{}');
    var NAMES = { aws: 'Amazon EKS', azure: 'Azure AKS', gcp: 'Google GKE', upstream: 'Kubernetes upstream' };
    var pSel = $('#dl-provider'), mSel = $('#dl-minor'), nIn = $('#dl-n');
    ['aws', 'azure', 'gcp', 'upstream'].forEach(function (p) {
      if (!T.windows || !T.windows[p]) return;
      var o = document.createElement('option'); o.value = p; o.textContent = NAMES[p]; pSel.appendChild(o);
    });
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var day = function (s) { return s ? new Date(s + 'T00:00:00') : null; };
    var gap = function (d) { return Math.round((d - today) / 86400000); };
    var long = function (s) { return day(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
    /* "ordinary support ended 82 days ago" · "extended support ends in 283 days" — the subject, then its tense. */
    var when = function (s, subject) {
      var n = gap(day(s)), k = Math.abs(n).toLocaleString('en-US') + (Math.abs(n) === 1 ? ' day' : ' days');
      return subject + (n < 0 ? ' ended ' + k + ' ago' : n === 0 ? ' ends today' : ' ends in ' + k);
    };
    var usd0 = function (x) { return '$' + Math.round(x).toLocaleString('en-US'); };
    var fillMinors = function () {
      var rows = T.windows[pSel.value] || [];
      mSel.innerHTML = '';
      rows.slice().reverse().forEach(function (w) {
        var o = document.createElement('option'); o.value = w[0]; o.textContent = w[0]; mSel.appendChild(o);
      });
      /* The first version shown is the newest one already past ordinary support: the case that costs money. */
      var past = rows.filter(function (w) { return w[2] && gap(day(w[2])) < 0; });
      mSel.value = (past.length ? past[past.length - 1] : rows[rows.length - 1] || [''])[0];
    };
    var dl = function () {
      var p = pSel.value, rows = T.windows[p] || [], n = Number(nIn.value);
      var i = rows.findIndex(function (w) { return w[0] === mSel.value; }), w = rows[i];
      $('#o-dl-n').textContent = n;
      if (!w) return;
      var name = NAMES[p], next = rows[i + 1] ? rows[i + 1][0] : '';
      $('#dl-std').textContent = w[2] ? long(w[2]) : 'unpublished';
      $('#dl-std-l').textContent = w[2] ? when(w[2], 'ordinary support') : 'the source publishes no date';
      if (w[3]) {
        $('#dl-ext').textContent = long(w[3]);
        $('#dl-ext-l').textContent = when(w[3], 'extended support');
      } else {
        $('#dl-ext').textContent = '—';
        $('#dl-ext-l').textContent = p === 'upstream' ? 'upstream Kubernetes sells no extension'
          : 'no extension date in the source for ' + name;
      }
      var rate = (T.rates || {})[p], cost = $('#dl-cost'), costL = $('#dl-cost-l');
      var beyond = w[3] && gap(day(w[3])) < 0, inside = w[2] && gap(day(w[2])) < 0 && !beyond;
      if (p === 'upstream') {
        cost.textContent = '—';
        costL.textContent = 'upstream sells no extension, so there is no surcharge to price';
      } else if (!rate) {
        cost.textContent = '—';
        costL.textContent = 'this build carries no published extended-support rate for ' + name + ', so nothing is estimated';
      } else if (beyond) {
        cost.textContent = '$0';
        costL.textContent = 'past the extension: no surcharge left to stop — and no more patches';
      } else {
        cost.textContent = usd0(rate * 730 * n);
        costL.textContent = (inside ? 'a month in surcharge, now, for ' : 'a month in surcharge from ' + long(w[2]) + ', if still on it, for ') +
          n + (n === 1 ? ' cluster' : ' clusters') + ' — $' + rate.toFixed(2) + ' per cluster-hour on top of the ordinary rate';
      }
      $('#dl-basis').textContent = 'Support dates: endoflife.date, fetched ' + T.asOf + '. Rate: the provider\'s published surcharge, in the price table of ' +
        T.rateAsOf + '; 730 hours to a month. These are the tables a reading uses to place your cluster\'s version' +
        (next ? ' — shoalcheck preflight upgrade ' + next + ' says what stops the move.' : '.');
    };
    pSel.addEventListener('input', function () { fillMinors(); dl(); });
    mSel.addEventListener('input', dl);
    nIn.addEventListener('input', dl);
    fillMinors(); dl();
  }

  /* ── just the output ───────────────────────────────────────────────────
     A reader who wants evidence, not copy: our sentences hide, the product's output and its captions stay. The
     choice is remembered on this browser only. */
  var justB = $$('[data-just-output]');
  if (justB.length) {
    var setJust = function (on) {
      document.documentElement.classList.toggle('just-output', on);
      justB.forEach(function (b) {
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.textContent = on ? 'Show the whole page' : 'Just the output';
      });
      try { localStorage.setItem('shoalcheck.just-output', on ? '1' : ''); } catch (e) {}
    };
    var was = false;
    try { was = localStorage.getItem('shoalcheck.just-output') === '1'; } catch (e) {}
    if (was) setJust(true);
    justB.forEach(function (b) {
      b.addEventListener('click', function () { setJust(!document.documentElement.classList.contains('just-output')); });
    });
  }

  /* ── the reading, live ──────────────────────────────────────────────────
     The sample's own page loads into the frame when it comes near the screen and is scaled to fit; until then
     the screenshot stands in. Opening it is a view transition into the page itself. */
  var live = $('#live-frame');
  if (live) {
    var frame = live.querySelector('iframe'), openA = live.querySelector('.live-open');
    var fit = function () {
      if (live.classList.contains('expanded')) {
        frame.style.width = window.innerWidth + 'px'; frame.style.height = window.innerHeight + 'px'; frame.style.transform = 'none';
        return;
      }
      frame.style.width = '1440px'; frame.style.height = '900px';
      frame.style.transform = 'scale(' + (live.clientWidth / 1440) + ')';
    };
    frame.addEventListener('load', function () { if (frame.getAttribute('src')) live.classList.add('live'); });
    var load = function () { if (!frame.getAttribute('src')) frame.setAttribute('src', frame.getAttribute('data-src')); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { load(); o.disconnect(); } }, { rootMargin: '600px' }).observe(live);
    } else { load(); }
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(live); else window.addEventListener('resize', fit);
    var go = function (e) {
      if (reduce || !document.startViewTransition || !live.classList.contains('live')) return;
      e.preventDefault();
      var href = openA.getAttribute('href');
      var t = document.startViewTransition(function () { live.classList.add('expanded'); fit(); });
      t.finished.then(function () { location.href = href; });
    };
    openA.addEventListener('click', go);
    live.addEventListener('click', function (e) { if (e.target === live || e.target.tagName === 'IMG') { e.preventDefault(); openA.click(); } });
    // Back from the reading: the page comes out of the back-forward cache as it was left, grown to the window.
    window.addEventListener('pageshow', function (e) { if (e.persisted) { live.classList.remove('expanded'); fit(); } });
  }

  /* ── billing period ───────────────────────────────────────────────────── */
  var billB = $$('[data-bill]');
  var setBill = function (b) {
    billB.forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-bill') === b ? 'true' : 'false'); });
    $$('.plan[data-monthly]').forEach(function (p) {
      var mo = Number(p.getAttribute('data-monthly')), yr = Number(p.getAttribute('data-yearly'));
      var price = $('[data-price]', p), line = $('[data-line]', p), save = $('[data-save]', p);
      if (b === 'year') {
        price.textContent = '$' + Math.floor(yr / 12).toLocaleString('en-US');
        line.textContent = '$' + yr.toLocaleString('en-US') + ' billed yearly';
        save.textContent = 'save $' + (12 * mo - yr).toLocaleString('en-US');
      } else {
        price.textContent = '$' + mo.toLocaleString('en-US');
        line.textContent = 'billed monthly';
        save.textContent = 'yearly: two months free';
      }
    });
  };
  billB.forEach(function (b) { b.addEventListener('click', function () { setBill(b.getAttribute('data-bill')); }); });

  /* ── the visitor's system, and the newest release ─────────────────────── */
  var meta = function (n) { var m = document.querySelector('meta[name="' + n + '"]'); return m ? m.content.trim() : ''; };
  var repo = meta('shoalcheck:releases'), contact = meta('shoalcheck:contact');
  var ua = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || '';
  var os = /mac/i.test(ua) ? 'mac' : /win/i.test(ua) ? 'windows' : /linux|x11/i.test(ua) ? 'linux' : '';
  var names = { mac: 'macOS', windows: 'Windows', linux: 'Linux' };
  if (os) {
    var label = $('[data-os-label]');
    if (label) label.textContent = 'Download for ' + names[os];
    var card = $('.os[data-os="' + os + '"]');
    if (card) { card.classList.add('here'); var t = $('.here-tag', card); if (t) t.hidden = false; }
  }
  /* Plan buttons: a contact sells and issues keys. Without one, nothing is on sale yet, and the page says so
     instead of sending anyone to an address nobody reads. */
  $$('[data-plan-cta]').forEach(function (a) {
    if (contact) {
      a.href = /^https?:/.test(contact) ? contact : 'mailto:' + contact + '?subject=' + encodeURIComponent('Shoalcheck ' + a.textContent.trim());
      return;
    }
    var p = document.createElement('div');
    p.className = 'pending';
    p.textContent = 'Licence keys are not on sale yet.';
    a.replaceWith(p);
  });
  if (!repo || !window.fetch) return;
  var releases = 'https://github.com/' + repo + '/releases';
  $$('[data-asset]').forEach(function (a) { a.href = releases; });
  /* The newest published release, prereleases included: GitHub's /releases/latest skips a release candidate,
     so a page that asked it would find nothing while the only releases are candidates. */
  fetch('https://api.github.com/repos/' + repo + '/releases?per_page=10', { headers: { Accept: 'application/vnd.github+json' } })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (list) {
      var rel = (list || []).filter(function (x) { return !x.draft; })[0];
      if (!rel) return;
      var assets = rel.assets || [];
      $$('[data-asset]').forEach(function (a) {
        var re = new RegExp(a.getAttribute('data-asset'));
        var hit = assets.filter(function (x) { return re.test(x.name); })[0];
        if (hit) { a.href = hit.browser_download_url; a.title = hit.name; }
      });
      var line = $('[data-release-line]');
      if (line && rel.tag_name) {
        line.textContent = (rel.prerelease ? 'Release candidate ' : 'Latest release ') + rel.tag_name +
          (rel.published_at ? ', ' + rel.published_at.slice(0, 10) : '') + ' · SHA-256 sums, signed · ';
        var all = document.createElement('a'); all.href = rel.html_url || releases; all.textContent = 'all files';
        line.appendChild(all);
      }
    })
    .catch(function () { /* the rows already point at the releases page */ });
})();

/* ── a screenshot opens at full size ──────────────────────────────────────────
   Every screenshot here is a 1440-wide capture drawn at a third to a half of that, where its text cannot be read;
   the adversarial review could not enlarge one. Each opens over the page at the size it was taken, and closes with
   Escape, the button or a click outside it; focus returns to the image it came from. */
(function () {
  var shots = Array.prototype.slice.call(document.querySelectorAll('.gallery img:not(.live-poster), .compare img, .shot-img'));
  if (!shots.length) return;
  var box = null, from = null;
  function close() {
    if (!box) return;
    box.remove(); box = null;
    document.documentElement.classList.remove('zoomed');
    if (from) from.focus();
  }
  function open(img) {
    from = img;
    box = document.createElement('div');
    box.className = 'zoom';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'The screenshot at full size');
    var big = document.createElement('img');
    big.src = img.currentSrc || img.src; big.alt = img.alt; big.width = img.width; big.height = img.height;
    var x = document.createElement('button');
    x.className = 'zoom-close'; x.type = 'button'; x.textContent = 'Close';
    x.addEventListener('click', close);
    var hint = document.createElement('p');
    hint.className = 'zoom-hint'; hint.textContent = 'Drag to move around it';
    box.appendChild(big); box.appendChild(hint); box.appendChild(x);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.body.appendChild(box);
    document.documentElement.classList.add('zoomed');
    x.focus();
  }
  shots.forEach(function (img) {
    img.classList.add('zoomable');
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', 'Open at full size: ' + (img.alt || 'screenshot'));
    img.addEventListener('click', function () { open(img); });
    img.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
    });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
