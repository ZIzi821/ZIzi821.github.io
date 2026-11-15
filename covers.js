/* Animated covers: every project tile plays a small loop made from that project's own content.
   Comments and vocabulary shown in the covers are examples; metrics are the ones in the repositories. */
(function () {
  'use strict';
  var ZZ = window.ZZ || {}, reduce = !!ZZ.reduce;
  var $ = ZZ.$, $$ = ZZ.$$;
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /* A scene gets (el, st). st.on is true while the tile is on screen; `await st.wait()` parks the loop while it is not. */
  function makeState() {
    var st = { on: false };
    st.wait = async function () { while (!st.on) await sleep(250); };
    st.pause = async function (ms) { await sleep(ms); await st.wait(); };
    return st;
  }
  async function type(el, text, speed, st) {
    for (var i = 1; i <= text.length; i++) { el.textContent = text.slice(0, i); await sleep(speed); if (!st.on) await st.wait(); }
  }
  function canvasFit(c) {
    var r = c.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(r.width * d); c.height = Math.round(r.height * d);
    var x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0);
    return { ctx: x, w: r.width, h: r.height };
  }
  var scenes = {};

  /* ---------- 1. content-review workflow: an example comment runs through the nodes ---------- */
  scenes.workflow = async function (el, st) {
    el.innerHTML = '<div class="s-wf"><div class="wf-card"><span class="lbl">示例评论</span><p class="txt"></p></div>' +
      '<ol class="wf-steps"><li>检索规则</li><li>大模型判定</li><li>代码核对</li></ol>' +
      '<div class="wf-out"><span class="cat">—</span><span class="conf">置信度 —</span></div>' +
      '<div class="wf-routes"><span class="auto">自动标注</span><span class="human">人工复核</span></div>' +
      '<p class="wf-tally">已处理 <b class="n">0</b> 条 · 转人工 <b class="h">0</b> 条</p></div>';
    var txt = $('.txt', el), steps = $$('.wf-steps li', el), cat = $('.cat', el), conf = $('.conf', el),
        auto = $('.auto', el), human = $('.human', el), nEl = $('.n', el), hEl = $('.h', el), n = 0, h = 0;
    var samples = [
      ['加我领取优惠券，名额有限，先到先得', '广告引流', 0.95],
      ['这家店的面真不错，下次还来', '正常', 0.93],
      ['写出这种东西，作者脑子是不是有问题', '攻击辱骂', 0.88],
      ['呵呵，你可真是个大聪明', '攻击辱骂', 0.65]
    ];
    if (reduce) { txt.textContent = samples[0][0]; cat.textContent = samples[0][1]; conf.textContent = '置信度 0.95'; auto.classList.add('on'); return; }
    for (var i = 0; ; i = (i + 1) % samples.length) {
      await st.wait();
      var s = samples[i];
      steps.forEach(function (x) { x.className = ''; }); auto.className = 'auto'; human.className = 'human';
      cat.textContent = '—'; cat.className = 'cat'; conf.textContent = '置信度 —';
      await type(txt, s[0], 42, st);
      for (var k = 0; k < steps.length; k++) { steps[k].className = 'run'; await st.pause(520); steps[k].className = 'done'; }
      cat.textContent = s[1]; cat.className = 'cat show' + (s[1] === '正常' ? '' : ' bad');
      for (var c = 0; c <= 10; c++) { conf.textContent = '置信度 ' + (s[2] * c / 10).toFixed(2); await sleep(35); }
      var toHuman = s[2] < 0.7;
      (toHuman ? human : auto).classList.add('on');
      n++; if (toHuman) h++; nEl.textContent = n; hEl.textContent = h;
      await st.pause(1700);
    }
  };

  /* ---------- 2. e-commerce: the customer-ID quality check, typed out, then its result ---------- */
  scenes.sql = async function (el, st) {
    var lines = [
      'WITH first_order AS (',
      '  SELECT customer_id, min(order_ts) AS first_ts',
      '  FROM orders GROUP BY customer_id',
      ')',
      'SELECT strftime(date_trunc(\'month\', o.order_ts), \'%Y-%m\') AS month,',
      '       count(*) AS orders,',
      '       count(DISTINCT o.customer_id) AS customers,',
      '       round(count(*) FILTER (WHERE o.order_ts = f.first_ts)',
      '             / count(*), 4) AS first_order_share',
      'FROM orders o JOIN first_order f USING (customer_id)',
      'GROUP BY 1 ORDER BY 1;'
    ];
    function paint(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/('[^']*')/g, '<i class="str">$1</i>')
        .replace(/\b(WITH|AS|SELECT|FROM|GROUP BY|ORDER BY|JOIN|USING|FILTER|WHERE|DISTINCT)\b/g, '<i class="kw">$1</i>')
        .replace(/\b(min|count|round|strftime|date_trunc)\b/g, '<i class="fn">$1</i>');
    }
    el.innerHTML = '<div class="s-sql"><div class="sql-bar"><i></i><i></i><i></i><span>04_customer_id_quality_check.sql</span></div>' +
      '<pre class="sql-code"></pre><div class="sql-res"></div></div>';
    var code = $('.sql-code', el), res = $('.sql-res', el);
    var rows = [['… 2017-09', '…', ''], ['2017-10', '1.0000', 'hot'], ['2017-11', '1.0000', 'hot'], ['2017-12', '1.0000', 'hot']];
    function table(n, flag) {
      var h = '<table><tr><th>month</th><th>first_order_share</th></tr>';
      for (var i = 0; i < n; i++) h += '<tr class="' + rows[i][2] + '"><td>' + rows[i][0] + '</td><td>' + rows[i][1] + '</td></tr>';
      return h + '</table>' + (flag ? '<p class="sql-flag">订单数 = 客户数 → 客户 ID 断档，复购分析只用 2017-09 之前</p>' : '');
    }
    if (reduce) { code.innerHTML = lines.map(paint).join('\n'); res.innerHTML = table(rows.length, true); return; }
    for (;;) {
      await st.wait();
      code.innerHTML = ''; res.innerHTML = ''; res.className = 'sql-res';
      for (var i = 0; i < lines.length; i++) {
        var row = document.createElement('span'); row.className = 'ln'; code.appendChild(row);
        await type(row, lines[i], 9, st);
        row.innerHTML = paint(lines[i]);
        code.appendChild(document.createTextNode('\n'));
      }
      await st.pause(350); res.className = 'sql-res show';
      for (var r = 1; r <= rows.length; r++) { res.innerHTML = table(r, false); await st.pause(260); }
      res.innerHTML = table(rows.length, true);
      await st.pause(3600);
    }
  };

  /* ---------- 3. Cairn: a real smoke-test question, the retrieval trace, quotes being verified ---------- */
  scenes.cairn = async function (el, st) {
    el.innerHTML = '<div class="s-qa"><div class="qa-q"><span class="lbl">提问 · 马来西亚校区</span><p></p></div>' +
      '<ul class="qa-trace"><li>译成英文再检索</li><li>召回 20 段</li><li>重排，留 6 段</li></ul>' +
      '<div class="qa-a"><span class="lbl">一句话结论</span><div class="sk w90"></div><div class="sk w60"></div>' +
      '<span class="lbl">下一步</span><ul class="qa-todo"><li><b></b><i class="sk w70"></i></li><li><b></b><i class="sk w80"></i></li><li><b></b><i class="sk w50"></i></li></ul>' +
      '<span class="lbl">原文依据</span><div class="qa-quotes"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
      '<p class="qa-ver"><b>0</b> / 7 条引文已由服务器逐字核对</p></div></div>';
    var q = $('.qa-q p', el), trace = $$('.qa-trace li', el), a = $('.qa-a', el), todo = $$('.qa-todo li', el), quotes = $$('.qa-quotes i', el), ver = $('.qa-ver b', el);
    var question = '过了 census date 再退课，学费能退吗？会有什么后果？';
    if (reduce) { q.textContent = question; a.classList.add('show'); trace.forEach(function (x) { x.className = 'done'; }); quotes.forEach(function (x) { x.className = 'ok'; }); ver.textContent = '7'; return; }
    for (;;) {
      await st.wait();
      a.className = 'qa-a'; trace.forEach(function (x) { x.className = ''; }); todo.forEach(function (x) { x.className = ''; });
      quotes.forEach(function (x) { x.className = ''; }); ver.textContent = '0';
      await type(q, question, 55, st);
      for (var i = 0; i < trace.length; i++) { trace[i].className = 'run'; await st.pause(600); trace[i].className = 'done'; }
      a.className = 'qa-a show'; await st.pause(900);
      for (var k = 0; k < todo.length; k++) { todo[k].className = 'tick'; await st.pause(420); }
      for (var j = 0; j < quotes.length; j++) { quotes[j].className = 'chk'; await st.pause(230); quotes[j].className = 'ok'; ver.textContent = j + 1; }
      await st.pause(3200);
    }
  };

  /* ---------- 4. A/B testing: a live A/A simulation, peeking every day versus looking once ---------- */
  scenes.ab = function (el, st) {
    el.innerHTML = '<div class="s-ab"><canvas></canvas><div class="ab-hud"><span>A/A 模拟 <b class="n">0</b> 次</span><span>只看最后一次 <b class="f">—</b></span><span class="hot">每天偷看 <b class="p">—</b></span></div></div>';
    var c = $('canvas', el), nEl = $('.n', el), fEl = $('.f', el), pEl = $('.p', el);
    var DAYS = 14, PER = 180, P = 0.10, runs = 0, fpFixed = 0, fpPeek = 0, history = [], cur = null, g, raf = null, lastT = 0;
    function simulate() {
      var a = 0, b = 0, n = 0, zs = [];
      for (var d = 0; d < DAYS; d++) {
        for (var i = 0; i < PER; i++) { if (Math.random() < P) a++; if (Math.random() < P) b++; }
        n += PER;
        var pp = (a + b) / (2 * n), se = Math.sqrt(pp * (1 - pp) * 2 / n);
        zs.push(se > 0 ? (a / n - b / n) / se : 0);
      }
      var first = -1;
      for (var k = 0; k < DAYS; k++) if (Math.abs(zs[k]) > 1.96) { first = k; break; }
      return { z: zs, first: first, fin: Math.abs(zs[DAYS - 1]) > 1.96, drawn: 0 };
    }
    function X(d) { return 14 + (g.w - 28) * d / (DAYS - 1); }
    function Y(z) { return g.h * 0.5 - z * (g.h * 0.36) / 3; }
    function path(run, upto, alpha) {
      var x = g.ctx;
      x.globalAlpha = alpha; x.strokeStyle = run.first >= 0 ? '#f0a36b' : '#9db6da'; x.lineWidth = 1.2;
      x.beginPath();
      var whole = Math.floor(upto), frac = upto - whole;
      for (var d = 0; d <= whole && d < DAYS; d++) { if (d === 0) x.moveTo(X(0), Y(run.z[0])); else x.lineTo(X(d), Y(run.z[d])); }
      if (whole < DAYS - 1 && frac > 0) x.lineTo(X(whole + frac), Y(run.z[whole] + (run.z[whole + 1] - run.z[whole]) * frac));
      x.stroke();
      if (run.first >= 0 && upto >= run.first) { x.globalAlpha = Math.min(1, alpha * 2.2); x.fillStyle = '#f0a36b'; x.fillRect(X(run.first) - 2.5, Y(run.z[run.first]) - 2.5, 5, 5); }
    }
    function frame(now) {
      raf = null;
      if (!st.on) return;
      if (!g || !g.w) g = canvasFit(c);
      var dt = Math.min(60, now - (lastT || now)); lastT = now;
      if (!cur) cur = simulate();
      cur.drawn += dt / 34;
      var x = g.ctx;
      x.clearRect(0, 0, g.w, g.h);
      x.globalAlpha = 0.5; x.strokeStyle = '#6a6a6a'; x.setLineDash([4, 5]); x.lineWidth = 1;
      [1.96, -1.96].forEach(function (z) { x.beginPath(); x.moveTo(8, Y(z)); x.lineTo(g.w - 8, Y(z)); x.stroke(); });
      x.setLineDash([]);
      x.globalAlpha = 0.25; x.beginPath(); x.moveTo(8, Y(0)); x.lineTo(g.w - 8, Y(0)); x.stroke();
      for (var i = 0; i < history.length; i++) path(history[i], DAYS, 0.05 + 0.22 * (i + 1) / history.length);
      path(cur, cur.drawn, 1);
      if (cur.drawn >= DAYS + 3) {
        runs++; if (cur.fin) fpFixed++; if (cur.first >= 0) fpPeek++;
        history.push(cur); if (history.length > 26) history.shift();
        cur = null;
        nEl.textContent = runs; fEl.textContent = (fpFixed / runs * 100).toFixed(1) + '%'; pEl.textContent = (fpPeek / runs * 100).toFixed(1) + '%';
      }
      raf = requestAnimationFrame(frame);
    }
    st.onShow = function () { g = canvasFit(c); lastT = 0; if (!raf) raf = requestAnimationFrame(frame); };
    window.addEventListener('resize', function () { g = null; });
    if (reduce) {
      st.onShow = function () {
        g = canvasFit(c);
        for (var i = 0; i < 400; i++) { var r = simulate(); runs++; if (r.fin) fpFixed++; if (r.first >= 0) fpPeek++; if (i > 380) history.push(r); }
        history.forEach(function (r) { path(r, DAYS, 0.5); });
        nEl.textContent = runs; fEl.textContent = (fpFixed / runs * 100).toFixed(1) + '%'; pEl.textContent = (fpPeek / runs * 100).toFixed(1) + '%';
        st.onShow = null;
      };
    }
  };

  /* ---------- 5. mini program: rate a word, the forgetting curve decides when it comes back ---------- */
  scenes.app = async function (el, st) {
    el.innerHTML = '<div class="s-app"><div class="phone"><div class="ph-top"><span>① 先背单词</span><i><b></b></i></div>' +
      '<div class="ph-card"><h4></h4><p></p></div>' +
      '<div class="ph-btns"><span>没记住</span><span>有点难</span><span>记住了</span><span>太简单</span></div>' +
      '<svg class="ph-curve" viewBox="0 0 200 70" preserveAspectRatio="none"><line x1="0" y1="14" x2="200" y2="14"/><path d=""/><circle r="3.2" cx="0" cy="14"/></svg>' +
      '<p class="ph-note">回忆概率降到 90% 时安排复习</p></div></div>';
    var h4 = $('.ph-card h4', el), p = $('.ph-card p', el), card = $('.ph-card', el), btns = $$('.ph-btns span', el),
        bar = $('.ph-top b', el), curve = $('.ph-curve path', el), dot = $('.ph-curve circle', el);
    var words = [['borrow', 'v. 借入'], ['weather', 'n. 天气'], ['library', 'n. 图书馆'], ['healthy', 'adj. 健康的'], ['invite', 'v. 邀请']];
    var picks = [2, 1, 2, 0, 3], rate = [0.070, 0.036, 0.018, 0.009];        // illustrative decay per rating
    function drawCurve(k) {
      var d = '', hit = 200;
      for (var x = 0; x <= 200; x += 4) { var y = 4 + 66 * (1 - Math.exp(-k * x)); d += (x ? 'L' : 'M') + x + ' ' + y.toFixed(1); }
      hit = Math.min(196, -Math.log(1 - 10 / 66) / k);
      curve.setAttribute('d', d); dot.setAttribute('cx', hit.toFixed(1));
    }
    if (reduce) { h4.textContent = words[0][0]; p.textContent = words[0][1]; btns[2].className = 'on'; drawCurve(rate[2]); bar.style.width = '40%'; return; }
    for (var i = 0; ; i = (i + 1) % words.length) {
      await st.wait();
      btns.forEach(function (b) { b.className = ''; });
      card.className = 'ph-card flip'; await sleep(220);
      h4.textContent = words[i][0]; p.textContent = words[i][1]; card.className = 'ph-card';
      bar.style.width = ((i + 1) / words.length * 100) + '%';
      await st.pause(1300);
      btns[picks[i]].className = 'on';
      curve.classList.remove('draw'); drawCurve(rate[picks[i]]); void curve.getBoundingClientRect(); curve.classList.add('draw');
      await st.pause(2300);
    }
  };

  /* ---------- 6. prompt v1 versus v2 on the 80 test items ---------- */
  scenes.metrics = async function (el, st) {
    var m = [['Macro-F1', '0.795', 79.5, '0.950', 95], ['漏判率', '25.0%', 25, '5.0%', 5], ['攻击辱骂识别', '9 / 20', 45, '18 / 20', 90], ['人工复核比例', '12.5%', 12.5, '11.2%', 11.2]];
    el.innerHTML = '<div class="s-mx"><p class="mx-tag"><b>Prompt v1</b></p>' + m.map(function (r) {
      return '<div class="mx-row"><label>' + r[0] + '</label><i><b></b></i><span></span></div>';
    }).join('') + '</div>';
    var tag = $('.mx-tag b', el), rows = $$('.mx-row', el), wrap = $('.s-mx', el);
    function set(v2) {
      tag.textContent = v2 ? 'Prompt v2' : 'Prompt v1'; wrap.classList.toggle('v2', v2);
      rows.forEach(function (r, i) { $('i b', r).style.width = m[i][v2 ? 4 : 2] + '%'; $('span', r).textContent = m[i][v2 ? 3 : 1]; });
    }
    set(false);
    if (reduce) { set(true); return; }
    for (var v = false; ; v = !v) { await st.wait(); set(v); await st.pause(2600); }
  };

  /* ---------- 7. Cairn: seven retrieval methods, MRR@10 ---------- */
  scenes.race = async function (el, st) {
    var m = [['BM25（关键词）', 0.375], ['混合检索 0.4 / 0.6', 0.590], ['RRF 融合', 0.703], ['向量', 0.709], ['RRF + 重排', 0.754], ['向量 + 重排', 0.762], ['翻译 + 向量 + 重排', 0.839]];
    el.innerHTML = '<div class="s-race"><p class="lbl">MRR@10</p>' + m.map(function (r, i) {
      return '<div class="rc-row' + (i === m.length - 1 ? ' best' : '') + '"><label>' + r[0] + '</label><i><b></b></i><span>0.000</span></div>';
    }).join('') + '</div>';
    var rows = $$('.rc-row', el);
    async function grow(i) {
      var b = $('i b', rows[i]), s = $('span', rows[i]);
      b.style.width = (m[i][1] * 100) + '%';
      for (var k = 1; k <= 12; k++) { s.textContent = (m[i][1] * k / 12).toFixed(3); await sleep(28); }
    }
    if (reduce) { rows.forEach(function (r, i) { $('i b', r).style.width = (m[i][1] * 100) + '%'; $('span', r).textContent = m[i][1].toFixed(3); }); return; }
    for (;;) {
      await st.wait();
      rows.forEach(function (r) { $('i b', r).style.width = '0'; $('span', r).textContent = '0.000'; r.classList.remove('win'); });
      await st.pause(500);
      for (var i = 0; i < m.length; i++) { await grow(i); await st.pause(160); }
      rows[m.length - 1].classList.add('win');
      await st.pause(3400);
    }
  };

  /* ---------- 8. teachloop-skills: eight behaviour scenarios, three requests that must not trigger ---------- */
  scenes.skill = async function (el, st) {
    var a = ['首页加统计卡', '新学生没有观察数据', '提交后被重复催交', '成人学员自己确认学完', 'AI 录音分析', '教师预览', '错题与板书分流', '刷选择题后延长复习'];
    var b = ['排版作业 PDF', '查询微信 API', '修改简历'];
    el.innerHTML = '<div class="s-sk"><p class="lbl">8 个行为场景</p><ul class="sk-a">' + a.map(function (x) { return '<li><b></b>' + x + '</li>'; }).join('') +
      '</ul><p class="lbl">3 个不该触发的请求</p><ul class="sk-b">' + b.map(function (x) { return '<li><b></b>' + x + '</li>'; }).join('') + '</ul></div>';
    var la = $$('.sk-a li', el), lb = $$('.sk-b li', el);
    if (reduce) { la.forEach(function (x) { x.className = 'ok'; }); lb.forEach(function (x) { x.className = 'skip'; }); return; }
    for (;;) {
      await st.wait();
      la.concat(lb).forEach(function (x) { x.className = ''; });
      await st.pause(500);
      for (var i = 0; i < la.length; i++) { la[i].className = i === 5 ? 'fail' : 'ok'; await st.pause(300); }
      for (var j = 0; j < lb.length; j++) { lb[j].className = 'skip'; await st.pause(300); }
      await st.pause(900); la[5].className = 'retry'; await st.pause(1100); la[5].className = 'ok';
      await st.pause(3000);
    }
  };

  /* ---------- 9. C++: keys dropping into a binary search tree ---------- */
  scenes.bst = function (el, st) {
    el.innerHTML = '<div class="s-bst"><canvas></canvas><p class="lbl">BST · insert</p></div>';
    var c = $('canvas', el), g = null, raf = null, root = null, queue = [], fly = null, lastT = 0, hold = 0;
    function reset() {
      root = null; hold = 0;
      var pool = [50, 28, 72, 14, 39, 61, 86, 33, 45, 67];
      var rest = pool.slice(1).sort(function () { return Math.random() - 0.5; });
      queue = [50].concat(rest.slice(0, 8));
    }
    function place(key) {                                        // returns the path of nodes visited and the new node
      var node = { k: key, l: null, r: null, x: 0.5, y: 0, a: 0 }, path = [];
      if (!root) { root = node; return { node: node, path: path }; }
      var cur = root, depth = 1, span = 0.25;
      for (;;) {
        path.push(cur);
        if (key < cur.k) { if (!cur.l) { node.x = cur.x - span; node.y = depth; cur.l = node; break; } cur = cur.l; }
        else { if (!cur.r) { node.x = cur.x + span; node.y = depth; cur.r = node; break; } cur = cur.r; }
        depth++; span /= 2;
      }
      return { node: node, path: path };
    }
    function px(n) { return [16 + (g.w - 32) * n.x, 30 + n.y * Math.min(52, (g.h - 70) / 3.2)]; }
    function drawTree(n) {
      if (!n) return;
      var x = g.ctx, p = px(n);
      [n.l, n.r].forEach(function (ch) { if (ch && ch.a > 0) { var q = px(ch); x.globalAlpha = 0.35 * ch.a; x.strokeStyle = '#9db6da'; x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(q[0], q[1]); x.stroke(); } });
      drawTree(n.l); drawTree(n.r);
      if (n.a <= 0) return;
      x.globalAlpha = n.a; x.fillStyle = n.hot ? '#f0a36b' : '#1b2330'; x.strokeStyle = n.hot ? '#f0a36b' : '#9db6da';
      x.beginPath(); x.arc(p[0], p[1], 12, 0, 6.2832); x.fill(); x.stroke();
      x.fillStyle = n.hot ? '#0b0b0b' : '#dfe9f8'; x.font = '10.5px ui-monospace, Consolas, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(n.k, p[0], p[1] + 0.5);
    }
    function frame(now) {
      raf = null;
      if (!st.on) return;
      if (!g || !g.w) g = canvasFit(c);
      var dt = Math.min(60, now - (lastT || now)); lastT = now;
      if (!fly) {
        if (queue.length) { var r = place(queue.shift()); fly = { node: r.node, path: r.path, i: 0, t: 0 }; }
        else { hold += dt; if (hold > 2600) reset(); }
      }
      if (fly) {
        fly.t += dt;
        if (fly.i < fly.path.length) {
          fly.path.forEach(function (n, k) { n.hot = k === fly.i; });
          if (fly.t > 330) { fly.t = 0; fly.i++; }
        } else {
          fly.path.forEach(function (n) { n.hot = false; });
          fly.node.a = Math.min(1, fly.node.a + dt / 260);
          if (fly.node.a >= 1 && fly.t > 420) fly = null;
        }
      }
      g.ctx.clearRect(0, 0, g.w, g.h); g.ctx.lineWidth = 1.2;
      drawTree(root); g.ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    reset();
    st.onShow = function () { g = canvasFit(c); lastT = 0; if (!raf) raf = requestAnimationFrame(frame); };
    window.addEventListener('resize', function () { g = null; });
    if (reduce) st.onShow = function () { g = canvasFit(c); while (queue.length) place(queue.shift()).node.a = 1; if (root) root.a = 1; g.ctx.lineWidth = 1.2; drawTree(root); st.onShow = null; };
  };

  /* ---------- 10. ZIzi Game: falling stars and a paddle ---------- */
  scenes.game = function (el, st) {
    el.innerHTML = '<div class="s-game"><canvas></canvas><p class="lbl">STARFALL</p></div>';
    var c = $('canvas', el), g = null, raf = null, drops = [], pad = 0.5, score = 0, lastT = 0;
    function frame(now) {
      raf = null;
      if (!st.on) return;
      if (!g || !g.w) g = canvasFit(c);
      var dt = Math.min(60, now - (lastT || now)); lastT = now;
      if (drops.length < 7 && Math.random() < 0.04) drops.push({ x: Math.random() * 0.9 + 0.05, y: -0.05, v: 0.00022 + Math.random() * 0.00025 });
      var target = 0.5, best = -1;
      drops.forEach(function (d) { d.y += d.v * dt; if (d.y > best && d.y < 0.9) { best = d.y; target = d.x; } });
      pad += (target - pad) * Math.min(1, dt / 180);
      drops = drops.filter(function (d) { if (d.y >= 0.88 && Math.abs(d.x - pad) < 0.07) { score++; return false; } return d.y < 1.05; });
      var x = g.ctx; x.clearRect(0, 0, g.w, g.h);
      drops.forEach(function (d) {
        var px = d.x * g.w, py = d.y * g.h;
        x.globalAlpha = 0.9; x.fillStyle = '#f3d98b'; x.fillRect(px - 1, py - 5, 2, 10); x.fillRect(px - 5, py - 1, 10, 2);
        x.globalAlpha = 0.25; x.fillRect(px - 0.5, py - 22, 1, 16);
      });
      x.globalAlpha = 1; x.fillStyle = '#bfd3f1'; x.fillRect(pad * g.w - 22, g.h * 0.9, 44, 4);
      x.fillStyle = '#8a8a8a'; x.font = '10.5px ui-monospace, Consolas, monospace'; x.textAlign = 'right'; x.fillText('SCORE ' + score, g.w - 12, 18);
      raf = requestAnimationFrame(frame);
    }
    st.onShow = function () { g = canvasFit(c); lastT = 0; if (!raf && !reduce) raf = requestAnimationFrame(frame); };
    window.addEventListener('resize', function () { g = null; });
  };

  /* ---------- screenshots: the motion is CSS only ---------- */
  scenes.shot = function () {};

  /* ---------- mount every cover and run it only while it is on screen ---------- */
  $$('.tile[data-cover]').forEach(function (tile) {
    var fn = scenes[tile.getAttribute('data-cover')], el = $('.cover', tile);
    if (!fn || !el) return;
    var st = makeState();
    try { var r = fn(el, st); if (r && r.catch) r.catch(function () {}); } catch (e) {}
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        st.on = en[0].isIntersecting;
        tile.classList.toggle('playing', st.on);
        if (st.on && st.onShow) st.onShow();
      }, { threshold: 0.15 }).observe(tile);
    } else { st.on = true; tile.classList.add('playing'); if (st.onShow) st.onShow(); }
  });
})();
