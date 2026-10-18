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

  /* ── the terminal types itself, once ──────────────────────────────────── */
  var term = $('[data-type]');
  if (term && !reduce) {
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
    setTimeout(step, 500);
  }

  /* ── tabs ─────────────────────────────────────────────────────────────── */
  var tabs = $$('.tab');
  var select = function (t) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute('aria-selected', on ? 'true' : 'false');
      var p = document.getElementById(x.getAttribute('aria-controls'));
      if (p) p.hidden = !on;
    });
  };
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
    var pods = [], survivors = [], stranded = [];
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
        var node = { x: x + 10, y: ny, rect: rect, used: n.p.length, lost: lost };
        if (!lost) survivors.push(node);
        n.p.forEach(function (p, pi) {
          var cx = x + 24 + pi * 15, cy = ny + 38;
          var c = el('circle', { cx: cx, cy: cy, r: 5, 'class': 'pod' }, gPods || (gPods = el('g', {})));
          var pod = { c: c, cx: cx, cy: cy, key: p.k, why: p.why, lost: lost };
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
    var movers = pods.filter(function (p) { return p.lost && !p.why; }), r = 0;
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
        var move = p.lost && !p.why && s >= 2, strand = p.why && s >= 3;
        p.c.classList.toggle('moved', move);
        p.c.classList.toggle('stranded', !!strand);
        p.c.style.transform = move ? 'translate(' + p.tx + 'px,' + p.ty + 'px)'
          : strand ? 'translate(' + p.sx + 'px,' + p.sy + 'px)' : '';
        if (p.row) p.row.classList.toggle('in', !!strand);
      });
      floor.style.opacity = s >= 3 ? 1 : 0;
    };
    var sec = $('#zone');
    var pinned = function () { return window.innerWidth > 980; };
    var onSceneScroll = function () {
      if (!pinned()) return;
      var rect = sec.getBoundingClientRect(), span = sec.offsetHeight - window.innerHeight;
      var p = Math.min(1, Math.max(0, -rect.top / Math.max(1, span)));
      paint(Math.min(4, Math.floor(p * 5)));
    };
    if (reduce) { paint(4); }
    else {
      window.addEventListener('scroll', onSceneScroll, { passive: true });
      window.addEventListener('resize', onSceneScroll);
      onSceneScroll();
      if (!pinned() && 'IntersectionObserver' in window) {
        // A phone has no room to pin a scene: it plays through once when it comes into view.
        var played = false;
        new IntersectionObserver(function (es) {
          if (played || !es[0].isIntersecting) return;
          played = true;
          [0, 1, 2, 3, 4].forEach(function (k) { setTimeout(function () { paint(k); }, k * 1100); });
        }, { threshold: 0.35 }).observe(svg);
      }
      if (shown < 0) paint(0);
    }
  }

  /* ── the app video plays while it is on screen ────────────────────────────
     Muted and looped, and only while visible, so it never runs unseen. Anyone who asked for reduced motion
     gets the poster and the controls, and starts it themselves. */
  var vid = $('#app-video');
  if (vid) {
    if (reduce || !('IntersectionObserver' in window)) {
      vid.controls = true;
    } else {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { var p = vid.play(); if (p && p.catch) p.catch(function () { vid.controls = true; }); }
          else vid.pause();
        });
      }, { threshold: 0.4 }).observe(vid);
    }
  }

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
    var fmtTok = function (n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + ' M' : Math.round(n / 1000) + ' k'; };
    /* "1.2–2.6 M", never "1.2 M–2.6 M": one unit for the range when both ends share it. */
    var tokRange = function (lo, hi) {
      if (hi >= 1e6 && lo >= 1e6) return (lo / 1e6).toFixed(1) + '–' + (hi / 1e6).toFixed(1) + ' M';
      if (1e6 > hi) return Math.round(lo / 1000) + '–' + Math.round(hi / 1000) + ' k';
      return fmtTok(lo) + '–' + fmtTok(hi);
    };
    var fmtUsd = function (x) { return x >= 100 ? '$' + Math.round(x).toLocaleString('en-US') : '$' + x.toFixed(2); };
    var calc = function () {
      var pods = Number($('#i-pods').value), clusters = Number($('#i-clusters').value), reads = Number($('#i-reads').value);
      var m = P.models[Number(sel.value)];
      $('#o-pods').textContent = pods.toLocaleString('en-US');
      $('#o-clusters').textContent = clusters; $('#o-reads').textContent = reads;
      // Measured per-object sizes: a pod 5.4–9.3 KB as kubectl prints it, and about three other objects per pod
      // at about 1 KB each (deployments, services, endpoint slices, bindings...).
      var lo = (pods * 5400 + pods * 3 * 900) / P.charsHi, hi = (pods * 9300 + pods * 3 * 1300) / P.charsLo;
      var perMonth = clusters * reads;
      $('#r-tokens').textContent = tokRange(lo, hi);
      $('#r-ctx').textContent = Math.round(lo / P.context * 100) + '–' + Math.round(hi / P.context * 100) + '%';
      $('#r-agent').textContent = fmtUsd(cost(lo, m) * perMonth) + '–' + fmtUsd(cost(hi, m) * perMonth);
      // Checks: about four objects per pod, and 7.3 rule-by-object checks per object — the ratio measured on
      // our kind test cluster (1,894 checks over 259 objects).
      var hours = pods * 4 * 7.3 * P.secPerCheck / 3600;
      $('#r-hours').textContent = Math.round(hours).toLocaleString('en-US') + ' h';
    };
    ['#i-pods', '#i-clusters', '#i-reads', '#i-model'].forEach(function (s) { $(s).addEventListener('input', calc); });
    calc();
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
