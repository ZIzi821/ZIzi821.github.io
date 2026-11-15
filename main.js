/* ZIzi portfolio — plain JavaScript, no dependencies */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  /* ---------- theme ---------- */
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}
  if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  $('#themeBtn').addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* ---------- scroll progress, nav state, active link ---------- */
  var progress = $('#progress'), nav = $('#nav');
  var links = $$('.nav-links a');
  var sections = links.map(function (a) { return $(a.getAttribute('href')); });
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    nav.classList.toggle('scrolled', window.scrollY > 30);
    var idx = -1;
    sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < window.innerHeight * 0.4) idx = i; });
    links.forEach(function (a, i) { a.classList.toggle('active', i === idx); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- number counters ---------- */
  function fmt(v, dec, sep) {
    var s = v.toFixed(dec);
    if (sep) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return s;
  }
  function runCount(el) {
    var to = parseFloat(el.getAttribute('data-to'));
    var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    var sep = el.getAttribute('data-sep') === '1';
    if (reduce) { el.textContent = fmt(to, dec, sep); return; }
    var t0 = null, dur = 1400;
    function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(to * e, dec, sep);
      if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(to, dec, sep);
    }
    requestAnimationFrame(step);
  }

  /* ---------- dots (routing note) ---------- */
  $$('.dots').forEach(function (d) {
    var total = parseInt(d.getAttribute('data-total'), 10), hit = parseInt(d.getAttribute('data-hit'), 10);
    for (var i = 0; i < total; i++) {
      var dot = document.createElement('i');
      if (i < hit) dot.className = 'hit';
      dot.style.transitionDelay = (i * 60) + 'ms';
      d.appendChild(dot);
    }
  });

  /* ---------- reveal on scroll ---------- */
  function activate(el) {
    el.classList.add('in');
    $$('.count', el).forEach(function (c) { if (!c._done) { c._done = true; runCount(c); } });
    $$('.bar, .m-bar', el).forEach(function (b, i) {
      setTimeout(function () { b.style.width = b.getAttribute('data-w') + '%'; }, reduce ? 0 : 120 + i * 90);
    });
    $$('.peek-bar', el).forEach(function (b, i) {
      setTimeout(function () { b.style.height = b.getAttribute('data-h') + '%'; }, reduce ? 0 : 200 + i * 220);
    });
    $$('.pipeline, .dots', el).forEach(function (p) { p.classList.add('in'); });
  }
  var targets = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { activate(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(activate);
  }

  /* ---------- typed line ---------- */
  var phrases = [
    '给内容审核工作流做 Prompt 评测',
    '用 SQL 找出需要优先核查的点位',
    '让 AI 的每句回答都带上原文出处',
    '给自己的学生做背词小程序',
    '检查 A/B 实验为什么不能提前偷看'
  ];
  var typed = $('#typed');
  if (typed) {
    if (reduce) { typed.textContent = phrases[0]; }
    else {
      var pi = 0, ci = 0, del = false;
      (function tick() {
        var p = phrases[pi];
        typed.textContent = p.slice(0, ci);
        var wait = del ? 28 : 70;
        if (!del && ci === p.length) { del = true; wait = 1700; }
        else if (del && ci === 0) { del = false; pi = (pi + 1) % phrases.length; wait = 350; }
        else { ci += del ? -1 : 1; }
        setTimeout(tick, wait);
      })();
    }
  }

  /* ---------- hero particle field ---------- */
  var canvas = $('#field');
  if (canvas && canvas.getContext && !reduce) {
    var ctx = canvas.getContext('2d'), W = 0, H = 0, pts = [], mouse = { x: -999, y: -999 }, raf = null, visible = true;
    var hero = canvas.parentElement;
    function resize() {
      var r = hero.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.max(36, Math.min(110, Math.round(W * H / 16000)));
      pts = [];
      for (var i = 0; i < n; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: Math.random() * 1.6 + .6 });
    }
    function color(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }
    function draw() {
      if (!visible) { raf = null; return; }
      ctx.clearRect(0, 0, W, H);
      var c1 = color('--a1'), c2 = color('--a2');
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        var dx = p.x - mouse.x, dy = p.y - mouse.y, dm = Math.sqrt(dx * dx + dy * dy);
        if (dm < 140 && dm > 0.01) { p.x += dx / dm * 0.6; p.y += dy / dm * 0.6; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = i % 3 ? c1 : c2; ctx.globalAlpha = .7; ctx.fill();
        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j], ex = p.x - q.x, ey = p.y - q.y, d = ex * ex + ey * ey;
          if (d < 130 * 130) {
            ctx.globalAlpha = (1 - Math.sqrt(d) / 130) * .22;
            ctx.strokeStyle = c2; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }
    resize();
    window.addEventListener('resize', resize);
    hero.addEventListener('mousemove', function (e) { var r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('mouseleave', function () { mouse.x = mouse.y = -999; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(draw); }).observe(hero);
    }
    raf = requestAnimationFrame(draw);
  }

  /* ---------- cursor glow, card tilt, magnetic buttons (pointer devices only) ---------- */
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var glow = $('#glow');
  if (fine && !reduce) {
    window.addEventListener('mousemove', function (e) { glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px'; }, { passive: true });
    $$('.tilt').forEach(function (card) {
      var max = card.classList.contains('small') ? 6 : 2.2;
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        card.style.transform = 'perspective(1100px) rotateX(' + (-y * max) + 'deg) rotateY(' + (x * max) + 'deg) translateY(-3px)';
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    });
    $$('.magnetic').forEach(function (b) {
      b.addEventListener('mousemove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .22) + 'px,' + ((e.clientY - r.top - r.height / 2) * .3) + 'px)';
      });
      b.addEventListener('mouseleave', function () { b.style.transform = ''; });
    });
  } else if (glow) { glow.style.display = 'none'; }

  /* ---------- open the right card when a note links to it, and vice versa ---------- */
  $$('a[href^="#p-"], a[href^="#n-"]').forEach(function (a) {
    a.addEventListener('click', function () {
      var t = $(a.getAttribute('href'));
      if (t) { var d = $('details', t); if (d) d.open = true; }
    });
  });
})();
