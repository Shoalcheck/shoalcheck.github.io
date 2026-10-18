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
