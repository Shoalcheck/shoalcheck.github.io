/* The section menu on a narrow screen. Under 900px the header has room for the brand and Download only, so the
   sections fold behind a Menu button; it opens and closes the list, says so to a screen reader, and closes when a
   link is taken or Escape is pressed. */
(function () {
  var btn = document.querySelector('.menu');
  var top = document.querySelector('.top');
  if (!btn || !top) return;
  function set(open) {
    top.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  btn.addEventListener('click', function () { set(!top.classList.contains('open')); });
  top.addEventListener('click', function (e) { if (e.target.closest('.nav a')) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
})();

/* A LINK TO A PLACE ON THIS PAGE LANDS THERE, AFTER THE PAGE HAS GROWN (founder, 2026-10-22: "Download" did not take
   him to the downloads). The landing grows after its first paint — the zone scene pins to three screens, the flow is
   built, the comparison is fetched — so a jump taken at once, as the browser takes it for a link or for a #hash on a
   cold load, landed screens early. Here the jump is taken, then checked every 120 ms for about two seconds (four on a cold load) and taken
   again if the target has moved; a reader who scrolls, presses a key or touches the screen meanwhile is left alone. */
(function () {
  var head = document.querySelector('header.top');
  var hand = false, timer = 0;
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
    window.addEventListener(ev, function () { hand = true; }, { passive: true, capture: true });
  });
  var place = function (t) { return t.getBoundingClientRect().top - (head ? head.offsetHeight : 0); };
  var land = function (id, checks) {
    var t = document.getElementById(id);
    if (!t) return;
    clearTimeout(timer);
    hand = false;
    var n = 0;
    // at once: the stylesheet's smooth scrolling would turn each correction into a slide across the pinned scenes
    var go = function () {
      var r = document.documentElement, was = r.style.scrollBehavior;
      r.style.scrollBehavior = 'auto';
      window.scrollTo(0, Math.max(0, window.scrollY + place(t)));
      r.style.scrollBehavior = was;
    };
    go();
    var check = function () {
      if (hand) return;
      if (Math.abs(place(t)) > 2) go();
      if (++n < (checks || 16)) timer = setTimeout(check, 120);
    };
    timer = setTimeout(check, 120);
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    if (!id || !document.getElementById(id) || id === 'main') return;
    e.preventDefault();
    if (history.pushState) history.pushState(null, '', '#' + id);
    // the pointerdown that made this click is the reader's hand on the link, not on the page
    setTimeout(function () { land(id); }, 0);
  });
  // a cold load keeps settling for longer: the scroll scenes and the flow are built after the load event
  var fromHash = function (checks) { var id = decodeURIComponent(location.hash.slice(1)); if (id && id !== 'main') land(id, checks); };
  window.addEventListener('hashchange', function () { fromHash(16); });
  if (location.hash) {
    if (document.readyState === 'complete') setTimeout(function () { fromHash(34); }, 60);
    else window.addEventListener('load', function () { setTimeout(function () { fromHash(34); }, 60); }, { once: true });
  }
})();
