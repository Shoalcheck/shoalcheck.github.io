// The flow, as a product film tells it: one window held on the screen while the page scrolls, and inside it the three
// real interfaces in turn — the terminal, a Claude Code session over shoalcheck-mcp that hands each team a Linear
// ticket, and GitHub's pull request closing on the reading taken again.
//
// THE SCROLL IS THE PLAYHEAD. The section is tall; its window is pinned (position: sticky) while the reader scrolls
// through it, and every part of every screen has its own point of the scroll at which it arrives — and leaves again on
// the way back, as on a product page. Nothing here runs on a timer.
//
// EVERY LINE IS THE CAPTURE'S OWN. Each screen is built from #flow-data (testdata/site/flow.json: the CLI's output, the
// session's prompt, calls and answer, the ticket payloads), #gate-demo (GitHub's record of a real pull request) and
// #film-mcp (shoalcheck-mcp's own answers). A screen may show less than was captured — trimmed, and it says so —
// never other words. A table row is the captured line cut at its own columns.
//
// Reduced motion, or no IntersectionObserver: nothing is pinned, each step is drawn whole under its words.
(function () {
  'use strict';
  // built after the first paint: the flow is far below the fold, and the opening's headline must not wait for it
  var go = function () {
  var sec = document.getElementById('flow');
  if (!sec) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var data = function (id) { var n = document.getElementById(id); try { return n ? JSON.parse(n.textContent) : null; } catch (e) { return null; } };
  var F = data('flow-data'), G = data('gate-demo'), M = data('film-mcp');
  if (!F || !G) return;
  var still = !('IntersectionObserver' in window) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var el = function (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  var add = function (parent, child) { parent.appendChild(child); return child; };
  // A part of a screen: drawn when the scroll reaches `at` (0–1 within its step).
  var STEPS = { read: [], review: [], gate: [] };
  var beat = function (step, node, at) { node.classList.add('beat'); node.dataset.at = at; STEPS[step].push(node); return node; };

  // A window, as the system draws one: traffic lights, a title, the body that holds the app.
  var win = function (cls, title, app) {
    var w = el('div', 'fw ' + cls);
    var bar = add(w, el('div', 'fw-bar'));
    add(bar, el('span', 'fw-l')); add(bar, el('span', 'fw-l')); add(bar, el('span', 'fw-l'));
    add(bar, el('b', 'fw-t', title));
    if (app) add(bar, el('span', 'fw-app', app));
    var body = add(w, el('div', 'fw-body'));
    var reel = add(body, el('div', 'fw-reel'));
    return { w: w, body: body, reel: reel };
  };

  // A fixed-width table, cut at the columns its own header sets: every cell is a slice of the captured line, and the
  // cells joined by one space are the line itself with its runs of spaces made one.
  var table = function (lines) {
    var head = lines[0], cols = [], re = /\S+(?: \S+)*/g, m;
    while ((m = re.exec(head))) cols.push(m.index);
    var names = head.trim().split(/\s{2,}/);
    var cut = function (line) {
      return cols.map(function (c, k) { return line.slice(c, k + 1 < cols.length ? cols[k + 1] : undefined).trim(); });
    };
    var rows = [];
    lines.forEach(function (line, k) {
      var cells = cut(line);
      var flat = line.replace(/\s+/g, ' ').trim();
      // a row is a row when its cells, joined, are exactly the line — the footer lines are not
      if (cells.join(' ').replace(/\s+/g, ' ').trim() === flat && cells.length === names.length && (k === 0 || /^\d+$/.test(cells[0]))) rows.push({ head: k === 0, cells: cells, line: line });
      else rows.push({ text: line });
    });
    return { names: names, rows: rows };
  };
  var SEVS = ['critical', 'high', 'medium', 'low', 'info'];
  var row = function (names, r) {
    var li = el('div', 't-line' + (r.head ? ' tr-head' : ' tr-row'));
    r.cells.forEach(function (c, k) {
      var KEY = { '#': 'idx', N: 'cnt', '$/MO': 'usd', WHY: 'why', SEV: 'sev', FINDING: 'finding', WORKLOAD: 'workload' };
      var cell = add(li, el('span', 'tc tc-' + (KEY[names[k]] || 'c'), c));
      if (!r.head && names[k] === 'SEV' && SEVS.indexOf(c) >= 0) cell.classList.add('sev-' + c);
      if (k + 1 < r.cells.length) li.appendChild(document.createTextNode(' '));
    });
    return li;
  };

  // ── 01 · Read: the terminal ──
  var read = F.steps[0];
  var term = win('fw-term', 'zsh — shoalcheck', 'Terminal');
  var nRuns = read.runs.length, span = 1 / nRuns;
  read.runs.forEach(function (run, ri) {
    var t0 = ri * span;
    var cmd = beat('read', add(term.reel, el('div', 't-cmdline')), t0 + span * 0.04);
    add(cmd, el('span', 't-ps', '$ '));
    add(cmd, el('span', 't-cmd', run.cmd));
    var T = table(run.out.filter(function (l) { return typeof l === 'string'; }));
    var n = T.rows.length;
    T.rows.forEach(function (r, k) {
      var at = t0 + span * (0.12 + 0.7 * (k / Math.max(1, n)));
      if (r.text != null) beat('read', add(term.reel, el('div', 't-line t-foot', r.text)), at);
      else beat('read', add(term.reel, row(T.names, r)), at);
    });
  });
  $('.fd[data-step="read"]', sec).appendChild(term.w);

  // ── 02 · Review & route: a Claude Code session, then the tickets it filed in Linear ──
  var rv = F.steps[1];
  var cc = win('fw-cc', 'claude — ' + rv.model, 'Claude Code');
  var md = function (s) { return s.replace(/\*\*/g, '').replace(/`/g, ''); };
  var rich = function (parent, s) { // **bold** and `code` only, the rest as text
    s.split(/(\*\*[^*]+\*\*|`[^`]+`)/).forEach(function (p) {
      if (!p) return;
      if (/^\*\*/.test(p)) add(parent, el('b', null, p.slice(2, -2)));
      else if (/^`/.test(p)) add(parent, el('code', null, p.slice(1, -1)));
      else parent.appendChild(document.createTextNode(p));
    });
    return parent;
  };
  var head = beat('review', add(cc.reel, el('div', 'cc-head')), 0.01);
  add(head, el('span', 'cc-star', '✻'));
  add(head, el('span', 'cc-model', rv.model));
  add(head, el('span', 'cc-tools', 'tools: shoalcheck-mcp only'));
  var prompt = beat('review', add(cc.reel, el('div', 'cc-prompt')), 0.04);
  add(prompt, el('span', 'cc-gt', '>'));
  add(prompt, el('span', 'cc-ptext', rv.prompt));
  var args = function (a) {
    var k = Object.keys(a || {});
    return k.length ? '(' + k.map(function (x) { return x + ': ' + JSON.stringify(a[x]); }).join(', ') + ')' : '()';
  };
  rv.calls.forEach(function (c, k) {
    var at = 0.08 + 0.3 * (k / rv.calls.length);
    var call = beat('review', add(cc.reel, el('div', 'cc-call')), at);
    add(call, el('span', 'cc-dot', '⏺'));
    add(call, el('span', 'cc-srv', 'shoalcheck · '));
    add(call, el('span', 'cc-tool', c.tool));
    add(call, el('span', 'cc-args', ' ' + args(c.args)));
    var ans = add(call, el('span', 'cc-ans'));
    add(ans, el('span', 'cc-el', '⎿ '));
    add(ans, document.createTextNode(Number(c.chars).toLocaleString('en-US') + ' characters from the reading'));
  });
  // the answer, trimmed: its opening paragraph and each team's first fix, never other words
  var paras = rv.text.split(/\n\n+/);
  var keep = paras.filter(function (p, k) { return k === 0 || /^\*\*(data|payments|core-api|sre)\*\*/.test(p); });
  var say = beat('review', add(cc.reel, el('div', 'cc-say')), 0.42);
  add(say, el('span', 'cc-dot', '⏺'));
  var sayBody = add(say, el('div', 'cc-sbody'));
  keep.forEach(function (p, k) {
    var bt = rich(el('p', 'cc-bt'), p);
    beat('review', add(sayBody, bt), 0.42 + 0.16 * (k / keep.length));
  });
  beat('review', add(sayBody, el('p', 'cc-trim', '… the answer goes on — trimmed here, never changed.')), 0.6);

  var lin = win('fw-lin', 'Linear — tickets, one per team', 'Linear');
  var board = add(lin.reel, el('div', 'tk-board'));
  rv.tickets.forEach(function (t, k) {
    var col = add(board, el('div', 'tk-col'));
    var hd = add(col, el('div', 'tk-colhead'));
    add(hd, el('span', 'tk-key', t.project));
    add(hd, el('span', 'tk-team', t.team));
    var card = beat('review', add(col, el('article', 'tk-card')), 0.7 + 0.06 * k);
    var sevm = /^\[(\w+)\]/.exec(t.title);
    add(card, el('span', 'tk-prio' + (sevm ? ' p-' + sevm[1].toLowerCase() : ''), sevm ? sevm[1] : ''));
    add(card, el('p', 'tk-title', t.title));
    var tags = add(card, el('div', 'tk-tags'));
    (t.table || []).slice(0, 2).forEach(function (kv) { add(tags, el('span', 'tk-tag', kv[1])); });
    add(card, el('p', 'tk-head', t.head));
    add(card, el('p', 'tk-mark', t.marker));
  });
  beat('review', add(lin.reel, el('p', 'tk-tail', rv.tickets[0].tail)), 0.95);
  var fdr = $('.fd[data-step="review"]', sec);
  fdr.appendChild(cc.w);
  fdr.appendChild(lin.w);

  // ── 03 · Gate: GitHub's pull request, red then green, and the reading taken again ──
  var gt = F.steps[2];
  var gh = win('fw-gh', G.repo.split('/').pop() + ' · pull request #' + G.pr.number, 'GitHub');
  var top = beat('gate', add(gh.reel, el('div', 'gt-top')), 0.02);
  add(top, el('span', 'gt-repo', G.repo));
  var pr = add(top, el('h4', 'gt-pr', G.pr.title + ' #' + G.pr.number));
  pr.setAttribute('role', 'presentation');
  var badge = add(top, el('span', 'gt-state', 'Open'));
  G.runs.forEach(function (r, k) {
    var t0 = 0.08 + k * 0.36, pass = String(r.exit) === '0';
    var run = beat('gate', add(gh.reel, el('div', 'gt-run ' + (pass ? 'pass' : 'fail'))), t0);
    run.dataset.sha = r.sha;
    run.dataset.exit = String(r.exit);
    var cm = add(run, el('div', 'gt-commit'));
    add(cm, el('span', 'gt-i', pass ? '✓' : '✗'));
    add(cm, el('span', 'gt-msg', r.message));
    add(cm, el('code', 'gt-sha', r.sha));
    var ch = beat('gate', add(run, el('div', 'gt-check')), t0 + 0.08);
    add(ch, el('b', 'gt-name', r.workflow + ' / ' + r.job + ' (' + r.event + ')'));
    add(ch, el('span', 'gt-res', (pass ? 'Successful in ' : 'Failing after ') + r.seconds + 's · exit ' + r.exit));
    add(ch, el('span', 'gt-req', 'Required'));
    var log = beat('gate', add(run, el('div', 'gt-log')), t0 + 0.14);
    (r.gate || []).filter(function (l) { return l.trim(); }).slice(0, 4).forEach(function (l) { add(log, el('div', 'gt-ll', l)); });
    var mg = beat('gate', add(run, el('div', 'gt-merge')), t0 + 0.22);
    add(mg, el('span', 'gt-i', pass ? '✓' : '✗'));
    add(mg, el('span', null, pass ? 'All checks have passed' : 'Merging is blocked'));
  });
  var merged = beat('gate', add(gh.reel, el('div', 'gt-merged', 'Merged')), 0.82);
  merged.dataset.merged = G.merged ? 'yes' : 'no';

  var re = win('fw-term fw-re', 'zsh — read again, an hour later', 'Terminal');
  gt.runs.forEach(function (run) {
    var cmd = beat('gate', add(re.reel, el('div', 't-cmdline')), 0.86);
    add(cmd, el('span', 't-ps', '$ '));
    add(cmd, el('span', 't-cmd', run.cmd));
    run.out.forEach(function (l, k) { beat('gate', add(re.reel, el('div', 't-line', l)), 0.87 + 0.08 * (k / run.out.length)); });
  });
  var D = M && M.filter(function (c) { return c.tool === 'diff_readings'; })[0];
  if (D) {
    var d = D.answer.diff;
    var mcp = beat('gate', add(re.reel, el('div', 'rr-mcp')), 0.97);
    add(mcp, el('span', 'cc-dot', '⏺'));
    add(mcp, el('span', null, 'shoalcheck-mcp · diff_readings — ' + d.newCount + ' new · ' + d.noLongerInSetCount + ' no longer in the set · ' + d.notEvaluatedCount + ' not evaluated'));
  }
  var fdg = $('.fd[data-step="gate"]', sec);
  fdg.appendChild(gh.w);
  fdg.appendChild(re.w);

  // ── the playhead ──
  var keys = ['read', 'review', 'gate'];
  var run = $('.flow-run', sec), pin = $('.flow-pin', sec);
  var copies = keys.map(function (k) { return $('.fc[data-step="' + k + '"]', sec); });
  var devs = keys.map(function (k) { return $('.fd[data-step="' + k + '"]', sec); });
  var bars = keys.map(function (k) { return $('.flow-bar i[data-step="' + k + '"]', sec); });
  var device = $('.flow-device', sec);
  var mode = still ? 'still' : 'scrub';
  var state = { p: 0, active: -1 };

  // a window whose drawn parts run past its bottom shows its newest part: the reel moves up under the window
  var follow = function (w) {
    var body = $('.fw-body', w), reel = $('.fw-reel', w);
    if (!body || !reel) return;
    var on = $$('.beat.on', reel), last = on[on.length - 1];
    var pad = parseFloat(getComputedStyle(body).paddingBottom) || 0;
    var over = last ? (last.offsetTop + last.offsetHeight) - (body.clientHeight - pad) : 0;
    reel.style.transform = over > 0 ? 'translate3d(0,' + (-over) + 'px,0)' : '';
  };

  var draw = function (p) {
    var i = Math.min(2, Math.floor(p * 3)), q = p * 3 - i;
    if (p >= 1) { i = 2; q = 1; }
    keys.forEach(function (k, j) {
      var local = j < i ? 1 : j > i ? 0 : q;
      STEPS[k].forEach(function (b) { b.classList.toggle('on', j < i || (j === i && local >= Number(b.dataset.at))); });
      bars[j].style.setProperty('--q', local.toFixed(3));
      copies[j].classList.toggle('on', j === i);
      devs[j].classList.toggle('on', j === i);
      devs[j].classList.toggle('past', j < i);
    });
    // the camera settles on the window as the step plays: a slow push, never a jolt — and moves round it a little, one
    // way in each step and back the other in the next, as a camera on a slider does
    devs[i].style.setProperty('--q', q.toFixed(3));
    var side = i % 2 ? -1 : 1;
    device.style.transform = 'perspective(2000px) rotateY(' + (side * (0.5 - q) * 7).toFixed(2) + 'deg) rotateX(' + (3 - q * 3).toFixed(2) + 'deg)';
    // the pull request's own state: open while it is judged, merged once its last commit passed (GitHub's record)
    var m = merged.classList.contains('on');
    badge.textContent = m ? 'Merged' : 'Open';
    badge.classList.toggle('merged', m);
    $$('.fw', devs[i]).forEach(follow);
    state.p = p; state.active = i;
  };

  var stepBox = function () {
    var r = run.getBoundingClientRect(), top = r.top + window.scrollY;
    var travel = Math.max(1, run.offsetHeight - pin.offsetHeight);
    return { top: top, travel: travel };
  };

  if (mode === 'still') {
    sec.classList.add('still');
    // each step's screen is set under its words, drawn whole
    copies.forEach(function (c, j) { c.classList.add('on'); c.appendChild(devs[j]); devs[j].classList.add('on'); });
    keys.forEach(function (k) { STEPS[k].forEach(function (b) { b.classList.add('on'); }); });
  } else {
    sec.classList.add('scrub');
    var ticking = false;
    var update = function () {
      ticking = false;
      var b = stepBox(), p = Math.max(0, Math.min(1, (window.scrollY - b.top) / b.travel));
      draw(p);
    };
    var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  // What the page shows of the flow, for its gate (scripts/site/landing-check.mjs).
  sec.flowState = function () {
    var b = stepBox();
    return {
      mode: mode,
      p: state.p,
      active: keys[Math.max(0, state.active)],
      steps: keys.map(function (k, j) {
        var on = STEPS[k].filter(function (x) { return x.classList.contains('on'); }).length;
        return { key: k, start: Math.round(b.top + b.travel * j / 3), end: Math.round(b.top + b.travel * (j + 1) / 3), on: on, of: STEPS[k].length };
      }),
    };
  };
  };
  if (document.readyState === 'complete') requestAnimationFrame(function () { setTimeout(go, 0); });
  else window.addEventListener('load', function () { requestAnimationFrame(function () { setTimeout(go, 0); }); }, { once: true });
})();
