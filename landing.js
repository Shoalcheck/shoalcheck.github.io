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

  /* ── the opening: the sample reading being taken ──────────────────────────
     The product is the reading, so the page opens on one being taken — the kinds it read, the checks it ran, the
     findings arriving by severity and category, the money with its basis, the claims it leads with — every figure
     the sample's own (#hero-reading, written from testdata/golden/sample-history.json by make site-data and held
     to it by a gate). What is drawn at a moment is a function of the moment alone, so a replay, a reduced-motion
     visit and the gate that reads the end state all see the same reading. */
  /* Its own scope: this file is one function, and a `var play` or `var T` further down (the scene's, the
     deadlines') would silently replace this block's. */
  (function () {
  var rdEl = $('#hero-rd'), rdData = $('#hero-reading');
  if (rdEl && rdData && rdData.textContent.trim()) {
    var RD = JSON.parse(rdData.textContent);
    var SEVS = ['critical', 'high', 'medium', 'low', 'info'];
    var T = { read: 2300, judge: 5200, price: 6600, end: 8900 };
    var fmt = function (n) { return Math.round(n).toLocaleString('en-US'); };
    var ease = function (p) { p = Math.max(0, Math.min(1, p)); return 1 - Math.pow(1 - p, 3); };
    var word = function (n, one, many) { return fmt(n) + '\u00a0' + (Math.round(n) === 1 ? one : many); };
    /* a figure never ends a line without the word it counts: "inside 90 / days" and "· 103 / rules" (D56 by-eye pass) */
    var bind = function (s) { return String(s).replace(/(\d) (?=\S)/g, '$1\u00a0'); };
    /* AN IDENTIFIER IS NEVER BROKEN ACROSS LINES: "workers/licensed-" over "etl-0" (D56 typography). A word holding a
       hyphen or a slash goes in whole, in a span that does not wrap; the rest wraps at its spaces as before. */
    var whole = function (el, s) {
      el.textContent = '';
      bind(s).split(/( )/).forEach(function (w) {
        if (/[-\/]/.test(w) && /\w/.test(w)) { var sp = document.createElement('span'); sp.className = 'nb'; sp.textContent = w; el.appendChild(sp); }
        else el.appendChild(document.createTextNode(w));
      });
    };
    rdEl.querySelector('.rd-cl').textContent = RD.cluster;
    /* where it ran, each part whole: on a narrow card the line wraps between parts instead of cutting the version
       to "k8s 1.31.2-ek…". The Kubernetes version without the provider's build suffix — the reading itself carries
       the whole string. */
    var whereEl = rdEl.querySelector('.rd-where');
    String(RD.where).split(' · ').forEach(function (part, i) {
      if (i) whereEl.appendChild(document.createTextNode(' · '));
      var sp = document.createElement('span'); sp.className = 'nb';
      sp.textContent = part.replace(/^(k8s \d+\.\d+\.\d+)-\S+$/, '$1'); whereEl.appendChild(sp);
    });
    var kindsEl = rdEl.querySelector('.rd-kinds'), gridEl = rdEl.querySelector('.rd-grid');
    var readSum = $('#rd-read-sum'), foundSum = $('#rd-found-sum'), usd = $('#rd-usd'), basis = $('#rd-basis');
    /* the figure's final width, kept from the start, so the words beside it do not slide while it counts up */
    usd.textContent = '$' + fmt(RD.dollars);
    var usdBox = document.createRange(); usdBox.selectNodeContents(usd);
    usd.style.setProperty('--usd-w', (usdBox.getBoundingClientRect().width / parseFloat(getComputedStyle(usd).fontSize)).toFixed(3) + 'em');
    usd.textContent = '';
    var claimsEl = $('#rd-claims'), stepEl = $('#rd-step'), replay = $('#rd-replay');
    /* The grid is built once: a head of severities, a row per category, a cell per pair. */
    var cells = [];
    var SHORT = ['crit', 'high', 'med', 'low', 'info'];
    gridEl.innerHTML = '<span class="rd-h" role="columnheader"></span>' + SHORT.map(function (s, i) {
      return '<span class="rd-h" role="columnheader" title="' + SEVS[i] + '">' + s + '</span>';
    }).join('');
    RD.cats.forEach(function (c, ci) {
      var row = document.createElement('span');
      row.className = 'rd-c'; row.setAttribute('role', 'rowheader'); row.textContent = c;
      gridEl.appendChild(row);
      cells[ci] = SEVS.map(function (s, si) {
        var cell = document.createElement('span');
        cell.className = 'rd-n sv' + si; cell.setAttribute('role', 'cell');
        cell.title = RD.grid[ci][si] + ' ' + s + ' · ' + c;
        gridEl.appendChild(cell);
        return cell;
      });
    });
    RD.claims.forEach(function (c) {
      var li = document.createElement('li');
      li.innerHTML = '<b></b><span></span>';
      whole(li.children[0], c[0]);
      whole(li.children[1], c[1]);
      claimsEl.appendChild(li);
    });
    var claimEls = [].slice.call(claimsEl.children);
    var paintAt = function (ms) {
      /* reading: one kind every few dozen milliseconds, newest at the bottom, the last nine in view */
      var nKinds = Math.min(RD.kinds.length, Math.floor(ms / (T.read / RD.kinds.length)) + (ms > 0 ? 1 : 0));
      var shown = RD.kinds.slice(0, nKinds), objs = 0;
      shown.forEach(function (k) { objs += k[1]; });
      /* while reading, the newest nine; once read, the nine it read most of */
      var view = nKinds < RD.kinds.length ? shown.slice(-9)
        : RD.kinds.slice().sort(function (a, b) { return b[1] - a[1]; }).slice(0, 9);
      kindsEl.classList.toggle('read', nKinds === RD.kinds.length);
      kindsEl.textContent = '';
      view.forEach(function (k) {
        var li = document.createElement('li'), name = document.createElement('span'), n = document.createElement('b');
        name.textContent = k[0]; n.textContent = fmt(k[1]);
        li.appendChild(name); li.appendChild(n); kindsEl.appendChild(li);
        /* a long kind's name in a narrow card is set smaller until it fits, never cut: at 1024 px the reading's
           "horizontalpodautoscalers" lost its last letters (D56 typography) */
        if (k[0].length > 16 && name.scrollWidth > name.clientWidth) {
          var fit = 11.5 * name.clientWidth / name.scrollWidth;
          if (fit >= 9) name.style.fontSize = (fit - 0.05).toFixed(2) + 'px';
        }
      });
      // "in 23 kinds": the kinds that held an object. The reading reads more kinds than that — a kind can be read
      // and be empty — and its own pages say how many it read; "· 23 kinds" beside them read as a contradiction.
      readSum.textContent = word(objs, 'object', 'objects') + ' in ' + word(nKinds, 'kind', 'kinds') +
        (nKinds === RD.kinds.length ? ' · ' + fmt(RD.kb) + '\u00a0KB' : '');
      /* judging: every cell counts up together, and the checks with them */
      var pj = ease((ms - T.read) / (T.judge - T.read)), total = 0;
      RD.grid.forEach(function (row, ci) {
        row.forEach(function (n, si) {
          var v = Math.round(n * pj); total += v;
          cells[ci][si].textContent = v ? v : '';
          cells[ci][si].classList.toggle('on', v > 0);
        });
      });
      /* ON THE WAY, A COUNT SAYS IT IS NOT YET THE TOTAL. The in-between figures are the totals eased in, not
         states the reading passed through, so they say "so far", and the basis — which is the total's — appears
         only under the total (D50 site review). */
      foundSum.textContent = ms < T.read ? '' : word(total, 'finding', 'findings') + (pj < 1 ? ' so far' : '') + ' · ' +
        fmt(RD.checks * pj) + ' of ' + fmt(RD.checks) + '\u00a0checks · ' + RD.rules + '\u00a0rules';
      /* pricing */
      var pp = ease((ms - T.judge) / (T.price - T.judge));
      usd.textContent = ms < T.judge ? '—' : '$' + fmt(RD.dollars * pp);
      basis.textContent = pp >= 1 ? RD.money : pp > 0 ? 'so far — the rules are still being priced' : '';
      /* what it found first: one claim after another */
      var nClaims = ms < T.price ? 0 : Math.min(claimEls.length, Math.floor((ms - T.price) / ((T.end - T.price) / claimEls.length)) + 1);
      claimEls.forEach(function (li, i) { li.classList.toggle('in', i < nClaims); });
      stepEl.textContent = ms < T.read ? 'reading the cluster' : ms < T.judge ? 'judging what it read'
        : ms < T.price ? 'pricing what it read' : ms < T.end ? 'what it found first' : 'the reading, written';
      rdEl.classList.toggle('done', ms >= T.end);
    };
    var t0 = 0, raf = 0;
    var frame = function (now) {
      var ms = now - t0;
      paintAt(Math.min(ms, T.end));
      if (ms < T.end) raf = requestAnimationFrame(frame);
      else replay.hidden = false;
    };
    var play = function () {
      cancelAnimationFrame(raf); replay.hidden = true;
      t0 = performance.now(); raf = requestAnimationFrame(frame);
    };
    replay.addEventListener('click', play);
    if (reduce || !('IntersectionObserver' in window)) {
      paintAt(T.end);
    } else {
      paintAt(0);
      var started = false;
      new IntersectionObserver(function (es) {
        if (started || !es[0].isIntersecting) return;
        started = true; setTimeout(play, 350);
      }, { threshold: 0.3 }).observe(rdEl);
    }
  }
  })();

  /* ── what one reading finds: a small scene in every tile ───────────────────
     Each capability tile draws one thing the sample holds — its grants, its nodes, its money by rule, its observed
     flows, its controls, a drain answer, its fleet — from #caps-data (written from the goldens by make site-data,
     held by a gate). A scene plays once when its tile comes into view; with reduced motion it is drawn finished.
     Text goes in through textContent: the data is ours, and still never markup. */
  (function () {
    var dataEl = $('#caps-data');
    if (!dataEl || !dataEl.textContent.trim()) return;
    var C = JSON.parse(dataEl.textContent);
    var NS = 'http://www.w3.org/2000/svg';
    var mk = function (tag, attrs, parent, text) {
      var n = /^(svg|g|rect|line|path|text|circle)$/.test(tag) ? document.createElementNS(NS, tag) : document.createElement(tag);
      for (var k in attrs || {}) n.setAttribute(k, attrs[k]);
      if (text != null) n.textContent = text;
      if (parent) parent.appendChild(n);
      return n;
    };
    var cut = function (s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
    var usd = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
    /* the width a scene has to draw in: its box less the padding */
    var roomOf = function (box) { var cs = getComputedStyle(box); return box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); };
    /* WHAT A DRAWING SHOWS, AS A LIST, on a tile too narrow to draw it at a size that can be read: scaled into a phone
       the map's names stood at 5.6 px and the grants ran off the tile's edge (D56 by-eye pass). One row a line. */
    var listOf = function (box, label, rows) {
      var ol = mk('ol', { 'class': 'cs-list', 'aria-label': label }, box);
      return rows.map(function (r) {
        var li = mk('li', { 'class': r.cls || '' }, ol);
        mk('span', {}, li, r.from);
        mk('span', { 'class': 'cs-arrow' }, li, '→');
        mk('span', { 'class': r.hot ? 'hot' : '' }, li, r.to);
        if (r.note) mk('span', { 'class': 'cs-why' }, li, '· ' + r.note);
        return li;
      });
    };
    /* in: the scene's parts, in the order they arrive; each gets .on after its delay */
    var builders = {
      security: function (box) {
        var chains = C.security.chains, subs = [], roles = [];
        chains.forEach(function (c) { if (subs.indexOf(c[0]) < 0) subs.push(c[0]); if (roles.indexOf(c[2]) < 0) roles.push(c[2]); });
        /* the drawing needs 480 px for its names to stand at 11 px; a narrower tile lists the grants, most severe first */
        if (roomOf(box) < 480) {
          var rank = { critical: 0, high: 1, medium: 2, low: 3 };
          return listOf(box, chains.length + ' grants from ' + subs.length + ' subjects to ' + roles.length + ' roles',
            chains.slice().sort(function (a, b) { return (a[3] in rank ? rank[a[3]] : 9) - (b[3] in rank ? rank[b[3]] : 9); }).map(function (c) {
              return { from: c[0], to: c[2], hot: c[2] === 'cluster-admin', note: c[3], cls: 'r-' + c[3] };
            }));
        }
        /* Wide enough that no subject or role is cut: the longest subject the sample holds is 29 characters. */
        var W = 480, rowH = 22, H = Math.max(subs.length, roles.length) * rowH + 8;
        var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'cs-svg', role: 'img',
          'aria-label': chains.length + ' grants from ' + subs.length + ' subjects to ' + roles.length + ' roles' }, box);
        var y = function (i, n) { return 4 + (i + 0.5) * ((H - 8) / n); };
        var parts = [];
        chains.slice().sort(function (a, b) { return (a[3] === 'critical') - (b[3] === 'critical'); }).forEach(function (c) {
          var y1 = y(subs.indexOf(c[0]), subs.length), y2 = y(roles.indexOf(c[2]), roles.length);
          parts.push(mk('path', { d: 'M202 ' + y1 + ' C 248 ' + y1 + ', 248 ' + y2 + ', 294 ' + y2, 'class': 'cs-edge r-' + c[3], pathLength: 1 }, svg));
        });
        subs.forEach(function (s, i) { mk('text', { x: 196, y: y(i, subs.length) + 4, 'text-anchor': 'end', 'class': 'cs-lab' }, svg, cut(s, 30)); });
        roles.forEach(function (r, i) {
          mk('text', { x: 300, y: y(i, roles.length) + 4, 'class': 'cs-lab' + (r === 'cluster-admin' ? ' cs-hot' : '') }, svg, cut(r, 27));
        });
        return parts;
      },
      reliability: function (box) {
        var wrap = mk('div', { 'class': 'cs-zones' }, box), parts = [];
        C.reliability.zones.forEach(function (z) {
          var col = mk('div', { 'class': 'cs-zone' }, wrap);
          mk('span', { 'class': 'cs-zn' }, col, z[0]);
          z[1].forEach(function (n) {
            var cell = mk('span', { 'class': 'cs-node' + (n[1] ? ' stops' : ''), title: n[0] + (n[1] ? ' — a drain stops here' : '') }, col, n[0].replace(/^ip-10-0-/, ''));
            if (n[1]) parts.push(cell);
          });
        });
        return parts;
      },
      money: function (box) {
        var rules = C.money.rules, max = rules.reduce(function (m, r) { return Math.max(m, r[1]); }, 1), parts = [], sum = 0;
        var list = mk('div', { 'class': 'cs-bars' }, box);
        rules.forEach(function (r) {
          sum += r[1];
          var row = mk('div', { 'class': 'cs-bar' }, list);
          mk('span', { 'class': 'cs-bl' }, row, r[0]);
          var track = mk('span', { 'class': 'cs-bt' }, row);
          var fill = mk('i', { style: '--w:' + (r[1] / max * 100).toFixed(1) + '%' }, track);
          mk('b', {}, row, usd(r[1]));
          parts.push(fill);
        });
        /* each figure rounded on its own, as in the reading: when the rows do not come to the total, say so */
        mk('div', { 'class': 'cs-note' }, box, usd(C.money.total) + ' a month' +
          (sum !== C.money.total ? ' · each rounded on its own; the rows come to ' + usd(sum) : ''));
        return parts;
      },
      topology: function (box) {
        var nodes = C.topology.nodes, edges = C.topology.edges, cols = 0, rows = 0, at = {};
        nodes.forEach(function (n) { cols = Math.max(cols, n[1] + 1); rows = Math.max(rows, n[2] + 1); });
        /* the drawing needs 900 px for its names to stand at 11 px; a narrower tile lists the flows */
        if (roomOf(box) < 900) {
          return listOf(box, edges.length + ' observed flows between ' + nodes.length + ' workloads', edges.map(function (e) {
            return { from: e[0], to: e[1], note: e[3] > 0 ? 'dropped' : '', cls: e[3] > 0 ? 'dropped' : '' };
          }));
        }
        /* The whole width of its tile, so a workload's name is never cut ("auth-servi…" in a third of it). */
        var W = 900, H = rows * 30 + 6, cw = W / cols;
        var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'cs-svg', role: 'img',
          'aria-label': edges.length + ' observed flows between ' + nodes.length + ' workloads' }, box);
        nodes.forEach(function (n) { at[n[0]] = { x: n[1] * cw + 6, y: n[2] * 30 + 4 }; });
        var parts = [];
        edges.forEach(function (e) {
          var a = at[e[0]], b = at[e[1]];
          if (!a || !b) return;
          var x1 = a.x + cw - 24, y1 = a.y + 11, x2 = b.x, y2 = b.y + 11, mx = (x1 + x2) / 2;
          parts.push(mk('path', { d: 'M' + x1 + ' ' + y1 + ' C ' + mx + ' ' + y1 + ', ' + mx + ' ' + y2 + ', ' + x2 + ' ' + y2,
            'class': 'cs-flow' + (e[3] > 0 ? ' dropped' : ''), pathLength: 1 }, svg));
        });
        nodes.forEach(function (n) {
          var p = at[n[0]];
          mk('rect', { x: p.x, y: p.y, width: cw - 30, height: 22, rx: 4, 'class': 'cs-wl' }, svg);
          mk('text', { x: p.x + 7, y: p.y + 15, 'class': 'cs-lab' }, svg, cut(n[0], Math.floor((cw - 44) / 6.6)));
        });
        return parts;
      },
      compliance: function (box) {
        var grid = mk('div', { 'class': 'cs-ctl' }, box), parts = [], tally = {};
        C.compliance.controls.forEach(function (c) {
          tally[c[1]] = (tally[c[1]] || 0) + 1;
          parts.push(mk('span', { 'class': 'cs-c s-' + c[1].toLowerCase(), title: c[0] + ' · ' + c[1] }, grid));
        });
        mk('div', { 'class': 'cs-note' }, box, [['FAIL', 'fail'], ['PASS', 'pass'], ['MANUAL', 'for a person'], ['NA', 'not assessable read-only']]
          .filter(function (k) { return tally[k[0]]; }).map(function (k) { return tally[k[0]] + ' ' + k[1]; }).join(' · '));
        return parts;
      },
      preflight: function (box) {
        var P = C.preflight, pre = mk('pre', { 'class': 'cs-term' }, box);
        return [mk('span', { 'class': 'p' }, pre, '$ ' + P.cmd + '\n'), mk('span', { 'class': 'bad' }, pre, P.head + '\n'),
                mk('span', { 'class': 'dim' }, pre, '  ' + P.why + '\n'), mk('span', { 'class': 'exit' }, pre, 'exit ' + P.exit)];
      },
      fleet: function (box) {
        var F = C.fleet, wrap = mk('div', { 'class': 'cs-fh-wrap' }, box);
        /* every name and value whole: a column is never narrower than what it holds, and a scene with less room
           than the table scrolls it rather than cut "operators.installed" to "operators.insta…" (D56 by-eye pass) */
        var tbl = mk('div', { 'class': 'cs-fleet', style: '--n: ' + F.clusters.length }, wrap), parts = [];
        mk('span', { 'class': 'cs-fh' }, tbl, 'what they declare');
        F.clusters.forEach(function (c) { mk('span', { 'class': 'cs-fh' }, tbl, c.replace(/^acme-pay-/, '')); });
        F.rows.forEach(function (r) {
          mk('span', { 'class': 'cs-fd' }, tbl, r[0] + ' · ' + r[1]);
          r[2].forEach(function (v) { parts.push(mk('span', { 'class': 'cs-fv' + (v === '(not declared)' ? ' none' : '') }, tbl, v === '(not declared)' ? '—' : v)); });
        });
        /* and the history: what the sample reading's comparison with the one before says — the new by title, the
           ones no longer in the set by count, never named and never called dealt with */
        var H = C.history;
        if (H) {
          var hist = mk('div', { 'class': 'cs-hist' }, wrap);
          mk('span', { 'class': 'cs-fh' }, hist, 'since ' + (H.since || 'the reading before'));
          var ol = mk('ol', {}, hist);
          (H.new || []).forEach(function (t) { parts.push(mk('li', { 'class': 'new' }, ol, '+ new · ' + t)); });
          if (H.gone) parts.push(mk('li', { 'class': 'gone' }, ol, '− ' + H.gone + ' no longer in the set'));
          if (H.notCompared) parts.push(mk('li', { 'class': 'nc' }, ol, H.notCompared + ' could not be compared'));
        }
        return parts;
      }
    };
    /* A SCENE PLAYS EACH TIME IT IS SEEN. It played once and stayed finished (D50 site review); now it plays when
       its tile comes into view, and is set back once the tile has left the screen entirely, so scrolling back plays
       it again. With reduced motion it is drawn finished and stays so. */
    $$('.cap-scene[data-scene]').forEach(function (box) {
      var make = builders[box.getAttribute('data-scene')];
      if (!make) return;
      var parts = make(box) || [];
      var finish = function () { box.classList.add('played'); parts.forEach(function (p) { p.classList.add('on'); }); };
      if (reduce || !('IntersectionObserver' in window)) { finish(); return; }
      var step = Math.min(220, 2400 / Math.max(1, parts.length)), timers = [], playing = false;
      new IntersectionObserver(function (es) {
        var e = es[0];
        if (e.intersectionRatio >= 0.45 && !playing) {
          playing = true;
          box.classList.add('played');
          timers = parts.map(function (p, i) { return setTimeout(function () { p.classList.add('on'); }, 200 + i * step); });
        } else if (!e.isIntersecting && playing) {
          playing = false;
          timers.forEach(clearTimeout);
          box.classList.remove('played');
          parts.forEach(function (p) { p.classList.remove('on'); });
        }
      }, { threshold: [0, 0.45] }).observe(box);
    });
  })();

  /* ── the integrations, drawn (D59) ──────────────────────────────────────
     An agent's calls to shoalcheck-mcp as a sequence: the agent, shoalcheck-mcp and the readings on this machine
     as lifelines, each call an arrow drawn from its caller, each answer drawn back with what shoalcheck-mcp returned
     over the sample (#film-mcp, the same answers the film prints). Beside them the cluster, behind a crossed line:
     shoalcheck-mcp has no kubeconfig and no client-go. Played each time it is seen; drawn whole with reduced motion. */
  var playWhenSeen = function (box, parts, step) {
    var finish = function () { box.classList.add('played'); parts.forEach(function (p) { p.classList.add('on'); }); };
    if (reduce || !('IntersectionObserver' in window)) { finish(); return; }
    var timers = [], playing = false;
    new IntersectionObserver(function (es) {
      var e = es[0];
      if (e.intersectionRatio >= 0.4 && !playing) {
        playing = true;
        box.classList.add('played');
        timers = parts.map(function (p, i) { return setTimeout(function () { p.classList.add('on'); }, 250 + i * step); });
      } else if (!e.isIntersecting && playing) {
        playing = false;
        timers.forEach(clearTimeout);
        box.classList.remove('played');
        parts.forEach(function (p) { p.classList.remove('on'); });
      }
    }, { threshold: [0, 0.4] }).observe(box);
  };
  (function () {
    var box = $('.isc[data-isc="agent"]'), src = $('#film-mcp');
    var M = src ? JSON.parse(src.textContent || 'null') : null;
    if (!box || !M || M.length < 3) return;
    var el = function (tag, cls, text, parent) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      if (parent) parent.appendChild(n);
      return n;
    };
    var usd = function (n) { return '$' + Math.round(Math.abs(n)).toLocaleString('en-US'); };
    var sq = el('div', 'sq', null, box), parts = [];
    var heads = el('div', 'sq-heads', null, sq);
    [['Your agent', 'Claude · Cursor · any MCP client'], ['shoalcheck-mcp', 'on your machine'], ['The readings', 'kept and signed on this machine']]
      .forEach(function (h, i) { var d = el('div', 'sq-h' + (i === 1 ? ' mcp' : ''), null, heads); el('b', '', h[0], d); el('span', '', h[1], d); });
    var rows = el('ol', 'sq-rows', null, sq);
    var row = function (kind, label) {
      var li = el('li', 'sq-' + kind, null, rows);
      el('span', 'sq-arrow', null, li);
      if (label) el('code', 'sq-l', label, li);
      parts.push(li);
      return li;
    };
    var args = function (a) { return Object.keys(a || {}).map(function (k) { return k + ': ' + a[k]; }).join(', '); };
    // 1 · what is there, by the team that owns it
    var L = M[0].answer, E = M[1].answer.finding, D = M[2].answer.diff;
    row('call', M[0].tool + (args(M[0].args) ? ' · ' + args(M[0].args) : ''));
    row('read', 'the latest reading');
    var a1 = row('ans'), c1 = el('div', 'sq-card', null, a1);
    el('b', '', L.envelope.total + ' findings · ' + usd(L.envelope.totalDollars) + ' a month identified, by owner', c1);
    var max = L.groups.reduce(function (m, g) { return Math.max(m, g.count); }, 1);
    var bars = el('div', 'sq-bars', null, c1);
    L.groups.slice().sort(function (a, b) { return (a.key.charAt(0) === '(') - (b.key.charAt(0) === '(') || b.count - a.count; }).forEach(function (g) {
      var r = el('div', 'sq-bar', null, bars);
      el('span', 'sq-k', g.key === '(no owner resolved)' ? 'no owner' : g.key, r);
      var t = el('span', 'sq-t', null, r);
      el('i', '', null, t).style.setProperty('--w', (g.count / max * 100).toFixed(1) + '%');
      el('span', 'sq-n', String(g.count), r);
    });
    // 2 · one finding, with what it rests on
    row('call', M[1].tool + ' · ' + (M[1].args.id || ''));
    var a2 = row('ans'), c2 = el('div', 'sq-card', null, a2);
    el('b', '', E.title, c2);
    el('span', 'sq-m', [E.owner, E.severity, usd(E.dollarImpactMonthly) + ' a month (' + E.priceBasis + ')', 'confidence ' + E.confidence].join(' · '), c2);
    // 3 · what changed since the reading before
    row('call', M[2].tool);
    var a3 = row('ans'), c3 = el('div', 'sq-card', null, a3);
    el('b', '', D.newCount + ' new · ' + D.noLongerInSetCount + ' no longer in the set · ' + D.notEvaluatedCount + ' not evaluated', c3);
    el('span', 'sq-m', (D.savingsDelta < 0 ? '−' : '+') + usd(D.savingsDelta) + ' a month identified against the reading before — what left is counted as missing, never as dealt with', c3);
    // the wall: what shoalcheck-mcp cannot do
    var wall = el('div', 'sq-wall', null, sq);
    el('span', 'sq-x', null, wall);
    el('b', '', 'Your cluster', wall);
    el('span', '', 'shoalcheck-mcp has no kubeconfig and no client-go: it answers from readings, and cannot reach the cluster', wall);
    parts.push(wall);
    playWhenSeen(box, parts, 360);
  })();

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
          var c = el('circle', { cx: cx, cy: cy, r: 5, 'class': 'pod', 'data-k': p.k }, gPods || (gPods = el('g', {})));
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
        /* THE ZONE GOES DARK WITH ITS PODS. Its nodes dimmed and its pods stayed bright, as if nothing on them had
           been lost; each now dims with its node until the story says where it goes — moved, gone or stranded. */
        p.c.classList.toggle('dark', p.lost && s >= 1 && !move && !strand && !(p.bare && s >= 2));
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
      // THE FILM IS THE PAGE'S ONE PINNED SCENE. This one pinned for 3,060 px of scroll and was the page's only
      // cinematic moment — on the free preflight, while the product is the reading (D50 site review). It plays
      // through once in view instead; the pinning below stays for a page that wants it back.
      if (reduce || window.innerWidth <= 980 || !sec.hasAttribute('data-pin')) return;
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
        // Not pinned, it plays through once when it comes into view.
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
          p.c.classList.remove('dark');
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

  /* ── the page's own controls ──────────────────────────────────────────────
     A SLIDER SAYS HOW FAR IT IS SET: its track fills to the thumb, and --p is the one number the stylesheet needs.
     A CHOICE SHOWS EVERY OPTION: four models or four providers fit on a line, so each is a button that says what
     it is, instead of a native select that hides them behind a click in the browser's own look. */
  var fillRange = function (el) {
    var span = el.max - el.min;
    el.style.setProperty('--p', (span > 0 ? (el.value - el.min) / span * 100 : 0) + '%');
  };
  $$('input[type=range]').forEach(function (el) {
    fillRange(el);
    el.addEventListener('input', function () { fillRange(el); });
  });
  var choices = function (box, name, items, chosen) {
    box.setAttribute('role', 'radiogroup');
    box.innerHTML = '';
    items.forEach(function (it) {
      var l = document.createElement('label'), r = document.createElement('input'), t = document.createElement('span');
      l.className = 'seg'; r.type = 'radio'; r.name = name; r.value = it.v; r.checked = it.v === chosen;
      t.className = 'seg-t'; t.textContent = it.t;
      l.appendChild(r); l.appendChild(t);
      if (it.s) { var u = document.createElement('span'); u.className = 'seg-s'; u.textContent = it.s; l.appendChild(u); }
      box.appendChild(l);
    });
  };
  var chosen = function (box) { var r = box.querySelector('input:checked'); return r ? r.value : ''; };

  /* ── the arithmetic ───────────────────────────────────────────────────── */
  var priceEl = $('#agent-prices');
  if (priceEl && $('#calc')) {
    var P = JSON.parse(priceEl.textContent);
    var sel = $('#i-model');
    choices(sel, 'model', P.models.map(function (m, k) {
      return { v: String(k), t: m.n.replace(/^Claude /, ''), s: '$' + m['in'] + ' / M' };
    }), '1');
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
    /* A LOOP, PRICED CALL BY CALL. Call i of k sends i/k of one look: what calls 1 to i−1 read, re-sent, and its own
       share. Each call is priced at its own size, because Haiku's rate changes at 100 K tokens a prompt. */
    var loopCost = function (tokens, m, k) {
      var sum = 0;
      for (var i = 1; i <= k; i++) sum += cost(tokens * i / k, m);
      return sum;
    };
    /* THE TRIANGLE: one bar per call, the part re-sent below and the call's own share on top. */
    var tri = $('#r-tri'), triOn = false;
    var drawTri = function (k) {
      if (!tri) return;
      var W = 320, H = 92, top = 6, gap = k > 24 ? 1 : 2, bw = (W - gap * (k - 1)) / k, out = '';
      for (var i = 1; i <= k; i++) {
        var x = (i - 1) * (bw + gap), h = H * i / k, share = H / k;
        var d = ' style="transition-delay:' + Math.round(i * (600 / k)) + 'ms"';
        if (i > 1) out += '<rect class="re" x="' + x.toFixed(1) + '" y="' + (top + H - h + share).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (h - share).toFixed(1) + '"' + d + '/>';
        out += '<rect class="nw" x="' + x.toFixed(1) + '" y="' + (top + H - h).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + share.toFixed(1) + '"' + d + '/>';
      }
      out += '<text x="0" y="111">call 1</text><text x="320" y="111" text-anchor="end">call ' + k + '</text>';
      tri.innerHTML = out;
      tri.classList.toggle('on', triOn);
    };
    if (tri) {
      if (reduce || !('IntersectionObserver' in window)) triOn = true;
      else new IntersectionObserver(function (es, io) {
        if (!es[0].isIntersecting) return;
        triOn = true; tri.classList.add('on'); io.disconnect();
      }, { threshold: 0.5 }).observe(tri);
    }
    var calc = function () {
      var pods = Number($('#i-pods').value), clusters = Number($('#i-clusters').value), reads = Number($('#i-reads').value);
      var k = Number($('#i-k').value), sec = Number($('#i-sec').value), rate = Number($('#i-rate').value);
      var m = P.models[Number(chosen(sel))], c = model(pods);
      $('#o-pods').textContent = pods.toLocaleString('en-US');
      $('#o-clusters').textContent = clusters; $('#o-reads').textContent = reads;
      $('#o-k').textContent = k; $('#r-k').textContent = k;
      $('#o-sec').textContent = sec; $('#o-rate').textContent = '$' + rate;
      var perMonth = clusters * reads;
      /* ONE READING OF ONE CLUSTER, the headline: what it reads, by hand, an agent's look, and the same as a loop. */
      $('#r-objects').textContent = Math.round(c.objects).toLocaleString('en-US') + ' · ' +
        Math.round(c.checks).toLocaleString('en-US') + ' checks';
      var lo = tokShown(c.lo), hi = tokShown(c.hi);
      $('#r-tokens').textContent = tokRange(lo, hi);
      $('#r-ctx').textContent = Math.round(lo / P.context * 100) + '–' + Math.round(hi / P.context * 100) + '%';
      var f = (k + 1) / 2;
      $('#r-loop').textContent = tokRange(tokShown(lo * f), tokShown(hi * f));
      $('#r-tri-x').textContent = String(f);
      drawTri(k);
      var one = hoursShown(c.checks * sec / 3600), dp = one >= 10 ? 0 : 1;
      $('#r-hours-one').textContent = fmtHours(one, dp);
      /* A MONTH BESIDE A MONTH: the agent's figure is every reading of every cluster, so the hours are too. */
      $('#r-n').textContent = perMonth + (perMonth === 1 ? ' reading' : ' readings');
      var hours = Number((one * perMonth).toFixed(dp));
      $('#r-hours').textContent = fmtUsd(hours * rate);
      $('#r-hours-month').textContent = fmtHours(hours, dp);
      /* BOUNDED IN WORDS. 5,000 pods, 20 clusters and 30 readings is thousands of engineers' months; the figure says
         so rather than printing a seven-figure count of hours as if it were a plan (D50 site review). */
      var fte = hours / 160;
      $('#r-fte').textContent = fte < 1 ? 'less than one engineer\'s month' : fte > 1000 ? 'more than a thousand engineers\' months'
        : Math.round(fte).toLocaleString('en-US') + (Math.round(fte) === 1 ? ' engineer\'s month' : ' engineers\' months');
      $('#r-agent').textContent = usdRange(cost(lo, m) * perMonth, cost(hi, m) * perMonth);
      $('#r-agent-loop').textContent = usdRange(loopCost(lo, m, k) * perMonth, loopCost(hi, m, k) * perMonth);
    };
    ['#i-pods', '#i-clusters', '#i-reads', '#i-k', '#i-sec', '#i-rate'].forEach(function (s) { $(s).addEventListener('input', calc); });
    sel.addEventListener('change', calc);
    calc();
  }

  /* ── deadlines ────────────────────────────────────────────────────────
     The support windows and the extended-support rate every reading uses (make site-data writes them; a gate
     holds them equal). Days are counted from the visitor's own clock; the dates are as the source published them. */
  var supEl = $('#support-windows');
  if (supEl && $('#dl-calc')) {
    var T = JSON.parse(supEl.textContent || '{}');
    var NAMES = { aws: 'Amazon EKS', azure: 'Azure AKS', gcp: 'Google GKE', upstream: 'Kubernetes upstream' };
    var SHORT = { aws: ['EKS', 'Amazon'], azure: ['AKS', 'Azure'], gcp: ['GKE', 'Google'], upstream: ['Upstream', 'Kubernetes'] };
    var pSel = $('#dl-provider'), mIn = $('#dl-minor'), nIn = $('#dl-n');
    choices(pSel, 'provider', ['aws', 'azure', 'gcp', 'upstream'].filter(function (p) { return T.windows && T.windows[p]; })
      .map(function (p) { return { v: p, t: SHORT[p][0], s: SHORT[p][1] }; }), 'aws');
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
    /* The version is a slider over the provider's own list, oldest to newest: twenty versions do not fit on a
       line as buttons, and one hidden behind a select is what the founder called terrible. */
    var fillMinors = function () {
      var rows = T.windows[chosen(pSel)] || [];
      mIn.max = String(Math.max(rows.length - 1, 0));
      /* The first version shown is the newest one already past ordinary support: the case that costs money. */
      var past = rows.filter(function (w) { return w[2] && gap(day(w[2])) < 0; });
      var first = past.length ? past[past.length - 1] : rows[rows.length - 1];
      mIn.value = String(Math.max(rows.indexOf(first), 0));
      fillRange(mIn);
    };
    var dl = function () {
      var p = chosen(pSel), rows = T.windows[p] || [], n = Number(nIn.value);
      var i = Number(mIn.value), w = rows[i];
      $('#o-dl-n').textContent = n;
      $('#o-dl-minor').textContent = w ? w[0] : '—';
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
    pSel.addEventListener('change', function () { fillMinors(); dl(); });
    mIn.addEventListener('input', dl);
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
        /* Short both ways: "Show the whole page" widened the bar's button and wrapped the navigation. */
        b.textContent = on ? 'Whole page' : 'Just the output';
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

  /* ── the product, live ──────────────────────────────────────────────────
     THE PRODUCT IN THE PAGE, NOT A RECORDING OF IT. Each live frame holds one of the product's own pages — the
     sample reading, the sample fleet, the app's window — loaded when it comes near the screen and scaled to fit, so
     what the visitor sees is the product's HTML drawn at their screen's resolution. The founder, on the recordings
     that were here: terrible quality. A page cannot be blurred by an encoder. Until a frame loads, its screenshot
     (where it has one) stands in; opening it is a view transition into the page itself. */
  $$('.live-frame').forEach(function (live) {
    var frame = live.querySelector('iframe'), openA = live.querySelector('.live-open');
    if (!frame) return;
    var W = Number(live.getAttribute('data-w')) || 1440, Hh = Number(live.getAttribute('data-h')) || 900;
    var fit = function () {
      if (live.classList.contains('expanded')) {
        frame.style.width = window.innerWidth + 'px'; frame.style.height = window.innerHeight + 'px'; frame.style.transform = 'none';
        return;
      }
      frame.style.width = W + 'px'; frame.style.height = Hh + 'px';
      frame.style.transform = 'scale(' + (live.clientWidth / W) + ')';
    };
    /* THE PAGE IS DARK, SO ITS FRAMES ARE. A frame follows the visitor's system theme, and a light system drew a
       white panel in the dark page (D50 site review). The theme is set on this frame's document only — never stored,
       so the sample opened on its own still follows the visitor's choice. */
    frame.addEventListener('load', function () {
      if (!frame.getAttribute('src')) return;
      try { frame.contentDocument.documentElement.setAttribute('data-theme', 'dark'); } catch (e) { /* another origin */ }
      live.classList.add('live');
    });
    var load = function () { if (!frame.getAttribute('src')) frame.setAttribute('src', frame.getAttribute('data-src')); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { load(); o.disconnect(); } }, { rootMargin: '600px' }).observe(live);
    } else { load(); }
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(live); else window.addEventListener('resize', fit);
    if (!openA) return;
    var go = function (e) {
      if (reduce || !document.startViewTransition || !live.classList.contains('live')) return;
      e.preventDefault();
      var href = openA.getAttribute('href');
      live.classList.add('vt');
      var t = document.startViewTransition(function () { live.classList.add('expanded'); fit(); });
      t.finished.then(function () { location.href = href; });
    };
    openA.addEventListener('click', go);
    live.addEventListener('click', function (e) { if (e.target === live || e.target.tagName === 'IMG') { e.preventDefault(); openA.click(); } });
    // Back from the page: it comes out of the back-forward cache as it was left, grown to the window.
    window.addEventListener('pageshow', function (e) { if (e.persisted) { live.classList.remove('expanded', 'vt'); fit(); } });
  });

  /* ── billing period ───────────────────────────────────────────────────── */
  var billB = $$('[data-bill]');
  var setBill = function (b) {
    billB.forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-bill') === b ? 'true' : 'false'); });
    $$('.plan[data-monthly]').forEach(function (p) {
      var mo = Number(p.getAttribute('data-monthly')), yr = Number(p.getAttribute('data-yearly'));
      var price = $('[data-price]', p), line = $('[data-line]', p), save = $('[data-save]', p);
      if (b === 'year') {
        /* To the cent: floor($590 / 12) printed $49, and $49 × 12 is $588 (D50 site review). */
        var per = yr / 12;
        price.textContent = '$' + (per % 1 ? per.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : per.toLocaleString('en-US'));
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
  /* A PHONE IS OFFERED WHAT IT CAN OPEN: the app runs on a desktop, so on a phone the sample reading is the primary
     and the download stays beside it, for the computer it is meant for (D50 site review). */
  if (/iphone|ipad|ipod|android/i.test(navigator.userAgent || '')) {
    var dlBtn = $('.hero-copy .cta .btn-primary'), sampleBtn = $('.hero-copy .cta a[href="sample-report.html"]');
    if (dlBtn && sampleBtn) {
      dlBtn.classList.remove('btn-primary'); sampleBtn.classList.add('btn-primary');
      dlBtn.parentNode.insertBefore(sampleBtn, dlBtn);
      var dlLabel = $('[data-os-label]', dlBtn);
      if (dlLabel) dlLabel.textContent = 'Download for a computer';
    }
    os = '';
  }
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
  if (!repo) return;
  var releases = 'https://github.com/' + repo + '/releases';
  $$('[data-asset]').forEach(function (a) { a.href = releases; });
  /* rel: { tag, prerelease, published, url, assets: [{ name, url }] } */
  var useRelease = function (rel) {
    var assets = rel.assets || [];
    $$('[data-asset]').forEach(function (a) {
      var re = new RegExp(a.getAttribute('data-asset'));
      var hit = assets.filter(function (x) { return re.test(x.name); })[0];
      if (hit) { a.href = hit.url; a.title = hit.name; }
    });
    var line = $('[data-release-line]');
    if (line && rel.tag) {
      line.textContent = (rel.prerelease ? 'Release candidate ' : 'Latest release ') + rel.tag +
        (rel.published ? ', ' + rel.published : '') + ' · SHA-256 sums, signed · ';
      var all = document.createElement('a'); all.href = rel.url || releases; all.textContent = 'all files';
      line.appendChild(all);
    }
  };
  /* THE RELEASE IS IN THE PAGE. publish-site.sh writes the release the downloads point at into #release when it
     publishes, so a visit costs no request to GitHub's API — unauthenticated, sixty an hour per address, after which
     every row silently fell back to the releases page (D50 site review). Only a copy that was never published, such
     as this repository's own site/, asks the API. */
  var relEl = $('#release'), given = null;
  try { given = relEl && relEl.textContent.trim() ? JSON.parse(relEl.textContent) : null; } catch (e) { given = null; }
  if (given) { useRelease(given); return; }
  if (!window.fetch) return;
  /* The newest published release, prereleases included: GitHub's /releases/latest skips a release candidate,
     so a page that asked it would find nothing while the only releases are candidates. */
  fetch('https://api.github.com/repos/' + repo + '/releases?per_page=10', { headers: { Accept: 'application/vnd.github+json' } })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (list) {
      var rel = (list || []).filter(function (x) { return !x.draft; })[0];
      if (!rel) return;
      useRelease({ tag: rel.tag_name, prerelease: rel.prerelease, published: (rel.published_at || '').slice(0, 10),
        url: rel.html_url, assets: (rel.assets || []).map(function (x) { return { name: x.name, url: x.browser_download_url }; }) });
    })
    .catch(function () { /* the rows already point at the releases page */ });
})();

