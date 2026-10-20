/* Shoalcheck — the film: one finding, followed from the reading to the next reading, then the rest of what a
   reading does. Not a recording: the page draws it from the product's own output, held equal by gates —
   #hero-reading and #caps-data (the sample reading), #film-data (the finding, the ticket `ticket push` builds, the
   patch, the reading after it), #film-mcp (shoalcheck-mcp's answers to the agent's calls), #film-ci (what
   `shoalcheck gate` printed over a pull request). The scroll is the timeline: a camera moves over one large drawing,
   and every figure in it is the sample's. Without this script the chapters below still read, as text. */
(function () {
  'use strict';
  var sec = document.getElementById('flow');
  if (!sec || !window.requestAnimationFrame) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var read = function (id) { var e = document.getElementById(id); try { return e ? JSON.parse(e.textContent) : null; } catch (x) { return null; } };
  var H = read('hero-reading'), D = read('film-data'), M = read('film-mcp'), CI = read('film-ci'), C = read('caps-data');
  if (!H || !D || !D.finding || !M || !M.length || !CI || !CI.out || !C) return;
  var stage = $('#film-stage'), world = $('#film-world'), sky = $('#film-sky');
  if (!stage || !world) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var F = D.finding, LIST = M[0].answer, EXPL = M[1].answer, DIFF = M[2].answer;
  // WHERE EACH TEAM WORKS is the visitor's own instruction to the agent in this illustration — not product output.
  // The teams are the reading's owner buckets; the trackers are what someone would tell their agent.
  var ROUTE = { 'core-api': 'Jira · CORE', payments: 'Linear · PAY', data: 'Linear · DATA', sre: 'Jira · SRE' };
  var routeOf = function (key) { return ROUTE[key] || ('Linear · ' + key.slice(0, 4).toUpperCase()); };

  /* ── small things ────────────────────────────────────────────────────── */
  var el = function (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  };
  var add = function (p, c) { p.appendChild(c); return c; };
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var ease = function (u) { return u * u * u * (u * (u * 6 - 15) + 10); };
  var usd = function (n) { return (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US'); };
  var cents = function (n) { return (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var num = function (n) { return Number(n).toLocaleString('en-US'); };
  var hhmm = function (iso) { return iso.slice(11, 16) + ' UTC'; };
  var SEV = ['critical', 'high', 'medium', 'low', 'info'];

  /* ── the facts the chapters print, each from the product ─────────────── */
  var groups = LIST.groups.slice();
  var unowned = groups.filter(function (g) { return g.key.charAt(0) === '('; })[0];
  var teams = groups.filter(function (g) { return g.key.charAt(0) !== '('; });
  var crit = C.security.chains.filter(function (c) { return c[3] === 'critical'; }).length;
  var ciNew = CI.out.filter(function (l) { return /^\s+\+ /.test(l); }).map(function (l) { return l.replace(/^\s+\+\s+\S+\s+/, '').replace(/\s+\(.*\)$/, ''); });
  var FACT = {
    cluster: D.cluster, objects: num(H.objects), kinds: num(LIST.reading.kindsRead), rules: num(H.rules), checks: num(H.checks),
    total: num(LIST.envelope.total), title: F.title, usd: usd(F.usd), owner: F.owner,
    cpuFrom: F.change[0][1], cpuTo: F.change[0][2], memFrom: F.change[1][1], memTo: F.change[1][2],
    teams: num(teams.length), unowned: unowned ? num(unowned.count) : '0',
    gone: num(D.after.gone), added: num(D.after.new), ne: num(D.after.notEvaluated), less: usd(-D.after.delta),
    usdBefore: usd(D.after.usd[0]), usdAfter: usd(D.after.usd[1]),
    ciNew: ciNew[0] || '', ciExit: num(CI.exit),
    money: usd(C.money.total), moneyRules: num(C.money.rules.length),
    grants: num(C.security.chains.length), crit: num(crit),
    node: C.preflight.cmd.split(' ').pop(), pfExit: num(C.preflight.exit)
  };
  $$('[data-f]', sec).forEach(function (s) { var k = s.getAttribute('data-f'); if (FACT[k] !== undefined) s.textContent = FACT[k]; });

  /* ── the drawing ──────────────────────────────────────────────────────
     One world, laid out in world pixels at the size its text is set for (22 px body). The camera never scales it
     past 1, so every word is drawn at least as large as it is set: zooming in is the camera arriving at a size,
     not a bitmap being blown up. */
  var P = {};
  var panel = function (key, x, y, w, h, title, sub) {
    var p = el('section', 'fp fp-' + key);
    p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.width = w + 'px'; p.style.height = h + 'px';
    var bar = add(p, el('div', 'fp-bar'));
    add(bar, el('i', 'fp-dots'));
    add(bar, el('b', 'fp-title', title));
    if (sub) add(bar, el('span', 'fp-sub', sub));
    var body = add(p, el('div', 'fp-body'));
    world.appendChild(p);
    P[key] = { el: p, body: body, x: x, y: y, w: w, h: h, d: [x, y, w, h] };
    return body;
  };
  var tracks = [];
  // A track is one thing that happens in one chapter: k runs 0 → 1 across [t0, t1] of that chapter's scroll, and
  // stays at 1 after it — so scrolling back plays it backwards, and a reader who jumps to a chapter sees it whole.
  var track = function (ch, t0, t1, set) { tracks.push({ ch: ch, t0: t0, t1: t1, set: set, last: -1 }); };
  var shown = function (node, ch, t0, t1, cls) {
    track(ch, t0, t1 === undefined ? t0 + 0.12 : t1, function (k) { node.classList.toggle(cls || 'on', k > 0.5); });
  };
  // Typed text sits over an invisible copy of the whole of it, so a line that wraps as it is typed never grows the
  // panel under the camera.
  var typer = function (parent, cls, text, ch, t0, t1) {
    var box = add(parent, el('span', 'tw-box ' + (cls || '')));
    add(box, el('span', 'tw-ghost', text));
    var typed = add(box, el('span', 'tw', ''));
    track(ch, t0, t1, function (k) { typed.textContent = text.slice(0, Math.round(text.length * k)); });
    return box;
  };
  var count = function (node, ch, t0, t1, to, fmt) {
    track(ch, t0, t1, function (k) { node.textContent = k >= 1 ? fmt(to) : k <= 0 ? '' : fmt(Math.round(to * ease(k))); });
  };

  /* R · the reading */
  var R = panel('r', 0, 0, 1180, 820, D.cluster, H.where.replace(/ · k8s .*/, '') + ' · Illustrative sample');
  var rTop = add(R, el('div', 'r-top'));
  [['objects', H.objects], ['kinds read', LIST.reading.kindsRead], ['rules', H.rules], ['checks', H.checks]].forEach(function (c, i) {
    var b = add(rTop, el('div', 'r-n'));
    var v = add(b, el('b'));
    add(b, el('span', '', c[0]));
    count(v, 0, 0.18 + i * 0.06, 0.55 + i * 0.06, c[1], num);
  });
  var rMid = add(R, el('div', 'r-mid'));
  // The grid is the opening's: a row per category, a column per severity, each cell the reading's count.
  var rGrid = add(rMid, el('div', 'r-grid'));
  add(rGrid, el('span', 'r-gh'));
  SEV.forEach(function (sv) { add(rGrid, el('span', 'r-gh', sv)); });
  var cell = {};
  H.cats.forEach(function (cat, ci) {
    add(rGrid, el('span', 'r-gs', cat));
    (H.grid[ci] || []).forEach(function (n, si) {
      var c = add(rGrid, el('span', 'r-gc' + (n ? '' : ' zero'), ''));
      cell[cat + ':' + SEV[si]] = c;
      var at = (ci * 5 + si) * 0.012;
      track(0, 0.3 + at, 0.42 + at, function (k) {
        c.textContent = k >= 1 ? n : k <= 0 ? '' : Math.round(n * k);
        c.classList.toggle('on', k > 0);
      });
    });
  });
  var rSum = add(rMid, el('div', 'r-sum'));
  var rUsd = add(rSum, el('b', 'r-usd'));
  add(rSum, el('span', '', 'a month identified, at list price'));
  var rTot = add(rSum, el('b', 'r-tot'));
  add(rSum, el('span', '', 'findings'));
  count(rUsd, 0, 0.55, 0.85, H.dollars, function (v) { return usd(v); });
  count(rTot, 0, 0.45, 0.8, H.total, num);
  var rList = add(R, el('ol', 'r-list'));
  add(rList, el('li', 'r-lh', 'Money findings, largest first'));
  var featRow = null;
  D.rows.forEach(function (r, i) {
    var li = add(rList, el('li', 'r-row'));
    add(li, el('i', 'sev s-' + r[0]));
    add(li, el('span', 'r-title', r[1]));
    add(li, el('b', 'r-usd2', usd(r[2])));
    shown(li, 1, 0.08 + i * 0.03);
    if (r[3]) featRow = li;
  });
  if (featRow) shown(featRow, 1, 0.28, 0.36, 'hit');
  track(1, 0.05, 0.2, function (k) {
    var c = cell[F.category + ':' + F.severity];
    if (c) c.classList.toggle('hit', k > 0.5);
  });

  /* F · the finding */
  var Fb = panel('f', 1300, 0, 1180, 820, 'Finding ' + F.id, F.resource);
  var fChips = add(Fb, el('div', 'f-chips'));
  add(fChips, el('span', 'chip sev-chip s-' + F.severity, F.severity));
  add(fChips, el('span', 'chip', F.category));
  add(fChips, el('span', 'chip own', 'team · ' + F.owner));
  add(Fb, el('h4', 'f-title', F.title));
  var fMoney = add(Fb, el('div', 'f-money'));
  var fUsd = add(fMoney, el('b'));
  add(fMoney, el('span', '', 'a month, at list price — an upper bound'));
  count(fUsd, 1, 0.62, 0.86, F.usd, function (v) { return usd(v); });
  var fEv = add(Fb, el('div', 'f-ev'));
  add(fEv, el('span', 'f-k', 'Evidence it read'));
  F.evidence.forEach(function (e, i) { shown(add(fEv, el('p', 'mono', e)), 1, 0.66 + i * 0.06); });
  var fRest = add(Fb, el('div', 'f-rest'));
  add(fRest, el('span', 'f-k', 'Rests on'));
  F.kinds.forEach(function (k, i) { shown(add(fRest, el('span', 'chip kind', k)), 1, 0.7 + i * 0.02); });
  shown(add(fRest, el('span', 'chip kind use', 'usage · ' + F.usage)), 1, 0.8);
  shown(add(Fb, el('p', 'f-bound', F.boundary)), 1, 0.86);

  /* T · the ticket */
  var Tb = panel('t', 2600, 0, 1180, 820, routeOf(F.owner), 'a new issue, filed once');
  var tCmd = add(Tb, el('p', 'term-line'));
  add(tCmd, el('span', 'pr', '$ '));
  typer(tCmd, '', 'shoalcheck ticket push --from reading.json --tracker linear --project ' + routeOf(F.owner).split(' · ')[1] + ' --finding ' + F.id, 2, 0.02, 0.32);
  var issue = add(Tb, el('div', 'issue'));
  shown(issue, 2, 0.4, 0.5);
  add(issue, el('h4', 'issue-t', D.ticket.title));
  D.ticket.lines.forEach(function (l) { add(issue, el('p', 'issue-p', l.replace(/`/g, ''))); });
  var tbl = add(issue, el('dl', 'issue-tbl'));
  D.ticket.table.forEach(function (r, i) {
    var row = add(tbl, el('div', 'it-row'));
    add(row, el('dt', '', r[0]));
    add(row, el('dd', '', r[1]));
    shown(row, 2, 0.5 + i * 0.03);
  });
  var iev = add(issue, el('div', 'issue-sec'));
  add(iev, el('b', '', 'Evidence read from the cluster'));
  add(iev, el('p', 'mono', F.evidence[0]));
  shown(iev, 2, 0.66);
  var iman = add(issue, el('div', 'issue-sec'));
  add(iman, el('b', '', 'Manifest from the rule, verbatim'));
  add(iman, el('pre', 'mono', F.yaml.replace(/\n$/, '').split('\n').slice(-4).join('\n')));
  shown(iman, 2, 0.72);
  var mark = add(issue, el('p', 'issue-mark mono', D.ticket.marker));
  shown(mark, 2, 0.8);

  /* A · the agent, over MCP */
  var Ab = panel('a', 0, 940, 1180, 980, 'Your agent · MCP', 'Claude, Cursor or any MCP client, with shoalcheck-mcp');
  var ask = add(Ab, el('div', 'a-msg you'));
  add(ask, el('span', 'a-who', 'You'));
  var routeLine = teams.map(function (g) { return g.key + ' → ' + routeOf(g.key); });
  var askText = 'File every finding in the tracker of the team that owns it — ' + routeLine.join(' · ') +
    (unowned ? ' · anything unowned → Linear PLAT for triage.' : '.');
  typer(add(ask, el('p')), '', askText, 3, 0.02, 0.22);
  var callBox = function (ch, t, call, lines) {
    var b = add(Ab, el('div', 'a-call'));
    var h = add(b, el('p', 'a-tool'));
    add(h, el('span', 'a-fn', 'shoalcheck · ' + call.tool));
    add(h, el('span', 'a-args mono', JSON.stringify(call.args)));
    var pre = add(b, el('pre', 'a-json mono'));
    lines.forEach(function (l, i) { shown(add(pre, el('span', '', l)), ch, t + 0.06 + i * 0.012); });
    shown(b, ch, t);
    return b;
  };
  var listLines = ['{ "groupBy": "owner", "groups": ['];
  groups.forEach(function (g) {
    listLines.push('    { "key": ' + JSON.stringify(g.key) + ', "count": ' + g.count + ', "dollars": ' + g.dollars.toFixed(2) + ' },');
  });
  listLines.push('  ], "envelope": { "total": ' + LIST.envelope.total + ', "totalDollars": ' + LIST.envelope.totalDollars.toFixed(2) + ' } }');
  callBox(3, 0.26, M[0], listLines);
  var ef = EXPL.finding;
  callBox(3, 0.55, M[1], ['{ "finding": { "id": ' + JSON.stringify(ef.id) + ', "owner": ' + JSON.stringify(ef.owner) + ',',
    '    "title": ' + JSON.stringify(ef.title) + ',',
    '    "dollarImpactMonthly": ' + ef.dollarImpactMonthly.toFixed(2) + ', "priceBasis": ' + JSON.stringify(ef.priceBasis) + ', "confidence": ' + ef.confidence + ' } }']);
  var said = add(Ab, el('div', 'a-msg agent'));
  add(said, el('span', 'a-who', 'Agent'));
  add(said, el('p', '', 'Filing ' + teams.map(function (g) { return g.count + ' for ' + g.key + ' (' + routeOf(g.key) + ')'; }).join(', ') +
    (unowned ? ', and ' + unowned.count + ' with no owner to PLAT triage.' : '.')));
  shown(said, 3, 0.7);
  add(Ab, el('p', 'a-note', 'The agent’s words are an illustration. Its tool calls and their answers are shoalcheck-mcp’s, over the sample — trimmed, never changed.'));

  /* B · every team's share */
  var Bb = panel('b', 1300, 940, 1900, 980, 'Your teams’ trackers', 'one ticket per finding, where each team works');
  var cols = add(Bb, el('div', 'b-cols'));
  var lanes = teams.concat(unowned ? [unowned] : []);
  var featCol = null;
  lanes.forEach(function (g, i) {
    var col = add(cols, el('div', 'b-col' + (g === unowned ? ' triage' : '')));
    if (g.key === F.owner) featCol = col;
    var head = add(col, el('div', 'b-head'));
    add(head, el('b', '', g === unowned ? 'no owner' : g.key));
    add(head, el('span', 'b-where', g === unowned ? 'Linear · PLAT triage' : routeOf(g.key)));
    var n = add(head, el('span', 'b-n'));
    count(n, 4, 0.2 + i * 0.05, 0.6 + i * 0.05, g.count, function (v) { return num(v) + ' tickets · ' + usd(g.dollars * Math.min(1, v / g.count)) + '/mo'; });
    var cards = add(col, el('div', 'b-cards'));
    var shownCards = Math.min(g.count, 5);
    for (var c = 0; c < shownCards; c++) {
      var feat = g.key === F.owner && c === 0;
      var card = add(cards, el('div', 'b-card' + (feat ? ' feat' : '')));
      if (feat) {
        add(card, el('span', 'b-ct', D.ticket.title));
      } else {
        add(card, el('i', 'b-sk'));
        add(card, el('i', 'b-sk short'));
      }
      shown(card, 4, 0.22 + i * 0.05 + c * 0.04);
    }
    if (g.count > shownCards) shown(add(cards, el('p', 'b-more', '+ ' + num(g.count - shownCards) + ' more')), 4, 0.6 + i * 0.04);
  });
  add(Bb, el('p', 'b-note', 'Counts and dollars are list_findings’ own buckets. Each card stands for one finding’s ticket; only the one this film follows is named.'));

  /* X · the fix */
  var Xb = panel('x', 0, 2040, 1180, 820, 'The finding’s own patch', 'remediation safety · ' + F.safety);
  var diff = add(Xb, el('pre', 'x-diff mono'));
  var yl = F.yaml.replace(/\n$/, '').split('\n');
  yl.forEach(function (line, i) {
    var m = /^(\s*)(cpu|memory):\s*(\S+)(.*)$/.exec(line);
    if (m) {
      var ch = F.change.filter(function (c) { return c[0] === m[2]; })[0];
      var old = add(diff, el('span', 'x-del', '-' + m[1].slice(1) + m[2] + ': ' + ch[1]));
      var neu = add(diff, el('span', 'x-add', '+' + m[1].slice(1) + m[2] + ': ' + m[3] + m[4]));
      shown(old, 5, 0.3 + i * 0.02);
      shown(neu, 5, 0.45 + i * 0.02);
    } else {
      shown(add(diff, el('span', 'x-ctx', ' ' + line)), 5, 0.1 + i * 0.015);
    }
  });
  shown(add(Xb, el('p', 'x-note', 'Applying it: ' + F.applying + ' Your team reviews it and applies it — Shoalcheck writes nothing to the cluster.')), 5, 0.7);

  /* G · read again */
  var Gb = panel('g', 1300, 2040, 1180, 820, 'diff_readings', 'the sample, read again an hour after the patch');
  var gCols = add(Gb, el('div', 'g-cols'));
  [['before the patch', D.readingAt, D.after.findings[0], D.after.usd[0]], ['an hour later', D.after.at, D.after.findings[1], D.after.usd[1]]].forEach(function (r, i) {
    var c = add(gCols, el('div', 'g-col' + (i ? ' after' : '')));
    add(c, el('span', 'g-when', r[0] + ' · ' + hhmm(r[1])));
    add(c, el('b', 'g-n', num(r[2])));
    add(c, el('span', 'g-l', 'findings'));
    add(c, el('b', 'g-usd', usd(r[3])));
    add(c, el('span', 'g-l', 'a month identified'));
    if (i) shown(c, 6, 0.3);
  });
  var gRow = add(Gb, el('div', 'g-row'));
  add(gRow, el('i', 'sev s-' + F.severity));
  add(gRow, el('span', 'g-rt', F.title));
  var gStamp = add(gRow, el('b', 'g-stamp', 'no longer in the set'));
  shown(gRow, 6, 0.42, 0.52, 'gone');
  shown(gStamp, 6, 0.48);
  var dd = DIFF.diff;
  var gBadges = add(Gb, el('div', 'g-badges'));
  [[dd.noLongerInSetCount, 'no longer in the set'], [dd.newCount, 'new'], [dd.notEvaluatedCount, 'not evaluated'], [cents(dd.savingsDelta), 'a month, identified']].forEach(function (b, i) {
    var x = add(gBadges, el('span', 'g-b'));
    add(x, el('b', '', typeof b[0] === 'number' ? num(b[0]) : b[0]));
    add(x, el('span', '', b[1]));
    shown(x, 6, 0.56 + i * 0.05);
  });
  shown(add(Gb, el('p', 'g-note', 'A finding that disappears is counted as missing, never as dealt with: two readings an hour apart cannot see why it went.')), 6, 0.8);

  /* C · CI */
  var Cb = panel('c', 2600, 2040, 1180, 820, 'Pull request · payments: ledger exporter', 'checks');
  var pr = add(Cb, el('pre', 'c-pr mono'));
  ['+ apiVersion: rbac.authorization.k8s.io/v1', '+ kind: ClusterRoleBinding', '+ metadata: { name: ledger-exporter-admin }',
    '+ roleRef: { kind: ClusterRole, name: cluster-admin }', '+ subjects: [{ kind: ServiceAccount, namespace: payments, name: ledger-exporter }]'].forEach(function (l, i) {
    shown(add(pr, el('span', '', l)), 7, 0.05 + i * 0.03);
  });
  var term = add(Cb, el('pre', 'c-term mono'));
  typer(term, 'c-cmd', '$ ' + CI.cmd, 7, 0.22, 0.4);
  CI.out.forEach(function (l, i) {
    var s = add(term, el('span', /^\s+\+ /.test(l) ? 'c-new' : /policy fired|^\s+· /.test(l) ? 'c-bad' : '', l || ' '));
    shown(s, 7, 0.44 + i * 0.03);
  });
  var check = add(Cb, el('div', 'c-check'));
  add(check, el('i'));
  add(check, el('b', '', 'shoalcheck gate'));
  add(check, el('span', '', 'failed · exit ' + CI.exit + ' · the policy fired'));
  shown(check, 7, 0.7);

  /* M · money */
  var Mb = panel('m', 0, 2980, 1180, 580, 'Money', 'every dollar with its rate');
  var mMax = Math.max.apply(null, C.money.rules.map(function (r) { return r[1]; }));
  C.money.rules.forEach(function (r, i) {
    var row = add(Mb, el('div', 'm-row'));
    add(row, el('span', 'm-l', r[0] + ' · ' + r[2] + (r[2] === 1 ? ' finding' : ' findings')));
    var bar = add(row, el('span', 'm-bar'));
    var fill = add(bar, el('i'));
    add(row, el('b', 'm-v', usd(r[1])));
    track(8, 0.1 + i * 0.07, 0.4 + i * 0.07, function (k) { fill.style.transform = 'scaleX(' + (ease(k) * r[1] / mMax) + ')'; });
  });
  var mTot = add(Mb, el('p', 'm-tot'));
  add(mTot, el('b', '', usd(C.money.total) + ' a month identified'));
  add(mTot, el('span', '', 'each row rounded on its own; dated list prices and a week of the cluster’s own usage'));
  shown(mTot, 8, 0.72);

  /* S · reach */
  var Sb = panel('s', 1300, 2980, 1180, 580, 'Who can reach what', 'subject → binding → role');
  C.security.chains.forEach(function (c, i) {
    var row = add(Sb, el('div', 's-row s-' + c[3]));
    add(row, el('span', 's-sub mono', c[0]));
    add(row, el('i', 's-arr'));
    add(row, el('span', 's-bind mono', c[1]));
    add(row, el('i', 's-arr'));
    add(row, el('b', 's-role mono', c[2]));
    shown(row, 9, 0.12 + i * 0.07);
  });

  /* P · before a change */
  var Pb = panel('p', 2600, 2980, 1180, 580, 'Before a change', 'free on every plan');
  var pTerm = add(Pb, el('pre', 'c-term mono'));
  typer(pTerm, 'c-cmd', '$ ' + C.preflight.cmd, 10, 0.1, 0.3);
  shown(add(pTerm, el('span', 'c-bad', C.preflight.head)), 10, 0.38);
  shown(add(pTerm, el('span', '', '  ' + C.preflight.why)), 10, 0.46);
  shown(add(pTerm, el('span', 'c-exit', 'exit ' + C.preflight.exit)), 10, 0.56);

  /* The connectors: what flows from one panel to the next, drawn as the film reaches it. */
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'film-links');
  svg.setAttribute('width', '3780'); svg.setAttribute('height', '3560');
  world.insertBefore(svg, world.firstChild);
  var link = function (ch, t0, t1, d) {
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
    var len = 0;
    track(ch, t0, t1, function (k) {
      if (!len) { len = p.getTotalLength(); p.style.strokeDasharray = len + ' ' + len; }
      p.style.strokeDashoffset = String(len * (1 - ease(k)));
      p.classList.toggle('on', k > 0);
    });
  };
  link(1, 0.4, 0.62, 'M1180 560 C1240 560 1240 410 1300 410');
  link(2, 0.0, 0.3, 'M2480 410 C2540 410 2540 410 2600 410');
  link(4, 0.0, 0.25, 'M1180 1430 C1240 1430 1240 1430 1300 1430');
  link(4, 0.3, 0.6, 'M3190 820 C3190 880 2560 860 2560 990');
  link(5, 0.0, 0.25, 'M2250 1920 C2250 1990 590 1970 590 2040');
  link(6, 0.0, 0.25, 'M1180 2450 C1240 2450 1240 2450 1300 2450');

  /* ── the camera ───────────────────────────────────────────────────────
     Smooth zooming and panning after van Wijk and Nuij (2003): between two views the camera rises as far as the
     distance needs and comes down onto the next, the path a person's eye can follow. Views are [centre x, centre
     y, width of world shown]. */
  var RHO = Math.SQRT2;
  var zoomPath = function (a, b) {
    var ux0 = a[0], uy0 = a[1], w0 = a[2], ux1 = b[0], uy1 = b[1], w1 = b[2];
    var dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy;
    if (d2 < 1e-12) {
      var S0 = Math.log(w1 / w0) / RHO;
      return function (t) { return [ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(RHO * t * S0)]; };
    }
    var d1 = Math.sqrt(d2);
    var b0 = (w1 * w1 - w0 * w0 + 4 * d2) / (2 * w0 * 2 * d1), b1 = (w1 * w1 - w0 * w0 - 4 * d2) / (2 * w1 * 2 * d1);
    var r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
    var S = (r1 - r0) / RHO;
    var cosh = function (x) { return ((x = Math.exp(x)) + 1 / x) / 2; };
    var sinh = function (x) { return ((x = Math.exp(x)) - 1 / x) / 2; };
    var tanh = function (x) { return ((x = Math.exp(2 * x)) - 1) / (x + 1); };
    return function (t) {
      var s = t * S, c0 = cosh(r0), u = w0 / (2 * d1) * (c0 * tanh(RHO * s + r0) - sinh(r0));
      return [ux0 + u * dx, uy0 + u * dy, w0 * c0 / cosh(RHO * s + r0)];
    };
  };
  // Each chapter's shots: [local time it arrives, what it frames]. What it frames is a panel, an element in one, or
  // the whole world — read off the laid-out drawing, so the same story frames itself on a desk and on a phone.
  var SHOTS = [
    [[0, '*'], [0.42, 'r']],
    [[0.3, rList], [0.72, 'f']],
    [[0.42, 't']],
    [[0.42, 'a']],
    [[0.3, 'b'], [0.72, 'feat']],
    [[0.42, 'x']],
    [[0.42, 'g']],
    [[0.42, 'c']],
    [[0.42, 'm']],
    [[0.42, 's']],
    [[0.42, 'p']],
    [[0.5, '*']]
  ];
  var N = SHOTS.length;
  var narrow = false, sw = 1, sh = 1, frames = [];
  var view = function (r) { // the [cx, cy, w] that fits rect r in the stage, with air, never past scale 1
    // On a desk the whole rect fits the stage. On a phone it fits its WIDTH and a tall one shows its top: the
    // condition that was meant to say so compared the height with a width already raised to fit that height,
    // so it never held, and a tall panel shrank to fit the screen (D60).
    // On a phone a panel that is nearly the stage's height (up to 1.2× what its width allows) fits whole, with 4% more
    // air so the hold's slow push-in (3.5%) never carries it past the edge — at 0.43 of its size or more, body text 11 px
    // or more; a taller one fits its width and shows its top. The stage there is short (about 350 × 390).
    var pad = 1.08, fitW = Math.max(r[2] * pad, sw), fitH = r[3] * pad * sw / sh;
    var w = !narrow ? Math.max(fitW, fitH) : fitH <= fitW * 1.2 ? Math.max(fitW, fitH * 1.04) : fitW;
    var vh = w * sh / sw, cy = r[1] + r[3] / 2;
    if (r[3] * pad > vh) cy = r[1] + vh / 2 - vh * 0.03; // …and shows its top, where its title is
    return [r[0] + r[2] / 2, cy, w];
  };
  // A shot may name an element instead of a rect: its box in world pixels, read when the stage is laid out.
  var boxOf = function (node) {
    var x = 0, y = 0, n = node;
    while (n && n !== world) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return [x - 30, y - 30, node.offsetWidth + 60, node.offsetHeight + 60];
  };
  // ON A PHONE THERE IS NO WHOLE-WORLD SHOT (D60, the founder from a phone: "з телефона жахливий вигляд"). The
  // drawing is one column of eleven panels there, and the whole of it on a phone's screen is thumbnails nobody can
  // read. The film opens on the reading and closes on it, so on a phone such a shot is the reading's panel.
  var namedNear = function () { return 'r'; };
  var worldW = 3780, worldH = 3560;
  var shot = function (r) {
    if (r === '*') return [0, 0, worldW, worldH];
    if (r === 'feat') return boxOf(featCol || P.b.el);
    if (typeof r === 'string') { var p = P[r]; return [p.x, p.y, p.w, p.h]; }
    return boxOf(r);
  };
  // ON A PHONE THE DRAWING IS A COLUMN: each panel at a width a phone can read once the camera fits it, stacked in
  // the film's order, and the camera travels down it. On a desk it is the map above, with its connectors.
  var ORDER = ['r', 'f', 't', 'a', 'b', 'x', 'g', 'c', 'm', 's', 'p'];
  var place = function () {
    sec.classList.toggle('film-narrow', narrow);
    var y = 0;
    ORDER.forEach(function (k) {
      var p = P[k], e = p.el;
      if (narrow) {
        e.style.left = '0px'; e.style.top = y + 'px'; e.style.width = ''; e.style.height = '';
        p.x = 0; p.y = y; p.w = e.offsetWidth; p.h = e.offsetHeight;
        y += p.h + 90;
      } else {
        e.style.left = p.d[0] + 'px'; e.style.top = p.d[1] + 'px'; e.style.width = p.d[2] + 'px'; e.style.height = p.d[3] + 'px';
        p.x = p.d[0]; p.y = p.d[1]; p.w = p.d[2]; p.h = p.d[3];
      }
    });
    worldW = narrow ? P.r.w : 3780; worldH = narrow ? y - 90 : 3560;
    world.style.width = worldW + 'px'; world.style.height = worldH + 'px';
  };
  var layout = function () {
    sw = stage.clientWidth; sh = stage.clientHeight;
    narrow = sw < 620;
    place();
    frames = [];
    SHOTS.forEach(function (shots, ch) {
      shots.forEach(function (s, i) {
        var r = shot(narrow && s[1] === '*' ? namedNear() : s[1]);
        frames.push({ g: ch + s[0], v: view(r) });
        if (i === shots.length - 1 && ch < N - 1) frames.push({ g: ch + 1, v: view(r), hold: true });
      });
    });
  };
  var camAt = function (g) {
    if (g <= frames[0].g) return frames[0].v;
    for (var i = 1; i < frames.length; i++) {
      var a = frames[i - 1], b = frames[i];
      if (g <= b.g) {
        var u = (g - a.g) / (b.g - a.g || 1);
        if (b.hold) { // holding a shot: a slow push-in, so the frame is never dead
          var v = a.v; return [v[0], v[1], v[2] * (1 - 0.035 * u)];
        }
        var from = a.hold ? [a.v[0], a.v[1], a.v[2] * (1 - 0.035)] : a.v;
        // On a phone the camera pans at the panels' one width rather than rising between them: the scroll is the
        // timeline, so wherever a thumb stops is a frame someone reads, and a rise drew it at a third of its size.
        if (narrow) { var e = ease(u); return [from[0] + (b.v[0] - from[0]) * e, from[1] + (b.v[1] - from[1]) * e, from[2] + (b.v[2] - from[2]) * e]; }
        return zoomPath(from, b.v)(ease(u));
      }
    }
    return frames[frames.length - 1].v;
  };
  // THE LIGHT FOLLOWS THE CAMERA: the panel under the centre of the view is lit, and a view wide enough to hold
  // several panels lights them all.
  var lit = '';
  var focus = function (v) {
    var key = v[2] > (narrow ? worldW * 1.6 : 2600) || v[2] * sh / sw > (narrow ? worldH * 0.5 : 1e9) ? '*' : '';
    if (!key) Object.keys(P).forEach(function (k) { var p = P[k]; if (v[0] >= p.x && v[0] <= p.x + p.w && v[1] >= p.y && v[1] <= p.y + p.h) key = k; });
    if (key === lit) return;
    lit = key;
    Object.keys(P).forEach(function (k) { P[k].el.classList.toggle('focus', key === '*' || key === k); });
  };
  var applyCam = function (v) {
    focus(v);
    var s = sw / v[2], tx = sw / 2 - v[0] * s, ty = sh / 2 - v[1] * s;
    world.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + s.toFixed(5) + ')';
    if (sky) sky.style.transform = 'translate(' + (tx * 0.35).toFixed(1) + 'px,' + (ty * 0.35).toFixed(1) + 'px)';
    world.setAttribute('data-scale', s.toFixed(3));
  };

  /* ── the chapters' copy and rail ─────────────────────────────────────── */
  var steps = $$('#film-steps > li'), rail = $$('#film-rail button');
  var active = -1;
  var setChapter = function (c) {
    if (c === active) return;
    active = c;
    steps.forEach(function (li, i) { li.classList.toggle('on', i === c); });
    rail.forEach(function (b, i) { b.setAttribute('aria-current', i === c ? 'step' : 'false'); b.classList.toggle('done', i < c); });
    sec.setAttribute('data-chapter', String(c));
  };

  /* ── the timeline ────────────────────────────────────────────────────── */
  var gNow = 0, gWant = 0, raf = 0, lastT = 0, idle = 0;
  var paint = function (g) {
    applyCam(camAt(g));
    for (var i = 0; i < tracks.length; i++) {
      var t = tracks[i], k = clamp((g - t.ch - t.t0) / ((t.t1 - t.t0) || 1e-6), 0, 1);
      if (k !== t.last) { t.last = k; t.set(k); }
    }
    setChapter(Math.min(N - 1, Math.floor(g)));
  };
  var want = function () {
    var r = sec.getBoundingClientRect(), span = sec.offsetHeight - window.innerHeight;
    var p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
    var g = p * N;
    if (reduce) g = Math.min(N - 1, Math.floor(g)) + 0.999; // a still of each chapter, whole
    return Math.min(g, N - 0.001);
  };
  var frame = function (t) {
    var dt = Math.min(64, t - (lastT || t)); lastT = t;
    gNow += (gWant - gNow) * (1 - Math.exp(-dt / 140));
    if (Math.abs(gWant - gNow) < 0.0008) gNow = gWant;
    paint(gNow);
    if (gNow !== gWant) { raf = requestAnimationFrame(frame); world.classList.add('moving'); clearTimeout(idle); }
    else { raf = 0; lastT = 0; idle = setTimeout(function () { world.classList.remove('moving'); }, 180); }
  };
  var onScroll = function () {
    gWant = want();
    if (reduce) { gNow = gWant; paint(gNow); return; }
    if (!raf) raf = requestAnimationFrame(frame);
  };
  rail.forEach(function (b, i) {
    b.addEventListener('click', function () {
      var span = sec.offsetHeight - window.innerHeight;
      window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY + span * (i + 0.6) / N, behavior: reduce ? 'auto' : 'smooth' });
    });
  });
  var size = function () { sec.style.setProperty('--film-n', String(N)); layout(); gWant = want(); gNow = gWant; paint(gNow); };
  sec.classList.add('film-on');
  size();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', size);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
  // For the gate: where each chapter's panel is, and what the film says the chapter is.
  sec.filmState = function () { return { chapter: active, n: N, g: gNow }; };
})();
