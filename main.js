/* Yanyu Zhu (ZIzi) portfolio — plain JavaScript, no dependencies */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  /* ---------- hero: dot-matrix terrain drawn on a canvas ---------- */
  var canvas = $('#field');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d'), W = 0, H = 0, raf = null, visible = true, t = 0;
    var COLS = 96, ROWS = 46;
    function resize() {
      var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function height(x, z, time) {
      return Math.sin(x * 0.42 + time * 0.9) * 0.55
           + Math.sin(z * 0.55 - time * 0.6) * 0.45
           + Math.sin((x + z) * 0.23 + time * 0.4) * 0.6
           + Math.cos(Math.sqrt(x * x + z * z) * 0.5 - time * 1.1) * 0.5;
    }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, horizon = H * 0.10, focal = H * 1.15, camY = 3.4;
      for (var j = ROWS - 1; j >= 0; j--) {
        var z = 2.2 + j * 0.42;
        for (var i = 0; i < COLS; i++) {
          var x = (i - (COLS - 1) / 2) * 0.36;
          var h = height(x, z, t);
          var sx = cx + (x / z) * focal;
          var sy = horizon + ((camY - h * 0.85) / z) * focal * 0.55;
          if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue;
          var near = 1 - j / ROWS;
          var lift = (h + 2.1) / 4.2;
          var size = (0.8 + near * 2.2) * (0.6 + lift * 0.9);
          var alpha = Math.max(0, Math.min(1, (0.10 + lift * lift * 1.2) * (0.5 + near * 0.7)));
          var c = Math.round(150 + lift * 80);
          ctx.fillStyle = 'rgba(' + (c - 26) + ',' + (c - 6) + ',' + Math.min(255, c + 22) + ',' + alpha.toFixed(3) + ')';
          ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
        }
      }
    }
    function loop() {
      if (!visible) { raf = null; return; }
      t += 0.012;
      frame();
      raf = requestAnimationFrame(loop);
    }
    resize();
    window.addEventListener('resize', function () { resize(); if (reduce) frame(); });
    if (reduce) { t = 1.2; frame(); }
    else {
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) {
          visible = en[0].isIntersecting;
          if (visible && !raf) raf = requestAnimationFrame(loop);
        }).observe(canvas);
      }
      raf = requestAnimationFrame(loop);
    }
  }

  /* ---------- counters ---------- */
  function fmt(v, dec) { return v.toFixed(dec); }
  function runCount(el) {
    var to = parseFloat(el.getAttribute('data-to')), dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    if (reduce) { el.textContent = fmt(to, dec); return; }
    var t0 = null, dur = 1300;
    (function step(now) {
      if (now === undefined) { requestAnimationFrame(step); return; }
      if (t0 === null) t0 = now;
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(to * e, dec);
      if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(to, dec);
    })();
  }

  /* ---------- dots in the routing note ---------- */
  $$('.dots').forEach(function (d) {
    var total = parseInt(d.getAttribute('data-total'), 10), hit = parseInt(d.getAttribute('data-hit'), 10);
    for (var i = 0; i < total; i++) {
      var dot = document.createElement('i');
      if (i < hit) dot.className = 'hit';
      dot.style.transitionDelay = (200 + i * 55) + 'ms';
      d.appendChild(dot);
    }
  });

  /* ---------- tiles: reveal on scroll, then start their own little animations ---------- */
  function activate(tile) {
    if (tile._on) return; tile._on = true;
    tile.classList.add('in');
    $$('.count', tile).forEach(runCount);
    $$('.bar', tile).forEach(function (b, i) {
      if (parseFloat(b.getAttribute('data-w')) < 30) b.classList.add('out');
      setTimeout(function () { b.style.width = b.getAttribute('data-w') + '%'; }, reduce ? 0 : 250 + i * 80);
    });
    $$('.peek b', tile).forEach(function (b, i) {
      setTimeout(function () { b.style.height = b.getAttribute('data-h') + '%'; }, reduce ? 0 : 300 + i * 200);
    });
  }
  var tiles = $$('.tile');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        setTimeout(function () { activate(el); }, n * 70);
        n++;
        io.unobserve(el);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
    tiles.forEach(function (el) { io.observe(el); });
  } else {
    tiles.forEach(activate);
  }

  /* ---------- views (dock tabs) ---------- */
  var views = $$('.view'), tabs = $$('.dock [data-tab]');
  function show(name, scroll) {
    var found = false;
    views.forEach(function (v) {
      var on = v.getAttribute('data-view') === name;
      if (on) found = true;
      v.hidden = !on;
      v.classList.toggle('is-active', on);
    });
    if (!found) return;
    tabs.forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-tab') === name); });
    if (scroll) {
      var top = $('.view.is-active').getBoundingClientRect().top + window.scrollY - 24;
      window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
    }
    if (history.replaceState) history.replaceState(null, '', '#' + name);
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-tab]') : null;
    if (!el) return;
    e.preventDefault();
    closeSheet();
    show(el.getAttribute('data-tab'), true);
  });
  var start = (location.hash || '').replace('#', '');
  if (start === 'notes' || start === 'about') show(start, false);

  /* ---------- project detail sheet ---------- */
  var sheet = $('#sheet'), body = $('#sheet-body'), panel = $('.sheet-panel'), lastFocus = null;
  function openSheet(id) {
    var tpl = document.getElementById(id);
    if (!tpl) return;
    body.innerHTML = '';
    body.appendChild(tpl.content.cloneNode(true));
    lastFocus = document.activeElement;
    sheet.hidden = false;
    document.body.classList.add('locked');
    panel.scrollTop = 0;
    panel.focus();
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.hidden = true;
    document.body.classList.remove('locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function tileAction(tile) {
    var open = tile.getAttribute('data-open'), href = tile.getAttribute('data-href');
    if (open) openSheet(open);
    else if (href) window.open(href, '_blank', 'noopener');
  }
  $$('.tile[data-open], .tile[data-href]').forEach(function (tile) {
    tile.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) return;
      tileAction(tile);
    });
    tile.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tileAction(tile); }
    });
  });
  sheet.addEventListener('click', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-close')) closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
})();
