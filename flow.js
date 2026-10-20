/* Shoalcheck — the flow: from a reading to a fix, as the screens it passes through. Every screen is built from
   captured output held to the product by gates: #flow-data (testdata/site/flow.json), #gate-demo, #film-mcp. Text is
   shown whole or trimmed with an explicit "…", never reworded. Pinned at a desk (the scroll is the timeline), stacked
   on a phone (each part arrives as it is reached), drawn whole with reduced motion; without this script, text. */
(function () {
  'use strict';
  var sec = document.getElementById('flow');
  if (!sec || !window.requestAnimationFrame) return;
  var data = function (id) {
    var e = document.getElementById(id);
    try { return e && e.textContent.trim() ? JSON.parse(e.textContent) : null; } catch (x) { return null; }
  };
  var F = data('flow-data'), G = data('gate-demo'), M = data('film-mcp');
  if (!F || !F.steps || F.steps.length !== 7 || !G || !G.runs || !M) return;
  var S = {};
  F.steps.forEach(function (s) { S[s.key] = s; });
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

  /* the figures the steps' copy names, from the data */
  var first = S.read.runs[0].out, foot = /^(\d+) rows?, one per rule, for (\d+) of (\d+) findings/.exec(first[first.length - 1]) || [];
  var FACT = {
    'read-rows': foot[1], 'read-of': foot[2], total: foot[3], title: S.finding.finding.title, usd: money(S.finding.finding.dollars),
    model: S.agent.model, calls: num(S.agent.calls.length), tickets: num(S.tickets.tickets.length),
    'gate-red': String(G.runs[0].exit), 'gate-green': String(G.runs[G.runs.length - 1].exit),
    gone: num(DIFF.diff.noLongerInSetCount), 'new': num(DIFF.diff.newCount), delta: money(DIFF.diff.savingsDelta)
  };
  [].forEach.call(sec.querySelectorAll('[data-f]'), function (s) { var v = FACT[s.getAttribute('data-f')]; if (v !== undefined) s.textContent = v; });

  /* A step is a list of beats: parts of a screen that arrive — a line, a call, a card — each at `at` (0 → 1) of its
     step; a typed beat types its text over `dur`. Pinned, scrolling back takes a beat away again. */
  var STEPS = [];
  var step = function (key, span) {
    var st = { key: key, li: sec.querySelector('.fs[data-step="' + key + '"]'), span: span, beats: [] };
    STEPS.push(st);
    return st;
  };
  var beat = function (st, node, at, o) {
    o = o || {};
    node.classList.add('beat');
    st.beats.push({ el: node, at: at, on: false, type: o.type, text: o.text, dur: o.dur || 0.1, also: o.also || [], anchor: o.anchor, n: -1, timer: 0 });
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
    var w = el('div', 'fw ' + cls, null, st.li), bar = el('div', 'fw-bar', null, w), dots = el('span', 'fw-dots', null, bar);
    dots.setAttribute('aria-hidden', 'true');
    el('i', '', null, dots); el('i', '', null, dots); el('i', '', null, dots);
    el('span', 'fw-title', title, bar);
    if (chip) el('span', 'fw-chip', chip, bar);
    return el('div', 'fw-body', null, w);
  };
  // where a screen came from; an identifier in it stays on one line
  var source = function (st, t, id) { var p = el('p', 'fs-src', t, st.li.querySelector('.fs-cap')); if (id) el('span', 'nb', id, p); };

  /* 01 · a terminal: each command typed, then every line it printed */
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
  var st1 = step('read', 1.15);
  source(st1, 'Captured ' + S.read.source.date + ' · shoalcheck, run over the sample reading');
  terminal(st1, S.read, 'zsh — shoalcheck findings').forEach(function (l) {
    if (l.textContent.indexOf(' ' + S.finding.finding.title + ' ') > 0) l.classList.add('tm-pick'); // the one opened next
  });

  /* 02 · the reading: the finding as the instrument shows it */
  var st2 = step('finding', 1.3);
  (function () {
    var s = S.finding, R = s.reading, f = s.finding;
    source(st2, 'The sample reading itself · finding ', s.source.finding);
    var app = el('div', 'ri', null, win(st2, 'fw-app', R.cluster + ' — reading'));
    var top = el('div', 'ri-top', null, app);
    el('b', 'ri-cl', R.cluster, top);
    el('span', '', [R.provider, R.region, 'k8s ' + R.version, when(R.at)].join(' · '), top);
    el('span', 'ri-state', 'Illustrative sample', top);
    var main = el('div', 'ri-main', null, app), list = el('div', 'ri-list', null, main), q = el('div', 'ri-q', null, list);
    el('span', 'ri-qi', null, q);
    beat(st2, q, 0.02, { type: el('span', 'ri-qt', '', q), text: s.query, dur: 0.12 });
    el('div', 'ri-lh', 'Finding', list);
    var sel = null, sum = 0;
    s.list.forEach(function (r, i) {
      var row = el('div', 'ri-row', null, list);
      el('span', 'ri-sv sv' + SEV[r.severity], r.severity.charAt(0).toUpperCase(), row);
      el('span', 'ri-rt', r.title, row);
      beat(st2, row, 0.16 + i * 0.035);
      sum += r.dollars;
      if (r.id === f.id) sel = row;
    });
    var status = el('div', 'ri-status', null, list);
    txt(status, num(s.list.length) + ' of ' + num(R.findings) + ' findings · ');
    el('b', '', money(sum), status);
    txt(status, ' of ' + money(R.dollars) + ' · “' + s.query + '”');
    beat(st2, status, 0.3);
    beat(st2, el('span', 'ri-pick', null, sel), 0.36);
    var dr = el('div', 'ri-drawer', null, main), inner = el('div', 'ri-din', null, dr);
    st2.follow = { box: dr, inner: inner };
    beat(st2, dr, 0.4);
    beat(st2, el('h4', 'ri-dtitle', f.title, inner), 0.42);
    var meta = el('div', 'ri-meta', null, inner);
    el('span', 'ri-sv sv' + SEV[f.severity], f.severity.charAt(0).toUpperCase(), meta);
    [f.severity, f.category, money(f.dollars) + '/mo', Math.round(f.confidence * 100) + '% confidence', f.effort + ' effort', f.id]
      .forEach(function (x, i) { if (i) el('span', 'ri-dot', '·', meta); el('span', i === 5 ? 'mono' : '', x, meta); });
    beat(st2, meta, 0.46);
    var sect = function (head, at, cls) { var d = el('div', 'ri-sect ' + (cls || ''), null, inner); el('span', 'ri-h', head, d); beat(st2, d, at); return d; };
    el('p', '', f.description, sect('What it is', 0.52));
    var rl = el('div', 'ri-res', null, sect('Affected resources', 0.58));
    f.resources.forEach(function (r) { var x = el('span', 'ri-rs', null, rl); el('b', '', r[0], x); txt(x, ' ' + (r[1] ? r[1] + '/' : '') + r[2]); });
    el('p', 'mono', f.owner, sect('Owner', 0.62));
    var ev = el('ul', 'ri-ev', null, sect('Evidence', 0.66));
    f.evidence.forEach(function (x) { el('li', '', x, ev); });
    if (f.evidenceCount > f.evidence.length) el('p', 'ri-more', '… ' + (f.evidenceCount - f.evidence.length) + ' more lines of evidence in the reading', ev.parentNode);
    var nb = el('ul', 'ri-nb', null, sect('What this does not establish', 0.74, 'ri-lim'));
    f.boundaries.forEach(function (x, i) { beat(st2, el('li', '', x, nb), 0.76 + i * 0.03); });
    el('p', 'ri-rule', 'rule ' + f.rule + ' · read from ' + f.kinds.join(', ') + (f.usage ? ' · usage from ' + f.usage : ''), inner);
  })();

  /* 03 · the agent: a real Claude Code session whose only tools were shoalcheck-mcp's */
  var st3 = step('agent', 2.7);
  (function () {
    var s = S.agent, body = win(st3, 'fw-cc', 'claude — review of the latest reading', 'Illustrative sample');
    source(st3, 'Captured ' + s.source.date + ' · ' + s.source.tool.split(';')[0] + ' · ' + s.model);
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
    st3.lay = function () {
      var r0 = net.getBoundingClientRect(), a = A.getBoundingClientRect(), c = C.getBoundingClientRect();
      var x0 = a.left + a.width / 2 - r0.left, w = Math.round(c.left + c.width / 2 - r0.left - x0);
      pk.style.left = Math.round(x0) + 'px';
      pk.style.width = w + 'px';
      pk.style.top = Math.round(Math.max(a.bottom, c.bottom) - r0.top + 13) + 'px';
      pk.style.setProperty('--w', w + 'px');
    };
    var scroll = el('div', 'cc-scroll', null, body), log = el('div', 'cc-log', null, scroll), me = el('div', 'cc-prompt', null, log);
    st3.follow = { box: scroll, inner: log };
    el('span', 'cc-gt', '> ', me);
    beat(st3, me, 0, { type: el('span', 'cc-ptext', '', me), text: s.prompt, dur: 0.05 });
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
      beat(st3, call, at, { also: [el('span', 'cc-pk', c.tool, pk), el('span', 'cc-pk cc-pk-back', num(c.chars) + ' chars', pk)] });
      var ans = el('div', 'cc-ans', null, log);
      el('span', 'cc-el', '⎿', ans);
      var js = el('div', 'cc-json', null, ans);
      lines(c.answer, '').forEach(function (l) { // a wrapped line continues under its own text
        var k = l.length - l.replace(/^ +/, '').length + 2, x = el('span', 'jl', l, js);
        x.style.paddingLeft = k + 'ch'; x.style.textIndent = -k + 'ch';
      });
      beat(st3, ans, at + 0.2 / n);
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
      beat(st3, d, 0.44 + 0.5 * i / blocks.length);
    });
    beat(st3, el('div', 'cc-stat', s.turns + ' turns · ' + s.seconds + ' s · tools: shoalcheck-mcp only', log), 0.95);
  })();

  /* 04 · the tickets: each team's, as `ticket push` assembled it, dealt to its column */
  var st4 = step('tickets', 1.25);
  (function () {
    var s = S.tickets, body = win(st4, 'fw-lin', 'Linear — what the push would create', 'Illustrative sample'), board = el('div', 'lb', null, body);
    st4.follow = { box: body, inner: board };
    source(st4, 'Captured ' + s.source.date + ' · shoalcheck ticket push --dry-run, once per team');
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
      beat(st4, card, 0.12 + i * 0.12);
      cards.push(card);
    });
    // the bucket no namespace label claims: counted by list_findings, given no ticket — in the agent's own words
    var g = (S.agent.calls.filter(function (c) { return c.answer.groups; })[0] || { answer: { groups: [] } }).answer.groups;
    var none = g.filter(function (x) { return x.key.charAt(0) === '('; })[0], quote = (/[^.]*Someone needs to take it on\./.exec(S.agent.text) || [''])[0].trim();
    if (none && quote) {
      var empty = el('div', 'lb-empty', null, column('no owner', num(none.count), 'lb-none'));
      el('p', '', num(none.count) + ' findings no namespace label claims. No ticket proposed:', empty);
      el('q', '', quote, empty);
      beat(st4, empty, 0.66);
    }
    st4.lay = function () { // each card flies from the deck to its column; on a narrow board, from the side
      var d = deck.getBoundingClientRect(), narrow = board.getBoundingClientRect().width < 560;
      cards.forEach(function (c, i) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--fx', (narrow ? 28 : Math.round(d.left + d.width / 2 - r.left - r.width / 2)) + 'px');
        c.style.setProperty('--fy', (narrow ? 0 : Math.round(d.bottom + 8 - r.top)) + 'px');
        c.style.setProperty('--fr', (i % 2 ? 3 : -3) + 'deg');
      });
    };
  })();

  /* 05 · the fix: the finding's own patch, as the diff a team reviews */
  var st5 = step('fix', 1.0);
  (function () {
    var s = S.fix, body = win(st5, 'fw-gh', 'Files changed — the patch', 'Illustrative sample');
    source(st5, 'The finding’s own remediation, verbatim');
    var count = function (k) { return s.diff.filter(function (d) { return d[0] === k; }).length; }, plus = count('+'), minus = count('-');
    var fh = el('div', 'gd-file', null, body);
    el('span', 'gd-chev', null, fh);
    el('b', 'mono', s.resource, fh);
    var cnt = el('span', 'gd-cnt', null, fh);
    el('span', 'gd-p', '+' + plus, cnt);
    el('span', 'gd-m', '−' + minus, cnt);
    var bars = el('span', 'gd-bars', null, cnt);
    for (var k = 0; k < 5; k++) el('i', k < Math.round(5 * plus / (plus + minus)) ? '' : 'm', null, bars);
    var tbl = el('div', 'gd', null, body), o = 0, nn = 0, ci = 0, ch = 0, ctx = count(' ');
    s.diff.forEach(function (d) {
      var row = el('div', 'gd-row gd-' + (d[0] === '+' ? 'add' : d[0] === '-' ? 'del' : 'ctx'), null, tbl);
      row.setAttribute('data-k', d[0]);
      if (d[0] !== '+') o++;
      if (d[0] !== '-') nn++;
      el('span', 'gd-o', d[0] === '+' ? '' : o, row);
      el('span', 'gd-n', d[0] === '-' ? '' : nn, row);
      el('span', 'gd-mk', d[0] === ' ' ? '' : d[0] === '-' ? '−' : '+', row);
      // coloured as a code host colours YAML: key, value, comment
      var code = el('span', 'gd-code', null, row), m = /^(\s*)(- )?([A-Za-z][\w.-]*)(:)(.*?)(\s+#.*)?$/.exec(d[1]);
      if (!m) code.textContent = d[1];
      else {
        txt(code, m[1] + (m[2] || ''));
        el('span', 'yk', m[3], code);
        txt(code, m[4] + m[5]);
        if (m[6]) el('span', 'yc', m[6], code);
      }
      beat(st5, row, d[0] === ' ' ? 0.04 + 0.3 * (ci++) / ctx : 0.42 + 0.1 * (ch++));
    });
    var note = el('div', 'gd-note', null, body);
    el('span', 'gd-tag', s.safety, note);
    el('p', '', 'Applying this: ' + s.applying, note);
    beat(st5, note, 0.8);
  })();

  /* 06 · the gate: a real pull request's checks, from GitHub's record */
  var st6 = step('gate', 1.05);
  (function () {
    var pr = el('div', 'gt', null, win(st6, 'fw-gh', G.repo + ' · pull request #' + G.pr.number, 'A real run'));
    st6.li.querySelector('.fw-chip').classList.add('real');
    source(st6, 'GitHub’s record · ' + G.repo + ' #' + G.pr.number + ', not the sample');
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
      beat(st6, run, i ? 0.5 : 0.06);
      beat(st6, el('pre', 'gt-out', shown.slice(0, 3).join('\n') + (shown.length > 3 ? '\n…' : ''), run), i ? 0.6 : 0.16);
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
      beat(st6, d, i ? 0.66 : 0.24);
    });
    if (merged) beat(st6, merged, 0.8, { anchor: box }); // merged comes last, also where the page is read top to bottom
  })();

  /* 07 · read again: the CLI comparing the two readings, and the same comparison as the agent's server gives it */
  var st7 = step('reread', 1.0);
  (function () {
    source(st7, 'Captured ' + S.reread.source.date + ' · shoalcheck, over both readings');
    terminal(st7, S.reread, 'zsh — shoalcheck diff').forEach(function (l) { if (/no longer in this reading|^\s+- \[/.test(l.textContent)) l.classList.add('tm-gone'); });
    var d = DIFF.diff, card = el('div', 'rr-mcp', null, st7.li);
    el('span', 'rr-k', 'The same two readings, as shoalcheck-mcp answers diff_readings', card);
    el('b', '', d.newCount + ' new · ' + d.noLongerInSetCount + ' no longer in the set · ' + d.notEvaluatedCount + ' not evaluated', card);
    el('span', 'rr-m', money(d.savingsDelta) + ' a month identified against the reading before — what left is counted as missing, never as dealt with', card);
    beat(st7, card, 0.9);
  })();

  /* modes — pinned: the stage holds still and the scroll plays it; stacked: the screens follow one another; still
     (reduced motion): everything drawn, nothing moves */
  var mode = '', geo = [], active = 0, frame = 0;
  var track = sec.querySelector('.flow-pin'), rail = [].slice.call(sec.querySelectorAll('.flow-rail button'));
  var fills = rail.map(function (b) { return el('i', 'fr-fill', null, b); });
  var docTop = function (n) { return n.getBoundingClientRect().top + window.scrollY; };
  var navH = function () { var t = document.querySelector('.top'); return t ? t.getBoundingClientRect().height : 64; };
  // a screen taller than its window keeps its newest part in view, as a terminal does
  var follow = function (st) {
    var f = st.follow, last = null;
    if (!f) return;
    st.beats.forEach(function (b) { if (b.on && f.inner.contains(b.el)) last = b.el; });
    // measured against the screen's own top: a part still settling has a transform, and a transformed ancestor would
    // move offsetTop's origin under it
    var y = mode !== 'pinned' || !last ? 0 : Math.max(0, Math.min(last.getBoundingClientRect().bottom - f.inner.getBoundingClientRect().top + 18 - f.box.clientHeight, f.inner.scrollHeight - f.box.clientHeight));
    f.inner.style.transform = y ? 'translateY(' + -Math.round(y) + 'px)' : '';
    f.box.classList.toggle('scrolled', y > 0); // fade the top edge only once the body has scrolled under the header
  };
  var tick = function () {
    frame = 0;
    var y = window.scrollY, i = 0;
    geo.forEach(function (g, k) { if (y >= g.start) i = k; });
    STEPS.forEach(function (st, k) {
      var g = geo[k], t = k < i ? 1 : k > i ? 0 : clamp((y - g.start) / (g.len * 0.82), 0, 1);
      st.beats.forEach(function (b) {
        if (!b.type) return setOn(b, t >= b.at);
        var p = clamp((t - b.at) / b.dur, 0, 1);
        typeTo(b, Math.round(b.text.length * p));
        setOn(b, p >= 1);
      });
      follow(st);
      st.li.classList.toggle('cur', k === i);
      st.li.classList.toggle('past', k < i);
      fills[k].style.transform = 'scaleX(' + t.toFixed(3) + ')';
      rail[k].classList.toggle('done', k < i);
      if (k === i) rail[k].setAttribute('aria-current', 'step'); else rail[k].removeAttribute('aria-current');
    });
    active = i;
  };
  // stacked: a part arrives once it is above the screen's bottom and leaves once below it again — read from where it
  // is on every frame, so a jump past a part still leaves it drawn
  var typeTimed = function (b) {
    var t0 = 0, ms = Math.min(900, 30 + b.text.length * 16), run = function (now) {
      t0 = t0 || now;
      var p = clamp((now - t0) / ms, 0, 1);
      typeTo(b, Math.round(b.text.length * p));
      if (p < 1) b.timer = requestAnimationFrame(run); else { b.timer = 0; setOn(b, true); }
    };
    b.timer = requestAnimationFrame(run);
  };
  var stack = function () {
    frame = 0;
    var H = window.innerHeight, all = [];
    STEPS.forEach(function (st) { st.beats.forEach(function (b) { all.push([b, (b.anchor || b.el).getBoundingClientRect().top]); }); });
    all.forEach(function (x) {
      var b = x[0], top = x[1];
      if (top < H * 0.92) {
        if (!b.type) setOn(b, true);
        else if (!b.on && !b.timer) { if (top > -40) typeTimed(b); else { typeTo(b, b.text.length); setOn(b, true); } }
      } else if (top >= H) {
        cancelAnimationFrame(b.timer); b.timer = 0;
        if (b.type) typeTo(b, 0);
        setOn(b, false);
      }
    });
  };
  var layout = function () {
    var want = reduce ? 'still' : window.innerWidth >= 900 && window.innerHeight >= 560 ? 'pinned' : 'stacked', H = window.innerHeight;
    if (want !== mode) {
      mode = want;
      ['pinned', 'stacked', 'still'].forEach(function (m) { sec.classList.toggle('flow-' + m, m === mode); });
      STEPS.forEach(function (st) {
        st.li.classList.remove('cur', 'past');
        st.beats.forEach(function (b) {
          cancelAnimationFrame(b.timer); b.timer = 0;
          if (b.type) typeTo(b, mode === 'still' ? b.text.length : 0);
          setOn(b, mode === 'still');
        });
        if (st.follow) st.follow.inner.style.transform = '';
      });
    }
    track.style.height = '';
    if (mode === 'pinned') {
      var y = docTop(track) - navH();
      track.style.height = Math.round(STEPS.reduce(function (a, st) { return a + st.span; }, 0) * H + H - navH()) + 'px';
      geo = STEPS.map(function (st) { var g = { start: Math.round(y), len: st.span * H }; y += g.len; return g; });
    }
    STEPS.forEach(function (st) { if (st.lay) st.lay(); });
    if (mode === 'pinned') tick(); else if (mode === 'stacked') stack();
  };
  rail.forEach(function (b, k) { b.addEventListener('click', function () { if (mode === 'pinned') window.scrollTo(0, geo[k].start + 2); }); });

  // for the browser gate: the mode, the step on the stage, where each step begins and ends on the page's scroll
  sec.flowState = function () {
    var H = window.innerHeight, nav = navH(), steps = STEPS.map(function (st, k) {
      if (mode === 'pinned') return { key: st.key, start: geo[k].start, end: Math.round(geo[k].start + geo[k].len * 0.9) };
      var top = docTop(st.li) - nav - 8;
      return { key: st.key, start: Math.round(top), end: Math.round(Math.max(top, docTop(st.li) + st.li.offsetHeight - H * 0.86)) };
    });
    return { mode: mode, steps: steps, active: mode === 'pinned' ? active : steps.reduce(function (a, s, k) { return window.scrollY >= s.start - H * 0.3 ? k : a; }, 0) };
  };
  var resizeT = 0;
  window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(layout, 120); });
  window.addEventListener('scroll', function () { if (!frame && mode !== 'still') frame = requestAnimationFrame(mode === 'pinned' ? tick : stack); }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  layout();
  sec.classList.add('flow-on');
})();
