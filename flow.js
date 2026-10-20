/* Shoalcheck — the flow: from a reading to a fix, in three screens that zoom into view. Every screen is built from
   captured output held to the product by gates: #flow-data (testdata/site/flow.json), #gate-demo, #film-mcp. Text is
   shown whole or trimmed with an explicit "…", never reworded. Each screen is a card in normal flow; reached, it zooms
   in (scale+fade) and its parts stream once, fast; a tall screen scrolls itself to its newest part. Reduced motion
   draws every part at once and nothing moves; without this script, the parts read as text. */
(function () {
  'use strict';
  var sec = document.getElementById('flow');
  if (!sec || !window.requestAnimationFrame) return;
  var data = function (id) {
    var e = document.getElementById(id);
    try { return e && e.textContent.trim() ? JSON.parse(e.textContent) : null; } catch (x) { return null; }
  };
  var F = data('flow-data'), G = data('gate-demo'), M = data('film-mcp');
  if (!F || !F.steps || F.steps.length !== 3 || !G || !G.runs || !M) return;
  var S = {};
  F.steps.forEach(function (s) { S[s.key] = s; });
  if (!S.read || !S.review || !S.gate) return;
  var DIFF = (M.filter(function (c) { return c.tool === 'diff_readings'; })[0] || {}).answer;
  if (!DIFF || !DIFF.diff) return;
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  var el = function (tag, cls, text, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    if (parent) parent.appendChild(n);
    return n;
  };
  var txt = function (parent, t) { parent.appendChild(document.createTextNode(t)); };
  var link = function (a, href) { a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; };
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var money = function (n) { return (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US'); };
  var num = function (n) { return Number(n).toLocaleString('en-US'); };
  var MON = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
  var when = function (iso) { return +iso.slice(8, 10) + ' ' + MON[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4) + ', ' + iso.slice(11, 16) + ' UTC'; };
  var SEV = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  // markdown's inline marks drawn, not printed: **bold** in weight, `code` as code — the words untouched
  var inline = function (parent, text) {
    text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).forEach(function (p) {
      if (/^\*\*[^*]+\*\*$/.test(p)) el('b', '', p.slice(2, -2), parent);
      else if (/^`[^`]+`$/.test(p)) el('code', '', p.slice(1, -1), parent);
      else if (p) txt(parent, p);
    });
    return parent;
  };

  // the finding the flow follows is the one the re-read names as no longer in the set — read in the first screen,
  // explained and routed in the second, gone in the third.
  var goneTitle = '';
  S.gate.runs.forEach(function (r) { r.out.forEach(function (l) {
    var mm = /^\s+- \[[a-z]+\]\s+(.*?)\s+\(f-[0-9a-f]+\)\s*$/.exec(l);
    if (mm) goneTitle = mm[1];
  }); });

  /* the figures the steps' copy names, from the data */
  var first = S.read.runs[0].out, foot = /^(\d+) rows?, one per rule, for (\d+) of (\d+) findings/.exec(first[first.length - 1]) || [];
  var FACT = {
    'read-rows': foot[1], 'read-of': foot[2], total: foot[3],
    model: S.review.model, calls: num(S.review.calls.length), tickets: num(S.review.tickets.length),
    'gate-red': String(G.runs[0].exit), 'gate-green': String(G.runs[G.runs.length - 1].exit),
    gone: num(DIFF.diff.noLongerInSetCount), 'new': num(DIFF.diff.newCount), delta: money(DIFF.diff.savingsDelta)
  };
  [].forEach.call(sec.querySelectorAll('[data-f]'), function (s) { var v = FACT[s.getAttribute('data-f')]; if (v !== undefined) s.textContent = v; });

  /* A step is a card with a media area and a reel of windows inside it, and a list of beats: parts of a screen that
     arrive — a line, a call, a card — each at `at` (0 → 1 of the step) once the step is reached; a typed beat types its
     text over `dur`. A builder works in its own 0 → 1 and is placed into a sub-range of the step with base/span. */
  var STEPS = [];
  var step = function (key) {
    var li = sec.querySelector('.fs[data-step="' + key + '"]');
    var media = el('div', 'fs-media', null, li), reel = el('div', 'fs-reel', null, media);
    var st = { key: key, li: li, media: media, reel: reel, beats: [], lays: [], base: 0, span: 1, dur: 2200, t0: 0, playing: false, done: false };
    STEPS.push(st);
    return st;
  };
  var seg = function (st, base, span) { st.base = base; st.span = span; };
  var beat = function (st, node, a, o) {
    o = o || {};
    node.classList.add('beat');
    st.beats.push({ el: node, at: st.base + a * st.span, on: false, type: o.type, text: o.text, dur: (o.dur || 0.1) * st.span, also: o.also || [], anchor: o.anchor, n: -1 });
  };
  var setOn = function (b, on) {
    if (b.on === on) return;
    b.on = on;
    b.el.classList.toggle('on', on);
    b.also.forEach(function (x) { x.classList.toggle('on', on); });
  };
  var typeTo = function (b, n) {
    if (b.n === n) return;
    b.n = n;
    b.type.textContent = b.text.slice(0, n);
    b.el.classList.toggle('typing', n > 0 && n < b.text.length);
  };
  // a window: traffic lights in CSS and a title — nobody's logo
  var win = function (st, cls, title, chip) {
    var w = el('div', 'fw ' + cls, null, st.reel), bar = el('div', 'fw-bar', null, w), dots = el('span', 'fw-dots', null, bar);
    dots.setAttribute('aria-hidden', 'true');
    el('i', '', null, dots); el('i', '', null, dots); el('i', '', null, dots);
    el('span', 'fw-title', title, bar);
    if (chip) el('span', 'fw-chip', chip, bar);
    return el('div', 'fw-body', null, w);
  };
  // where a screen came from; a merged step lists each capture on its own line; an identifier in it stays on one line
  var source = function (st, t, id) {
    var cap = st.li.querySelector('.fs-cap'), box = cap.querySelector('.fs-srcs') || el('div', 'fs-srcs', null, cap);
    var p = el('p', 'fs-src', t, box);
    if (id) el('span', 'nb', id, p);
  };

  /* a terminal: each command typed, then every line it printed */
  var terminal = function (st, s, title) {
    var scr = el('div', 'tm', null, win(st, 'fw-term', title, 'Illustrative sample')), lines = [], slot = 0.84 / s.runs.length;
    s.runs.forEach(function (r, k) {
      var t0 = 0.02 + k * slot, cmd = el('div', 'tm-l tm-cmd' + (k ? ' tm-next' : ''), null, scr); // a later prompt waits for its turn
      el('span', 'tm-ps', '$ ', cmd);
      var typed = el('span', 't-cmd', '', cmd);
      el('span', 'tm-cur', null, cmd);
      beat(st, cmd, t0, { type: typed, text: r.cmd, dur: slot * 0.28 });
      r.out.forEach(function (line, i) {
        var l = el('div', 'tm-l t-line', line, scr);
        lines.push(l);
        beat(st, l, t0 + slot * (0.34 + 0.6 * i / r.out.length));
      });
    });
    var end = el('div', 'tm-l tm-end', null, scr);
    el('span', 'tm-ps', '$ ', end);
    el('span', 'tm-cur', null, end);
    beat(st, end, 0.88);
    return lines;
  };

  /* 01 · READ — the terminal: the reading, worst first, and the money in it */
  var st1 = step('read');
  st1.dur = 1700;
  source(st1, 'Captured ' + S.read.sources[0].date + ' · shoalcheck, run over the sample reading');
  terminal(st1, S.read, 'zsh — shoalcheck findings').forEach(function (l) {
    if (goneTitle && l.textContent.indexOf(' ' + goneTitle + ' ') > 0) l.classList.add('tm-pick'); // the one the review follows
  });

  /* 02 · REVIEW & ROUTE — a real Claude Code session over shoalcheck-mcp, then the per-team tickets it led to */
  var st2 = step('review');
  st2.dur = 3000;
  (function () {
    seg(st2, 0, 0.62);
    var s = S.review, body = win(st2, 'fw-cc', 'claude — review of the latest reading', 'Illustrative sample');
    var agSrc = s.sources[0];
    source(st2, 'Captured ' + agSrc.date + ' · ' + agSrc.tool.split(';')[0] + ' · ' + s.model);
    // the wire: the agent, the server on this machine, the reading it serves — and the cluster, which none can reach
    var id = (s.calls[0].answer.readings || [])[0] || {}, net = el('div', 'cc-net', null, body);
    var node = function (cls, a, b) { var n = el('div', 'cc-node ' + cls, null, net); el('b', '', a, n); el('span', cls === 'cc-a' ? 'cc-model' : '', b, n); return n; };
    var A = node('cc-a', 'Claude Code', s.model);
    el('div', 'cc-trk', null, net);
    node('cc-mcp', 'shoalcheck-mcp', 'on this machine');
    el('div', 'cc-trk', null, net);
    var C = node('cc-c', 'the reading', [id.cluster, id.signature, id.ageSeconds ? Math.round(id.ageSeconds / 86400) + ' days old' : ''].filter(Boolean).join(' · '));
    node('cc-x', 'your cluster', 'no route to it');
    var pk = el('div', 'cc-pks', null, net); // the lane a call runs along, agent to reading, and its answer back
    pk.setAttribute('aria-hidden', 'true');
    st2.lays.push(function () {
      var r0 = net.getBoundingClientRect(), a = A.getBoundingClientRect(), c = C.getBoundingClientRect();
      var x0 = a.left + a.width / 2 - r0.left, w = Math.round(c.left + c.width / 2 - r0.left - x0);
      pk.style.left = Math.round(x0) + 'px';
      pk.style.width = w + 'px';
      pk.style.top = Math.round(Math.max(a.bottom, c.bottom) - r0.top + 13) + 'px';
      pk.style.setProperty('--w', w + 'px');
    });
    var scroll = el('div', 'cc-scroll', null, body), log = el('div', 'cc-log', null, scroll), me = el('div', 'cc-prompt', null, log);
    el('span', 'cc-gt', '> ', me);
    beat(st2, me, 0, { type: el('span', 'cc-ptext', '', me), text: s.prompt, dur: 0.05 });
    // an answer, trimmed and never changed: the keys kept carry the server's values; "…" stands for what was left out,
    // and a list that lost elements says how many
    var more = function (x) { return x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).length === 1 && x['…'] !== undefined; };
    var flat = function (v) {
      if (v === null || typeof v !== 'object') return JSON.stringify(v);
      if (Array.isArray(v)) return '[' + v.map(function (x) { return more(x) ? '… ' + num(x['…']) + ' more' : flat(x); }).join(', ') + ']';
      return '{' + Object.keys(v).map(function (k) { return k === '…' ? '…' : JSON.stringify(k) + ': ' + flat(v[k]); }).join(', ') + '}';
    };
    var lines = function (v, ind) {
      var one = flat(v);
      if (one.length <= 110 || v === null || typeof v !== 'object') return [ind + one];
      var arr = Array.isArray(v), out = [ind + (arr ? '[' : '{')];
      var keys = arr ? v : Object.keys(v).filter(function (k) { return k !== '…'; }), cut = !arr && v['…'] !== undefined;
      keys.forEach(function (k, i) {
        var sub; // a list's elements one to a line, however long: rows read as rows
        if (arr) sub = [ind + '  ' + (more(k) ? '… ' + num(k['…']) + ' more' : flat(k))];
        else { sub = lines(v[k], ind + '  '); sub[0] = ind + '  ' + JSON.stringify(k) + ': ' + sub[0].replace(/^\s+/, ''); }
        sub[sub.length - 1] += i < keys.length - 1 ? ',' : cut ? ', …' : '';
        out = out.concat(sub);
      });
      return out.concat(ind + (arr ? ']' : '}'));
    };
    var n = s.calls.length;
    s.calls.forEach(function (c, i) {
      var at = 0.06 + 0.34 * i / n, call = el('div', 'cc-call', null, log);
      el('span', 'cc-dot', '⏺', call);
      var head = el('span', 'cc-head', null, call), a = Object.keys(c.args);
      el('b', '', 'shoalcheck - ', head);
      el('b', 'cc-tool', c.tool, head);
      txt(head, ' (MCP)' + (a.length ? '(' + a.map(function (k) { return k + ': ' + JSON.stringify(c.args[k]); }).join(', ') + ')' : ''));
      beat(st2, call, at, { also: [el('span', 'cc-pk', c.tool, pk), el('span', 'cc-pk cc-pk-back', num(c.chars) + ' chars', pk)] });
      var ans = el('div', 'cc-ans', null, log);
      el('span', 'cc-el', '⎿', ans);
      var js = el('div', 'cc-json', null, ans);
      lines(c.answer, '').forEach(function (l) { // a wrapped line continues under its own text
        var k = l.length - l.replace(/^ +/, '').length + 2, x = el('span', 'jl', l, js);
        x.style.paddingLeft = k + 'ch'; x.style.textIndent = -k + 'ch';
      });
      beat(st2, ans, at + 0.2 / n);
    });
    // the review as the agent wrote it: headings and bold in weight, code in its colour, items marked — no word changed
    var blocks = [], para = [], flush = function () { if (para.length) blocks.push({ k: 'p', t: para.join(' ') }); para = []; };
    s.text.split('\n').forEach(function (l) {
      if (!l.trim()) flush();
      else if (/^#+ /.test(l)) { flush(); blocks.push({ k: 'h', t: l.replace(/^#+ /, '') }); }
      else if (/^- /.test(l)) { flush(); blocks.push({ k: 'li', t: l.slice(2) }); }
      else para.push(l);
    });
    flush();
    var say = el('div', 'cc-say', null, log);
    blocks.forEach(function (b, i) {
      var d = el('div', 'cc-blk cc-' + b.k + (i ? '' : ' cc-first'), null, say);
      if (!i) el('span', 'cc-dot cc-dot-say', '⏺', d);
      inline(el('span', 'cc-bt', null, d), b.t);
      beat(st2, d, 0.44 + 0.5 * i / blocks.length);
    });
    beat(st2, el('div', 'cc-stat', s.turns + ' turns · ' + s.seconds + ' s · tools: shoalcheck-mcp only', log), 0.95);
  })();
  (function () {
    seg(st2, 0.64, 0.36);
    var s = S.review, body = win(st2, 'fw-lin', 'Linear — what the push would create', 'Illustrative sample'), board = el('div', 'lb', null, body);
    source(st2, 'Captured ' + s.sources[1].date + ' · shoalcheck ticket push --dry-run, once per team');
    var head = el('div', 'lb-head', null, board);
    el('b', '', 'From the agent’s review', head);
    var deck = el('span', 'lb-deck', num(s.tickets.length) + ' dry runs, each: “' + s.tickets[0].tail + '”', head);
    var cols = el('div', 'lb-cols', null, board), cards = [];
    var column = function (name, count, cls) {
      var col = el('section', 'lb-col ' + (cls || ''), null, cols), ch = el('div', 'lb-ch', null, col);
      el('span', 'lb-ic', null, ch);
      el('b', '', name, ch);
      el('span', 'lb-n', count, ch);
      return col;
    };
    s.tickets.forEach(function (t, i) {
      var card = el('article', 'tk-card', null, column(t.team, '1')), top = el('div', 'tk-top', null, card);
      el('span', 'tk-key', t.project, top);
      el('span', '', t.head.replace(/^--- | ---$/g, ''), top);
      el('p', 'tk-title', t.title, card);
      inline(el('p', 'tk-desc', null, card), t.lines.join(' '));
      var tbl = el('dl', 'tk-tbl', null, card);
      t.table.forEach(function (r) { el('dt', '', r[0], tbl); el('dd', '', r[1], tbl); });
      el('p', 'tk-mark', t.marker, card);
      beat(st2, card, 0.12 + i * 0.12);
      cards.push(card);
    });
    // the bucket no namespace label claims: counted by list_findings, given no ticket — in the agent's own words
    var g = (s.calls.filter(function (c) { return c.answer.groups; })[0] || { answer: { groups: [] } }).answer.groups;
    var none = g.filter(function (x) { return x.key.charAt(0) === '('; })[0], quote = (/[^.]*Someone needs to take it on\./.exec(s.text) || [''])[0].trim();
    if (none && quote) {
      var empty = el('div', 'lb-empty', null, column('no owner', num(none.count), 'lb-none'));
      el('p', '', num(none.count) + ' findings no namespace label claims. No ticket proposed:', empty);
      el('q', '', quote, empty);
      beat(st2, empty, 0.66);
    }
    st2.lays.push(function () { // each card flies from the deck to its column; on a narrow board, from the side
      var d = deck.getBoundingClientRect(), narrow = board.getBoundingClientRect().width < 560;
      cards.forEach(function (c, i) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--fx', (narrow ? 28 : Math.round(d.left + d.width / 2 - r.left - r.width / 2)) + 'px');
        c.style.setProperty('--fy', (narrow ? 0 : Math.round(d.bottom + 8 - r.top)) + 'px');
        c.style.setProperty('--fr', (i % 2 ? 3 : -3) + 'deg');
      });
    });
  })();

  /* 03 · GATE — a real pull request's checks block the bad merge and pass the fix, then the reading is taken again */
  var st3 = step('gate');
  st3.dur = 2600;
  (function () {
    seg(st3, 0, 0.52);
    var pr = el('div', 'gt', null, win(st3, 'fw-gh', G.repo + ' · pull request #' + G.pr.number, 'A real run'));
    st3.li.querySelector('.fw-chip').classList.add('real');
    source(st3, 'GitHub’s record · ' + G.repo + ' #' + G.pr.number + ', not the sample');
    var h = el('div', 'gt-h', null, pr);
    link(el('a', 'gt-pr', G.pr.title + ' #' + G.pr.number, h), G.pr.url);
    el('span', 'gt-badge gt-open', 'Open', h);
    var merged = G.merged && el('span', 'gt-badge gt-merged', 'Merged', h);
    var tl = el('ol', 'gt-tl', null, pr);
    G.runs.forEach(function (r, i) {
      var ok = r.exit === 0, run = el('li', 'gt-run ' + (ok ? 'pass' : 'fail'), null, tl), c = el('div', 'gt-commit', null, run);
      run.setAttribute('data-sha', r.sha);
      run.setAttribute('data-exit', String(r.exit));
      el('span', 'gt-cdot', null, c);
      el('code', '', r.sha, c);
      el('span', 'gt-msg', r.message, c);
      var chk = el('div', 'gt-check', null, run);
      el('span', 'gt-st', null, chk);
      el('b', '', 'gate', chk);
      el('span', 'gt-ex', (ok ? 'passed' : 'failed') + ' · exit ' + r.exit + ' · ' + r.seconds + ' s', chk);
      link(el('a', 'gt-link', 'the run', chk), r.url);
      var shown = r.gate.slice(1).filter(function (x) { return x.trim(); });
      beat(st3, run, i ? 0.5 : 0.06);
      beat(st3, el('pre', 'gt-out', shown.slice(0, 3).join('\n') + (shown.length > 3 ? '\n…' : ''), run), i ? 0.6 : 0.16);
    });
    var box = el('div', 'gt-merge', null, pr);
    var MERGE = { blocked: ['Merging is blocked', 'the required check “gate” failed'], clean: ['Ready to merge', 'every check passed'] };
    G.runs.forEach(function (r, i) {
      var m = MERGE[r.mergeableState];
      if (!m) return;
      var d = el('div', 'gt-m ' + (r.exit === 0 ? 'ok' : 'no'), null, box);
      el('span', 'gt-mi', null, d);
      el('b', '', m[0], d);
      el('span', '', m[1] + ' · at ' + r.sha, d);
      beat(st3, d, i ? 0.66 : 0.24);
    });
    if (merged) beat(st3, merged, 0.8, { anchor: box }); // merged comes last, also where the page is read top to bottom
  })();
  (function () {
    seg(st3, 0.54, 0.32);
    source(st3, 'Captured ' + S.gate.sources[1].date + ' · shoalcheck, over both readings');
    terminal(st3, S.gate, 'zsh — shoalcheck diff').forEach(function (l) { if (/no longer in this reading|^\s+- \[/.test(l.textContent)) l.classList.add('tm-gone'); });
  })();
  (function () {
    seg(st3, 0.86, 0.14);
    var d = DIFF.diff, card = el('div', 'rr-mcp', null, st3.reel);
    el('span', 'rr-k', 'The same two readings, as shoalcheck-mcp answers diff_readings', card);
    el('b', '', d.newCount + ' new · ' + d.noLongerInSetCount + ' no longer in the set · ' + d.notEvaluatedCount + ' not evaluated', card);
    el('span', 'rr-m', money(d.savingsDelta) + ' a month identified against the reading before — what left is counted as missing, never as dealt with', card);
    beat(st3, card, 0.9);
  })();

  /* motion — zoom: each card zooms in when reached, then its parts stream once and the reel scrolls to its newest part;
     still (reduced motion): everything drawn, nothing moves. */
  var LEAD = 140, mode = reduce ? 'still' : 'zoom', active = 0, raf = 0, parRaf = 0;
  var rail = [].slice.call(sec.querySelectorAll('.flow-rail button'));
  var railbar = sec.querySelector('.flow-railbar');
  var fills = rail.map(function (b) { return el('i', 'fr-fill', null, b); });
  var docTop = function (n) { return n.getBoundingClientRect().top + window.scrollY; };
  var navH = function () { var t = document.querySelector('.top'); return t ? t.getBoundingClientRect().height : 64; };
  // the sticky nav and the sticky rail both sit above a card the reader scrolls to
  var headH = function () { return navH() + (railbar ? railbar.getBoundingClientRect().height : 0); };

  // a screen taller than its media keeps its newest part in view, as a terminal does — scrolled to the lowest part so
  // far drawn, so a card taller than its neighbours is never cut by following a shorter one beside it
  var follow = function (st) {
    if (mode !== 'zoom') { st.reel.style.transform = ''; return; }
    var reelTop = st.reel.getBoundingClientRect().top, bottom = 0, any = false;
    st.beats.forEach(function (b) {
      if (!b.on) return;
      any = true;
      var bb = b.el.getBoundingClientRect().bottom - reelTop;
      if (bb > bottom) bottom = bb;
    });
    if (!any) { st.reel.style.transform = ''; return; }
    var mediaH = st.media.clientHeight, reelH = st.reel.scrollHeight;
    var y = Math.max(0, Math.min(bottom + 16 - mediaH, reelH - mediaH));
    st.reel.style.transform = y ? 'translateY(' + -Math.round(y) + 'px)' : '';
  };
  var drawAll = function (st, on) {
    st.beats.forEach(function (b) {
      if (b.type) typeTo(b, on ? b.text.length : 0);
      setOn(b, on);
    });
  };
  // the cascade: parts of every playing step turn on by their time, typed parts type over theirs; the reel follows
  var play = function () {
    raf = 0;
    var now = performance.now(), going = false;
    STEPS.forEach(function (st) {
      if (!st.playing) return;
      var t = now - st.t0 - LEAD;
      st.beats.forEach(function (b) {
        var at = b.at * st.dur;
        if (!b.type) return setOn(b, t >= at);
        var p = clamp((t - at) / (b.dur * st.dur), 0, 1);
        typeTo(b, Math.round(b.text.length * p));
        setOn(b, p >= 1);
      });
      follow(st);
      if (t >= st.dur) { st.playing = false; st.done = true; } else going = true;
    });
    if (going) raf = requestAnimationFrame(play);
  };
  var enter = function (st) {
    if (mode !== 'zoom') return;
    st.li.classList.add('in');
    st.t0 = performance.now();
    st.playing = true;
    st.done = false;
    if (!raf) raf = requestAnimationFrame(play);
  };
  var leave = function (st) {
    if (mode !== 'zoom') return;
    st.li.classList.remove('in');
    st.playing = false;
    st.done = false;
    drawAll(st, false);
    st.reel.style.transform = '';
  };

  // the rail: the step most in view is the current one; its marker fills, the ones before it are done
  var updateRail = function () {
    var mid = window.scrollY + window.innerHeight * 0.42, i = 0;
    STEPS.forEach(function (st, k) { if (docTop(st.li) <= mid) i = k; });
    active = i;
    STEPS.forEach(function (st, k) {
      rail[k].classList.toggle('done', k < i);
      if (k === i) rail[k].setAttribute('aria-current', 'step'); else rail[k].removeAttribute('aria-current');
      fills[k].style.transform = 'scaleX(' + (k < i ? 1 : k === i ? 1 : 0).toFixed(0) + ')';
    });
  };

  // a light parallax: each card's backdrop drifts a few px against the scroll — transform only, never under reduced motion
  var parallax = function () {
    parRaf = 0;
    if (mode !== 'zoom') return;
    var H = window.innerHeight;
    STEPS.forEach(function (st) {
      var r = st.media.getBoundingClientRect(), c = (r.top + r.bottom) / 2 - H / 2;
      st.media.style.setProperty('--par', clamp(-c / H * 16, -12, 12).toFixed(1) + 'px');
    });
  };

  // observe each card: in view → zoom and play (again, each time it returns); out of view → set back
  var observe = function () {
    if (!window.IntersectionObserver) { STEPS.forEach(function (st) { enter(st); }); return; }
    var ob = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var st = STEPS[+e.target.getAttribute('data-k')];
        if (!st) return;
        if (e.isIntersecting && !st.playing && !st.done) enter(st);
        else if (!e.isIntersecting) leave(st);
      });
    }, { root: null, rootMargin: '-112px 0px -22% 0px', threshold: 0.01 });
    STEPS.forEach(function (st, k) { st.li.setAttribute('data-k', k); ob.observe(st.li); });
  };

  var still = function () {
    STEPS.forEach(function (st) { st.li.classList.add('in'); st.reel.style.transform = ''; drawAll(st, true); st.lays.forEach(function (f) { f(); }); });
  };

  var layout = function () {
    STEPS.forEach(function (st) { st.lays.forEach(function (f) { f(); }); });
    STEPS.forEach(function (st) { if (st.playing || st.done) follow(st); });
    updateRail();
    parallax();
  };
  rail.forEach(function (b, k) { b.addEventListener('click', function () { window.scrollTo({ top: Math.max(0, docTop(STEPS[k].li) - headH() - 12), behavior: 'smooth' }); }); });

  // for the browser gate: the mode, the step reached, where each step begins and ends on the page's scroll
  sec.flowState = function () {
    var H = window.innerHeight, head = headH(), steps = STEPS.map(function (st) {
      var top = docTop(st.li) - head - 10;
      return { key: st.key, start: Math.round(top), end: Math.round(Math.max(top, docTop(st.li) + st.li.offsetHeight - H * 0.86)) };
    });
    return { mode: mode, steps: steps, active: active };
  };

  var resizeT = 0;
  window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(layout, 120); });
  window.addEventListener('scroll', function () {
    updateRail();
    if (mode === 'zoom' && !parRaf) parRaf = requestAnimationFrame(parallax);
  }, { passive: true });

  if (mode === 'still') still(); else observe();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  layout();
  sec.classList.add('flow-on', 'flow-' + mode);
})();
