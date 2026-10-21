/* THE PIPELINE IS GITHUB, AS IT SHOWED A RUN THAT HAPPENED (D64; before it D58/D59). The founder: "я хотів моушн
   дизайн github actions або gitlab CI з реальним інтерфейсом". GitHub's own pages, drawn from its record of a public
   repository's pull request (#gate-demo: make site-data writes it from testdata/site/gate-demo.json, a gate holds it):
   the pull request at the first commit, the job's page with the Gate step's log, the alert on the security page, the
   pull request at the later commit. Every name, number and line is the record's; the rest is GitHub's own wording.
   It plays as a story when seen — the check starts, the job runs a step at a time with the seconds each took, its log
   prints, the alert lands, merging is blocked; the narrowing commit passes and is merged — and again when it returns.
   No logo and no picture; with reduced motion it is drawn finished. */
window.ghScene = function (box, G, playWhenSeen) {
  if (!box || !G || !G.runs || G.runs.length < 2 || !G.runs[0].jobSteps || !G.runs[0].gateLog) return;
  var el = function (tag, cls, text, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  };
  var txt = function (s, parent) { parent.appendChild(document.createTextNode(s)); };
  var link = function (text, href, cls, parent) {
    var a = el('a', cls, text, parent);
    a.href = href; a.target = '_blank'; a.rel = 'noopener';
    return a;
  };
  /* drawn icons, never pictures: a status in a circle; GitHub's commit, merge and pull-request glyphs in strokes. Only
     these constants become markup; the record's text goes in as text. */
  var C = '<circle cx="8" cy="8" r=';
  var SHAPES = {
    ok: C + '"7" class="f"/><path class="k" d="M4.9 8.3 7 10.3l4.1-4.5"/>',
    fail: C + '"7" class="f"/><path class="k" d="M5.6 5.6l4.8 4.8m0-4.8-4.8 4.8"/>',
    run: C + '"6" class="t"/><path class="a" d="M8 2a6 6 0 0 1 6 6"/>',
    wait: C + '"6"/>',
    dot: C + '"3" class="f"/>',
    commit: C + '"2.6"/><path d="M8 1v4.4M8 10.6V15"/>',
    merge: '<circle cx="4.5" cy="3.5" r="1.8"/><circle cx="4.5" cy="12.5" r="1.8"/><circle cx="11.5" cy="8" r="1.8"/><path d="M4.5 5.3v5.4m0-5.4c0 2.2 2.3 2.7 5.2 2.7"/>',
    pr: '<circle cx="4.5" cy="3.5" r="1.8"/><circle cx="4.5" cy="12.5" r="1.8"/><circle cx="11.5" cy="12.5" r="1.8"/><path d="M4.5 5.3v5.4m7 0V6.5a2 2 0 0 0-2-2H7.4M9 3 7.4 4.5 9 6"/>',
    block: C + '"5.6"/><path d="M4.1 11.9l7.8-7.8"/>',
    check: '<path d="M3.5 8.4 6.6 11.4 12.5 5"/>',
    cross: '<path d="M4.5 4.5l7 7m0-7-7 7"/>',
    shield: '<path d="M8 1.6 13.2 3.6v3.9c0 3.1-2.1 5.6-5.2 6.9-3.1-1.3-5.2-3.8-5.2-6.9V3.6zM6.2 6.2l3.6 3.6m0-3.6-3.6 3.6"/>',
    chev: '<path d="M6.2 4 10.2 8l-4 4"/>',
    caret: '<path d="M4.5 6.5 8 10l3.5-3.5"/>'
  };
  var icon = function (parent, kind, cls) {
    parent.insertAdjacentHTML('beforeend', '<svg class="gh-i ' + kind + (cls ? ' ' + cls : '') + '" viewBox="0 0 16 16" aria-hidden="true">' + SHAPES[kind] + '</svg>');
    return parent.lastChild;
  };
  var big = function (parent, kind, glyph, cls) { icon(el('span', 'gh-big ' + kind + (cls ? ' ' + cls : ''), null, parent), glyph); };
  var STATUS = { success: 'ok', failure: 'fail' };
  var status = function (parent, c, before) { /* a status in one place: what it was before (states), then what it came to */
    var s = el('span', 'gh-swap gh-ico', null, parent);
    (before || []).forEach(function (k, i) { icon(s, k, i ? 'pend' : before.length > 1 ? 'pre' : 'pend'); });
    icon(s, STATUS[c] || 'wait', before ? 'fin' : '');
    return s;
  };
  /* GitHub's formats: a check's time in its largest unit ("Failing after 1m"), a job's and a step's in minutes and
     seconds ("in 1m 12s", "47s"), a day as its page prints it ("Oct 20, 2026") */
  var unit = function (s) { return s < 60 ? s + 's' : s < 3600 ? Math.floor(s / 60) + 'm' : Math.floor(s / 3600) + 'h'; };
  var ms = function (s) { return s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + (s % 60) + 's'; };
  var day = function (iso) { var d = new Date(iso); return 'JanFebMarAprMayJunJulAugSepOctNovDec'.substr(d.getUTCMonth() * 3, 3) + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear(); };
  /* the story as beats: at its time an element is given a class, and the stylesheet draws what the class means;
     data-beat names every class an element will be given, so a check can tell a story that played from one that stopped */
  var parts = [], T = 0;
  var beat = function (e, cls, dt) {
    T += dt;
    parts.push({ el: e, cls: cls, at: T });
    e.setAttribute('data-beat', ((e.getAttribute('data-beat') || '') + ' ' + cls).trim());
  };
  var gh = el('div', 'gh', null, box), runs = G.runs, red = runs[0], last = runs[runs.length - 1], pr = G.pr;
  var page = function (cls, tab) {
    var p = el('div', 'gh-pane ' + cls, null, gh), n = el('div', 'gh-nav', null, p), r = el('span', 'gh-repo', null, n);
    txt(G.repo.split('/')[0] + ' / ', r);
    el('b', '', G.repo.split('/')[1], r);
    el('span', 'gh-tab', tab, n);
    return p;
  };
  var into = function (line, text) {
    txt(text + ' into ', line); el('span', 'gh-ref', pr.base, line);
    txt(' from ', line); el('span', 'gh-ref', pr.head, line);
  };

  /* the pull request as it stood at the first commit: its head, the commit, the checks GitHub showed for it */
  var prA = page('gh-pr a', 'Pull requests'), head = el('div', 'gh-prhead', null, prA);
  var title = el('h4', 'gh-title', null, head);
  link(pr.title, pr.url, '', title);
  txt(' ', title);
  el('span', 'gh-num', '#' + pr.number, title);
  var state = el('div', 'gh-state', null, head), badges = el('span', 'gh-swap', null, state);
  icon(el('span', 'gh-badge open', null, badges), 'pr').insertAdjacentText('afterend', 'Open');
  if (G.merged) icon(el('span', 'gh-badge merged', null, badges), 'merge').insertAdjacentText('afterend', 'Merged');
  var meta = el('span', 'gh-swap gh-meta', null, state), metas = runs.map(function (r, i) {
    var m = el('span', 'gh-m' + (i ? '' : ' first'), null, meta);
    el('b', '', pr.author, m);
    into(m, ' wants to merge ' + (i + 1) + (i ? ' commits' : ' commit'));
    return m;
  });
  if (G.merged) {
    var mm = el('span', 'gh-m', null, meta);
    el('b', '', pr.author, mm);
    into(mm, ' merged ' + runs.length + ' commits');
    metas.push(mm);
  }
  var commitRow = function (r, pane) {
    var c = el('div', 'gh-commit', null, pane);
    c.setAttribute('data-sha', r.sha);
    icon(c, 'commit', 'gh-cico');
    el('span', 'gh-cmsg', r.message, c);
    status(c, r.conclusion, ['run']).className += ' gh-cst';
    el('code', 'gh-csha', r.sha, c);
    return c;
  };
  var checksBox = function (r, pane) {
    var b = el('div', 'gh-box', null, pane), ok = r.checks.every(function (c) { return c.conclusion === 'success'; });
    b.setAttribute('data-sha', r.sha);
    var sec = el('div', 'gh-sec gh-sec-checks', null, b), bi = el('span', 'gh-swap', null, sec), st;
    big(bi, 'wait', 'dot', 'pend');
    big(bi, ok ? 'ok' : 'fail', ok ? 'check' : 'cross', 'fin');
    st = el('span', 'gh-swap gh-sec-h', null, sec);
    el('b', 'pend', 'Some checks haven’t completed yet', st);
    el('b', 'fin', ok ? 'All checks have passed' : 'Some checks were not successful', st);
    var rows = el('div', 'gh-checks', null, b), later = [];
    r.checks.forEach(function (c) {
      /* the job's own check runs from the start; another (code scanning) is listed when it is reported */
      var job = c.app === 'GitHub Actions' && c.name === r.job, row = el('div', 'gh-check' + (job ? '' : ' later'), null, rows);
      status(row, c.conclusion, job ? ['run'] : null);
      var body = el('span', 'gh-check-body', null, row);
      el('span', 'gh-check-name', c.suite + ' / ' + c.name + (c.event ? ' (' + c.event + ')' : ''), body);
      if (c.required) el('span', 'gh-req', 'Required', body);
      link('Details', c.url, 'gh-details', row);
      var cs = el('span', 'gh-swap gh-check-st', null, row);
      if (job) el('span', 'pend', 'In progress', cs);
      el('span', job ? 'fin' : '', (c.conclusion === 'success' ? 'Successful in ' : 'Failing after ') + unit(c.seconds) + (c.title ? ' — ' + c.title : ''), cs);
      if (!job) later.push(row);
    });
    var clean = r.mergeableState === 'clean', btn = null;
    if (clean || r.mergeableState === 'blocked') {
      var m = el('div', 'gh-sec gh-sec-merge', null, b), mt;
      big(m, clean ? 'ok' : 'block', clean ? 'check' : 'block');
      mt = el('span', 'gh-sec-t', null, m);
      el('b', '', clean ? 'This branch has no conflicts with the base branch' : 'Merging is blocked', mt);
      if (clean) el('span', 'gh-sec-d', 'Merging can be performed automatically.', mt);
      btn = el('span', 'gh-btn' + (clean ? '' : ' off'), null, el('div', 'gh-sec gh-sec-btn', null, b));
      btn.setAttribute('aria-disabled', String(!clean));
      el('span', 'gh-btn-l', 'Merge pull request', btn);
      icon(el('span', 'gh-btn-c', null, btn), 'caret');
    }
    return { box: b, later: later, btn: btn };
  };
  var c0 = commitRow(red, prA), b0 = checksBox(red, prA);

  /* the job's page: the run as titled, the job's head, every step with its seconds, the Gate step's log */
  var job = page('gh-job', 'Actions'), rh = el('div', 'gh-runhead', null, job);
  el('span', 'gh-wf', red.workflow, rh);
  var rt = el('span', 'gh-runtitle', null, rh);
  txt(red.title + ' ', rt);
  el('span', 'gh-num', '#' + red.runNumber, rt);
  var jb = el('div', 'gh-jobbox', null, job), jh = el('div', 'gh-jobhead', null, jb);
  status(jh, red.conclusion, ['wait', 'run']);
  var jt = el('span', 'gh-jobt', null, jh);
  link(red.job, red.jobUrl, 'gh-jobname', jt);
  el('span', 'fin', (red.conclusion === 'success' ? 'succeeded ' : 'failed ') + day(red.jobCompletedAt) + ' in ' + ms(red.seconds), el('span', 'gh-swap gh-jobst', null, jt));
  el('span', 'gh-search', 'Search logs', jh);
  var sl = el('div', 'gh-steps', null, jb), steps = [], gate = null, logLines = [], log = null;
  red.jobSteps.forEach(function (s) {
    var st = el('div', 'gh-step' + (s.name === 'Gate' ? ' gate' : ''), null, sl), hd = el('div', 'gh-shead', null, st);
    icon(hd, 'chev', 'gh-chev');
    status(hd, s.conclusion, ['wait', 'run']);
    el('span', 'gh-sname', s.name, hd);
    el('span', 'gh-sdur', ms(s.seconds), hd);
    steps.push({ el: st, s: s });
    if (s.name !== 'Gate') return;
    /* GitHub draws a step's log a line a row, numbered: an "##[group]" line as "Run …" over the lines it folds (folded
       until asked), "##[endgroup]" as nothing, an "##[error]" line as "Error: …" */
    gate = st;
    log = el('div', 'gh-log', null, st);
    var n = 0, fold = null;
    red.gateLog.forEach(function (raw) {
      if (raw === '##[endgroup]') { fold = null; return; }
      var grp = raw.indexOf('##[group]') === 0, err = raw.indexOf('##[error]') === 0;
      var line = el('div', 'gh-line' + (grp ? ' grp' : '') + (err ? ' err' : '') + (/^\s*\+ critical /.test(raw) ? ' crit' : ''), null, fold || log);
      el('span', 'gh-ln', String(++n), line);
      var lc = grp ? el('span', 'gh-lc', null, line) : line, tg;
      if (grp) {
        tg = el('button', 'gh-fold-t', null, lc);
        tg.type = 'button';
        tg.setAttribute('aria-expanded', 'false');
        tg.setAttribute('aria-label', 'Show the lines folded under "' + raw.slice(9) + '"');
        icon(tg, 'chev');
      }
      el('span', 'gh-lt', grp ? raw.slice(9) : err ? 'Error: ' + raw.slice(9) : raw, lc);
      if (!fold) logLines.push(line);
      if (grp) {
        var f = fold = el('div', 'gh-fold', null, log);
        f.hidden = true;
        tg.addEventListener('click', function () { f.hidden = !f.hidden; tg.setAttribute('aria-expanded', String(!f.hidden)); });
      }
    });
  });
  el('div', 'gh-jobfoot', null, sl);
  /* the steps under the Gate stand over its log's room, moved up by its height, until it opens; the page's frame
     stops short of the room until then (gh-scene.css) */
  if (log && 'ResizeObserver' in window) new ResizeObserver(function () { job.style.setProperty('--logh', log.offsetHeight + 'px'); }).observe(log);

  /* the alert the red run's upload opened, on the page GitHub lists it on. The pull request's code-scanning check says
     "No new alerts in code changed by this pull request", and the alert is still there on the pull request's ref: the
     object it names is a cluster's, not a line of the change. The page is the owner's — no link to it. */
  var sec = null, alerts = (red.alerts || []).map(function (a) {
    sec = sec || page('gh-secp', 'Security and quality');
    if (!sec.querySelector('.gh-secp-k')) el('span', 'gh-secp-k', 'Code scanning', sec);
    var al = el('div', 'gh-alert', null, sec), t = el('span', 'gh-alert-t', null, al);
    al.setAttribute('data-alert', a.number);
    icon(t, 'shield', 'gh-shield');
    el('b', '', a.ruleDescription, t);
    el('span', 'gh-lvl', { error: 'Error', warning: 'Warning', note: 'Note' }[a.level] || a.level, t);
    el('span', 'gh-alert-m', a.message, al);
    el('code', 'gh-alert-p', a.path, al);
    el('span', 'gh-alert-s', '#' + a.number + ' · ' + a.tool + ' · ' + a.ref, al);
    return al;
  });

  /* the pull request at the later commits, and the merge GitHub recorded */
  var prB = page('gh-pr b', 'Pull requests');
  var later = runs.slice(1).map(function (r) { return { c: commitRow(r, prB), b: checksBox(r, prB) }; });
  var merged = null;
  if (G.merged) {
    big(merged = el('div', 'gh-merged', null, prB), 'done', 'merge');
    var mt = el('span', 'gh-merged-t', null, merged), m1 = el('span', '', null, mt);
    el('b', '', pr.mergedBy, m1);
    txt(' merged commit ', m1);
    el('code', 'gh-mc', pr.mergeCommit, m1);
    txt(' into ', m1);
    el('span', 'gh-ref', pr.base, m1);
    if (last.checks.every(function (c) { return c.conclusion === 'success'; })) el('span', 'gh-merged-d', last.checks.length + ' checks passed', mt);
  }

  /* THE STORY, paced to the run: a step that took longer spins a little longer (kind's 47 s is the longest pause), the
     log prints a line at a time, every check lands in the order GitHub recorded it. About ten seconds. */
  beat(c0, 'on', 250);
  beat(b0.box, 'on', 300);
  beat(job, 'on', 300);
  var after = false;
  steps.forEach(function (x) {
    if (x.el === gate) {
      beat(gate, 'open', 220);
      logLines.forEach(function (l) { beat(l, 'on', 85); });
      beat(gate, 'on', 160);
      after = true;
      return;
    }
    beat(x.el, 'on', after ? 120 + Math.min(300, x.s.seconds * 10) : 140 + Math.min(560, x.s.seconds * 12));
    if (x.s.name === 'Upload to code scanning') {
      b0.later.forEach(function (row) { beat(row, 'on', 140); });
      if (sec) beat(sec, 'on', 200);
      alerts.forEach(function (al) { beat(al, 'on', 0); });
    }
  });
  beat(job, 'done', 200);
  beat(b0.box, 'done', 250);
  beat(c0, 'done', 0);
  later.forEach(function (x, i) {
    if (!i) beat(prB, 'on', 900);
    beat(x.c, 'on', i ? 900 : 0);
    beat(metas[i], 'past', 0);
    beat(metas[i + 1], 'on', 0);
    beat(x.b.box, 'on', 300);
    x.b.later.forEach(function (row) { beat(row, 'on', 900); });
    beat(x.b.box, 'done', 600);
    beat(x.c, 'done', 0);
  });
  if (merged) {
    var btn = later.length ? later[later.length - 1].b.btn : b0.btn;
    if (btn) beat(btn, 'press', 800);
    beat(merged, 'on', 350);
    beat(metas[metas.length - 2], 'past', 0);
    beat(metas[metas.length - 1], 'on', 0);
    beat(head, 'merged', 0);
  }
  playWhenSeen(box, parts);
};
