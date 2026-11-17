/* Yanyu Zhu (ZIzi) portfolio — core: hero sky, tiles, tabs, detail sheet. Plain JavaScript, no dependencies. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  window.ZZ = { reduce: reduce, $: $, $$: $$ };

  /* Quote card. The wording was drafted for Jason with his go-ahead (2026-11-15); change it here if he wants it said differently.
     While `text` is empty the card stays hidden. */
  var QUOTE = {
    text: 'Cairn 的方向是 ZIzi 先提出来的：只按原文回答，每句话都带出处。第一版回答提示词和界面怎么排也是 ZIzi 定的，给的要求具体，能直接照着做，我在这个基础上往下做。',
    name: 'Jason Liang',
    role: 'Cairn & TraceDesk Lite 队友'
  };

  /* ================= hero: stars, a dot-matrix planet and an orbit ================= */
  var canvas = $('#sky');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d'), W = 0, H = 0, dpr = 1, stars = [], t0 = performance.now(), last = 0, raf = null, visible = true;
    var Lx = -0.56, Ly = -0.36, Lz = 0.75;                       // light from the upper left
    function resize() {
      var r = canvas.getBoundingClientRect(), oldW = W;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // phones fire resize when the address bar slides in and out; keep the same stars unless the width really changed
      if (stars.length && Math.abs(W - oldW) < 2) return;
      stars = [];
      var n = Math.round(W * H / 9000);
      for (var i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 0.9 + 0.3, p: Math.random() * 6.28, s: 0.4 + Math.random() * 1.2 });
    }
    function surface(x, y, z) {                                  // procedural terrain on the unit sphere, 0..1
      var v = 0.5
        + 0.26 * Math.sin(4.1 * x + 1.7 * Math.sin(3.1 * y + 0.6))
        + 0.17 * Math.sin(6.7 * y + 2.2 * z + 1.1)
        + 0.12 * Math.sin(11.3 * z + 4.9 * x)
        + 0.07 * Math.sin(21.0 * x * y + 8.7 * z);
      return v < 0 ? 0 : v > 1 ? 1 : v;
    }
    function draw(now) {
      var time = (now - t0) / 1000;
      var intro = Math.min(1, time / 1.8), ease = 1 - Math.pow(1 - intro, 3);
      ctx.clearRect(0, 0, W, H);

      // stars
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        ctx.globalAlpha = (0.18 + 0.5 * (0.5 + 0.5 * Math.sin(time * s.s + s.p))) * ease;
        ctx.fillStyle = '#cfdcf2';
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }

      var R = Math.min(340, W * 0.36, H * 0.60) * (0.95 + 0.05 * ease);
      var cx = W / 2, cy = H * 0.07 + R;
      var a = time * 0.07, ca = Math.cos(a), sa = Math.sin(a);

      // orbit (behind the planet first)
      var orx = R * 1.72, ory = R * 0.46, tilt = -0.30, ct = Math.cos(tilt), st = Math.sin(tilt), ocy = cy - R * 0.08;
      function orbitPoint(th) {
        var ex = Math.cos(th) * orx, ey = Math.sin(th) * ory;
        return [cx + ex * ct - ey * st, ocy + ex * st + ey * ct, Math.sin(th) < 0];   // third value: on the far side
      }
      function hidden(p) { var dx = p[0] - cx, dy = p[1] - cy; return p[2] && dx * dx + dy * dy < R * R; }
      ctx.lineWidth = 1;
      for (var k = 0; k < 220; k++) {
        if (k % 2) continue;
        var p1 = orbitPoint(k / 220 * 6.2832), p2 = orbitPoint((k + 0.9) / 220 * 6.2832);
        if (hidden(p1)) continue;
        ctx.globalAlpha = (p1[2] ? 0.16 : 0.34) * ease;
        ctx.strokeStyle = '#a9c2e6';
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      }

      // planet: one square per grid cell, sized by how much light it gets
      var step = W < 640 ? 3.6 : 4.2, y0 = Math.max(0, cy - R), y1 = Math.min(H, cy + R);
      for (var py = y0; py <= y1; py += step) {
        var ny = (py - cy) / R, half = Math.sqrt(1 - ny * ny) * R;
        var iy = Math.round(py / step);
        for (var px = cx - half; px <= cx + half; px += step) {
          var nx = (px - cx) / R, nz2 = 1 - nx * nx - ny * ny;
          if (nz2 <= 0) continue;
          var nz = Math.sqrt(nz2);
          var light = nx * Lx + ny * Ly + nz * Lz;
          var ix = Math.round(px / step);
          if (light <= 0.02) {                                   // night side: a sparse dither so the limb still reads
            if ((ix + iy * 3) % 7 === 0 && nz < 0.55) { ctx.globalAlpha = 0.20 * ease; ctx.fillStyle = '#8fa9cf'; ctx.fillRect(px, py, 1, 1); }
            continue;
          }
          var rx = nx * ca + nz * sa, rz = -nx * sa + nz * ca;   // spin around the vertical axis
          var v = surface(rx, ny, rz);
          var b = light * (0.30 + 0.80 * v) + 0.22 * Math.pow(1 - nz, 3);
          if (b < 0.16 && (ix + iy) % 2) continue;               // dither the terminator
          if (b > 1) b = 1;
          var size = step * (0.22 + 0.70 * b);
          ctx.globalAlpha = (0.30 + 0.70 * b) * ease;
          ctx.fillStyle = v < 0.40 ? '#6f8fbd' : '#bfd3f1';
          ctx.fillRect(px - size / 2, py - size / 2, size, size);
        }
      }
      // thin limb on the dark side
      ctx.globalAlpha = 0.30 * ease; ctx.strokeStyle = '#9db6da'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, -1.15, 0.75); ctx.stroke();

      // a dark rise in front of the planet, so its lower half sinks into the page
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.translate(cx, cy + R * 1.0); ctx.scale(1.6, 1.12);
      var hill = ctx.createRadialGradient(0, 0, R * 0.62, 0, 0, R);
      hill.addColorStop(0, 'rgba(11,11,11,1)'); hill.addColorStop(0.35, 'rgba(11,11,11,.9)'); hill.addColorStop(1, 'rgba(11,11,11,0)');
      ctx.fillStyle = hill; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.2832); ctx.fill();
      ctx.restore();

      // satellite with a short trail
      var th = time * 0.32 + 0.8;
      for (var j = 0; j < 26; j++) {
        var q = orbitPoint(th - j * 0.022);
        if (hidden(q)) continue;
        ctx.globalAlpha = (1 - j / 26) * 0.9 * ease;
        ctx.fillStyle = '#eaf2ff';
        var sz = j === 0 ? 4 : 1.6;
        ctx.fillRect(q[0] - sz / 2, q[1] - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
    }
    function loop(now) {
      if (!visible) { raf = null; return; }
      if (now - last > 30) { last = now; draw(now); }
      raf = requestAnimationFrame(loop);
    }
    resize();
    window.addEventListener('resize', function () { resize(); if (reduce) draw(t0 + 5000); });
    if (reduce) draw(t0 + 5000);
    else {
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }).observe(canvas);
      }
      raf = requestAnimationFrame(loop);
    }
  }

  /* ================= counters and dots ================= */
  function runCount(el) {
    var to = parseFloat(el.getAttribute('data-to')), dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    if (reduce) { el.textContent = to.toFixed(dec); return; }
    var start = null;
    requestAnimationFrame(function step(now) {
      if (start === null) start = now;
      var p = Math.min(1, (now - start) / 1300), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (to * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(step); else el.textContent = to.toFixed(dec);
    });
  }
  $$('.dots').forEach(function (d) {
    var total = parseInt(d.getAttribute('data-total'), 10), hit = parseInt(d.getAttribute('data-hit'), 10);
    for (var i = 0; i < total; i++) {
      var dot = document.createElement('i');
      if (i < hit) dot.className = 'hit';
      dot.style.transitionDelay = (200 + i * 55) + 'ms';
      d.appendChild(dot);
    }
  });

  /* ================= quote card ================= */
  var quote = $('#quote');
  if (quote && QUOTE.text) {
    $('[data-quote-text]', quote).textContent = QUOTE.text;
    $('[data-quote-name]', quote).textContent = QUOTE.name;
    $('[data-quote-role]', quote).textContent = QUOTE.role;
    $('[data-quote-initials]', quote).textContent = QUOTE.name.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
    quote.hidden = false;
  } else if (quote) { quote.parentNode.removeChild(quote); }

  /* ================= tiles: reveal on scroll ================= */
  var tiles = $$('.tile');
  function activate(tile) {
    if (tile._on) return; tile._on = true;
    tile.classList.add('in');
    $$('.count', tile).forEach(runCount);
  }
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        setTimeout(function () { activate(el); }, n * 80);
        n++;
        io.unobserve(el);
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -4% 0px' });
    tiles.forEach(function (el) { io.observe(el); });
  } else { tiles.forEach(activate); }

  /* ================= views (dock tabs) ================= */
  var views = $$('.view'), tabs = $$('.dock [data-tab]');
  function show(name, scroll) {
    var found = false;
    views.forEach(function (v) { if (v.getAttribute('data-view') === name) found = true; });
    if (!found) return;
    views.forEach(function (v) {
      var on = v.getAttribute('data-view') === name;
      v.hidden = !on; v.classList.toggle('is-active', on);
    });
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
    e.preventDefault(); closeSheet(); show(el.getAttribute('data-tab'), true);
  });
  var startView = (location.hash || '').replace('#', '');
  if (startView === 'notes' || startView === 'about') show(startView, false);

  /* ================= project detail sheet ================= */
  /* An open sheet owns one history entry, so the phone's back gesture closes the sheet instead of leaving the site. */
  var sheet = $('#sheet'), body = $('#sheet-body'), lastFocus = null, canPush = !!(history.pushState && history.replaceState);
  if (canPush && history.state && history.state.sheet) history.replaceState(null, '');   // a reload while a sheet was open
  function openSheet(id) {
    var tpl = document.getElementById(id);
    if (!tpl) return;
    body.innerHTML = ''; body.appendChild(tpl.content.cloneNode(true));
    if (sheet.hidden) lastFocus = document.activeElement;
    if (canPush) { if (history.state && history.state.sheet) history.replaceState({ sheet: id }, ''); else history.pushState({ sheet: id }, ''); }
    sheet.hidden = false; document.body.classList.add('locked');
    body.scrollTop = 0; body.focus();
    setupShots(body);
  }

  /* Screenshot strip: arrow buttons, and a slow drift once it is in view that stops for good as soon as someone touches it. */
  var shots = { timer: null, io: null };
  function stopShots() {
    if (shots.timer) clearInterval(shots.timer); shots.timer = null;
    if (shots.io) shots.io.disconnect(); shots.io = null;
  }
  function setupShots(root) {
    stopShots();
    var strip = $('.shots', root);
    if (!strip) return;
    var btns = $$('[data-shots]', root), touched = false;
    function step() { var f = $('figure', strip); return f ? f.getBoundingClientRect().width + 16 : 250; }
    function atEnd() { return strip.scrollLeft >= strip.scrollWidth - strip.clientWidth - 4; }
    function update() { btns.forEach(function (b) { b.disabled = +b.getAttribute('data-shots') < 0 ? strip.scrollLeft <= 4 : atEnd(); }); }
    function halt() { touched = true; stopShots(); }
    btns.forEach(function (b) {
      b.addEventListener('click', function () { halt(); strip.scrollBy({ left: +b.getAttribute('data-shots') * step(), behavior: reduce ? 'auto' : 'smooth' }); });
    });
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function (ev) { strip.addEventListener(ev, halt, { passive: true }); });
    strip.addEventListener('scroll', update, { passive: true });
    update();
    if (reduce || !('IntersectionObserver' in window)) return;
    shots.io = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting || shots.timer || touched) return;
      shots.timer = setInterval(function () {
        if (document.hidden || strip.matches(':hover')) return;
        if (atEnd()) strip.scrollTo({ left: 0, behavior: 'smooth' }); else strip.scrollBy({ left: step(), behavior: 'smooth' });
      }, 2600);
    }, { root: body, threshold: 0.6 });
    shots.io.observe(strip);
  }
  function closeSheet(fromHistory) {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true; document.body.classList.remove('locked'); stopShots();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    if (fromHistory !== true && canPush && history.state && history.state.sheet) history.back();
  }
  window.addEventListener('popstate', function () { closeSheet(true); });
  function act(el) {
    var open = el.getAttribute('data-open'), href = el.getAttribute('data-href');
    if (open) openSheet(open); else if (href) window.open(href, '_blank', 'noopener');
  }
  $$('[data-open], [data-href]').forEach(function (el) {
    el.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) return; act(el); });
    if (el.tagName !== 'BUTTON') el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(el); } });
  });
  sheet.addEventListener('click', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-close')) closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
})();
