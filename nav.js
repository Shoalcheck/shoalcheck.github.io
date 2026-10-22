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
   cold load, landed screens early. Here the jump is taken and then taken again for as long as the page is still
   moving: it ends once the target has stayed under the bar for three frames and the page has not changed size for
   400 ms (a ResizeObserver on the body), not after a fixed time — on a busy machine the page takes longer to settle,
   and a clock measured the load instead of the page. It gives up after 6 s (10 s on a cold load), and a reader who
   scrolls, presses a key or touches the screen meanwhile is left alone. */
(function () {
  var head = document.querySelector('header.top');
  var hand = false, stop = function () {};
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
    window.addEventListener(ev, function () { hand = true; }, { passive: true, capture: true });
  });
  var place = function (t) { return t.getBoundingClientRect().top - (head ? head.offsetHeight : 0); };
  // at once: the stylesheet's smooth scrolling would turn each correction into a slide across the pinned scenes
  var jump = function (t) {
    var r = document.documentElement, was = r.style.scrollBehavior;
    r.style.scrollBehavior = 'auto';
    window.scrollTo(0, Math.max(0, window.scrollY + place(t)));
    r.style.scrollBehavior = was;
  };
  var land = function (id, cap) {
    var t = document.getElementById(id);
    if (!t) return;
    stop();
    hand = false;
    var t0 = performance.now(), resized = t0, still = 0, raf = 0;
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { resized = performance.now(); still = 0; }) : null;
    if (ro) ro.observe(document.body);
    stop = function () { cancelAnimationFrame(raf); if (ro) ro.disconnect(); ro = null; stop = function () {}; };
    var frame = function () {
      var now = performance.now();
      if (hand || now - t0 > cap) return stop();
      if (Math.abs(place(t)) > 1) { jump(t); still = 0; }
      else if (now - resized > 400 && ++still >= 3) return stop();
      raf = requestAnimationFrame(frame);
    };
    jump(t);
    raf = requestAnimationFrame(frame);
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    if (!id || !document.getElementById(id) || id === 'main') return;
    e.preventDefault();
    if (history.pushState) history.pushState(null, '', '#' + id);
    // the pointerdown that made this click is the reader's hand on the link, not on the page
    setTimeout(function () { land(id, 6000); }, 0);
  });
  var fromHash = function (cap) { var id = decodeURIComponent(location.hash.slice(1)); if (id && id !== 'main') land(id, cap); };
  window.addEventListener('hashchange', function () { fromHash(6000); });
  if (location.hash) {
    if (document.readyState === 'complete') setTimeout(function () { fromHash(10000); }, 0);
    else window.addEventListener('load', function () { fromHash(10000); }, { once: true });
  }
})();
