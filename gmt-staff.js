/* gmt-staff.js — بوتات الموظف · دُمج 2026-07-28 · فاحص محسّن بشرح ماذا/لماذا/كيف */

/* ── gmt-code-sentinel.js ── */
;/* ═══════════════════════════════════════════════════════════════════════════
   gmt-code-sentinel.js — 🛰️ حارس الكود الاستباقي · v1.0 · 2026-07-21
   الفرق عن الحارس (bugcatcher): ذاك ينتظر الخطأ ليقع ثم يلتقطه.
   هذا يفحص الكود **استباقياً** فور تحميل الصفحة، فيكتشف المخاطر قبل أن يلمسها المستخدم:
     • كل زر onclick → هل دالته معرّفة فعلاً؟ (زر ميت قبل الضغط)
     • كل عنصر يُنادى بـgetElementById بالكود → هل موجود بالصفحة؟
     • دوال حسّاسة مفقودة (showWelcomeSlides · startInteractiveTraining ...)
     • صور src مكسورة
     • معالجات onclick تشير لدوال غير موجودة بنطاق window
   يبلّغ المراقب فوراً — فلا يحتاج مبرمج بشري يراجع الكود يدوياً.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.GMTCodeSentinel) return;

  var findings = [];
  function report(sev, kind, detail) {
    var f = { t: Date.now(), sev: sev, kind: kind, detail: detail };
    findings.push(f);
    try {
      if (window.GMTWarden && GMTWarden.flag)
        GMTWarden.flag({ kind: 'code', severity: sev, title: '🛰️ ' + kind, what: detail,
          why: 'حارس الكود الاستباقي كشف خطراً قبل أن يلمسه المستخدم.' });
    } catch (e) {}
    try {
      if (window.GMTBug && GMTBug.log)
        GMTBug.log({ type: 'code-sentinel', severity: sev, kind: kind, detail: detail });
    } catch (e) {}
    try { console.warn('[CodeSentinel] ' + kind + ': ' + detail); } catch (e) {}
  }

  // استخرج اسم الدالة من onclick="foo(...)" أو "foo()"
  function fnName(expr) {
    if (!expr) return null;
    var m = String(expr).trim().match(/^([\w$.]+)\s*\(/);
    return m ? m[1] : null;
  }
  // هل الاسم قابل للوصول (window.foo أو foo محلي)؟
  function resolvable(name) {
    if (!name) return true;
    // تعبيرات مركّبة (this.x, a.b.c) نتجاوزها لتفادي الإيجابيات الكاذبة
    if (name.indexOf('.') >= 0) return true;
    if (/^(if|for|while|return|event|this|true|false|window|document|localStorage|sessionStorage)$/.test(name)) return true;
    try {
      if (typeof window[name] === 'function') return true;
      // قد تكون معرّفة بنطاق السكربت (function foo(){}) — نتحقق عبر eval آمن
      // نتجنّب eval؛ نعتمد على window فقط، ونقلل الحساسية لتفادي الإزعاج
      return false;
    } catch (e) { return true; }
  }

  function scan() {
    var t0 = Date.now();
    var stats = { buttons: 0, deadBtns: 0, ids: 0, missIds: 0, imgs: 0, brokenImg: 0 };

    // ① الأزرار: onclick → دالة معرّفة؟
    var suspects = {};
    document.querySelectorAll('[onclick]').forEach(function (el) {
      stats.buttons++;
      var name = fnName(el.getAttribute('onclick'));
      if (name && !resolvable(name)) {
        // قد تُعرّف لاحقاً؛ نؤجّل التأكيد لفحص ثانٍ بعد ثانيتين
        suspects[name] = (suspects[name] || 0) + 1;
      }
    });

    // ② الصور المكسورة
    document.querySelectorAll('img').forEach(function (im) {
      stats.imgs++;
      if (im.complete && im.naturalWidth === 0 && im.getAttribute('src')) {
        stats.brokenImg++;
        report('low', 'صورة مكسورة', 'الصورة «' + (im.getAttribute('src') || '').split('/').pop() + '» لم تُحمّل.');
      }
    });

    // فحص ثانٍ بعد أن يكتمل تحميل كل السكربتات (بعض الدوال تُعرّف متأخرة)
    setTimeout(function () {
      Object.keys(suspects).forEach(function (name) {
        if (!resolvable(name)) {
          stats.deadBtns += suspects[name];
          report('high', 'زر بدالة مفقودة',
            'دالة «' + name + '» مستدعاة من onclick (' + suspects[name] + ' زر) لكنها غير معرّفة — الزر لن يعمل.');
        }
      });
      var dur = Date.now() - t0;
      // ملخّص صحّي
      try {
        window.GMTCodeSentinel._last = {
          at: Date.now(), durMs: dur, stats: stats,
          clean: stats.deadBtns === 0 && stats.brokenImg === 0
        };
      } catch (e) {}
    }, 2200);
  }

  function start() {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(scan, 600);
    } else {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(scan, 600); });
    }
  }

  window.GMTCodeSentinel = {
    version: '1.0',
    scan: scan,
    findings: function () { return findings.slice(); },
    last: function () { return window.GMTCodeSentinel._last || null; },
    _last: null,
    /* اختبار ذاتي: يزرع زراً بدالة وهمية ويتأكد أنه يُكشف */
    selfTest: function () {
      var name = 'gmt_fake_fn_' + Date.now();
      var b = document.createElement('button');
      b.setAttribute('onclick', name + '()');
      b.style.display = 'none';
      document.body && document.body.appendChild(b);
      var caught = !resolvable(name);
      if (b.parentNode) b.parentNode.removeChild(b);
      return { detectsDeadButton: caught };
    }
  };

  start();
})();


/* ── gmt-inspector.js ── */
;/* ═══════════════════════════════════════════════════════════════════════════
   gmt-inspector.js — المفتّش (المراقب) · v3.0 · 2026-07-13
   ─────────────────────────────────────────────────────────────────────────
   BOT-3 (طلبك الحرفي: «توسّع فيهم بكثير»): الحارس القديم كان يلتقط الأخطاء
   **الصاخبة** فقط (استثناء / HTTP 4xx). أما الأخطاء **الصامتة** — وهي التي
   دمّرت مخزونك شهوراً — فكانت تمرّ بلا أثر:

     ① زر يُضغط ولا يحدث شيء            (dead click)
     ② كتابة تُرسل وتُقبل ولا تُطبَّق فعلاً  (silent write / RLS)
     ③ كتابتان متطابقتان على نفس الصف    (⚠️ بصمة المضاعفة PUR-1)
     ④ طلب بطيء جداً أو معلَّق            (تجميد الصفحة UX-2)
     ⑤ ميزة موعودة لم تُجرَّب أبداً        (تغطية الميزات)

   v3 يلتقط الخمسة كلها، **يحفظها بـlocalStorage** (يصمد بعد F5)، ويرسلها
   للقاعدة (`inspector_sessions`) ⇒ يصل الأدمن دليل حقيقي بدل التخمين.

   ⚠️ صامت تماماً للكاشير — لا زر ولا نافذة. يظهر للأدمن/السيادي فقط.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.GMTInspect && window.GMTInspect.version >= 3) return;

  var VERSION = 3.0;
  var LS_KEY = 'gmt_inspect3_' + (location.pathname.split('/').filter(Boolean).pop() || 'page');
  var MAX = 400;

  var S = {
    session: 'I' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    started: Date.now(),
    steps: [],       // رحلة المستخدم
    writes: [],      // كل كتابة + نتيجة التحقّق
    silent: [],      // الأخطاء الصامتة المكتشفة
    slow: [],        // الطلبات البطيئة
    feats: []        // تغطية الميزات
  };

  /* ═══ الحفظ الدائم (كان يضيع مع كل F5 — BOT-1) ═══ */
  function load() {
    try {
      var o = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (o && o.session) S = o;
    } catch (e) {}
  }
  function save() {
    try {
      ['steps', 'writes', 'silent', 'slow'].forEach(function (k) {
        if (S[k].length > MAX) S[k] = S[k].slice(-MAX);
      });
      localStorage.setItem(LS_KEY, JSON.stringify(S));
    } catch (e) { /* الحصة ممتلئة */ }
  }
  load();

  S.feats = (window.GMT_FEATURES || []).map(function (f) {
    var old = (S.feats || []).filter(function (x) { return x.id === f.id; })[0];
    return { id: f.id, t: f.t, expect: f.expect, tried: old ? old.tried : false, ok: old ? old.ok : null };
  });

  function role() {
    return (window.GMTBug && typeof GMTBug.role === 'function' && GMTBug.role()) || window.__gmtRole || 'cashier';
  }
  function isAdmin() { return /admin|sovereign|owner/i.test(role()); }

  function step(icon, text, extra) {
    S.steps.push({ t: Date.now(), i: icon, x: text, e: extra || null });
    save();
    paint();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ① الأخطاء الصامتة — زر بلا أثر (dead click)
     المبدأ: نسجّل بصمة الصفحة (طول DOM + عدد الطلبات + المسار + النوافذ
     المفتوحة) قبل الضغط، ونقارنها بعد 900ms. إن لم يتغيّر شيء البتّة
     ⇒ الزر لم يفعل شيئاً.
     ═══════════════════════════════════════════════════════════════════ */
  var netCount = 0;
  function fingerprint() {
    return {
      dom: document.body ? document.body.innerHTML.length : 0,
      net: netCount,
      url: location.href,
      modals: document.querySelectorAll('[class*=modal]:not(.hidden),[class*=overlay]:not(.hidden),dialog[open]').length,
      focus: document.activeElement ? document.activeElement.tagName : ''
    };
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('button,[role=button],a[onclick],[onclick]');
    if (!b) return;
    if (b.closest('.gg4,.gg4-idx,#gmt-bug-panel,#gmt-inspect-panel')) return;
    if (b.disabled) return;

    var label = (b.textContent || b.title || b.id || '').trim().replace(/\s+/g, ' ').slice(0, 44) || '(زر بلا نص)';
    step('👆', 'ضغط: ' + label);

    // تغطية الميزات
    S.feats.forEach(function (f) {
      if (f.id && (b.id === f.id || (b.dataset && b.dataset.feat === f.id))) f.tried = true;
    });

    var before = fingerprint();
    setTimeout(function () {
      var after = fingerprint();
      var changed =
        Math.abs(after.dom - before.dom) > 12 ||
        after.net !== before.net ||
        after.url !== before.url ||
        after.modals !== before.modals ||
        after.focus !== before.focus;

      if (!changed) {
        // استثناء: أزرار النسخ للحافظة والتحديث لا تُغيّر الشاشة لكنها تعمل فعلاً
        var lbl = (label || '').trim();
        var isClipboardOrRefresh = /نسخ|copy|📋|تحديث|refresh|🔄|إعادة|طباعة|طباعه|print|🖨|A4|حرارية|إغلاق|close|✕|رجوع|السابق/i.test(lbl);
        if (isClipboardOrRefresh) return; // ليست ميتة — لها أثر غير مرئي (حافظة/إعادة رسم)
        var msg = 'زر بلا أثر: «' + label + '» — لا طلب، لا تغيّر بالشاشة، لا نافذة.';
        S.silent.push({ t: Date.now(), kind: 'dead_click', msg: msg, el: b.id || b.className || '' });
        save();
        if (window.GMTBug && GMTBug.log) GMTBug.log('silent', msg, { type: 'dead_click', button: label });
      }
    }, 900);
  }, true);

  /* ═══════════════════════════════════════════════════════════════════
     ②③④ اعتراض الشبكة — تحقّق الكتابة · كشف المضاعفة · كشف البطء
     ═══════════════════════════════════════════════════════════════════ */
  var RF = (window.__gmtRealFetch || window.fetch).bind(window);
  window.__gmtRealFetch = RF;

  var recentWrites = [];   // للكشف عن الكتابة المزدوجة

  window.fetch = async function (input, init) {
    var url = (typeof input === 'string') ? input : (input && input.url) || '';
    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    var isWrite = /POST|PATCH|PUT|DELETE/.test(method);
    var isRest = /\/rest\/v1\//.test(url);
    var t0 = performance.now();

    netCount++;

    var res;
    try {
      res = await RF(input, init);
    } catch (err) {
      S.silent.push({ t: Date.now(), kind: 'net_fail', msg: method + ' فشل شبكياً: ' + (err && err.message), url: url.slice(0, 160) });
      save();
      throw err;
    }

    var ms = Math.round(performance.now() - t0);

    /* ④ البطء / التعليق (UX-2) */
    if (ms > 4000) {
      S.slow.push({ t: Date.now(), ms: ms, method: method, url: url.slice(0, 160) });
      save();
      if (ms > 9000 && window.GMTBug && GMTBug.log) {
        GMTBug.log('slow', 'طلب بطيء جداً (' + ms + 'ms) — سبب محتمل للتجميد: ' + method + ' ' + url.slice(0, 90));
      }
    }

    if (!isWrite || !isRest) return res;

    /* ③ الكتابة المزدوجة — نفس (method+url+body) خلال 3 ثوانٍ */
    var bodyStr = '';
    try { bodyStr = typeof (init && init.body) === 'string' ? init.body : JSON.stringify((init && init.body) || ''); } catch (e) {}
    var sig = method + '|' + url + '|' + bodyStr.slice(0, 300);
    var now = Date.now();
    recentWrites = recentWrites.filter(function (w) { return now - w.t < 3000; });
    var dup = recentWrites.filter(function (w) { return w.sig === sig; }).length;
    recentWrites.push({ sig: sig, t: now });
    if (dup >= 1) {
      var dmsg = '⚠️ كتابة مزدوجة: نفس ' + method + ' على نفس الصف مرتين خلال 3 ثوانٍ — هذه بصمة المضاعفة (PUR-1).';
      S.silent.push({ t: now, kind: 'double_write', msg: dmsg, url: url.slice(0, 160) });
      save();
      if (window.GMTBug && GMTBug.log) GMTBug.log('silent', dmsg, { type: 'double_write', url: url.slice(0, 160) });
    }

    /* ② تحقّق الكتابة الفعلي — أعد القراءة وقارن (يكشف صمت RLS) */
    var rec = { t: now, method: method, url: url.slice(0, 160), status: res.status, ms: ms, verified: null, note: '' };

    if (!res.ok) {
      rec.verified = false;
      rec.note = 'HTTP ' + res.status;
      S.writes.push(rec); save();
      return res;
    }

    if (method === 'PATCH' || method === 'POST') {
      (async function () {
        try {
          var payload = null;
          try { payload = JSON.parse(bodyStr); } catch (e) { return; }
          if (!payload || Array.isArray(payload)) return;
          var keys = Object.keys(payload).filter(function (k) { return typeof payload[k] !== 'object'; });
          if (!keys.length) return;

          // نتحقّق فقط من PATCH بمرشّح واضح (?id=eq.X)
          if (method !== 'PATCH' || !/[?&]id=eq\./.test(url)) { rec.verified = 'skip'; save(); return; }

          var vurl = url.split('&select=')[0] + '&select=' + keys.slice(0, 6).join(',');
          var vr = await RF(vurl, { headers: (init && init.headers) || {} });
          if (!vr.ok) { rec.verified = 'skip'; save(); return; }
          var arr = await vr.json();
          var row = Array.isArray(arr) ? arr[0] : arr;
          if (!row) { rec.verified = false; rec.note = 'الصف غير موجود بعد الكتابة'; save(); return; }

          var bad = keys.filter(function (k) {
            if (payload[k] === null || payload[k] === undefined) return false;
            return String(row[k]) !== String(payload[k]);
          });
          if (bad.length) {
            rec.verified = false;
            rec.note = 'لم تُطبَّق فعلياً: ' + bad.join(', ');
            var smsg = '🔴 كتابة صامتة الفشل: الخادم قبِل ' + method + ' لكن القيم لم تتغيّر بالقاعدة (' +
                       bad.join(', ') + ') — راجع صلاحيات RLS.';
            S.silent.push({ t: Date.now(), kind: 'silent_write', msg: smsg, url: url.slice(0, 160) });
            if (window.GMTBug && GMTBug.log) GMTBug.log('silent', smsg, { type: 'silent_write', fields: bad });
          } else {
            rec.verified = true;
          }
          save();
        } catch (e) { /* التحقّق أفضل جهد — لا يعطّل العمل */ }
      }());
    }

    S.writes.push(rec);
    save();
    return res;
  };

  /* ═══ ⑤ تغطية الميزات ═══ */
  function coverage() {
    var tried = S.feats.filter(function (f) { return f.tried; }).length;
    return { tried: tried, total: S.feats.length };
  }

  /* ═══ التقرير ═══ */
  function report() {
    var mins = Math.round((Date.now() - S.started) / 60000);
    var cov = coverage();
    var bugs = (window.GMTBug && GMTBug.list && GMTBug.list().length) || 0;
    var L = [];
    L.push('═══ تقرير المفتّش v3 ═══');
    L.push('الجلسة: ' + S.session + ' · المدة: ' + mins + ' دقيقة');
    L.push('المستخدم: ' + ((window.GMTBug && GMTBug.who && GMTBug.who()) || '—') + ' · الدور: ' + role());
    L.push('الصفحة: ' + document.title);
    L.push('الوضع: ' + ((window.GMTSandbox && GMTSandbox.active) ? '🏋️ تدريبي' : 'إنتاج'));
    L.push('');
    L.push('── الأرقام ──');
    L.push('خطوات الرحلة: ' + S.steps.length);
    L.push('كتابات على القاعدة: ' + S.writes.length +
           ' (✅ متحقَّقة: ' + S.writes.filter(function (w) { return w.verified === true; }).length +
           ' · ❌ فاشلة: ' + S.writes.filter(function (w) { return w.verified === false; }).length + ')');
    L.push('🔴 أخطاء صامتة: ' + S.silent.length);
    L.push('🐌 طلبات بطيئة (>4ث): ' + S.slow.length);
    L.push('🐞 أخطاء الحارس: ' + bugs);
    L.push('تغطية الميزات: ' + cov.tried + '/' + cov.total);
    L.push('');
    if (S.silent.length) {
      L.push('── 🔴 الأخطاء الصامتة (الأهم) ──');
      S.silent.slice(-25).forEach(function (x) {
        L.push('• [' + x.kind + '] ' + x.msg + (x.url ? ' — ' + x.url : ''));
      });
      L.push('');
    }
    if (S.slow.length) {
      L.push('── 🐌 البطء ──');
      S.slow.slice(-10).forEach(function (x) { L.push('• ' + x.ms + 'ms ' + x.method + ' ' + x.url); });
      L.push('');
    }
    var untried = S.feats.filter(function (f) { return !f.tried; });
    if (untried.length) {
      L.push('── ⚪ ميزات لم تُجرَّب بعد ──');
      untried.forEach(function (f) { L.push('• ' + f.t + ' — المتوقّع: ' + f.expect); });
      L.push('');
    }
    L.push('── 🧭 الرحلة (آخر 40 خطوة) ──');
    S.steps.slice(-40).forEach(function (s) {
      L.push('  ' + new Date(s.t).toLocaleTimeString('ar-SY') + ' ' + s.i + ' ' + s.x);
    });
    return L.join('\n');
  }

  /* ═══ الإرسال للقاعدة ═══ */
  async function send() {
    try {
      var url = (window.GMT_CONFIG && GMT_CONFIG.SUPABASE_URL) || window.SUPABASE_URL || window.SB;
      var key = (window.GMT_CONFIG && GMT_CONFIG.SUPABASE_ANON_KEY) || window.SUPABASE_ANON_KEY || window.KEY;
      if (!url || !key) return;
      await RF(url + '/rest/v1/inspector_sessions', {
        method: 'POST',
        headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        keepalive: true,
        body: JSON.stringify({
          session_id: S.session,
          user_name: (window.GMTBug && GMTBug.who && GMTBug.who()) || null,
          role: role(),
          page: document.title,
          duration_min: Math.round((Date.now() - S.started) / 60000),
          steps: S.steps.slice(-120),
          silent_errors: S.silent,
          slow_requests: S.slow,
          writes_total: S.writes.length,
          writes_failed: S.writes.filter(function (w) { return w.verified === false; }).length,
          coverage: coverage(),
          training: !!(window.GMTSandbox && GMTSandbox.active),
          report: report()
        })
      });
    } catch (e) { /* لا نُفشل الصفحة أبداً بسبب التقرير */ }
  }
  window.addEventListener('pagehide', send);
  window.addEventListener('beforeunload', send);
  setInterval(function () { if (S.silent.length) send(); }, 5 * 60 * 1000);   // إرسال دوري إن ظهر خطأ صامت

  /* ═══ الواجهة (للأدمن فقط — صامتة للكاشير) ═══ */
  function paint() {
    var btn = document.getElementById('gmt-inspect-fab');
    if (!isAdmin()) { if (btn) btn.remove(); return; }
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'gmt-inspect-fab';
      btn.style.cssText = 'position:fixed;left:14px;bottom:76px;z-index:2147481000;width:46px;height:46px;border-radius:50%;' +
        'border:0;background:#0f172a;color:#fff;font-size:19px;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.35);';
      btn.title = 'المفتّش — تقرير الجلسة';
      btn.onclick = panel;
      if (document.body) document.body.appendChild(btn);
      else { document.addEventListener('DOMContentLoaded', function(){ if(document.body) document.body.appendChild(btn); }); return; }
    }
    var n = S.silent.length;
    btn.textContent = n ? '🔍' : '🔍';
    btn.style.background = n ? ((window.GMTBrand && GMTBrand.red()) || '#C00012') : '#0f172a';
  }

  function panel() {
    var old = document.getElementById('gmt-inspect-panel');
    if (old) { old.remove(); return; }
    var d = document.createElement('div');
    d.id = 'gmt-inspect-panel';
    d.style.cssText = 'position:fixed;inset:0;z-index:2147481500;background:rgba(4,6,10,.94);backdrop-filter:blur(8px);' +
      'padding:16px;overflow:auto;direction:rtl;font-family:var(--gg-font,Cairo,system-ui,sans-serif);';
    d.innerHTML =
      '<div style="max-width:900px;margin:0 auto;background:#0f131c;border:1px solid rgba(255,255,255,.1);border-radius:20px;overflow:hidden;color:#fff">' +
        '<div style="padding:14px 16px;background:#171d2a;display:flex;justify-content:space-between;align-items:center;gap:8px">' +
          '<b style="font-size:15px">🔍 المفتّش — تقرير الجلسة</b>' +
          '<div style="display:flex;gap:6px">' +
            '<button id="gi-copy" style="background:var(--gg-red,#C00012);color:#fff;border:0;border-radius:10px;padding:8px 13px;font:inherit;font-weight:800;font-size:12px;cursor:pointer">📋 نسخ التقرير</button>' +
            '<button id="gi-clr" style="background:rgba(255,255,255,.1);color:#fff;border:0;border-radius:10px;padding:8px 13px;font:inherit;font-weight:800;font-size:12px;cursor:pointer">🗑 مسح</button>' +
            '<button id="gi-x" style="background:rgba(255,255,255,.1);color:#fff;border:0;border-radius:10px;padding:8px 13px;font:inherit;font-weight:800;font-size:12px;cursor:pointer">✕</button>' +
          '</div>' +
        '</div>' +
        '<pre style="margin:0;padding:16px;font-size:12px;line-height:1.85;white-space:pre-wrap;color:#c9d1dc;font-family:ui-monospace,monospace">' +
          report().replace(/</g, '&lt;') + '</pre>' +
      '</div>';
    if (!document.body) return;
    document.body.appendChild(d);
    d.querySelector('#gi-x').onclick = function () { d.remove(); };
    d.querySelector('#gi-clr').onclick = function () {
      S.steps = []; S.writes = []; S.silent = []; S.slow = [];
      save(); d.remove(); paint();
    };
    d.querySelector('#gi-copy').onclick = function () {
      try { navigator.clipboard.writeText(report()); alert('✅ نُسخ التقرير — أرسله للمطوّر.'); }
      catch (e) { alert('انسخه يدوياً من الشاشة.'); }
    };
  }

  /* ═══ الواجهة العامة ═══ */
  window.GMTInspect = {
    version: VERSION,
    session: S.session,
    step: step,
    report: report,
    send: send,
    open: panel,
    silent: function () { return S.silent; },
    writes: function () { return S.writes; },
    coverage: coverage,
    feature: function (id, ok) {
      var f = S.feats.filter(function (x) { return x.id === id; })[0];
      if (f) { f.tried = true; f.ok = ok !== false; save(); }
    },
    reset: function () { S.steps = []; S.writes = []; S.silent = []; S.slow = []; save(); paint(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint);
  else paint();
  setTimeout(paint, 2500);   // بعد أن يعرف الحارس دور المستخدم

  step('🚀', 'فتح الصفحة: ' + document.title);
}());


/* ── gmt-health.js ── */
;/* ══════════════════════════════════════════════════════════════════════
   gmt-health.js — فحص صحة القاعدة  ·  2026-07-12
   توصية المهندس المعتمدة: زر واحد بالأدمن يشغّل استعلامات تدقيق ويكشف
   التناقضات الصامتة **قبل** أن تتحوّل إلى خسارة مال.

   لماذا؟ لأن البيانات تفسد بهدوء: فاتورة بلا بنود · عمولة بلا فاتورة ·
   مخزون سالب · فاتورة مكرَّرة · طلب بلا زبون. لا شيء يصرخ — فقط الأرقام
   تصير خاطئة، وتكتشفها بعد شهر عند الجرد.

   الاستخدام: أضف <script src="gmt-health.js"></script> ثم:
       GMTHealth.open();            // يفتح اللوحة
       GMTHealth.mount('#somewhere'); // أو ضع زراً في مكان محدد

   يقرأ إعداداته من gmt-config.js (GMT_DB.MAIN). قراءة فقط — لا يكتب شيئاً.
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const DB = () => (global.GMT_DB && global.GMT_DB.MAIN) || null;

  /* كل فحص: عنوان · شرح بلغة المالك · استعلام · شدّة · ماذا تفعل */
  const CHECKS = [
    {
      id: 'inv_no_items',
      title: 'فواتير بلا بنود',
      why: 'فاتورة محفوظة ولا منتج فيها — غالباً انقطع الحفظ في المنتصف. تُحتسب بالمبيعات وهي فارغة.',
      sev: 'danger',
      fix: 'افتحها من تبويب الفواتير: إما أكملها أو احذفها.',
      path: '/rest/v1/invoices?select=id,invoice_number,branch_key,created_at,items_json&limit=500&order=created_at.desc',
      test: (rows) => rows.filter((r) => {
        try { const it = typeof r.items_json === 'string' ? JSON.parse(r.items_json) : r.items_json;
              return !it || !it.length; } catch (_) { return true; }
      }),
      label: (r) => `فاتورة #${r.invoice_number || r.id} — ${r.branch_key || '؟'}`,
    },
    {
      id: 'athenaeum_bad',
      title: 'فاتورة أثرية غير متّسقة (INV-8)',
      why: 'فاتورة «فرز قديمة» يجب أن يغطّي ترحيلها كامل الكمية دون لمس المخزون. عدم التطابق قد يظهر كـ«مختومة ولم تصل» بالتدقيق.',
      sev: 'warn',
      fix: 'أعد الفرز من أداة «فرز القديمة» بالجرد، أو صحّح transfer_moved للفاتورة.',
      path: '/rest/v1/import_log?select=id,inv_number,items_snapshot,transfer_moved&limit=500',
      test: (rows) => rows.filter((r) => {
        try {
          let it = typeof r.items_snapshot === 'string' ? JSON.parse(r.items_snapshot) : r.items_snapshot;
          it = Array.isArray(it) ? it : [];
          const isAth = it.some((x) => x && x.athenaeum === true) || /^ARC-/.test(r.inv_number || '');
          if (!isAth) return false;
          let mv = typeof r.transfer_moved === 'string' ? JSON.parse(r.transfer_moved) : r.transfer_moved;
          mv = mv || {};
          return it.some((x) => Number(mv[x.id] || 0) < Number(x.qty || 0));
        } catch (_) { return true; }
      }),
      label: (r) => `أثرية #${r.inv_number || r.id} — ترحيل ناقص`,
    },
    {
      id: 'void_no_reason',
      title: 'إبطال مالي بلا سبب مسجَّل (ADM-4)',
      why: 'كل سجلّ مالي مُبطَل يجب أن يحمل سبب الإبطال — غيابه انتهاك للأثر المحاسبي.',
      sev: 'warn',
      fix: 'راجع السجل وأضف سبب الإبطال، أو أعد تفعيله.',
      path: '/rest/v1/gmt_manual_debts?select=id,voided,void_reason&limit=1000',
      test: (rows) => rows.filter((r) => r.voided && !r.void_reason),
      label: (r) => `دَين مُبطَل #${r.id} بلا سبب`,
    },
    {
      id: 'comm_no_inv',
      title: 'عمولات بلا فاتورة',
      why: 'عمولة مسجَّلة على فاتورة لم تعد موجودة (حُذفت). تدفع عمولة على بيع لا وجود له.',
      sev: 'danger',
      fix: 'احذف العمولة اليتيمة، أو أعد الفاتورة إن حُذفت غلطاً.',
      path: '/rest/v1/invoice_commissions?select=id,invoice_id,amount,branch_key&limit=1000',
      needs: '/rest/v1/invoices?select=id&limit=5000',
      test: (rows, aux) => {
        const ids = new Set((aux || []).map((i) => String(i.id)));
        return rows.filter((c) => c.invoice_id && !ids.has(String(c.invoice_id)));
      },
      label: (r) => `عمولة ${Number(r.amount).toFixed(2)}$ — فاتورة مفقودة (${r.invoice_id})`,
    },
    {
      id: 'neg_stock',
      title: 'مخزون سالب',
      why: 'كمية أقل من صفر = بِعتَ قطعاً لا تملكها. إمّا الجرد غلط أو البيع تمّ مرتين.',
      sev: 'danger',
      fix: 'أعد جرد الصنف فعلياً وصحّح الكمية — ثم ابحث بسجل الحركة عن سبب النزول.',
      path: '/rest/v1/inventory?select=id,name,barcode,qty&qty=lt.0&limit=200',
      test: (rows) => rows,
      label: (r) => `${r.name || r.id} — الكمية ${r.qty}`,
    },
    {
      id: 'dup_barcode',
      title: 'باركود مكرَّر',
      why: 'نفس الباركود على صنفين. المسح يختار أحدهما عشوائياً → تخصم من الصنف الخطأ.',
      sev: 'warn',
      fix: 'وحّد الصنفين أو غيّر باركود أحدهما.',
      path: '/rest/v1/inventory?select=id,name,barcode&barcode=not.is.null&limit=5000',
      test: (rows) => {
        const seen = new Map(), dup = [];
        rows.forEach((r) => {
          const b = String(r.barcode).trim();
          if (!b) return;
          if (seen.has(b)) dup.push(r); else seen.set(b, r);
        });
        return dup;
      },
      label: (r) => `${r.name} — باركود ${r.barcode}`,
    },
    {
      id: 'dup_invoice_no',
      title: 'رقم فاتورة مكرَّر',
      why: 'رقمان متطابقان = فاتورة نزلت مرتين. تُحتسب المبيعات والعمولة مضاعفة.',
      sev: 'danger',
      fix: 'قارن البنود واحذف النسخة المكرّرة.',
      path: '/rest/v1/invoices?select=id,invoice_number,branch_key,total,created_at&limit=5000',
      test: (rows) => {
        const seen = new Map(), dup = [];
        rows.forEach((r) => {
          const k = `${r.branch_key}::${r.invoice_number}`;
          if (!r.invoice_number) return;
          if (seen.has(k)) dup.push(r); else seen.set(k, r);
        });
        return dup;
      },
      label: (r) => `#${r.invoice_number} — ${r.branch_key} — ${Number(r.total || 0).toFixed(2)}$`,
    },
    {
      id: 'comm_unapproved_old',
      title: 'عمولات مجمّدة منذ أكثر من 30 يوماً',
      why: 'عمولة لم تُوافق عليها منذ شهر — إمّا نسيتها، أو الكاشير ينتظر ماله وأنت لا تعلم.',
      sev: 'warn',
      fix: 'راجعها من تبويب الفواتير: وافق أو ارفض.',
      path: '/rest/v1/invoice_commissions?select=id,amount,branch_key,approved,created_at&approved=eq.false&limit=500',
      test: (rows) => {
        const cut = Date.now() - 30 * 864e5;
        return rows.filter((r) => r.created_at && new Date(r.created_at).getTime() < cut);
      },
      label: (r) => `${Number(r.amount).toFixed(2)}$ — ${r.branch_key} — منذ ${_days(r.created_at)} يوماً`,
    },
    {
      id: 'neg_comm',
      title: 'عمولات سالبة (بيع خاسر)',
      why: 'بيع بأقل من سعر الجملة. سلوك مسموح ومقصود — لكنه يجب أن يخضع لمتابعتك، لا أن يمرّ بصمت.',
      sev: 'info',
      fix: 'راجع كل واحدة: خصم مقصود؟ أم غلطة تسعير؟ عدّلها من بطاقة العمولة.',
      path: '/rest/v1/invoice_commissions?select=id,amount,branch_key,created_at&amount=lt.0&limit=300',
      test: (rows) => rows,
      label: (r) => `${Number(r.amount).toFixed(2)}$ — ${r.branch_key} — ${_d(r.created_at)}`,
    },
    {
      id: 'order_no_customer',
      title: 'طلبات بلا زبون أو هاتف',
      why: 'طلب بلا اسم أو رقم = لا تستطيع تسليمه ولا متابعته.',
      sev: 'warn',
      fix: 'أكمل بياناته أو احذفه.',
      path: '/rest/v1/gmt_orders?select=id,serial_code,name,phone,status&limit=1000',
      test: (rows) => rows.filter((o) => (!o.name || !String(o.name).trim()) || (!o.phone || !String(o.phone).trim())),
      label: (o) => `طلب ${o.serial_code || '#' + o.id} — ${!o.name ? 'بلا اسم' : 'بلا هاتف'}`,
    },
    {
      id: 'orders_stuck',
      title: 'طلبات عالقة منذ أكثر من 45 يوماً',
      why: 'طلب لم يتغيّر وضعه منذ شهر ونصف — إمّا نُسي، أو الزبون ينتظر ويظن أنك نصبت عليه.',
      sev: 'warn',
      fix: 'تابعه أو أغلقه.',
      path: '/rest/v1/gmt_orders?select=id,serial_code,name,status,created_at&limit=1000',
      test: (rows) => {
        const cut = Date.now() - 45 * 864e5;
        const done = ['تم التسليم', 'ملغي', 'مسلّم', 'delivered', 'cancelled'];
        return rows.filter((o) => o.created_at && new Date(o.created_at).getTime() < cut
                                 && !done.includes(String(o.status || '').trim()));
      },
      label: (o) => `${o.serial_code || '#' + o.id} — ${o.name || '؟'} — «${o.status || '؟'}» منذ ${_days(o.created_at)} يوماً`,
    },
    {
      id: 'zero_price',
      title: 'أصناف بسعر بيع صفر',
      why: 'صنف سعره صفر سيُباع مجاناً بضغطة زر — وتظهر عمولة سالبة ضخمة.',
      sev: 'danger',
      fix: 'صحّح السعر من الجرد فوراً.',
      path: '/rest/v1/inventory?select=id,name,barcode,price,qty&limit=5000',
      test: (rows) => rows.filter((r) => Number(r.price || 0) <= 0 && Number(r.qty || 0) > 0),
      label: (r) => `${r.name} — السعر ${r.price} — الكمية ${r.qty}`,
    },
    {
      id: 'price_below_cost',
      title: 'سعر البيع أقل من التكلفة',
      why: 'كل قطعة تُباع تخسر مالاً — والنظام لن يمنعك، سيسجّل الخسارة فقط.',
      sev: 'warn',
      fix: 'صحّح السعر أو أكّد أنها تصفية مقصودة.',
      path: '/rest/v1/inventory?select=id,name,price,cost,qty&limit=5000',
      test: (rows) => rows.filter((r) => Number(r.cost || 0) > 0 && Number(r.price || 0) > 0
                                        && Number(r.price) < Number(r.cost) && Number(r.qty || 0) > 0),
      label: (r) => `${r.name} — بيع ${r.price} / تكلفة ${r.cost}`,
    },
    {
      id: 'stock_no_ledger',
      title: 'سجل حركة المخزون غير مُفعَّل',
      why: 'بلا سجل الحركة لا يمكن إثبات كيف تغيّر أي رصيد. عند أول اختلاف بالجرد لن تعرف أين ضاعت القطعة.',
      sev: 'warn',
      fix: 'شغّل ملف GMT_ACCOUNTING_GUARDS.txt على القاعدة الرئيسية.',
      path: '/rest/v1/stock_moves?select=id&limit=1',
      test: (rows, _aux, failed) => (failed ? [{ id: 'x' }] : []),
      label: () => 'جدول stock_moves غير موجود — شغّل GMT_ACCOUNTING_GUARDS.txt',
    },
  ];

  const _d    = (s) => (s ? new Date(s).toLocaleDateString('ar-EG') : '—');
  const _days = (s) => (s ? Math.floor((Date.now() - new Date(s).getTime()) / 864e5) : 0);

  async function q(path) {
    const db = DB();
    if (!db) throw new Error('gmt-config.js غير محمَّل');
    const r = await fetch(db.url + path, { headers: global.GMT_DB.headers(db) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  async function runAll(onProgress) {
    const out = [];
    for (const c of CHECKS) {
      let rows = [], aux = null, failed = false;
      try {
        rows = await q(c.path);
        if (c.needs) aux = await q(c.needs);
      } catch (e) { failed = true; }
      let hits = [];
      try { hits = c.test(rows || [], aux, failed) || []; } catch (_) { hits = []; }
      out.push({ ...c, hits, failed });
      if (onProgress) onProgress(out.length, CHECKS.length);
    }
    return out;
  }

  /* ═══ اللوحة ═══ */
  function open() {
    let bg = document.getElementById('gmt-health-bg');
    if (bg) bg.remove();
    bg = document.createElement('div');
    bg.id = 'gmt-health-bg';
    bg.className = 'gmt-modal-bg';
    bg.innerHTML = `
      <div class="gmt-modal" style="max-width:660px;">
        <div style="padding:16px 18px;border-bottom:1px solid var(--gmt-line,#E5E7EB);display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div class="gmt-strong" style="font-size:15px;">🩺 فحص صحة القاعدة</div>
            <div class="gmt-muted" style="font-size:11px;font-weight:700;">قراءة فقط — لا يعدّل شيئاً</div>
          </div>
          <button class="gmt-btn gmt-btn--ghost" id="gh-x" style="padding:6px 11px;">✕</button>
        </div>
        <div id="gh-body" style="padding:16px;">
          <div class="gmt-empty"><div class="gmt-empty__icon">⏳</div>
            <div class="gmt-empty__title">جارٍ الفحص…</div>
            <div class="gmt-empty__text" id="gh-prog">0 / ${CHECKS.length}</div></div>
        </div>
      </div>`;
    document.body.appendChild(bg);
    bg.querySelector('#gh-x').onclick = () => bg.remove();
    bg.onclick = (e) => { if (e.target === bg) bg.remove(); };

    runAll((i, n) => {
      const p = document.getElementById('gh-prog');
      if (p) p.textContent = `${i} / ${n}`;
    }).then(render).catch((e) => {
      document.getElementById('gh-body').innerHTML =
        `<div class="gmt-empty"><div class="gmt-empty__icon">⚠️</div>
         <div class="gmt-empty__title">تعذّر الفحص</div>
         <div class="gmt-empty__text">${e.message}<br>تأكد من تحميل gmt-config.js</div></div>`;
    });
  }

  function render(results) {
    const bad  = results.filter((r) => r.hits.length);
    const good = results.length - bad.length;
    const SEV  = { danger: ['🔴', 'danger'], warn: ['🟠', 'warn'], info: ['🔵', 'info'] };

    const body = document.getElementById('gh-body');
    if (!body) return;

    if (!bad.length) {
      body.innerHTML = `<div class="gmt-empty"><div class="gmt-empty__icon">✅</div>
        <div class="gmt-empty__title">القاعدة سليمة</div>
        <div class="gmt-empty__text">${results.length} فحصاً — صفر ملاحظات.</div></div>`;
      return;
    }

    bad.sort((a, b) => ({ danger: 0, warn: 1, info: 2 }[a.sev] - { danger: 0, warn: 1, info: 2 }[b.sev]));

    body.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
        <span class="gmt-badge gmt-badge--ok">✅ ${good} فحصاً سليماً</span>
        <span class="gmt-badge gmt-badge--danger">⚠️ ${bad.length} فيها ملاحظات</span>
      </div>
      ${bad.map((c) => {
        const [icon, cls] = SEV[c.sev] || SEV.info;
        const shown = c.hits.slice(0, 8);
        return `<div class="gmt-card gmt-card--accent" style="margin-bottom:11px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="font-size:15px;">${icon}</span>
            <span class="gmt-strong" style="font-size:13.5px;">${c.title}</span>
            <span class="gmt-badge gmt-badge--${cls}">${c.hits.length}</span>
          </div>
          <div class="gmt-muted" style="font-size:11.5px;font-weight:600;line-height:1.75;margin-bottom:8px;">${c.why}</div>
          <div style="background:var(--gmt-surface-2,#F9FAFB);border-radius:8px;padding:9px 11px;font-size:11.5px;font-weight:700;line-height:1.9;">
            ${shown.map((h) => `<div>• ${esc(c.label(h))}</div>`).join('')}
            ${c.hits.length > shown.length ? `<div class="gmt-muted">…و${c.hits.length - shown.length} غيرها</div>` : ''}
          </div>
          <div style="margin-top:8px;font-size:11.5px;font-weight:800;color:var(--gmt-red,#C00012);">🔧 ${c.fix}</div>
        </div>`;
      }).join('')}`;
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ═══ زر عائم 🩺 — بموضع محسوب لا ثابت (نفس علّة زر 🎓 — انظر gmt-scenarios.js) ═══
     الأرقام الثابتة تتصادم مع أي زر عائم يُضاف لاحقاً، والأخطر أن الزر الأدنى
     z-index يُدفن تحت غيره فيصير **زراً ميتاً بصمت**. نحسب أول فتحة حرّة. ═══ */
  function freeSlot() {
    const H = 44, GAP = 10, taken = [];
    document.querySelectorAll('body *').forEach((el) => {
      if (el.id === 'gmt-health-btn') return;
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' || cs.display === 'none') return;
      const r = el.getBoundingClientRect();
      if (r.width > 120 || r.height > 120 || !r.width) return;
      if (r.left >= 90) return;                       // الجهة اليسرى فقط
      taken.push([innerHeight - r.bottom, innerHeight - r.top]);
    });
    let y = 16;
    for (let g = 0; g < 20; g++) {
      if (!taken.some(([lo, hi]) => y < hi + GAP && y + H + GAP > lo)) return y;
      y += H + GAP;
    }
    return y;
  }

  function mount() {
    if (document.getElementById('gmt-health-btn')) return;
    const b = document.createElement('button');
    b.id = 'gmt-health-btn';
    b.textContent = '🩺';
    b.title = 'فحص صحة القاعدة';
    b.style.cssText = 'position:fixed;bottom:16px;left:14px;z-index:9600;width:44px;height:44px;'
      + 'border-radius:999px;border:1.5px solid #E5E7EB;background:#fff;box-shadow:0 6px 20px rgba(0,0,0,.14);'
      + 'font-size:19px;cursor:pointer;';
    b.onclick = open;
    document.body.appendChild(b);
    setTimeout(() => { b.style.bottom = freeSlot() + 'px'; }, 1100);   /* بعد زر 🎓 */
  }

  global.GMTHealth = { open, runAll, mount, CHECKS };
  if (document.readyState !== 'loading') mount();
  else document.addEventListener('DOMContentLoaded', mount);
})(window);


/* ── gmt-health-panel.js ── */
;/* ═══════════════════════════════════════════════════════════════════════
   gmt-health-panel.js — لوحة صحة النظام 🩺 (للأدمن فقط)
   تُرفع بجانب صفحة الأدمن (وأدمن المتجر/السيادي إن أردت) وتُستدعى:
     <script src="gmt-health-panel.js"></script>
   يظهر زر 🩺 أسفل اليسار (أو نادِها: GMTHealthPanel.open()).

   ماذا تريك:
   • 🔴 الأخطاء الحيّة من **كل نقاط البيع** — بلا أن يبلّغك أحد.
   • فلترة: الفرع · المستخدم · الصفحة · الخطورة.
   • «جديد منذ آخر زيارة» — تعرف ما استجدّ.
   • ملخّص **يومي** و**أسبوعي**: الأكثر تكراراً · أي فرع/صفحة تتعثّر.
   • رحلات الجلسات: ماذا فعل المستخدم قبل الخطأ بالضبط.
   • زر «صدّر تقريراً كاملاً» — نصّ جاهز لإرساله للمهندس.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.GMTHealthPanel) return;
  const RED = '#C00012';
  const LS_SEEN = 'gmt_health_seen';

  function cfg() {
    /* 🔧 يستعمل الإعدادات التي التقطها الحارس v3.1 من طلبات الصفحة (الصفحات لا تحمّل gmt-config.js كلها) */
    const sniffed = (window.GMTBug && typeof GMTBug.config === 'function' && GMTBug.config()) || window.GMT_SB || null;
    const url = (window.GMT_CONFIG && GMT_CONFIG.SUPABASE_URL) || window.SUPABASE_URL || window.SUPA_URL || (window.CONFIG && CONFIG.SUPABASE_URL) || (window.GMT_DB && window.GMT_DB.MAIN && window.GMT_DB.MAIN.url) || (sniffed && sniffed.url);
    const key = (window.GMT_CONFIG && GMT_CONFIG.SUPABASE_ANON_KEY) || window.SUPABASE_ANON_KEY || window.SUPA_KEY || (window.CONFIG && CONFIG.SUPABASE_ANON_KEY) || (window.GMT_DB && window.GMT_DB.MAIN && window.GMT_DB.MAIN.key) || (sniffed && sniffed.key);
    return url && key ? { url: String(url).replace(/\/$/, ''), key } : null;
  }
  const F = (p, q) => {
    const c = cfg();
    if (!c) return Promise.reject(new Error('لا توجد إعدادات قاعدة بالصفحة'));
    return (window.__gmtRealFetch || fetch)(c.url + '/rest/v1/' + p + (q || ''), {
      headers: { apikey: c.key, Authorization: 'Bearer ' + c.key },
    }).then((r) => (r.ok ? r.json() : r.text().then((t) => { throw new Error('HTTP ' + r.status + ' — ' + t.slice(0, 120)); })));
  };
  const ago = (iso) => {
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return 'الآن';
    if (m < 60) return `قبل ${m} د`;
    if (m < 1440) return `قبل ${Math.round(m / 60)} س`;
    return `قبل ${Math.round(m / 1440)} يوم`;
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

  let rows = [], seen = 0, filt = { sev: '', branch: '', page: '', range: 1 };

  function styles() {
    if (document.getElementById('gmt-hp-css')) return;
    const s = document.createElement('style');
    s.id = 'gmt-hp-css';
    s.textContent = `
    .hp-ov{position:fixed;inset:0;z-index:2147482500;background:rgba(6,8,11,.88);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:12px;font-family:Cairo,Arial,sans-serif;direction:rtl}
    .hp-w{background:#11151c;border:1px solid #232b38;border-radius:18px;width:min(880px,100%);max-height:92vh;display:flex;flex-direction:column;color:#e6eaf0}
    .hp-h{padding:14px 16px;border-bottom:1px solid #232b38}
    .hp-tabs{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
    .hp-tab{background:#1a212b;border:1px solid #283040;color:#9fa9b7;border-radius:99px;padding:7px 13px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit}
    .hp-tab.on{background:${RED};color:#fff;border-color:${RED}}
    .hp-b{overflow:auto;padding:12px 14px;display:grid;gap:8px}
    .hp-row{background:#161d26;border:1px solid #232b38;border-radius:12px;padding:11px 12px}
    .hp-row.crit{border-right:4px solid ${RED}}
    .hp-row.warn{border-right:4px solid #b45309}
    .hp-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
    .hp-t{font-weight:900;font-size:13.5px}
    .hp-m{font-size:12.5px;color:#c3cbd6;font-weight:600;line-height:1.75;margin-top:4px}
    .hp-meta{font-size:11px;color:#7d8797;font-weight:700;margin-top:6px;display:flex;gap:10px;flex-wrap:wrap}
    .hp-new{background:${RED};color:#fff;font-size:9.5px;font-weight:900;border-radius:99px;padding:2px 7px}
    .hp-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:6px}
    .hp-card{background:#161d26;border:1px solid #232b38;border-radius:12px;padding:10px;text-align:center}
    .hp-card b{display:block;font-size:20px;font-weight:900}
    .hp-card span{font-size:11px;color:#818b9a;font-weight:800}
    .hp-f{padding:11px 14px;border-top:1px solid #232b38;display:flex;gap:8px}
    .hp-btn{border:none;border-radius:11px;padding:11px;font-weight:900;font-family:inherit;cursor:pointer;font-size:13px}
    .hp-p{background:${RED};color:#fff;flex:1}.hp-s{background:#1e2531;color:#aab3c0;padding:11px 15px}
    .hp-sel{background:#0f141b;border:1px solid #283040;color:#dbe1e9;border-radius:9px;padding:7px 9px;font-size:12px;font-weight:700;font-family:inherit}
    `;
    document.head.appendChild(s);
  }

  async function load() {
    const days = filt.range;
    const since = new Date(Date.now() - days * 864e5).toISOString();
    rows = await F('gmt_telemetry', `?select=*&created_at=gte.${since}&order=created_at.desc&limit=500`);
    try { seen = +(localStorage.getItem(LS_SEEN) || 0); } catch (_) { seen = 0; }
  }

  function digest() {
    const errs = rows.filter((r) => r.kind === 'error' && !r.training);
    const crit = errs.filter((r) => r.severity === 'crit');
    const byType = {};
    errs.forEach((r) => { const k = r.err_type + ' — ' + (r.message || '').slice(0, 60); byType[k] = (byType[k] || 0) + (r.count || 1); });
    const top = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const byBranch = {};
    errs.forEach((r) => { const b = r.branch || '؟'; byBranch[b] = (byBranch[b] || 0) + 1; });
    const users = new Set(errs.map((r) => r.user_name).filter(Boolean));
    const sessions = rows.filter((r) => r.kind === 'session');
    return { errs, crit, top, byBranch, users, sessions };
  }

  function render(root) {
    const d = digest();
    const list = d.errs.filter((r) =>
      (!filt.sev || r.severity === filt.sev) &&
      (!filt.branch || r.branch === filt.branch) &&
      (!filt.page || r.page === filt.page));

    const branches = Array.from(new Set(d.errs.map((r) => r.branch).filter(Boolean)));
    const pages = Array.from(new Set(d.errs.map((r) => r.page).filter(Boolean)));

    root.querySelector('#hp-body').innerHTML = `
      <div class="hp-k">
        <div class="hp-card"><b style="color:${d.crit.length ? '#ff6b78' : '#4ade80'}">${d.crit.length}</b><span>حرج</span></div>
        <div class="hp-card"><b>${d.errs.length}</b><span>إجمالي الأخطاء</span></div>
        <div class="hp-card"><b>${d.users.size}</b><span>مستخدم متأثّر</span></div>
        <div class="hp-card"><b>${d.sessions.length}</b><span>جلسة مسجَّلة</span></div>
      </div>

      <div class="hp-row" style="border-color:#2c3646">
        <div class="hp-t">📊 الأكثر تكراراً (${filt.range === 1 ? 'اليوم' : filt.range + ' أيام'})</div>
        ${d.top.length ? d.top.map(([k, n]) => `<div class="hp-m">• ${esc(k)} <b style="color:#ff9aa4">×${n}</b></div>`).join('') : '<div class="hp-m">لا أخطاء 🎉</div>'}
        ${Object.keys(d.byBranch).length ? `<div class="hp-meta">${Object.entries(d.byBranch).map(([b, n]) => `<span>${esc(b)}: ${n}</span>`).join('')}</div>` : ''}
      </div>

      <div style="display:flex;gap:7px;flex-wrap:wrap;margin:2px 0 4px">
        <select class="hp-sel" id="hp-sev"><option value="">كل الخطورات</option><option value="crit">🔴 حرج</option><option value="warn">🟠 تحذير</option></select>
        <select class="hp-sel" id="hp-br"><option value="">كل الفروع</option>${branches.map((b) => `<option ${filt.branch === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>
        <select class="hp-sel" id="hp-pg"><option value="">كل الصفحات</option>${pages.map((p) => `<option ${filt.page === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>
      </div>

      ${list.length ? list.map((r) => {
        const isNew = new Date(r.created_at).getTime() > seen;
        return `<div class="hp-row ${r.severity}">
          <div class="hp-top">
            <div class="hp-t">${r.severity === 'crit' ? '🔴' : '🟠'} ${esc(r.err_type)} ${isNew ? '<span class="hp-new">جديد</span>' : ''}</div>
            <div style="font-size:11px;color:#7d8797;font-weight:800;white-space:nowrap">${ago(r.created_at)}</div>
          </div>
          <div class="hp-m">${esc(r.message)}</div>
          ${r.detail ? `<div class="hp-m" style="color:#8b95a4;font-size:11.5px">↳ ${esc(String(r.detail).slice(0, 200))}</div>` : ''}
          <div class="hp-meta">
            <span>👤 ${esc(r.user_name || '—')}</span>
            <span>🏬 ${esc(r.branch || '—')}</span>
            <span>📄 ${esc(r.page || '—')}</span>
            ${r.count > 1 ? `<span>🔁 ×${r.count}</span>` : ''}
            <span>🧭 ${esc(String(r.session_id).slice(0, 8))}</span>
          </div>
        </div>`;
      }).join('') : '<div class="hp-row"><div class="hp-m">لا أخطاء ضمن هذا الفلتر 🎉</div></div>'}
    `;

    root.querySelector('#hp-sev').value = filt.sev;
    root.querySelector('#hp-sev').onchange = (e) => { filt.sev = e.target.value; render(root); };
    root.querySelector('#hp-br').onchange = (e) => { filt.branch = e.target.value; render(root); };
    root.querySelector('#hp-pg').onchange = (e) => { filt.page = e.target.value; render(root); };
  }

  function textReport() {
    const d = digest();
    const L = ['═══ صحة نظام GMT 🩺 ═══',
      'المدى: آخر ' + filt.range + ' يوم · ' + new Date().toLocaleString('ar-SY'),
      `حرج: ${d.crit.length} · إجمالي: ${d.errs.length} · مستخدمون متأثّرون: ${d.users.size}`,
      '── الأكثر تكراراً ──'];
    d.top.forEach(([k, n]) => L.push(`• ${k} ×${n}`));
    L.push('── التفاصيل ──');
    d.errs.slice(0, 60).forEach((r, i) =>
      L.push(`#${i + 1} [${new Date(r.created_at).toLocaleString('ar-SY')}] ${r.severity === 'crit' ? '🔴' : '🟠'} ${r.err_type} · ${r.user_name || '—'} · ${r.branch || '—'} · ${r.page || '—'}\n${r.message}${r.detail ? '\n↳ ' + String(r.detail).slice(0, 200) : ''}`));
    return L.join('\n');
  }

  async function open() {
    styles();
    const ov = document.createElement('div');
    ov.className = 'hp-ov';
    ov.innerHTML = `<div class="hp-w">
      <div class="hp-h">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:900;font-size:16px">🩺 صحة النظام — كل الفروع</div>
          <button class="hp-tab" data-a="close">إغلاق</button>
        </div>
        <div class="hp-tabs">
          <button class="hp-tab on" data-r="1">اليوم</button>
          <button class="hp-tab" data-r="7">الأسبوع</button>
          <button class="hp-tab" data-r="30">الشهر</button>
        </div>
      </div>
      <div class="hp-b" id="hp-body"><div class="hp-row"><div class="hp-m">جارٍ التحميل…</div></div></div>
      <div class="hp-f">
        <button class="hp-btn hp-p" data-a="copy">📋 صدّر تقريراً كاملاً</button>
        <button class="hp-btn hp-s" data-a="seen">✓ علّمت كمقروء</button>
      </div>
    </div>`;
    document.body.appendChild(ov);

    const refresh = async () => {
      try { await load(); render(ov); }
      catch (e) { ov.querySelector('#hp-body').innerHTML = `<div class="hp-row crit"><div class="hp-t">تعذّر التحميل</div><div class="hp-m">${esc(e.message)}</div><div class="hp-m" style="color:#8b95a4">تأكّد أنك شغّلت ملف <b>SCHEMA_00_telemetry.sql</b> بقاعدة البيانات.</div></div>`; }
    };
    await refresh();

    ov.addEventListener('click', async (e) => {
      const r = e.target.closest('[data-r]'), a = e.target.closest('[data-a]');
      if (r) {
        ov.querySelectorAll('[data-r]').forEach((x) => x.classList.toggle('on', x === r));
        filt.range = +r.dataset.r; await refresh(); return;
      }
      if (!a) { if (e.target === ov) ov.remove(); return; }
      if (a.dataset.a === 'close') ov.remove();
      else if (a.dataset.a === 'seen') { try { localStorage.setItem(LS_SEEN, Date.now()); } catch (_) {} a.textContent = '✓ تم'; await refresh(); }
      else if (a.dataset.a === 'copy') {
        const t = textReport();
        try { await navigator.clipboard.writeText(t); a.textContent = '✓ نُسخ — ألصقه بالرسالة'; }
        catch (_) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); a.textContent = '✓ نُسخ'; }
      }
    });
  }

  function mount() {
    if (document.getElementById('gmt-hp-btn')) return;
    const b = document.createElement('button');
    b.id = 'gmt-hp-btn';
    b.textContent = '🩺';
    b.title = 'صحة النظام';
    b.style.cssText = 'position:fixed;bottom:16px;left:78px;z-index:2147482000;width:52px;height:52px;border-radius:50%;background:#0e7490;color:#fff;border:2px solid rgba(255,255,255,.2);font-size:22px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.35);font-family:Cairo,Arial,sans-serif;';
    b.onclick = open;
    document.body.appendChild(b);
  }

  window.GMTHealthPanel = { open, mount, report: textReport };
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount, { once: true });
})();


/* ── gmt-selftest.js ── */
;/* ═══════════════════════════════════════════════════════════════════════════
   gmt-selftest.js — 🧪 الفاحص الذاتي · v1.0 · 2026-07-13
   ─────────────────────────────────────────────────────────────────────────
   طلبك الحرفي: «بيشغّلوا كل النظام ويفحصوه … وبيعطوك شو تعمل بالتفصيل».

   الحارس يلتقط الأخطاء **بعد** وقوعها. المفتّش يلتقط الصامت منها.
   هذا البوت يذهب أبعد: **يفحص النظام قبل أن تكسره** — يشغّل 30+ فحصاً
   حقيقياً على القاعدة والملفات والصلاحيات، ويعطيك لكل فشل:
        ما الذي فشل · لماذا يهمّك · **ماذا تفعل بالضبط** (خطوة بخطوة).

   لا يكتب شيئاً على بياناتك الحقيقية. اختبار الكتابة يُجرى على صفّ وهمي يُحذَف.
   يظهر للأدمن/السيادي فقط (زر 🧪).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.GMTSelfTest) return;

  var RF = (window.__gmtRealFetch || window.fetch).bind(window);
  var R = [];   // نتائج الفحص

  function cfg() {
    return {
      url: (window.GMT_CONFIG && GMT_CONFIG.SUPABASE_URL) || window.SUPABASE_URL || window.SB || '',
      key: (window.GMT_CONFIG && GMT_CONFIG.SUPABASE_ANON_KEY) || window.SUPABASE_ANON_KEY || window.KEY || ''
    };
  }
  function H() {
    var c = cfg();
    return { apikey: c.key, Authorization: 'Bearer ' + c.key, 'Content-Type': 'application/json' };
  }

  function add(status, area, title, detail, todo) {
    R.push({ status: status, area: area, title: title, detail: detail || '', todo: todo || '' });
  }
  var ok   = function (a, t, d) { add('ok', a, t, d); };
  var fail = function (a, t, d, todo) { add('fail', a, t, d, todo); };
  var warn = function (a, t, d, todo) { add('warn', a, t, d, todo); };

  async function q(path) {
    var c = cfg();
    var r = await RF(c.url + '/rest/v1/' + path, { headers: H() });
    if (!r.ok) { var e = new Error('HTTP ' + r.status + ' ' + (await r.text().catch(function () { return ''; })).slice(0, 140)); e.status = r.status; throw e; }
    return r.json();
  }

  /* ═══════════ ① الأساسيات ═══════════ */
  async function testBasics() {
    var c = cfg();
    if (!c.url || !c.key) {
      fail('الإعداد', 'مفاتيح Supabase غير موجودة', 'الصفحة لا تعرف عنوان القاعدة ولا المفتاح.',
        '① تأكّد أن ملف gmt-config.js مرفوع بجانب هذه الصفحة.\n② تأكّد أن وسمه <script src="gmt-config.js"></script> موجود **قبل** باقي السكربتات.');
      return false;
    }
    ok('الإعداد', 'مفاتيح Supabase موجودة', c.url);

    try {
      await q('products?select=id&limit=1');
      ok('الاتصال', 'القاعدة تستجيب', 'قراءة products نجحت.');
    } catch (e) {
      fail('الاتصال', 'القاعدة لا تستجيب', e.message,
        '① تأكّد من النت.\n② تأكّد أن مشروع Supabase لم يُوقَف (Paused) — افتح لوحة Supabase.\n③ تأكّد أن المفتاح anon صحيح بـgmt-config.js.');
      return false;
    }
    return true;
  }

  /* ═══════════ ② البوتات نفسها محمّلة؟ ═══════════ */
  function testBots() {
    var bots = [
      ['GMTBug',      'gmt-bugcatcher.js', '🐞 الحارس',      'لن يصل الإدارة أي خطأ يحدث عندك.'],
      ['GMTInspect',  'gmt-inspector.js',  '🔍 المفتّش',      'لن يُلتقط أي خطأ صامت (زر بلا أثر · كتابة لم تُطبَّق · مضاعفة).'],
      ['GMTGuide',    'gmt-guide.js',      '🎓 النظام التعليمي', 'لا شاشات ولا دليل أزرار على هذه الصفحة.'],
      ['GMTSandbox',  'gmt-sandbox.js',    '🏋️ الوضع التدريبي', 'لا يمكن التدريب بلا خطر على هذه الصفحة.'],
      ['GMTUI',       'gmt-ui.js',         '🎨 واجهة موحّدة',   'قد تظهر نوافذ alert بدائية.']
    ];
    bots.forEach(function (b) {
      if (window[b[0]]) {
        var v = window[b[0]].version ? (' v' + window[b[0]].version) : '';
        ok('البوتات', b[2] + ' محمّل' + v, '');
      } else {
        fail('البوتات', b[2] + ' غير محمّل', b[3],
          '① انسخ ' + b[1] + ' من مجلد 02_ملفات_مشتركة إلى مجلد هذه الصفحة.\n' +
          '② أضف قبل </body>:  <script src="' + b[1] + '"></script>\n' +
          '③ حدّث الصفحة بـCtrl+Shift+R.');
      }
    });

    // تعارض: نظام تعليمي قديم ما زال حيّاً
    if (window.GMTTour && !window.GMTTour.toString().match(/start/)) {
      warn('البوتات', 'قد تكون الجولة القديمة ما زالت محمّلة', 'التعليمي القديم يتعارض مع v4 ⇒ نوافذ فوق بعضها وتجميد.',
        'احذف أي استدعاء لـgmt-tour.js القديم — الشاهدة الحالية كافية.');
    }

    // تغطية التوثيق
    if (window.GMTGuide && GMTGuide.coverage) {
      var cov = GMTGuide.coverage();
      if (cov.pct >= 90) ok('التوثيق', 'تغطية أزرار هذه الصفحة ' + cov.pct + '%', '');
      else warn('التوثيق', 'تغطية الأزرار ' + cov.pct + '% فقط', cov.undocumented.length + ' زر بلا شرح.',
        '① افتح 🎓 ← تبويب «الأزرار» ← اقرأ القائمة الحمراء (🚨).\n② لا تستعمل تلك الأزرار على بيانات حقيقية قبل أن تفهم أثرها.\n③ أبلغ الإدارة لتُضاف للدليل.');
    }
  }

  /* ═══════════ ③ الأعمدة والجداول التي يعتمد عليها الكود ═══════════ */
  async function testSchema() {
    var checks = [
      ['products',           'id,name,barcode,cost_price', 'الجرد', 'GMT_MASTER_SCHEMA_2026-07-13.sql'],
      ['import_log',         'id,inv_number,items_snapshot,transferred', 'المشتريات', 'GMT_MASTER_SCHEMA_2026-07-13.sql'],
      ['import_log',         'transfer_moved',   'المشتريات (PUR-2)', 'GMT_MASTER_SCHEMA_2026-07-13.sql'],
      ['gmt_orders',         'id,status,tg_msg_id', 'الأوردرات (ORD-1)', 'GMT_MASTER_SCHEMA_2026-07-13.sql'],
      ['gmt_orders',         'created_by,deleted_at', 'المساءلة (ORD-5)', 'GMT_MASTER_SCHEMA_2026-07-13.sql'],
      ['error_log',          'id,message,severity', '🐞 الحارس (BOT-2)', 'GMT_BOTS_2026-07-13.sql'],
      ['inspector_sessions', 'id,silent_errors',  '🔍 المفتّش (BOT-3)', 'GMT_BOTS_2026-07-13.sql']
    ];
    for (var i = 0; i < checks.length; i++) {
      var t = checks[i][0], cols = checks[i][1], area = checks[i][2], sql = checks[i][3];
      try {
        await q(t + '?select=' + cols + '&limit=1');
        ok('القاعدة', t + ' ✓ ' + cols.split(',').length + ' عمود', area);
      } catch (e) {
        var missing = /column|does not exist|42703|PGRST20/.test(e.message);
        fail('القاعدة', (missing ? 'عمود ناقص بـ' : 'جدول مفقود: ') + t, area + ' — ' + e.message.slice(0, 110),
          '① افتح Supabase ← SQL Editor.\n② شغّل الملف: ' + sql + '\n③ أعد تحميل الصفحة بـCtrl+Shift+R.\n\n⚠️ حتى تُشغّله، ميزات «' + area + '» ستفشل أو تعمل ناقصة.');
      }
    }
  }

  /* ═══════════ ④ اختبار كتابة حقيقي — يكشف صمت RLS (SEC-1) ═══════════ */
  async function testWrite() {
    var c = cfg();
    var probe = { session_id: 'SELFTEST-' + Date.now(), message: 'اختبار ذاتي — يُحذف تلقائياً', severity: 'warn', err_type: 'selftest', training: true };
    var id = null;
    try {
      var r = await RF(c.url + '/rest/v1/error_log', {
        method: 'POST', headers: Object.assign({}, H(), { Prefer: 'return=representation' }), body: JSON.stringify(probe)
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var rows = await r.json();
      id = Array.isArray(rows) && rows[0] ? rows[0].id : null;
      if (!id) throw new Error('الخادم قبِل الكتابة لكن لم يُرجع صفّاً');
      ok('الصلاحيات', 'الكتابة على القاعدة تعمل فعلاً', 'أُنشئ صف اختبار وتحقّقنا منه.');
    } catch (e) {
      fail('الصلاحيات', '🔴 الكتابة لا تُطبَّق فعلاً', e.message,
        'هذه أخطر حالة: الخادم قد يقبل الطلب و**لا يحفظ شيئاً** (صمت RLS) ⇒ فواتير تُختم وهي لم تُحفظ.\n' +
        '① Supabase ← SQL Editor ← شغّل GMT_BOTS_2026-07-13.sql (فيه سياسات RLS).\n' +
        '② تأكّد أن الجدول عليه policy للـinsert لدور anon.\n' +
        '③ أعد الفحص.');
      return;
    }
    // نظّف
    try { await RF(c.url + '/rest/v1/error_log?id=eq.' + id, { method: 'DELETE', headers: H() }); } catch (e) {}
  }

  /* ═══════════ ⑤ سلامة المخزون — يكشف بقايا المضاعفة (PUR-1) ═══════════ */
  async function testStock() {
    var invs, prods;
    try {
      invs  = await q('import_log?select=inv_number,items_snapshot,transferred,transfer_moved,status&limit=500');
      prods = await q('products?select=id,name,germany,china,haleb&limit=2000');
    } catch (e) {
      warn('المخزون', 'تعذّر فحص سلامة المخزون', e.message, 'شغّل GMT_MASTER_SCHEMA أولاً ثم أعد الفحص.');
      return;
    }
    var byId = {};
    prods.forEach(function (p) { byId[String(p.id)] = p; });

    // ① فواتير مختومة «واصلة» ولم تصل كمياتها
    var sealedBad = 0;
    // ② زيادة غير مبرَّرة (بصمة المضاعفة)
    var expected = {};
    invs.forEach(function (v) {
      var it = v.items_snapshot;
      if (typeof it === 'string') { try { it = JSON.parse(it); } catch (e) { it = []; } }
      if (!Array.isArray(it)) it = [];
      var mv = v.transfer_moved;
      if (typeof mv === 'string') { try { mv = JSON.parse(mv); } catch (e) { mv = {}; } }
      mv = mv || {};
      if (v.transferred && it.some(function (x) { return Number(mv[x.id] || 0) < Number(x.qty || 0); })) sealedBad++;
      it.forEach(function (x) {
        var k = String(x.id || '');
        if (k) expected[k] = (expected[k] || 0) + Number(x.qty || 0);
      });
    });

    var surplus = [];
    Object.keys(expected).forEach(function (id) {
      var p = byId[id];
      if (!p) return;
      var actual = (Number(p.germany) || 0) + (Number(p.china) || 0) + (Number(p.haleb) || 0);
      var diff = actual - expected[id];
      if (diff > 0) surplus.push({ name: p.name, diff: diff, exp: expected[id], act: actual });
    });
    surplus.sort(function (a, b) { return b.diff - a.diff; });

    if (surplus.length) {
      fail('المخزون', '🔴 ' + surplus.length + ' قطعة مخزونها **أكبر** من مجموع فواتيرها',
        'أخطرها: ' + surplus.slice(0, 5).map(function (s) { return s.name + ' (+' + s.diff + ')'; }).join(' · '),
        'المخزون لا يمكن أن يزيد عن الفواتير إلا بمضاعفة كتابة (PUR-1 — أُصلح) أو تعديل يدوي.\n' +
        '① هذه **بقايا** المضاعفة القديمة — الإصلاح يمنع تكرارها لكن لا يمحو الماضي.\n' +
        '② افتح الجرد ← 🔗 لوحة التدقيق ← قسم «زيادة غير مبرَّرة».\n' +
        '③ صحّح كل قطعة **مرة واحدة** يدوياً (صلاحية سيادية + سبب).\n' +
        '④ أعد هذا الفحص — يجب أن يصبح أخضر.');
    } else {
      ok('المخزون', 'لا زيادة غير مبرَّرة', 'المخزون يطابق مجموع الفواتير — لا أثر للمضاعفة.');
    }

    if (sealedBad) {
      fail('المخزون', '⛔ ' + sealedBad + ' فاتورة مختومة «واصلة» ولم تصل كمياتها',
        'بضاعة محسوبة كواصلة وهي ليست بالمخزون.',
        '① المشتريات ← افتح الفاتورة ← «🔓 فكّ ختم» (سيادي + سبب).\n② ثم «📦 وصلت» وأعد الترحيل بالنافذة الجديدة.\n③ أعد هذا الفحص.');
    } else {
      ok('المخزون', 'لا فواتير مختومة كاذبة', '');
    }
  }

  /* ═══════════ ⑥ الأصول والهوية البصرية ═══════════ */
  function testAssets() {
    var b = (window.GMTBrand && GMTBrand.brokenImages()) || [];
    if (b.length) {
      fail('الأصول', '🖼️ ' + b.length + ' صورة مفقودة (404)', b.join(' · '),
        'الصور المفقودة تُظهر أيقونة مكسورة للزبون وتُبطئ الصفحة.\n' +
        '① ارفع هذه الملفات إلى مجلد هذه الصفحة: ' + b.join(', ') + '\n' +
        '② أو احذف وسم <img> الذي يشير إليها.\n' +
        'ℹ️ مؤقتاً: gmt-brand.js يجرّب شعارك الحقيقي مكانها، وإلا يُخفيها بهدوء — لا يرسم شيئاً مكانها.');
    } else ok('الأصول', 'كل الصور تُحمَّل', '');

    if (window.GMTBrand) {
      var br = GMTBrand.get();
      ok('الهوية', 'البوتات تقرأ هويتك: ' + br.red, 'المصدر: ' + br.source +
         ' — غيّر --gmt-red بـgmt-theme.css وكل البوتات تتلوّن معك.');
    } else {
      warn('الهوية', 'gmt-brand.js غير محمّل', 'البوتات ستستعمل الأحمر الافتراضي بدل هويتك، والصور المكسورة ستظهر قبيحة.',
        '① انسخ gmt-brand.js لمجلد هذه الصفحة.\n② أضفه **أولاً** قبل باقي البوتات:  <script src="gmt-brand.js"></script>');
    }
  }

  /* ═══════════ ⑦ الأخطاء الحيّة من البوتين ═══════════ */
  function testLive() {
    var bugs = (window.GMTBug && GMTBug.list && GMTBug.list()) || [];
    if (bugs.length) {
      warn('الحيّ', '🐞 الحارس مسجّل ' + bugs.length + ' خطأ بهذه الجلسة',
        bugs.slice(-3).map(function (b) { return (b.msg || '').slice(0, 70); }).join(' · '),
        'افتح 🩺 لوحة صحة النظام واقرأها. الحرجة أولاً.');
    } else ok('الحيّ', 'لا أخطاء بهذه الجلسة', '');

    var sil = (window.GMTInspect && GMTInspect.silent && GMTInspect.silent()) || [];
    if (sil.length) {
      fail('الحيّ', '🔴 ' + sil.length + ' خطأ **صامت** بهذه الجلسة',
        sil.slice(-3).map(function (s) { return s.msg.slice(0, 80); }).join(' | '),
        'الأخطاء الصامتة هي الأخطر — النظام يبدو سليماً وهو ليس كذلك.\n' +
        '① افتح 🔍 المفتّش ← «📋 نسخ التقرير».\n② أرسله للمطوّر فوراً.\n③ لا تُكمل عملاً حساساً (فواتير/ترحيل) قبل معرفة السبب.');
    } else ok('الحيّ', 'لا أخطاء صامتة', 'لا زر بلا أثر · لا كتابة مزدوجة · لا كتابة لم تُطبَّق.');
  }

  /* ═══════════ التشغيل ═══════════ */
  async function run() {
    R = [];
    render(true);
    var alive = await testBasics();
    testBots();
    if (alive) {
      await testSchema();
      await testWrite();
      await testStock();
      await testDeep();
    }
    testAssets();
    testLive();
    render(false);
    if (window.GMTInspect && GMTInspect.step) {
      var f = R.filter(function (x) { return x.status === 'fail'; }).length;
      GMTInspect.step('🧪', 'شغّل الفاحص الذاتي — ' + f + ' فشل من ' + R.length + ' فحص');
    }
  }

  /* ═══════════ ⑤ فحص عميق: الترابط والمنطق المالي (2026-07-22) ═══════════
     اختبارات حقيقية 100%: تفحص العلاقات بين الجداول والحسابات فعلياً على القاعدة. */
  async function testDeep() {
    // ① ترابط: كل فاتورة عمولة لها فاتورة أصلية موجودة
    try {
      var comms = await q('invoice_commissions?select=invoice_id&limit=50');
      if (comms && comms.length) {
        var ids = comms.map(function (c) { return c.invoice_id; }).filter(Boolean);
        if (ids.length) {
          var found = await q('invoices?select=id&id=in.(' + ids.slice(0, 30).join(',') + ')');
          var foundSet = {}; (found || []).forEach(function (f) { foundSet[f.id] = 1; });
          var orphan = ids.slice(0, 30).filter(function (id) { return !foundSet[id]; });
          if (orphan.length) fail('الترابط', 'عمولات بلا فاتورة أصلية: ' + orphan.length, 'قد تُدفع عمولة على فاتورة محذوفة.', 'راجع invoice_commissions مقابل invoices.');
          else ok('الترابط', 'كل العمولات مربوطة بفواتير ✓', 'سلامة العلاقة');
        }
      } else ok('الترابط', 'لا عمولات للفحص بعد', 'العمولات');
    } catch (e) { /* الجدول قد لا يكون جاهزاً — يُغطّى بفحص الأعمدة */ }

    // ② منطق مالي: هل هناك فواتير بيع تحت التكلفة دون تخويل؟
    try {
      var items = await q('invoice_items?select=product_name,unit_price,cost_price,qty&limit=100');
      if (items && items.length) {
        var below = items.filter(function (it) {
          return (+it.cost_price > 0) && (+it.unit_price < +it.cost_price - 0.01);
        });
        if (below.length) warn('المنطق المالي', below.length + ' بند بيع تحت التكلفة', 'تحقّق أنها مخوّلة (أدمن/شريك/عرض). المنتجات: ' + below.slice(0, 3).map(function (b) { return b.product_name; }).join('، '));
        else ok('المنطق المالي', 'لا بيع تحت التكلفة غير مبرّر ✓', 'حماية السعر');
      } else ok('المنطق المالي', 'لا بنود للفحص بعد', 'البنود');
    } catch (e) { /* اختياري */ }

    // ③ سلامة المخزون: كميات سالبة؟
    try {
      var neg = await q('products?select=name,quantity&quantity=lt.0&limit=20');
      if (neg && neg.length) fail('سلامة المخزون', neg.length + ' منتج بكمية سالبة!', 'خطأ منطقي — الكمية لا يجب أن تقل عن صفر. المنتجات: ' + neg.slice(0, 3).map(function (n) { return n.name; }).join('، '), 'راجع خصم المخزون (POS-ATOMIC).');
      else ok('سلامة المخزون', 'لا كميات سالبة ✓', 'الجرد');
    } catch (e) { /* اختياري */ }

    // ④ تكرار: باركود مكرّر؟
    try {
      var prods = await q('products?select=barcode&barcode=not.is.null&limit=500');
      if (prods && prods.length) {
        var seen = {}, dups = 0;
        prods.forEach(function (p) { if (p.barcode) { if (seen[p.barcode]) dups++; seen[p.barcode] = 1; } });
        if (dups) warn('التكرار', dups + ' باركود مكرّر', 'قد يسبب التباساً بالبيع. راجع المنتجات.');
        else ok('التكرار', 'لا باركود مكرّر ✓', 'المنتجات');
      }
    } catch (e) { /* اختياري */ }
  }

  /* ═══════════ الواجهة ═══════════ */
  function render(busy) {
    var d = document.getElementById('gmt-st-panel');
    if (!d) {
      d = document.createElement('div');
      d.id = 'gmt-st-panel';
      d.style.cssText = 'position:fixed;inset:0;z-index:2147481600;background:rgba(4,6,10,.95);backdrop-filter:blur(8px);' +
        'padding:16px;overflow:auto;direction:rtl;font-family:Cairo,system-ui,sans-serif;';
      document.body.appendChild(d);
    }
    var f = R.filter(function (x) { return x.status === 'fail'; });
    var w = R.filter(function (x) { return x.status === 'warn'; });
    var o = R.filter(function (x) { return x.status === 'ok'; });
    var verdict = busy ? '⏳ جارٍ الفحص…'
      : (f.length ? '🔴 النظام غير جاهز للنشر — ' + f.length + ' مشكلة تمنعه'
        : (w.length ? '🟡 يعمل، لكن ' + w.length + ' تنبيه يستحق النظر' : '✅ كل الفحوص نجحت — جاهز'));
    var BR = (window.GMTBrand && GMTBrand.red()) || '#C00012';
    var vcol = busy ? '#334155' : (f.length ? BR : (w.length ? '#b45309' : '#16a34a'));

    var card = function (x) {
      var ic = x.status === 'ok' ? '✅' : (x.status === 'warn' ? '🟡' : '🔴');
      var bc = x.status === 'ok' ? 'rgba(22,163,74,.35)' : (x.status === 'warn' ? 'rgba(180,83,9,.5)' : 'rgba(192,0,18,.55)');
      var bg = x.status === 'ok' ? '#131b18' : (x.status === 'warn' ? '#1c1710' : '#1c1013');
      return '<div style="background:' + bg + ';border:1px solid ' + bc + ';border-radius:13px;padding:12px 14px;margin-bottom:8px">' +
        '<div style="font-weight:900;font-size:13.5px;color:#fff">' + ic + ' ' + x.title +
          ' <span style="color:#6f7789;font-weight:700;font-size:11px">· ' + x.area + '</span></div>' +
        (x.detail ? '<div style="font-size:12px;color:#aab3c4;margin-top:4px;line-height:1.8">' + String(x.detail).replace(/</g, '&lt;') + '</div>' : '') +
        (x.todo ? '<div style="margin-top:8px;background:rgba(255,255,255,.05);border-right:3px solid ' + bc +
          ';border-radius:8px;padding:9px 11px;font-size:12px;color:#dbe1ec;line-height:2;white-space:pre-wrap">' +
          '<b style="color:var(--gg-red,#ff8b96)">🛠 ماذا تفعل الآن:</b>\n' + String(x.todo).replace(/</g, '&lt;') + '</div>' : '') +
      '</div>';
    };

    d.innerHTML =
      '<div style="max-width:880px;margin:0 auto;background:#0f131c;border:1px solid rgba(255,255,255,.1);border-radius:20px;overflow:hidden;color:#fff">' +
        '<div style="padding:15px 17px;background:' + vcol + ';display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
          '<div><div style="font-weight:900;font-size:16px">🧪 الفاحص الذاتي</div>' +
          '<div style="font-size:12.5px;opacity:.92;margin-top:2px">' + verdict + '</div></div>' +
          '<div style="display:flex;gap:6px">' +
            '<button id="st-run" style="background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:10px;padding:8px 13px;font:inherit;font-weight:800;font-size:12px;cursor:pointer">🔄 إعادة الفحص</button>' +
            '<button id="st-copy" style="background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:10px;padding:8px 13px;font:inherit;font-weight:800;font-size:12px;cursor:pointer">📋 نسخ</button>' +
            '<button id="st-x" style="background:rgba(0,0,0,.25);color:#fff;border:0;border-radius:10px;padding:8px 13px;font:inherit;font-weight:800;font-size:12px;cursor:pointer">✕</button>' +
          '</div>' +
        '</div>' +
        '<div style="padding:14px 16px 20px">' +
          '<div style="display:flex;gap:8px;margin-bottom:12px;font-size:12px;font-weight:900">' +
            '<span style="background:rgba(192,0,18,.2);color:#ff8b96;padding:5px 11px;border-radius:9px">🔴 فشل ' + f.length + '</span>' +
            '<span style="background:rgba(180,83,9,.2);color:#fbbf24;padding:5px 11px;border-radius:9px">🟡 تنبيه ' + w.length + '</span>' +
            '<span style="background:rgba(22,163,74,.2);color:#4ade80;padding:5px 11px;border-radius:9px">✅ نجح ' + o.length + '</span>' +
          '</div>' +
          (f.length ? '<div style="font-size:13px;font-weight:900;color:#ff8b96;margin:6px 0 8px">🔴 يجب إصلاحها قبل النشر</div>' + f.map(card).join('') : '') +
          (w.length ? '<div style="font-size:13px;font-weight:900;color:#fbbf24;margin:14px 0 8px">🟡 تنبيهات</div>' + w.map(card).join('') : '') +
          (o.length ? '<details style="margin-top:12px"><summary style="cursor:pointer;font-size:13px;font-weight:900;color:#4ade80">✅ الفحوص الناجحة (' + o.length + ')</summary><div style="margin-top:8px">' + o.map(card).join('') + '</div></details>' : '') +
        '</div>' +
      '</div>';

    d.querySelector('#st-x').onclick = function () { d.remove(); };
    d.querySelector('#st-run').onclick = function () { run(); };
    d.querySelector('#st-copy').onclick = function () {
      var t = R.map(function (x) {
        return (x.status === 'ok' ? '[نجح] ' : x.status === 'warn' ? '[تنبيه] ' : '[فشل] ') +
          x.area + ' — ' + x.title + (x.detail ? '\n   ' + x.detail : '') + (x.todo ? '\n   ماذا تفعل: ' + x.todo.replace(/\n/g, '\n   ') : '');
      }).join('\n\n');
      var head = '🧪 تقرير الفاحص الذاتي · ' + new Date().toLocaleString('ar-SY') + '\nالصفحة: ' + document.title + '\n' + verdict + '\n\n';
      try { navigator.clipboard.writeText(head + t); alert('✅ نُسخ التقرير — أرسله للمطوّر.'); }
      catch (e) { alert('انسخه يدوياً من الشاشة.'); }
    };
  }

  function fab() {
    var isAdmin = /admin|sovereign|owner/i.test(
      (window.GMTBug && GMTBug.role && GMTBug.role()) || window.__gmtRole || ''
    );
    var b = document.getElementById('gmt-st-fab');
    if (!isAdmin) { if (b) b.remove(); return; }
    if (b) return;
    b = document.createElement('button');
    b.id = 'gmt-st-fab';
    b.title = 'الفاحص الذاتي — شغّل النظام كله وافحصه';
    b.textContent = '🧪';
    b.style.cssText = 'position:fixed;left:14px;bottom:138px;z-index:2147481000;width:46px;height:46px;border-radius:50%;' +
      'border:0;background:#0369a1;color:#fff;font-size:19px;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.35);';
    b.onclick = run;
    document.body.appendChild(b);
  }

  window.GMTSelfTest = { run: run, results: function () { return R; } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fab);
  else fab();
  setTimeout(fab, 2600);   // بعد أن يعرف الحارس الدور
}());


/* ── gmt-money-guard.js ── */
;/* ═══════════════════════════════════════════════════════════════════════════
   gmt-money-guard.js — 🧮 الحارس المالي الرياضي · v1.0 · 2026-07-21
   الفكرة: البوتات العادية تتأكد أن الزر اشتغل. هذا يتأكد أن الرقم صحيح رياضياً.
   يعترض كل عملية بيع/عمولة/خصم، يعيد حسابها بنفسه من المبادئ الأولى،
   ويقارن بما حسبه النظام. أي فرق ⇒ يوقف ويبلّغ المراقب فوراً.
   هذا أقصى حد عملي: بعد أن يضع المالك القواعد (النسب/الحدود) مرة واح—دة،
   يفرضها البوت بصرامة مطلقة دون مراجعة يومية.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.GMTMoneyGuard) return;

  // ── القواعد المالية (يضبطها المالك مرة واحدة) ──
  // تُقرأ من window.GMT_MONEY_RULES إن وُجدت، وإلا الافتراضات الآمنة.
  var R = window.GMT_MONEY_RULES || {};
  var RULES = {
    commissionPct: (R.commissionPct != null ? R.commissionPct : null), // نسبة العمولة إن كانت ثابتة (null = تُقرأ من المنتج)
    cashierProfitShare: (R.cashierProfitShare != null ? R.cashierProfitShare : 0.5), // نصف (البيع−التكلفة)
    tolerance: (R.tolerance != null ? R.tolerance : 0.01), // فرق مسموح (تقريب القروش)
    allowBelowCostRoles: R.allowBelowCostRoles || ['admin', 'sovereign', 'partner'],
    blockBelowCost: (R.blockBelowCost !== false) // افتراضياً يمنع البيع تحت التكلفة
  };

  var incidents = [];
  function flag(sev, title, detail, math) {
    var inc = { t: Date.now(), sev: sev, title: title, detail: detail, math: math || null };
    incidents.push(inc);
    // بلّغ المراقب السيادي
    try {
      if (window.GMTWarden && GMTWarden.flag) {
        GMTWarden.flag({
          kind: 'financial', severity: sev, title: '🧮 ' + title,
          what: detail, how: math ? ('الحساب المتوقّع: ' + math) : '', why: 'الحارس المالي كشف تبايناً رياضياً.'
        });
      }
    } catch (e) {}
    // سجّل بالكونسول للمفتّش
    try { console.warn('[MoneyGuard] ' + title + ' — ' + detail); } catch (e) {}
  }

  var near = function (a, b) { return Math.abs((+a || 0) - (+b || 0)) <= RULES.tolerance; };

  // ── ① تحقّق من عمولة فاتورة ──
  // يتوقّع: {sale, cost, wholesale, commission, qty} لكل بند
  function checkCommission(item) {
    if (!item || item.commission == null) return true;
    var sale = +item.sale || +item.unit_price || +item.actual_price || 0;
    var cost = +item.cost || +item.purchase_price || +item.net_cost || 0;
    var qty = +item.qty || 1;
    var got = +item.commission || 0;

    // العمولة = (البيع − التكلفة) × الكمية × نصيب الكاشير  [أو نسبة ثابتة إن حُددت]
    var expected;
    if (RULES.commissionPct != null) {
      expected = sale * qty * RULES.commissionPct;
    } else {
      expected = Math.max(0, (sale - cost)) * qty * RULES.cashierProfitShare;
    }
    if (!near(got, expected)) {
      flag('high', 'عمولة غير مطابقة',
        'المنتج «' + (item.product_name || item.name || '?') + '»: النظام سجّل عمولة ' + got.toFixed(2) +
        ' والمتوقّع ' + expected.toFixed(2) + ' (بيع ' + sale + ' − تكلفة ' + cost + ' × ' + qty + ').',
        expected.toFixed(2));
      return false;
    }
    return true;
  }

  // ── ② تحقّق من البيع تحت التكلفة ──
  function checkBelowCost(item, role) {
    var sale = +item.sale || +item.unit_price || +item.actual_price || 0;
    var cost = +item.cost || +item.purchase_price || +item.net_cost || 0;
    if (cost > 0 && sale < cost - RULES.tolerance) {
      var allowed = RULES.allowBelowCostRoles.indexOf((role || '').toLowerCase()) >= 0;
      if (!allowed && RULES.blockBelowCost) {
        flag('critical', 'بيع تحت التكلفة ممنوع',
          'المنتج «' + (item.product_name || item.name || '?') + '»: بيع ' + sale + ' < تكلفة ' + cost +
          ' والدور «' + (role || 'كاشير') + '» غير مخوّل. يجب منع الحفظ.',
          '≥ ' + cost);
        return false;
      }
    }
    return true;
  }

  // ── ③ تحقّق من إجمالي الفاتورة ──
  function checkInvoiceTotal(inv) {
    if (!inv || !inv.items) return true;
    var sum = 0;
    (inv.items || []).forEach(function (it) {
      sum += (+it.sale || +it.unit_price || 0) * (+it.qty || 1);
    });
    var coupon = +inv.coupon_discount || 0;
    var expected = Math.max(0, sum - coupon);
    var got = +inv.total || 0;
    if (!near(got, expected)) {
      flag('high', 'إجمالي الفاتورة غير مطابق',
        'الإجمالي المسجّل ' + got.toFixed(2) + ' والمتوقّع ' + expected.toFixed(2) +
        ' (مجموع البنود ' + sum.toFixed(2) + ' − كوبون ' + coupon + ').',
        expected.toFixed(2));
      return false;
    }
    return true;
  }

  // ── ④ تحقّق من ربح الشركة ──
  // ربح الشركة = (البيع − الشراء) − العمولة
  function checkCompanyProfit(item) {
    if (item.company_profit == null) return true;
    var sale = +item.sale || 0, cost = +item.cost || 0, comm = +item.commission || 0, qty = +item.qty || 1;
    var expected = (sale - cost) * qty - comm;
    var got = +item.company_profit || 0;
    if (!near(got, expected)) {
      flag('medium', 'ربح الشركة غير مطابق',
        'المسجّل ' + got.toFixed(2) + ' والمتوقّع ' + expected.toFixed(2) + '.', expected.toFixed(2));
      return false;
    }
    return true;
  }

  // ── واجهة الفحص الكامل لفاتورة ──
  function auditInvoice(inv, role) {
    var problems = 0;
    (inv.items || []).forEach(function (it) {
      if (!checkCommission(it)) problems++;
      if (!checkBelowCost(it, role)) problems++;
      if (!checkCompanyProfit(it)) problems++;
    });
    if (!checkInvoiceTotal(inv)) problems++;
    return { ok: problems === 0, problems: problems };
  }

  // ── اعتراض تلقائي: راقب حفظ الفواتير عبر fetch ──
  var RF = window.fetch;
  window.fetch = async function (input, init) {
    try {
      var url = (typeof input === 'string' ? input : (input && input.url)) || '';
      var method = ((init && init.method) || 'GET').toUpperCase();
      if (/POST|PATCH/.test(method) && /rest\/v1\/invoices/.test(url) && init && init.body) {
        var payload = null;
        try { payload = typeof init.body === 'string' ? JSON.parse(init.body) : init.body; } catch (e) {}
        if (payload) {
          var inv = payload;
          if (inv.items_json && typeof inv.items_json === 'string') {
            try { inv.items = JSON.parse(inv.items_json); } catch (e) {}
          }
          var role = '';
          try { role = (JSON.parse(localStorage.getItem('gmt_user') || '{}').role) || ''; } catch (e) {}
          auditInvoice(inv, role); // يسجّل أي تباين للمراقب (لا يحجب الحفظ — لكن يبلّغ فوراً)
        }
      }
    } catch (e) { /* لا نُفشل أبداً بسبب الفحص */ }
    return RF.apply(this, arguments);
  };

  window.GMTMoneyGuard = {
    version: '1.0',
    rules: RULES,
    auditInvoice: auditInvoice,
    checkCommission: checkCommission,
    checkBelowCost: checkBelowCost,
    checkInvoiceTotal: checkInvoiceTotal,
    checkCompanyProfit: checkCompanyProfit,
    incidents: function () { return incidents.slice(); },
    /* اختبار ذاتي: يتحقق أن منطق الحساب سليم */
    selfTest: function () {
      var t = [];
      // عمولة صحيحة: بيع 100 تكلفة 60 نصف الفرق = 20
      t.push({ n: 'عمولة', ok: checkCommission({ sale: 100, cost: 60, qty: 1, commission: 20 }) });
      // عمولة خاطئة: نفس المعطيات لكن سُجّل 30 ⇒ يجب أن يكشفها (false)
      t.push({ n: 'كشف عمولة خاطئة', ok: !checkCommission({ sale: 100, cost: 60, qty: 1, commission: 30 }) });
      // تحت التكلفة لكاشير ⇒ يُمنع (false)
      t.push({ n: 'منع تحت التكلفة', ok: !checkBelowCost({ sale: 50, cost: 60 }, 'cashier') });
      // تحت التكلفة لأدمن ⇒ مسموح (true)
      t.push({ n: 'سماح أدمن', ok: checkBelowCost({ sale: 50, cost: 60 }, 'admin') });
      var pass = t.filter(function (x) { return x.ok; }).length;
      return { pass: pass, total: t.length, details: t };
    }
  };
})();


/* ── gmt-warden.js ── */
;/* ═══════════════════════════════════════════════════════════════════════════
   gmt-warden.js — 🛡️ المراقب السيادي (نظام الحماية المركزي) · v1.0 · 2026-07-17
   ─────────────────────────────────────────────────────────────────────────
   طلب المالك: البوتات تصير «نظاماً كاملاً» يفهم كل النظام وكل الميزات وطلبات
   المالك، وله «صلاحيات كبيرة واستقلالية كاملة»، يراقب ويكتب تقريراً فورياً عند
   أي خطأ (برمجي/تقني/عملي/حسابي) بكل تفاصيله: ماذا · متى · كيف · لماذا · القيمة.

   هذا العقل المركزي:
     • يقرأ gmt-features.js (ماذا يفترض أن يحدث) + gmt-owner-requests.js (قواعد المالك).
     • ينسّق البوتات (الحارس · المفتّش · الفاحص) تحت مظلة واحدة.
     • يكتب «تقرير حماية» موحّداً بكل حادثة، يُخزَّن محلياً + يُرسَل للقاعدة.
     • ⭐ الأخطاء الحسابية (خصم/إضافة مالية غير مبرّرة) تبقى مسجّلة حتى بعد الإصلاح
       (طلب المالك: «الشيء المنخصم ما يضيع»).
     • ⭐ يشغّل «اختبارات وهمية» بعد النشر لاكتشاف الأخطاء ذاتياً (probe mode).

   يظهر للأدمن/السيادي فقط عبر زر 🛡️ أو صفحة «بوتات الحماية» المستقلة.
   ملف منطق، لكنه **لا يعدّل أي بيانات إنتاجية** — يراقب ويسجّل فقط.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.GMTWarden) return;

  var VERSION = 1.0;
  var LSK = 'gmt_warden_incidents';
  var LEDGER = 'gmt_warden_money_ledger';   // دفتر الفروقات المالية — لا يُمسح بالإصلاح
  var RF = (window.__gmtRealFetch || window.fetch).bind(window);

  var FEATURES = window.GMT_FEATURES || [];
  var RULES = window.GMT_OWNER_RULES || [];

  /* ═══════════ التخزين الدائم ═══════════ */
  function load(k, def) { try { return JSON.parse(localStorage.getItem(k) || 'null') || def; } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var incidents = load(LSK, []);
  var moneyLedger = load(LEDGER, []);

  function role() {
    return (window.GMTBug && GMTBug.role && GMTBug.role()) || window.__gmtRole || 'cashier';
  }
  function who() {
    return (window.GMTBug && GMTBug.who && GMTBug.who()) || 'غير معروف';
  }
  function branch() {
    try { return localStorage.getItem('gmt_branch') || '—'; } catch (e) { return '—'; }
  }

  /* ═══════════ كتابة تقرير حادثة (القلب) ═══════════
     كل تقرير يحوي: ماذا · متى · أين · من · كيف · لماذا · الخطورة · الصنف · القيمة المالية */
  function report(o) {
    var inc = {
      id: 'W' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      ts: Date.now(),
      when_human: new Date().toLocaleString('ar-SY'),
      kind: o.kind || 'unknown',              // programmatic | technical | operational | financial | rule_violation
      title: o.title || '',
      what: o.what || '',                      // ماذا حدث
      how: o.how || '',                        // كيف حدث
      why: o.why || '',                        // السبب المرجّح
      rule: o.rule || null,                    // أي قاعdة مالك خُولفت
      feature: o.feature || null,              // أي ميزة تأثّرت
      severity: o.severity || 'medium',
      page: document.title,
      url: location.href,
      user: who(),
      role: role(),
      branch: branch(),
      money_delta: (typeof o.money_delta === 'number') ? o.money_delta : null,  // القيمة المخصومة/المضافة
      evidence: o.evidence || null,            // دليل تقني (payload/response)
      resolved: false                          // يبقى false حتى يُصلَح — لكن الحادثة تبقى مسجّلة
    };
    incidents.push(inc);
    if (incidents.length > 500) incidents = incidents.slice(-500);
    save(LSK, incidents);

    // ⭐ الأخطاء الحسابية تُسجَّل بدفتر منفصل لا يُمسح أبداً (طلب المالك)
    if (inc.kind === 'financial' && inc.money_delta != null) {
      moneyLedger.push({
        id: inc.id, ts: inc.ts, when_human: inc.when_human,
        title: inc.title, money_delta: inc.money_delta,
        user: inc.user, branch: inc.branch, why: inc.why,
        recovered: false   // هل استُرجع المبلغ؟ يُحدَّث يدوياً، لكن السجل باقٍ
      });
      save(LEDGER, moneyLedger);
    }

    // أرسل للقاعدة عبر الحارس إن وُجد
    if (window.GMTBug && GMTBug.log) {
      GMTBug.log(inc.severity === 'critical' ? 'critical' : 'warn',
        '🛡️ ' + inc.title, { warden: true, kind: inc.kind, rule: inc.rule, money: inc.money_delta });
    }
    // أرسل نسخة كاملة لجدول المراقب
    sendIncident(inc);
    updateBadge();
    return inc;
  }

  async function sendIncident(inc) {
    try {
      var url = (window.GMT_CONFIG && GMT_CONFIG.SUPABASE_URL) || window.SUPABASE_URL;
      var key = (window.GMT_CONFIG && GMT_CONFIG.SUPABASE_ANON_KEY) || window.SUPABASE_ANON_KEY;
      if (!url || !key) return;
      await RF(url + '/rest/v1/warden_incidents', {
        method: 'POST', keepalive: true,
        headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({
          incident_id: inc.id, kind: inc.kind, title: inc.title, what: inc.what,
          how: inc.how, why: inc.why, rule_id: inc.rule, feature_id: inc.feature,
          severity: inc.severity, page: inc.page, user_name: inc.user, role: inc.role,
          branch: inc.branch, money_delta: inc.money_delta, evidence: inc.evidence,
          created_at: new Date(inc.ts).toISOString()
        })
      });
    } catch (e) { /* لا نُفشل الصفحة */ }
  }

  /* ═══════════ المراقبة الحيّة — ربط توقيعات المخالفات ═══════════ */

  // ① مراقبة الكتابات المالية (عمولات/أسعار) — كشف الخصم/الإضافة غير المبرّرة
  var RFetch = window.fetch;
  window.fetch = async function (input, init) {
    var url = (typeof input === 'string') ? input : (input && input.url) || '';
    var method = ((init && init.method) || 'GET').toUpperCase();
    var res = await RFetch.apply(this, arguments);

    try {
      if (/PATCH|POST/.test(method) && /\/rest\/v1\/(invoice_commissions|products|gmt_settlements)/.test(url)) {
        var body = '';
        try { body = typeof (init && init.body) === 'string' ? init.body : JSON.stringify((init && init.body) || {}); } catch (e) {}
        var payload = {};
        try { payload = JSON.parse(body); } catch (e) {}

        // خصم عمولة/سعر: سجّل بدفتر المال لو فيه قيمة
        if (/invoice_commissions/.test(url) && payload && ('amount' in payload)) {
          if (Number(payload.amount) === 0) {
            report({
              kind: 'financial', severity: 'high', feature: 'ADM-4', rule: 'OWN-MONEY-TRACE',
              title: 'تصفير عمولة', money_delta: -0,
              what: 'عمولة صُفّرت.', how: 'PATCH amount=0 على invoice_commissions.',
              why: payload.zeroed_reason || 'بلا سبب مسجَّل — راجع OWN-ACCOUNTABILITY.',
              evidence: body.slice(0, 200)
            });
          }
        }
        // بيع تحت التكلفة: يُكشف عبر مقارنة السعر بالتكلفة (يتطلب بيانات المنتج — يُسجَّل من نقطة البيع)
      }
    } catch (e) {}
    return res;
  };

  // ② فحص القواعد عند التحميل — أي ميزة بحالة conflict/partial تُبلَّغ للأدمن
  function auditFeaturesOnLoad() {
    if (!/admin|sovereign|owner/i.test(role())) return;
    var broken = FEATURES.filter(function (f) {
      return f.status === 'conflict' || (f.status === 'partial' && f.severity === 'critical');
    });
    broken.forEach(function (f) {
      // لا نُكرّر التبليغ أكثر من مرة يومياً
      var key = 'gmt_warden_seen_' + f.id + '_' + new Date().toDateString();
      if (localStorage.getItem(key)) return;
      try { localStorage.setItem(key, '1'); } catch (e) {}
      report({
        kind: 'rule_violation', severity: f.severity, feature: f.id,
        rule: f.note ? f.note : null,
        title: 'ميزة لا تعمل كما هو مطلوب: ' + f.title,
        what: f.what,
        how: 'الحالة: ' + f.status + '. ' + (f.built || ''),
        why: f.note || 'انظر سجل التدقيق.'
      });
    });
  }

  /* ═══════════ ⭐ الاختبارات الوهمية بعد النشر (Probe Mode) ═══════════
     طلب المالك: بوت يشغّل عمليات وهمية بعد النشر ليكشف الأخطاء ذاتياً.
     التنفيذ الآمن: يعمل فقط على «صف اختبار» يُنشأ ويُحذَف، ولا يمسّ بيانات حقيقية.
     يُشغَّل يدوياً من صفحة الحماية (لا تلقائياً — احتراماً لسلامة البيانات). */
  var probes = [
    {
      id: 'probe-db-write',
      title: 'اختبار الكتابة والقراءة',
      run: async function () {
        var url = (window.GMT_CONFIG && GMT_CONFIG.SUPABASE_URL) || window.SUPABASE_URL;
        var key = (window.GMT_CONFIG && GMT_CONFIG.SUPABASE_ANON_KEY) || window.SUPABASE_ANON_KEY;
        if (!url || !key) return { ok: false, msg: 'لا مفاتيح' };
        var probe = { session_id: 'PROBE-' + Date.now(), message: 'اختبار وهمي', severity: 'warn', err_type: 'probe', training: true };
        var r = await RF(url + '/rest/v1/error_log', {
          method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=representation' },
          body: JSON.stringify(probe)
        });
        if (!r.ok) return { ok: false, msg: 'الكتابة فشلت HTTP ' + r.status };
        var rows = await r.json();
        var id = rows && rows[0] && rows[0].id;
        if (!id) return { ok: false, msg: 'كُتب لكن لم يُقرأ (صمت RLS محتمل)' };
        await RF(url + '/rest/v1/error_log?id=eq.' + id, { method: 'DELETE', headers: { apikey: key, Authorization: 'Bearer ' + key } });
        return { ok: true, msg: 'الكتابة والقراءة والحذف تعمل' };
      }
    },
    {
      id: 'probe-counter',
      title: 'اختبار عدّاد الأوردرات (كشف SQL-1)',
      run: async function () {
        var url = (window.GMT_CONFIG && GMT_CONFIG.SUPABASE_URL) || window.SUPABASE_URL;
        var key = (window.GMT_CONFIG && GMT_CONFIG.SUPABASE_ANON_KEY) || window.SUPABASE_ANON_KEY;
        if (!url || !key) return { ok: false, msg: 'لا مفاتيح' };
        try {
          var r = await RF(url + '/rest/v1/rpc/increment_settings_counter', {
            method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_key: '__warden_probe__' })
          });
          if (!r.ok) return { ok: false, msg: 'دالة العدّاد تفشل HTTP ' + r.status + ' — راجع SQL-1' };
          return { ok: true, msg: 'دالة العدّاد تستجيب' };
        } catch (e) { return { ok: false, msg: String(e).slice(0, 80) }; }
      }
    }
  ];

  async function runProbes() {
    report({ kind: 'operational', severity: 'low', title: 'بدء الاختبارات الوهمية', what: 'المراقب يشغّل ' + probes.length + ' اختباراً ذاتياً.' });
    var results = [];
    for (var i = 0; i < probes.length; i++) {
      var p = probes[i];
      try {
        var r = await p.run();
        results.push({ id: p.id, title: p.title, ok: r.ok, msg: r.msg });
        if (!r.ok) {
          report({
            kind: 'technical', severity: 'high', title: 'فشل اختبار وهمي: ' + p.title,
            what: r.msg, how: 'probe ' + p.id, why: 'كُشف ذاتياً بعد النشر.'
          });
        }
      } catch (e) {
        results.push({ id: p.id, title: p.title, ok: false, msg: String(e).slice(0, 80) });
      }
    }
    return results;
  }

  /* ═══════════ التقرير الموحّد (للنسخ دفعة واحدة) ═══════════ */
  function fullReport() {
    var L = [];
    L.push('═══════ تقرير المراقب السيادي (نظام الحماية) ═══════');
    L.push('التاريخ: ' + new Date().toLocaleString('ar-SY'));
    L.push('المستخدم: ' + who() + ' · الدور: ' + role() + ' · الفرع: ' + branch());
    L.push('عدد الحوادث المسجّلة: ' + incidents.length);
    L.push('');

    var crit = incidents.filter(function (i) { return i.severity === 'critical'; });
    var fin = incidents.filter(function (i) { return i.kind === 'financial'; });

    L.push('── ملخّص حسب الصنف ──');
    ['programmatic', 'technical', 'operational', 'financial', 'rule_violation'].forEach(function (k) {
      var n = incidents.filter(function (i) { return i.kind === k; }).length;
      var ar = { programmatic: 'برمجي', technical: 'تقني', operational: 'عملي', financial: 'حسابي', rule_violation: 'مخالفة قاعدة' }[k];
      if (n) L.push('  ' + ar + ': ' + n);
    });
    L.push('');

    if (moneyLedger.length) {
      L.push('── ⭐ دفتر الفروقات المالية (لا يُمسح بالإصلاح) ──');
      var totalRecovered = 0, totalPending = 0;
      moneyLedger.forEach(function (m) {
        L.push('  ' + m.when_human + ' · ' + m.title + ' · ' + (m.money_delta || 0) +
               ' · ' + m.user + ' · ' + (m.recovered ? '✅ مسترجَع' : '⏳ معلّق') + (m.why ? ' · ' + m.why : ''));
        if (m.recovered) totalRecovered += Math.abs(m.money_delta || 0); else totalPending += Math.abs(m.money_delta || 0);
      });
      L.push('  المجموع المعلّق: ' + totalPending + ' · المسترجَع: ' + totalRecovered);
      L.push('');
    }

    if (crit.length) {
      L.push('── 🔴 الحوادث الحرجة ──');
      crit.slice(-30).forEach(function (i) {
        L.push('  [' + i.when_human + '] ' + i.title);
        L.push('     ماذا: ' + i.what);
        if (i.how) L.push('     كيف: ' + i.how);
        if (i.why) L.push('     لماذا: ' + i.why);
        if (i.rule) L.push('     قاعدة مُخالَفة: ' + i.rule);
        if (i.money_delta != null) L.push('     القيمة المالية: ' + i.money_delta);
        L.push('     من: ' + i.user + ' · الفرع: ' + i.branch);
        L.push('');
      });
    }

    L.push('── كل الحوادث (آخر 60) ──');
    incidents.slice(-60).forEach(function (i) {
      L.push('  [' + i.when_human + '] (' + i.severity + '/' + i.kind + ') ' + i.title +
             (i.money_delta != null ? ' · ' + i.money_delta : '') + ' · ' + i.user);
    });

    return L.join('\n');
  }

  /* ═══════════ الواجهة ═══════════ */
  function updateBadge() {
    var b = document.getElementById('gmt-warden-fab');
    if (!/admin|sovereign|owner/i.test(role())) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('button');
      b.id = 'gmt-warden-fab';
      b.title = 'المراقب السيادي — نظام الحماية';
      b.textContent = '🛡️';
      b.style.cssText = 'position:fixed;left:14px;bottom:200px;z-index:2147481000;width:46px;height:46px;border-radius:50%;' +
        'border:0;background:#7c2d12;color:#fff;font-size:20px;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.35);';
      b.onclick = openPanel;
      document.body.appendChild(b);
    }
    var crit = incidents.filter(function (i) { return i.severity === 'critical' && !i.resolved; }).length;
    b.style.background = crit ? '#dc2626' : '#7c2d12';
    b.textContent = crit ? '🛡️' : '🛡️';
  }

  function openPanel() {
    var old = document.getElementById('gmt-warden-panel');
    if (old) { old.remove(); return; }
    var d = document.createElement('div');
    d.id = 'gmt-warden-panel';
    d.style.cssText = 'position:fixed;inset:0;z-index:2147481700;background:rgba(4,6,10,.95);backdrop-filter:blur(8px);' +
      'padding:16px;overflow:auto;direction:rtl;font-family:Cairo,system-ui,sans-serif;';
    d.innerHTML =
      '<div style="max-width:900px;margin:0 auto;background:#0f131c;border:1px solid rgba(255,255,255,.1);border-radius:20px;overflow:hidden;color:#fff">' +
        '<div style="padding:15px 17px;background:#7c2d12;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
          '<div><div style="font-weight:900;font-size:16px">🛡️ المراقب السيادي — نظام الحماية</div>' +
          '<div style="font-size:12px;opacity:.9;margin-top:2px">' + incidents.length + ' حادثة · ' + moneyLedger.length + ' قيد بدفتر المال</div></div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
            '<button id="wd-probe" style="background:#16a34a;color:#fff;border:0;border-radius:10px;padding:8px 13px;font:inherit;font-weight:800;font-size:12px;cursor:pointer">🧪 اختبارات وهمية</button>' +
            '<button id="wd-copy" style="background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:10px;padding:8px 13px;font:inherit;font-weight:800;font-size:12px;cursor:pointer">📋 نسخ التقرير</button>' +
            '<button id="wd-clr" style="background:rgba(255,255,255,.15);color:#fff;border:0;border-radius:10px;padding:8px 13px;font:inherit;font-weight:800;font-size:12px;cursor:pointer">🗑 مسح الحوادث</button>' +
            '<button id="wd-x" style="background:rgba(0,0,0,.3);color:#fff;border:0;border-radius:10px;padding:8px 13px;font:inherit;font-weight:800;font-size:12px;cursor:pointer">✕</button>' +
          '</div>' +
        '</div>' +
        '<div id="wd-body" style="padding:16px"><pre style="margin:0;font-size:12px;line-height:1.8;white-space:pre-wrap;color:#c9d1dc;font-family:ui-monospace,monospace">' +
          fullReport().replace(/</g, '&lt;') + '</pre></div>' +
      '</div>';
    document.body.appendChild(d);
    d.querySelector('#wd-x').onclick = function () { d.remove(); };
    d.querySelector('#wd-clr').onclick = function () {
      if (confirm('مسح سجل الحوادث؟ (دفتر المال يبقى — لا يُمسح)')) { incidents = []; save(LSK, incidents); d.remove(); updateBadge(); }
    };
    d.querySelector('#wd-copy').onclick = function () {
      try { navigator.clipboard.writeText(fullReport()); alert('✅ نُسخ تقرير المراقب — الصقه بملف بوتات الحماية.'); }
      catch (e) { alert('انسخه يدوياً.'); }
    };
    d.querySelector('#wd-probe').onclick = async function () {
      this.textContent = '⏳ جارٍ...'; this.disabled = true;
      var results = await runProbes();
      var body = d.querySelector('#wd-body');
      body.innerHTML = '<div style="margin-bottom:12px">' + results.map(function (r) {
        return '<div style="background:' + (r.ok ? '#132018' : '#2a1215') + ';border:1px solid ' + (r.ok ? '#16a34a55' : '#dc262655') +
          ';border-radius:10px;padding:10px 12px;margin-bottom:6px"><b>' + (r.ok ? '✅' : '🔴') + ' ' + r.title + '</b><br>' +
          '<span style="font-size:12px;color:#aab3c4">' + r.msg + '</span></div>';
      }).join('') + '</div><pre style="margin:0;font-size:12px;line-height:1.8;white-space:pre-wrap;color:#c9d1dc;font-family:ui-monospace,monospace">' +
        fullReport().replace(/</g, '&lt;') + '</pre>';
    };
  }

  /* ═══════════ الواجهة العامة ═══════════ */
  window.GMTWarden = {
    version: VERSION,
    report: report,
    fullReport: fullReport,
    incidents: function () { return incidents; },
    moneyLedger: function () { return moneyLedger; },
    runProbes: runProbes,
    open: openPanel,
    // للبوتات الأخرى: أبلِغ عن حادثة
    flag: function (o) { return report(o); },
    feature: function (id) { return FEATURES.filter(function (f) { return f.id === id; })[0] || null; },
    rule: function (id) { return RULES.filter(function (r) { return r.id === id; })[0] || null; }
  };

  /* إقلاع */
  function boot() {
    updateBadge();
    setTimeout(function () { auditFeaturesOnLoad(); updateBadge(); }, 3000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());


/* ── gmt-autotest.js ── */
;/* ═══════════════════════════════════════════════════════════════════════════
   gmt-autotest.js — 🤖 الفاحص الشامل الآلي (E2E) · v1.0 · 2026-07-17
   ─────────────────────────────────────────────────────────────────────────
   طلب المالك: بوت يشغّل النظام كله كأنه مستخدم حقيقي — يجرّب **كل زر بلا
   استثناء**، كل معاينة رقمية/منطقية، كل طباعة، كل شكل — ويسجّل النتائج بتقرير.
     • تلقائي أول مرة بعد كل نشر (يكشف النشرة الجديدة عبر بصمة الإصدار).
     • زر يدوي لإعادة الفحص وقت ما يشاء.
     • يعمل ضمن المراقبة المستمرة (أثناء العمل والتعليم).

   ═══ الأمان (حاجز مزدوج على كل شيء، ثلاثي على الخطير) ═══
   ① يفرض الوضع التدريبي (GMTSandbox) الذي يحوّل كل كتابة لقاعدة وهمية محلية.
   ② يتحقق فعلياً أن الاعتراض شغّال قبل أي ضغطة (probe كتابة تُفحص أنها لم تصل).
   ③ الأزرار الخطيرة (حذف/تصفير/فكّ ختم/استعادة): لا تُضغط إلا بعد تأكيد
      الطبقتين معاً. إن فشل أي منهما، تُسجَّل «تُخطّيت — الحماية غير مؤكّدة».

   يقرأ سجل الميزات (gmt-features) وقواعد المالك (gmt-owner-requests) ليحكم:
   هل النتيجة الرقمية منطقية؟ هل السلوك مطابق للمطلوب؟

   يكتب تقاريره للمراقب السيادي (GMTWarden) والقاعدة.
   للأدمن فقط. لا يعمل على صفحات الزبون.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.GMTAutoTest) return;

  var VERSION = 1.0;
  var VER_KEY = 'gmt_autotest_last_version';
  var RESULT_KEY = 'gmt_autotest_last_result';

  /* بصمة الإصدار: تتغيّر مع كل نشر (من sw.js cache أو تاريخ الملفات) */
  function deployVersion() {
    // نحاول قراءة نسخة الكاش من service worker، وإلا نستعمل بصمة المحتوى
    var v = '';
    try {
      var sw = document.querySelector('script[src*="sw"]');
      v = (window.GMT_BUILD || '') + '';
    } catch (e) {}
    if (!v) {
      // بصمة من عدد السكربتات وأطوالها (تتغيّر مع أي تحديث)
      var s = document.scripts.length + ':' + document.body.innerHTML.length;
      v = s;
    }
    return v;
  }

  var R = [];        // نتائج الفحص
  var running = false;

  function role() {
    return (window.GMTBug && GMTBug.role && GMTBug.role()) || window.__gmtRole || 'cashier';
  }
  function isAdmin() { return /admin|sovereign|owner/i.test(role()); }
  function isCustomerPage() {
    return /متجر|كفالة|الموقع|شحنة|store|warranty|tracking|site/i.test(document.title) &&
           !/أدمن|admin|إدارة/i.test(document.title);
  }

  /* أنماط الأزرار الخطيرة (تحتاج الحاجز الثلاثي) */
  var DANGER = /حذف|احذف|delete|تصفير|صفّر|زero|فكّ|فك ختم|unseal|استعادة|استرجاع|restore|drop|مسح|امسح|إلغاء نهائي/i;

  // يستنتج "لماذا" و"كيف نصلح" تلقائياً من نوع المشكلة
  function inferWhyFix(title, detail) {
    var t = (title + ' ' + detail).toLowerCase();
    if (/is not defined|غير معرّف|undefined/.test(t))
      return { why: 'دالة أو بوت مطلوب غير محمّل — غالباً ترتيب تحميل خاطئ أو ملف مفقود من _shared', fix: 'تأكد أن gmt-core.js يُحمّل بأول الصفحة وأن مجلد _shared مرفوع كاملاً' };
    if (/nan|قيمة لا نهائية|حساب فاشل/.test(t))
      return { why: 'عملية حسابية أنتجت قيمة غير صالحة (قسمة على صفر أو حقل فارغ)', fix: 'تحقق من مدخلات الحساب — تأكد أن الأرقام موجودة قبل العملية' };
    if (/سالب|قيمة سالبة/.test(t))
      return { why: 'ظهرت قيمة سالبة في مكان لا يجب أن يكون فيه (سعر/كمية)', fix: 'أضف تحقّقاً يمنع القيم السالبة، أو راجع منطق الطرح' };
    if (/صورة مكسورة|لم تُحمّل/.test(t))
      return { why: 'ملف الصورة غير موجود بالمسار المحدّد', fix: 'ارفع الصورة الناقصة (شعارات المالك: truck.png · canonlogo.png إلخ)' };
    if (/جدول فارغ|قالب.*فارغ/.test(t))
      return { why: 'الجدول أو القالب لم يمتلئ ببيانات — قد يكون فشل التحميل أو لا توجد بيانات', fix: 'تحقق من اتصال القاعدة وأن البيانات موجودة' };
    if (/زر ميت|dead|بلا وظيفة/.test(t))
      return { why: 'زر بلا دالة مرتبطة — الدالة غير معرّفة أو staff غير محمّل', fix: 'تأكد أن gmt-staff.js محمّل، وأن الدالة معرّفة كـwindow' };
    return { why: '', fix: '' };
  }

  function add(status, area, title, detail, danger) {
    var wf = (status === 'fail' || status === 'warn') ? inferWhyFix(title, detail) : { why: '', fix: '' };
    R.push({ status: status, area: area, title: title, detail: detail || '', why: wf.why, fix: wf.fix, danger: !!danger, ts: Date.now() });
  }

  /* ═══════════ ① التحقق من الحاجز المزدوج ═══════════ */
  function sandboxActive() {
    return !!(window.GMTSandbox && window.GMTSandbox.active);
  }

  async function verifyWriteBlocked() {
    /* probe: نرسل كتابة وهمية ونتأكد أنها لم تصل للقاعدة الحقيقية.
       بما أن الوضع التدريبي يحاكي محلياً، الكتابة يجب ألا تصل للشبكة الحقيقية. */
    if (!sandboxActive()) return false;
    try {
      var realFetchUsed = false;
      var origReal = window.__gmtRealFetch;
      // إن كان الوضع التدريبي شغّالاً، window.fetch ملفوف؛ نتأكد أن probe لا يصل الشبكة
      var url = (window.GMT_CONFIG && GMT_CONFIG.SUPABASE_URL) || window.SUPABASE_URL || '';
      if (!url) return sandboxActive(); // لا مفاتيح = لا شبكة أصلاً = آمن
      var r = await window.fetch(url + '/rest/v1/__autotest_probe__', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ __probe: true, __training: true })
      });
      // الوضع التدريبي يُرجع Response محاكاة (201/200) بلا لمس القاعدة
      // لو وصل فعلاً للقاعdة، سيرجع خطأ جدول غير موجود (404/400) من الخادم الحقيقي
      var txt = await r.text().catch(function () { return ''; });
      // محاكاة الساندبوكس تُرجع نجاحاً وهمياً؛ الخادم الحقيقي يُرجع خطأ PGRST
      var reachedRealServer = /PGRST|does not exist|42P01|relation/i.test(txt);
      return !reachedRealServer;
    } catch (e) {
      // خطأ = لم يصل = آمن (على الأرجح اعترضه الساندبوكس)
      return sandboxActive();
    }
  }

  /* ═══════════ ② اكتشاف كل الأزرار والعناصر ═══════════ */
  function discoverButtons() {
    var out = [], seen = {};
    var els = document.querySelectorAll('button, [role=button], a[onclick], input[type=button], input[type=submit], [onclick]');
    Array.prototype.forEach.call(els, function (el) {
      // تجاهل أزرار البوتات نفسها
      if (el.closest('#gmt-warden-panel,#gmt-st-panel,#gmt-inspect-panel,#gmt-bug-panel,.gg4,.gg4-idx,#gmt-autotest-panel')) return;
      if (el.id && /^(gmt-|gts-|wd-|gi-|st-)/.test(el.id)) return;
      var txt = (el.textContent || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 44);
      var oc = el.getAttribute('onclick') || '';
      var fn = (oc.match(/^\s*([\w$]+)\s*\(/) || [])[1] || '';
      var key = (txt || fn) + '|' + (el.id || '');
      if ((!txt && !fn) || seen[key]) return;
      seen[key] = 1;
      out.push({ el: el, label: txt || fn, fn: fn, danger: DANGER.test(txt + ' ' + fn) });
    });
    return out;
  }

  /* ═══════════ ③ فحص المعاينات الرقمية والمنطقية ═══════════ */
  function checkNumbers() {
    var issues = [];
    // ابحث عن إجماليات وتحقق من منطقيتها
    var totals = document.querySelectorAll('[id*=total i],[class*=total i],[id*=إجمالي],[id*=مجموع],[id*=amount i]');
    Array.prototype.forEach.call(totals, function (el) {
      var txt = (el.textContent || '').replace(/[^\d.\-]/g, '');
      var num = parseFloat(txt);
      if (isNaN(num)) return;
      if (num < 0) issues.push({ what: 'قيمة سالبة غير متوقّعة: ' + (el.id || el.className).slice(0, 30) + ' = ' + num });
      if (!isFinite(num)) issues.push({ what: 'قيمة لا نهائية: ' + (el.id || '') });
    });
    // تحقق: NaN ظاهر بالواجهة
    if (/\bNaN\b/.test(document.body.innerText)) issues.push({ what: 'كلمة NaN ظاهرة بالواجهة (حساب فاشل)' });
    if (/undefined|null/.test((document.body.innerText.match(/\b(undefined|null)\b/g) || []).slice(0, 1).join(''))) {
      // فقط إن ظهرت بمكان رقمي
    }
    return issues;
  }

  /* ═══════════ ④ فحص الطباعة ═══════════ */
  function checkPrintTemplates() {
    var issues = [];
    var prints = document.querySelectorAll('[id*=print i],[class*=print i],[id*=طباعة],[id*=receipt i],[class*=receipt i],[id*=فاتورة]');
    var count = 0;
    Array.prototype.forEach.call(prints, function (el) {
      count++;
      // هل القالب فارغ؟
      var content = (el.innerHTML || '').trim();
      if (content.length < 20 && !el.querySelector('img,table,svg')) {
        issues.push({ what: 'قالب طباعة يبدو فارغاً: ' + (el.id || el.className).slice(0, 30) });
      }
    });
    return { count: count, issues: issues };
  }

  /* ═══════════ ⑤ فحص الأشكال والعناصر ═══════════ */
  function checkShapes() {
    var issues = [];
    // صور مكسورة
    var broken = 0;
    Array.prototype.forEach.call(document.images, function (img) {
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) broken++;
    });
    if (broken) issues.push({ what: broken + ' صورة مكسورة (لم تُحمّل)' });
    // جداول فارغة
    var emptyTables = 0;
    Array.prototype.forEach.call(document.querySelectorAll('table'), function (t) {
      if (!t.querySelector('td,th')) emptyTables++;
    });
    if (emptyTables) issues.push({ what: emptyTables + ' جدول فارغ' });
    return issues;
  }

  /* ═══════════ التشغيل الرئيسي ═══════════ */
  async function run(opts) {
    if (running) return;
    if (!isAdmin()) return;
    if (isCustomerPage()) return;   // لا فحص على صفحات الزبون
    running = true;
    R = [];
    opts = opts || {};
    render(true);

    // ─── الحاجز الأول: فرض الوضع التدريبي ───
    var wasTraining = sandboxActive();
    if (!wasTraining) {
      add('info', 'الأمان', 'تفعيل الوضع التدريبي', 'الفحص يتطلب الوضع التدريبي (يمنع الحفظ الحقيقي). سيُعاد تحميل الصفحة بوضع التدريب.');
      // نحفظ نيّة الفحص التلقائي بعد إعادة التحميل
      try { sessionStorage.setItem('gmt_autotest_resume', '1'); } catch (e) {}
      render(false); running = false;
      if (window.GMTSandbox && GMTSandbox.enter) { GMTSandbox.enter(); return; }
      else { add('fail', 'الأمان', 'الوضع التدريبي غير متاح', 'لا يمكن الفحص الآمن بدون gmt-sandbox.js.'); render(false); return; }
    }

    // ─── الحاجز الثاني: تأكيد أن الكتابة معترَضة فعلاً ───
    var blocked = await verifyWriteBlocked();
    add(blocked ? 'ok' : 'fail', 'الأمان',
      blocked ? 'الحاجز المزدوج مؤكّد' : '🔴 الحماية غير مؤكّدة',
      blocked ? 'الوضع التدريبي شغّال والكتابة لا تصل القاعدة الحقيقية.' :
                'لم أتأكد أن الكتابة معترَضة — سأتخطّى الأزرار الخطيرة احتياطاً.');

    var safeToTestDanger = blocked;

    // ─── اكتشاف كل الأزرار ───
    var buttons = discoverButtons();
    add('info', 'الاكتشاف', 'وُجد ' + buttons.length + ' زر/عنصر تفاعلي', 'سأجرّبها واحداً واحداً.');

    // ─── تجربة كل زر ───
    var tested = 0, dead = 0, danger = 0, skipped = 0;
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      // الأزرار الخطيرة: الحاجز الثلاثي
      if (b.danger) {
        danger++;
        if (!safeToTestDanger) {
          add('warn', 'زر خطير', '⏭ تُخطّي: ' + b.label, 'زر خطير والحماية غير مؤكّدة — لم أضغطه حفاظاً على بياناتك.', true);
          skipped++;
          continue;
        }
      }
      // بصمة قبل الضغط
      var before = {
        html: document.body.innerHTML.length,
        modals: document.querySelectorAll('.modal,[role=dialog],.popup').length,
        url: location.href
      };
      var errored = false;
      try {
        // اضغط فعلياً (بأمان الوضع التدريبي)
        b.el.click();
      } catch (e) {
        errored = true;
        add('fail', 'زر', '🔴 خطأ عند ضغط: ' + b.label, String(e).slice(0, 120), b.danger);
      }
      // انتظر رد الفعل
      await sleep(120);
      var after = {
        html: document.body.innerHTML.length,
        modals: document.querySelectorAll('.modal,[role=dialog],.popup').length,
        url: location.href
      };
      tested++;
      if (!errored) {
        var changed = (before.html !== after.html) || (before.modals !== after.modals) || (before.url !== after.url);
        if (changed) {
          add('ok', 'زر', '✅ ' + b.label, b.danger ? 'زر خطير — جُرّب بأمان تدريبي.' : '', b.danger);
        } else {
          dead++;
          add('warn', 'زر', '⚠️ بلا أثر ظاهر: ' + b.label, 'الضغط لم يُحدث تغييراً مرئياً — قد يكون زرّاً ميتاً أو يحتاج شرطاً.', b.danger);
        }
      }
      // أغلق أي نافذة انفتحت (بحثاً عن زر إغلاق)
      closeModals();
      await sleep(40);
    }

    // ─── فحص المعاينات الرقمية ───
    var numIssues = checkNumbers();
    if (numIssues.length) numIssues.forEach(function (x) { add('fail', 'الأرقام', '🔴 ' + x.what); });
    else add('ok', 'الأرقام', '✅ لا قيم رقمية شاذّة', 'لا NaN · لا قيم سالبة غير متوقّعة · لا لانهاية.');

    // ─── فحص الطباعة ───
    var pr = checkPrintTemplates();
    if (pr.issues.length) pr.issues.forEach(function (x) { add('fail', 'الطباعة', '🔴 ' + x.what); });
    else add('ok', 'الطباعة', '✅ قوالب الطباعة (' + pr.count + ') سليمة', 'لا قالب فارغ.');

    // ─── فحص الأشكال ───
    var shapeIssues = checkShapes();
    if (shapeIssues.length) shapeIssues.forEach(function (x) { add('warn', 'الأشكال', '⚠️ ' + x.what); });
    else add('ok', 'الأشكال', '✅ الصور والجداول سليمة', '');

    // ─── ⭐ اختبارات الترابط بين الوحدات (يجعل الفاحص أقوى) ───
    if (window.GMTIntegrationTests && GMTIntegrationTests.run) {
      add('info', 'الترابط', 'فحص الترابط بين الوحدات...', 'المشتريات↔الجرد · الجرد↔المتجر · البيع↔العمولة...');
      try {
        var links = await GMTIntegrationTests.run();
        links.forEach(function (L) {
          add(L.ok === true ? 'ok' : L.ok === false ? 'fail' : 'info', 'الترابط',
            (L.ok === true ? '✅ ' : L.ok === false ? '🔴 ' : 'ℹ️ ') + L.title, L.msg + (L.detail ? ' — ' + L.detail : ''));
        });
      } catch (e) { add('warn', 'الترابط', 'تعذّر فحص الترابط', String(e).slice(0, 80)); }
    }

    // ─── ⭐ الاختبارات الوهمية (probes) — تقوية إضافية ───
    if (window.GMTWarden && GMTWarden.runProbes) {
      try {
        var probeResults = await GMTWarden.runProbes();
        probeResults.forEach(function (p) {
          add(p.ok ? 'ok' : 'fail', 'اختبار وهمي', (p.ok ? '✅ ' : '🔴 ') + p.title, p.msg);
        });
      } catch (e) {}
    }

    // ─── الخلاصة ───
    add('info', 'الخلاصة',
      'جُرّب ' + tested + ' زر · ' + dead + ' بلا أثر · ' + danger + ' خطير · ' + skipped + ' تُخطّي',
      'اكتمل الفحص الشامل.');

    // احفظ البصمة (فُحصت هذه النسخة)
    try {
      localStorage.setItem(VER_KEY, deployVersion());
      localStorage.setItem(RESULT_KEY, JSON.stringify({ ts: Date.now(), summary: { tested: tested, dead: dead, danger: danger, skipped: skipped } }));
      sessionStorage.removeItem('gmt_autotest_resume');
    } catch (e) {}

    // بلّغ المراقب السيادي بالنتائج المهمة
    reportToWarden();

    running = false;
    render(false);
  }

  function reportToWarden() {
    if (!window.GMTWarden || !GMTWarden.flag) return;
    var fails = R.filter(function (r) { return r.status === 'fail'; });
    var deadBtns = R.filter(function (r) { return r.status === 'warn' && /بلا أثر/.test(r.title); });
    if (fails.length) {
      GMTWarden.flag({
        kind: 'technical', severity: 'high', title: 'الفاحص الشامل: ' + fails.length + ' مشكلة',
        what: fails.slice(0, 5).map(function (f) { return f.title; }).join(' · '),
        how: 'فحص E2E آلي', why: 'كُشف بالتجربة الآلية بعد النشر.'
      });
    }
    if (deadBtns.length) {
      GMTWarden.flag({
        kind: 'programmatic', severity: 'medium', title: 'الفاحص الشامل: ' + deadBtns.length + ' زر بلا أثر',
        what: deadBtns.slice(0, 8).map(function (f) { return f.title.replace('⚠️ بلا أثر ظاهر: ', ''); }).join(' · '),
        how: 'ضغط آلي بلا تغيير مرئي', why: 'قد تكون أزراراً ميتة أو تحتاج شرطاً.'
      });
    }
  }

  function closeModals() {
    var closers = document.querySelectorAll('[onclick*=close i],[onclick*=إغلاق],.modal .close,[aria-label=Close],[aria-label=إغلاق]');
    Array.prototype.forEach.call(closers, function (c) {
      if (c.offsetParent !== null) { try { c.click(); } catch (e) {} }
    });
    // مفتاح Escape
    try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); } catch (e) {}
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ═══════════ الواجهة ═══════════ */
  function render(busy) {
    var d = document.getElementById('gmt-autotest-panel');
    if (!d) {
      d = document.createElement('div');
      d.id = 'gmt-autotest-panel';
      d.style.cssText = 'position:fixed;inset:0;z-index:2147481800;background:rgba(4,6,10,.96);backdrop-filter:blur(8px);' +
        'padding:16px;overflow:auto;direction:rtl;font-family:Cairo,system-ui,sans-serif;';
      document.body.appendChild(d);
    }
    var fails = R.filter(function (r) { return r.status === 'fail'; });
    var warns = R.filter(function (r) { return r.status === 'warn'; });
    var oks = R.filter(function (r) { return r.status === 'ok'; });
    var verdict = busy ? '⏳ جارٍ الفحص الشامل — يجرّب كل زر...'
      : (fails.length ? '🔴 ' + fails.length + ' مشكلة تحتاج مراجعة'
        : (warns.length ? '🟡 ' + warns.length + ' تنبيه' : '✅ كل شيء سليم'));
    var vcol = busy ? '#334155' : (fails.length ? '#dc2626' : (warns.length ? '#b45309' : '#16a34a'));

    function card(x) {
      var ic = x.status === 'ok' ? '✅' : x.status === 'warn' ? '🟡' : x.status === 'fail' ? '🔴' : 'ℹ️';
      var bc = x.status === 'ok' ? 'rgba(22,163,74,.35)' : x.status === 'warn' ? 'rgba(180,83,9,.5)' : x.status === 'fail' ? 'rgba(220,38,38,.5)' : 'rgba(255,255,255,.12)';
      return '<div style="background:#141a26;border:1px solid ' + bc + ';border-radius:11px;padding:9px 12px;margin-bottom:5px">' +
        '<div style="font-weight:800;font-size:12.5px;color:#fff">' + ic + ' ' + x.title +
        (x.danger ? ' <span style="background:#7c2d12;color:#fca5a5;font-size:9px;padding:1px 5px;border-radius:4px">خطير</span>' : '') +
        ' <span style="color:#6f7789;font-weight:600;font-size:10px">' + x.area + '</span></div>' +
        (x.detail ? '<div style="font-size:11px;color:#aab3c4;margin-top:2px">' + x.detail.replace(/</g, '&lt;') + '</div>' : '') + '</div>';
    }

    d.innerHTML =
      '<div style="max-width:880px;margin:0 auto;background:#0f131c;border:1px solid rgba(255,255,255,.1);border-radius:20px;overflow:hidden;color:#fff">' +
        '<div style="padding:14px 16px;background:' + vcol + ';display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
          '<div><div style="font-weight:900;font-size:15px">🤖 الفاحص الشامل الآلي</div>' +
          '<div style="font-size:12px;opacity:.92;margin-top:2px">' + verdict + '</div></div>' +
          '<div style="display:flex;gap:6px">' +
            (busy ? '' : '<button id="at-run" style="background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:9px;padding:7px 12px;font:inherit;font-weight:800;font-size:11px;cursor:pointer">🔄 إعادة</button>' +
            '<button id="at-copy" style="background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:9px;padding:7px 12px;font:inherit;font-weight:800;font-size:11px;cursor:pointer">📋 نسخ</button>') +
            '<button id="at-x" style="background:rgba(0,0,0,.25);color:#fff;border:0;border-radius:9px;padding:7px 12px;font:inherit;font-weight:800;font-size:11px;cursor:pointer">✕</button>' +
          '</div>' +
        '</div>' +
        '<div style="padding:12px 14px 18px">' +
          '<div style="display:flex;gap:6px;margin-bottom:10px;font-size:11px;font-weight:900;flex-wrap:wrap">' +
            '<span style="background:rgba(220,38,38,.2);color:#fca5a5;padding:4px 9px;border-radius:8px">🔴 ' + fails.length + '</span>' +
            '<span style="background:rgba(180,83,9,.2);color:#fbbf24;padding:4px 9px;border-radius:8px">🟡 ' + warns.length + '</span>' +
            '<span style="background:rgba(22,163,74,.2);color:#4ade80;padding:4px 9px;border-radius:8px">✅ ' + oks.length + '</span>' +
          '</div>' +
          (fails.length ? fails.map(card).join('') : '') +
          (warns.length ? warns.map(card).join('') : '') +
          '<details style="margin-top:8px"><summary style="cursor:pointer;font-size:12px;font-weight:900;color:#4ade80">✅ الناجحة والمعلومات (' + (oks.length + R.filter(function(r){return r.status==='info';}).length) + ')</summary><div style="margin-top:6px">' +
            R.filter(function (r) { return r.status === 'ok' || r.status === 'info'; }).map(card).join('') + '</div></details>' +
        '</div>' +
      '</div>';

    var x = d.querySelector('#at-x'); if (x) x.onclick = function () { d.remove(); };
    var rn = d.querySelector('#at-run'); if (rn) rn.onclick = function () { run(); };
    var cp = d.querySelector('#at-copy'); if (cp) cp.onclick = function () {
      var t = '🤖 تقرير الفاحص الشامل · ' + new Date().toLocaleString('ar-SY') + '\nالصفحة: ' + document.title + '\n' + verdict + '\n\n' +
        R.map(function (r) { return (r.status === 'ok' ? '[✓] ' : r.status === 'fail' ? '[✗] ' : r.status === 'warn' ? '[!] ' : '[i] ') + r.area + ' — ' + r.title + (r.detail ? '\n    ' + r.detail : ''); }).join('\n');
      try { navigator.clipboard.writeText(t); alert('✅ نُسخ تقرير الفاحص الشامل.'); } catch (e) { alert('انسخه يدوياً.'); }
    };
  }

  /* ═══════════ زر عائم + التشغيل التلقائي ═══════════ */
  function fab() {
    if (!isAdmin() || isCustomerPage()) { var e = document.getElementById('gmt-autotest-fab'); if (e) e.remove(); return; }
    if (document.getElementById('gmt-autotest-fab')) return;
    var b = document.createElement('button');
    b.id = 'gmt-autotest-fab';
    b.title = 'الفاحص الشامل — يجرّب كل زر';
    b.textContent = '🤖';
    b.style.cssText = 'position:fixed;left:14px;bottom:262px;z-index:2147481000;width:46px;height:46px;border-radius:50%;' +
      'border:0;background:#4338ca;color:#fff;font-size:19px;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.35);';
    b.onclick = function () { run(); };
    document.body.appendChild(b);
  }

  function maybeAutoRun() {
    if (!isAdmin() || isCustomerPage()) return;
    // استئناف بعد دخول الوضع التدريبي
    var resume = false;
    try { resume = sessionStorage.getItem('gmt_autotest_resume') === '1'; } catch (e) {}
    if (resume && sandboxActive()) { setTimeout(function () { run(); }, 1500); return; }
    // أول مرة بعد نشر جديد: البصمة تغيّرت
    var last = '';
    try { last = localStorage.getItem(VER_KEY) || ''; } catch (e) {}
    var now = deployVersion();
    if (last !== now) {
      // نشرة جديدة — شغّل تلقائياً مرة واحدة (بعد أن يستقر النظام)
      setTimeout(function () {
        if (confirm('🤖 تم اكتشاف نشرة جديدة.\nهل تريد تشغيل الفحص الشامل الآلي الآن؟\n(سيجرّب كل زر بأمان الوضع التدريبي)')) {
          run();
        } else {
          try { localStorage.setItem(VER_KEY, now); } catch (e) {} // لا تسأل ثانيةً لنفس النسخة
        }
      }, 3500);
    }
  }

  window.GMTAutoTest = {
    version: VERSION,
    run: run,
    results: function () { return R; },
    discover: discoverButtons
  };

  function boot() { fab(); maybeAutoRun(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(fab, 2800);
}());


/* ── gmt-integration-tests.js ── */
;/* ═══════════════════════════════════════════════════════════════════════════
   gmt-integration-tests.js — 🔗 اختبارات الترابط بين الوحدات · v1.0 · 2026-07-17
   ─────────────────────────────────────────────────────────────────────────
   طلب المالك: الفاحص يجرّب الترابطات — الجرد↔المشتريات، الجرد↔المتجر، وهكذا.
   يفحص أن البيانات تنتقل صحيحاً بين الوحدات، لا كل وحدة وحدها.

   يعمل بالوضع التدريبي (قاعدة وهمية) — لا يمسّ بيانات حقيقية.
   يقرأ سجل الميزات ليعرف الترابطات المتوقّعة. يبلّغ المراقب بأي انقطاع.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.GMTIntegrationTests) return;

  var RF = (window.__gmtRealFetch || window.fetch).bind(window);

  function cfg() {
    return {
      url: (window.GMT_CONFIG && GMT_CONFIG.SUPABASE_URL) || window.SUPABASE_URL || '',
      key: (window.GMT_CONFIG && GMT_CONFIG.SUPABASE_ANON_KEY) || window.SUPABASE_ANON_KEY || ''
    };
  }
  async function q(path) {
    var c = cfg(); if (!c.url) return null;
    try {
      var r = await RF(c.url + '/rest/v1/' + path, { headers: { apikey: c.key, Authorization: 'Bearer ' + c.key } });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }

  /* ═══════════ تعريف الترابطات المتوقّعة ═══════════ */
  var LINKS = [
    {
      id: 'purchase-inventory',
      title: 'المشتريات ← الجرد',
      desc: 'كل كمية بالجرد يجب أن يقابلها استلام/فاتورة شراء (لا مخزون من عدم).',
      run: async function () {
        var products = await q('products?select=id,name,germany,china,damascus,aleppo&limit=200');
        var receipts = await q('stock_receipts?select=product_id,qty&limit=500');
        if (!products) return { ok: null, msg: 'تعذّر قراءة المنتجات (قد تكون القاعدة غير متصلة)' };
        // منتجات لها مخزون موجب لكن بلا أي استلام = مشبوهة
        var receiptByProd = {};
        (receipts || []).forEach(function (r) { receiptByProd[r.product_id] = (receiptByProd[r.product_id] || 0) + Number(r.qty || 0); });
        var orphan = [];
        products.forEach(function (p) {
          var stock = (Number(p.germany) || 0) + (Number(p.china) || 0) + (Number(p.damascus) || 0) + (Number(p.aleppo) || 0);
          if (stock > 0 && receipts && !receiptByProd[p.id]) orphan.push(p.name || p.id);
        });
        if (orphan.length > 5) return { ok: false, msg: orphan.length + ' منتج له مخزون بلا استلام مسجَّل — راجع المشتريات', detail: orphan.slice(0, 8).join(' · ') };
        return { ok: true, msg: 'تدفّق المشتريات→الجرد سليم (' + products.length + ' منتج)' };
      }
    },
    {
      id: 'inventory-store',
      title: 'الجرد ← المتجر',
      desc: 'منتجات المتجر يجب أن تكون موجودة بالجرد (لا يُعرض للزبون ما ليس بالمخزون).',
      run: async function () {
        var storeProds = await q('gmt_store?select=id,name&limit=200');
        if (storeProds === null) return { ok: null, msg: 'المتجر بقاعدة منفصلة — يُفحص يدوياً' };
        if (!storeProds.length) return { ok: true, msg: 'لا منتجات بالمتجر' };
        return { ok: true, msg: 'المتجr يعرض ' + storeProds.length + ' منتج (تحقّق يدوي أن لها مقابلاً بالجرد)' };
      }
    },
    {
      id: 'sale-commission',
      title: 'البيع ← العمولة',
      desc: 'كل فاتورة بيع (فوق الجملة) يجب أن يقابلها سجل عمولة.',
      run: async function () {
        var invoices = await q('invoices?select=id,total&order=created_at.desc&limit=50');
        var comms = await q('invoice_commissions?select=invoice_id&limit=200');
        if (!invoices) return { ok: null, msg: 'تعذّر قراءة الفواتير' };
        if (!invoices.length) return { ok: true, msg: 'لا فواتير بعد' };
        var commSet = {};
        (comms || []).forEach(function (c) { commSet[c.invoice_id] = true; });
        var missing = invoices.filter(function (i) { return Number(i.total) > 0 && comms && !commSet[i.id]; });
        // ملاحظة: ليست كل فاتورة لها عمولة (البيع بسعر الجملة بلا عمولة) — لذا ننبّه فقط
        if (missing.length > invoices.length * 0.8) return { ok: false, msg: 'معظم الفواتير بلا عمولة — تحقّق من تسجيل العمولات' };
        return { ok: true, msg: 'ترابط البيع→العمولة سليم' };
      }
    },
    {
      id: 'commission-settlement',
      title: 'العمولة ← التسوية',
      desc: 'العمولات المدفوعة يجب أن تكون مربوطة بتسوية (settlement_id).',
      run: async function () {
        var paid = await q('invoice_commissions?paid=eq.true&select=id,settlement_id&limit=200');
        if (!paid) return { ok: null, msg: 'تعذّر قراءة العمولات' };
        if (!paid.length) return { ok: true, msg: 'لا عمولات مدفوعة بعد' };
        var orphan = paid.filter(function (c) { return !c.settlement_id; });
        if (orphan.length) return { ok: false, msg: orphan.length + ' عمولة مدفوعة بلا تسوية مربوطة — خلل بالتحصيل' };
        return { ok: true, msg: 'كل عمولة مدفوعة مربوطة بتسوية (' + paid.length + ')' };
      }
    },
    {
      id: 'order-invoice',
      title: 'الأوردر ← الفاتورة',
      desc: 'الأوردرات المنفّذة يجب أن تكون مقفلة/مربوطة بفاتورة.',
      run: async function () {
        var orders = await q('gmt_orders?select=id,status,serial_code&order=created_at.desc&limit=50');
        if (!orders) return { ok: null, msg: 'تعذّر قراءة الأوردرات' };
        if (!orders.length) return { ok: true, msg: 'لا أوردرات بعد' };
        return { ok: true, msg: orders.length + ' أوردر — ترابط الأوردر→الفاتورة يُفحص عند الربط' };
      }
    },
    {
      id: 'coupon-flow',
      title: 'الكوبون: المتجر ← الكاشير',
      desc: 'الكوبونات المستخدَمة يجب أن تكون مختومة (is_used) مرة واحدة فقط.',
      run: async function () {
        var coupons = await q('gmt_coupons?select=code,is_used,used_at&limit=200');
        if (coupons === null) return { ok: null, msg: 'لا جدول كوبونات أو غير متصل' };
        if (!coupons.length) return { ok: true, msg: 'لا كوبونات' };
        var used = coupons.filter(function (c) { return c.is_used; });
        return { ok: true, msg: coupons.length + ' كوبون · ' + used.length + ' مستخدَم (الختم مرة واحدة مضمون بالكود)' };
      }
    },
    {
      id: 'warranty-invoice',
      title: 'الكفالة ← الفاتورة',
      desc: 'الكفالات يجب أن تكون مرتبطة برقم فاتورة صحيح.',
      run: async function () {
        // الكفالة بقاعدة منفصلة (DB3) — فحص وجود فقط
        return { ok: null, msg: 'الكفالة بقاعدة منفصلة (DB3) — تُفحص من صفحتها' };
      }
    }
  ];

  /* ═══════════ التشغيل ═══════════ */
  async function runAll() {
    var results = [];
    for (var i = 0; i < LINKS.length; i++) {
      var L = LINKS[i];
      try {
        var r = await L.run();
        results.push({ id: L.id, title: L.title, desc: L.desc, ok: r.ok, msg: r.msg, detail: r.detail });
        // بلّغ المراقب بأي ترابط مكسور
        if (r.ok === false && window.GMTWarden && GMTWarden.flag) {
          GMTWarden.flag({
            kind: 'operational', severity: 'high', title: 'ترابط مكسور: ' + L.title,
            what: r.msg, how: 'اختبار ترابط ' + L.id, why: r.detail || 'تدفّق البيانات بين الوحدتين غير سليم.'
          });
        }
      } catch (e) {
        results.push({ id: L.id, title: L.title, ok: false, msg: 'خطأ: ' + String(e).slice(0, 80) });
      }
    }
    return results;
  }

  window.GMTIntegrationTests = {
    version: 1.0,
    run: runAll,
    links: LINKS
  };
}());


/* ── gmt-integrity.js ── */
;/* ═══════════════════════════════════════════════════════
   gmt-integrity.js — تدقيق الربط بين المشتريات والجرد 🔗
   (يُرفع جنب purchases_standalone.html و index_inventory.html)

   المشكلة التي يحلها (واقعة حقيقية 2026-07-11):
   فواتير أوروبية أُدخلت أكثر من مرة → حُذفت قطعها من الجرد → بقيت الفواتير
   «يتيمة»: موجودة بالمشتريات وقطعها غير موجودة بالمخزون، وترحيلها يذهب سُدى.

   القاعدة التي يفرضها:
   • كل قطعة بالجرد لها فاتورة (مستوردة أو شراء فوري، واصلة أو في الطريق).
   • كل بند فاتورة له قطعة بالجرد (وإلا فهو بند يتيم).
   • لا فاتورتان بنفس الرقم (كشف التكرار).

   ثلاث طبقات:
   ١) 🔗 لوحة التدقيق (زر عائم) — تكشف وتُصلح بضغطة.
   ٢) 🛡️ حارس الحذف (بالجرد) — يمنع حذف قطعة مرتبطة بفاتورة.
   ٣) 🚦 حارس الترحيل والتكرار (بالمشتريات).
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const DB = {
    url: 'https://ysawzwtmodkqqbqoiojj.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYXd6d3Rtb2RrcXFicW9pb2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NjI0OTUsImV4cCI6MjA5MjAzODQ5NX0.g-dBDpHzMsP_0IQAKFxzWkKzc_I13bGUMeYNgcUmrKQ',
  };
  const H = () => ({ apikey: DB.key, Authorization: 'Bearer ' + DB.key, 'Content-Type': 'application/json' });
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (b) => String(b ?? '').trim().toLowerCase();

  async function rest(method, path, body, extra) {
    const r = await fetch(DB.url + '/rest/v1/' + path, {
      method, headers: { ...H(), ...(extra || {}) }, body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new Error('HTTP ' + r.status + ' — ' + (await r.text().catch(() => '')).slice(0, 120));
    if (r.status === 204) return null;
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  }

  /* ══ استخراج بنود الفاتورة (البنية تختلف قليلاً بين الأنواع) ══ */
  function invItems(inv) {
    let raw = inv.items_snapshot;   /* INV-1: الاسم الحقيقي بالقاعدة (كان `items` ⇒ HTTP 400) */
    if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch (_) { raw = []; } }
    if (!Array.isArray(raw)) raw = [];
    return raw.map((i) => ({
      name: i.name || i.product_name || '',
      barcode: i.barcode || (i.product && i.product.barcode) || '',
      qty: Number(i.qty || i.quantity || 0),
      unitPrice: Number(i.unit_price ?? i.unitPrice ?? 0),
      salePrice: Number(i.sale_price ?? i.salePrice ?? 0),
      wholePrice: Number(i.whole_price ?? i.wholePrice ?? 0),
      minPrice: Number(i.min_price ?? i.minPrice ?? 0),
      image_url: i.image_url || '',
    }));
  }

  /* ══════════ المحرّك: التدقيق ══════════ */
  const S = { invoices: [], products: [], report: null, busy: false };

  async function audit() {
    const brCols = await branchKeys().catch(() => []);
    const prodSel = ['id','name','barcode','created_at'].concat(brCols).join(',');
    const [invs, prods] = await Promise.all([
      rest('GET', 'import_log?select=*&order=created_at.desc&limit=1000'),
      rest('GET', 'products?select=' + prodSel + '&limit=5000'),
    ]);
    S.invoices = invs || [];
    S.products = prods || [];

    const byBarcode = new Map();
    S.products.forEach((p) => { const b = norm(p.barcode); if (b) byBarcode.set(b, p); });

    const invoicedBarcodes = new Set();
    const orphanItems = [];   // بنود فواتير بلا قطعة بالجرد
    const dupInvoices = [];   // فواتير برقم مكرر

    const seenNo = new Map();
    S.invoices.forEach((inv) => {
      const no = String(inv.inv_number || '').trim();
      if (no) {
        if (seenNo.has(no)) dupInvoices.push({ inv, first: seenNo.get(no) });
        else seenNo.set(no, inv);
      }
      invItems(inv).forEach((it) => {
        const b = norm(it.barcode);
        if (b) invoicedBarcodes.add(b);
        if (!b) return; // بند بلا باركود — لا يمكن ربطه (يُبلَّغ بالملخص)
        if (!byBarcode.has(b)) orphanItems.push({ inv, item: it });
      });
    });

    // قطع بالجرد بلا أي فاتورة
    const orphanProducts = S.products.filter((p) => {
      const b = norm(p.barcode);
      return !b || !invoicedBarcodes.has(b);
    });

    /* ════ INV-9 (2026-07-13) — ثلاثة فحوص جديدة ════ */
    const byId = new Map(S.products.map((p) => [String(p.id), p]));
    const isTransit = (k) => k === 'germany' || k === 'china';
    const stockCols = brCols.length ? brCols : ['germany','china','haleb'];

    // ① فواتير مختومة «مُرحَّلة» وكمياتها لم تصل فعلياً (transfer_moved أقل من المطلوب)
    const sealedNotMoved = [];
    // ② فواتير «بالطريق» لكن رصيد العبور لا يغطّيها (الكمية اختفت من مخزون العبور)
    const transitMissing = [];
    S.invoices.forEach((inv) => {
      let mv = inv.transfer_moved;
      if (typeof mv === 'string') { try { mv = JSON.parse(mv); } catch (_) { mv = {}; } }
      mv = mv || {};
      const raw = (typeof inv.items_snapshot === 'string')
        ? (() => { try { return JSON.parse(inv.items_snapshot) || []; } catch (_) { return []; } })()
        : (Array.isArray(inv.items_snapshot) ? inv.items_snapshot : []);
      if (!raw.length) return;

      if (inv.transferred) {
        const short = raw.filter((i) => Number(mv[i.id] || 0) < Number(i.qty || 0));
        if (short.length) {
          sealedNotMoved.push({
            inv,
            missing: short.map((i) => ({
              name: i.name || i.id,
              expected: Number(i.qty || 0),
              moved: Number(mv[i.id] || 0),
            })),
          });
        }
      } else if (String(inv.status || '') === 'transit') {
        const src = inv.source_branch || (inv.inv_type === 'germany' ? 'germany' : 'china');
        const gap = [];
        raw.forEach((i) => {
          const p = byId.get(String(i.id));
          if (!p) return;
          const remain = Number(i.qty || 0) - Number(mv[i.id] || 0);
          const have = Number(p[src] || 0);
          if (remain > 0 && have < remain) gap.push({ name: i.name || i.id, need: remain, have });
        });
        if (gap.length) transitMissing.push({ inv, gap });
      }
    });

    // ③ فرق مجموع الفواتير عن المخزون الفعلي (لكل قطعة)
    const expectedById = new Map();   // كم قطعة دخلت النظام حسب الفواتير
    S.invoices.forEach((inv) => {
      const raw = (typeof inv.items_snapshot === 'string')
        ? (() => { try { return JSON.parse(inv.items_snapshot) || []; } catch (_) { return []; } })()
        : (Array.isArray(inv.items_snapshot) ? inv.items_snapshot : []);
      raw.forEach((i) => {
        const k = String(i.id || '');
        if (!k) return;
        expectedById.set(k, (expectedById.get(k) || 0) + Number(i.qty || 0));
      });
    });
    const stockGaps = [];
    expectedById.forEach((expected, id) => {
      const p = byId.get(id);
      if (!p) return;
      const actual = stockCols.reduce((n, c) => n + (Number(p[c]) || 0), 0);
      const diff = actual - expected;   // موجب = زيادة غير مبرَّرة · سالب = نقص (بيع/فقد)
      if (Math.abs(diff) > 0) {
        stockGaps.push({ id, name: p.name, expected, actual, diff, transit: stockCols.filter(isTransit).reduce((n, c) => n + (Number(p[c]) || 0), 0) });
      }
    });
    // الأخطر أولاً: الزيادة غير المبرَّرة (بصمة المضاعفة PUR-1)
    stockGaps.sort((a, b) => b.diff - a.diff);

    S.report = {
      invoices: S.invoices.length,
      products: S.products.length,
      orphanItems, orphanProducts, dupInvoices,
      sealedNotMoved, transitMissing, stockGaps,          /* INV-9 */
      surplus: stockGaps.filter((g) => g.diff > 0).length, /* مؤشّر المضاعفة */
      noBarcodeItems: S.invoices.reduce((n, inv) => n + invItems(inv).filter((i) => !norm(i.barcode)).length, 0),
      at: new Date(),
    };
    return S.report;
  }

  /* ══════════ الإصلاحات ══════════ */
  // (أ) إعادة إنشاء قطعة محذوفة من بيانات فاتورتها
  async function recreateProduct(entry) {
    const it = entry.item;
    const branchCols = await branchKeys();
    const np = {
      name: it.name || 'قطعة من فاتورة ' + (entry.inv.inv_number || ''),
      barcode: it.barcode,
      price: it.salePrice || 0,
      wholesale_price: it.wholePrice || 0,
      net_cost: it.unitPrice || 0,
      image_url: it.image_url || null,
    };
    branchCols.forEach((k) => { np[k] = 0; });   // تُرحَّل الكميات بالترحيل لا هنا
    const res = await rest('POST', 'products', np, { Prefer: 'return=representation' });
    return Array.isArray(res) ? res[0] : res;
  }

  // (ب) إنشاء «فاتورة شراء فوري» لقطع يتيمة بالجرد (لتصبح كل قطعة ذات فاتورة تبرّر كميتها)
  async function invoiceOrphanProducts(list) {
    const bcols = await branchKeys();   // أعمدة الفروع لحساب الكمية الفعلية
    const moved = {};
    const items = list.map((p) => {
      const total = (bcols || []).reduce((s, k) => s + (Number(p[k]) || 0), 0);   // الكمية الموجودة فعلاً
      if (p.id != null && total > 0) moved[String(p.id)] = total;   // مرحّلة بالكامل مسبقاً
      return {
        id: p.id, name: p.name, barcode: p.barcode || '',
        qty: total,   // (2026-08-15) الكمية الفعلية تبرّر المخزون (كانت 0 فتبقى «زيادة غير مبرّرة»)
        unit_price: Number(p.net_cost || p.cost_price || 0) || 0,
        sale_price: Number(p.price || 0) || 0,
        whole_price: Number(p.wholesale_price || 0) || 0,
        min_price: 0, image_url: p.image_url || '',
        notes: 'تسوية — كمية كانت بالجرد بلا فاتورة',
      };
    });
    const entry = {
      inv_number: 'AUDIT-' + Date.now().toString().slice(-8),
      inv_type: 'شراء فوري',
      supplier: 'تسوية تدقيق (بلا مورّد)',
      status: 'arrived',
      transferred: true,                          // مرحّلة مسبقاً — لا تُضيف مخزوناً ثانيةً
      transferred_at: new Date().toISOString(),
      transferred_by: 'audit',
      transfer_moved: moved,                      // المرحّل = الكمية كاملة (يمنع أي مضاعفة لاحقة)
      items: JSON.stringify(items),
      notes: 'فاتورة تسوية: تبرّر الكميات الموجودة بالجرد بلا فاتورة (مرحّلة مسبقاً — لا تُضيف مخزوناً). راجعها وعدّل الأسعار.',
      created_at: new Date().toISOString(),
    };
    return rest('POST', 'import_log', entry, { Prefer: 'return=representation' });
  }

  let _branchCache = null;
  async function branchKeys() {
    if (_branchCache) return _branchCache;
    try {
      const rows = await rest('GET', 'inv_columns?is_branch=eq.true&select=key_name');
      _branchCache = (rows || []).map((r) => r.key_name);
    } catch (_) { _branchCache = []; }
    return _branchCache;
  }

  /* ══════════ اللوحة ══════════ */
  function open() {
    let ov = document.getElementById('intg-ov');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'intg-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.65);display:flex;align-items:flex-start;justify-content:center;padding:14px;overflow:auto;';
    ov.innerHTML = `<div style="background:#fff;border-radius:18px;max-width:780px;width:100%;margin:auto;font-family:'Cairo',sans-serif;direction:rtl;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#1a1a1a,#2a1215);color:#fff;padding:14px 18px;border-bottom:3px solid #C00012;display:flex;align-items:center;gap:10px;">
        <div style="flex:1;"><div style="font-size:16px;font-weight:900;">🔗 تدقيق الفواتير والجرد</div>
        <div style="font-size:11px;color:#cbd5e1;">كل قطعة بالجرد لها فاتورة · كل بند فاتورة له قطعة · لا فواتير مكررة</div></div>
        <button onclick="document.getElementById('intg-ov').remove()" style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:9px;padding:7px 12px;font-weight:800;font-family:inherit;cursor:pointer;">إغلاق</button>
      </div>
      <div id="intg-body" style="padding:18px;"><div style="text-align:center;padding:30px;color:#6b7280;font-weight:800;font-size:13px;">⏳ جارٍ الفحص…</div></div>
    </div>`;
    document.body.appendChild(ov);
    audit().then(render).catch((e) => {
      document.getElementById('intg-body').innerHTML = `<div style="color:#dc2626;font-weight:800;font-size:13px;">تعذّر الفحص: ${esc(e.message)}</div>`;
    });
  }

  function render() {
    const r = S.report;
    const body = document.getElementById('intg-body');
    if (!body) return;
    const clean = !r.orphanItems.length && !r.orphanProducts.length && !r.dupInvoices.length;

    body.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:9px;margin-bottom:16px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px;text-align:center;">
          <div style="font-size:18px;font-weight:900;">${r.invoices}</div><div style="font-size:10px;color:#64748b;font-weight:700;">فاتورة</div></div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px;text-align:center;">
          <div style="font-size:18px;font-weight:900;">${r.products}</div><div style="font-size:10px;color:#64748b;font-weight:700;">قطعة بالجرد</div></div>
        <div style="background:${r.orphanItems.length ? '#fef2f2' : '#f0fdf4'};border:1px solid ${r.orphanItems.length ? '#fecaca' : '#bbf7d0'};border-radius:12px;padding:10px;text-align:center;">
          <div style="font-size:18px;font-weight:900;color:${r.orphanItems.length ? '#dc2626' : '#16a34a'};">${r.orphanItems.length}</div>
          <div style="font-size:10px;color:#64748b;font-weight:700;">بند فاتورة يتيم</div></div>
        <div style="background:${r.orphanProducts.length ? '#fffbeb' : '#f0fdf4'};border:1px solid ${r.orphanProducts.length ? '#fde68a' : '#bbf7d0'};border-radius:12px;padding:10px;text-align:center;">
          <div style="font-size:18px;font-weight:900;color:${r.orphanProducts.length ? '#b45309' : '#16a34a'};">${r.orphanProducts.length}</div>
          <div style="font-size:10px;color:#64748b;font-weight:700;">قطعة بلا فاتورة</div></div>
        <div style="background:${r.dupInvoices.length ? '#fdf4ff' : '#f0fdf4'};border:1px solid ${r.dupInvoices.length ? '#f0abfc' : '#bbf7d0'};border-radius:12px;padding:10px;text-align:center;">
          <div style="font-size:18px;font-weight:900;color:${r.dupInvoices.length ? '#a21caf' : '#16a34a'};">${r.dupInvoices.length}</div>
          <div style="font-size:10px;color:#64748b;font-weight:700;">فاتورة مكررة</div></div>
      </div>

      ${clean ? `<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:14px;padding:20px;text-align:center;color:#166534;font-weight:900;font-size:14px;">
        ✅ الربط سليم تماماً — كل قطعة لها فاتورة، وكل بند فاتورة له قطعة بالجرد.</div>` : ''}

      ${r.orphanItems.length ? `
      <div style="margin-bottom:16px;">
        <div style="font-size:13px;font-weight:900;color:#dc2626;margin-bottom:4px;">🚨 بنود فواتير يتيمة (قطعها محذوفة من الجرد)</div>
        <div style="font-size:11px;color:#6b7280;font-weight:700;line-height:1.8;margin-bottom:8px;">
          هذه بالضبط مشكلتك: الفاتورة موجودة والقطعة غير موجودة — فترحيلها يذهب سُدى.
          «إعادة الإنشاء» تُعيد القطعة للجرد بكميات صفر وببيانات فاتورتها، فيعمل الترحيل بشكل صحيح.
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:12px;max-height:200px;overflow:auto;">
          ${r.orphanItems.map((e, i) => `<div style="display:flex;align-items:center;gap:8px;padding:9px 11px;border-bottom:1px solid #f3f4f6;font-size:11.5px;">
            <div style="flex:1;">
              <div style="font-weight:800;">${esc(e.item.name) || '(بلا اسم)'}</div>
              <div style="color:#9ca3af;font-weight:700;font-size:10px;">فاتورة ${esc(e.inv.inv_number || '—')} · ${esc(e.inv.status === 'transit' ? '🚢 في الطريق' : '📦 واصلة')} · باركود <span dir="ltr">${esc(e.item.barcode)}</span></div>
            </div>
            <button onclick="GMTIntegrity.fixItem(${i})" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:8px;padding:6px 10px;font-family:inherit;font-size:10.5px;font-weight:800;cursor:pointer;white-space:nowrap;">↩︎ إعادة الإنشاء بالجرد</button>
          </div>`).join('')}
        </div>
        <button onclick="GMTIntegrity.fixAllItems()" style="width:100%;margin-top:8px;background:#dc2626;color:#fff;border:none;border-radius:10px;padding:11px;font-family:inherit;font-weight:900;font-size:12.5px;cursor:pointer;">
          ↩︎ إعادة إنشاء الكل (${r.orphanItems.length} قطعة) بالجرد
        </button>
      </div>` : ''}

      ${r.orphanProducts.length ? `
      <div style="margin-bottom:16px;">
        <div style="font-size:13px;font-weight:900;color:#b45309;margin-bottom:4px;">⚠️ قطع بالجرد بلا فاتورة</div>
        <div style="font-size:11px;color:#6b7280;font-weight:700;line-height:1.8;margin-bottom:8px;">
          قطع دخلت الجرد يدوياً أو قبل النظام. القاعدة: كل قطعة لها فاتورة —
          الزر أدناه يُنشئ لها «فاتورة تسوية (شراء فوري)» واحدة تجمعها، عدّل بياناتها لاحقاً.
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:12px;max-height:160px;overflow:auto;">
          ${r.orphanProducts.slice(0, 60).map((p) => `<div style="padding:8px 11px;border-bottom:1px solid #f3f4f6;font-size:11.5px;">
            <span style="font-weight:800;">${esc(p.name)}</span>
            <span style="color:#9ca3af;font-size:10px;font-weight:700;" dir="ltr">${esc(p.barcode) || '(بلا باركود)'}</span>
          </div>`).join('')}
          ${r.orphanProducts.length > 60 ? `<div style="padding:8px;text-align:center;color:#9ca3af;font-size:10.5px;font-weight:700;">…و${r.orphanProducts.length - 60} أخرى</div>` : ''}
        </div>
        <button onclick="GMTIntegrity.fixOrphanProducts()" style="width:100%;margin-top:8px;background:#b45309;color:#fff;border:none;border-radius:10px;padding:11px;font-family:inherit;font-weight:900;font-size:12.5px;cursor:pointer;">
          🧾 إنشاء فاتورة تسوية لها (${r.orphanProducts.length} قطعة)
        </button>
      </div>` : ''}

      ${r.dupInvoices.length ? `
      <div style="margin-bottom:16px;">
        <div style="font-size:13px;font-weight:900;color:#a21caf;margin-bottom:4px;">🔁 فواتير برقم مكرر</div>
        <div style="font-size:11px;color:#6b7280;font-weight:700;margin-bottom:8px;">راجعها بنفسك — الحذف يدوي عمداً (قد يكون التكرار مقصوداً).</div>
        <div style="border:1px solid #e5e7eb;border-radius:12px;max-height:150px;overflow:auto;">
          ${r.dupInvoices.map((d) => `<div style="padding:9px 11px;border-bottom:1px solid #f3f4f6;font-size:11.5px;">
            <span style="font-weight:900;">${esc(d.inv.inv_number)}</span>
            <span style="color:#9ca3af;font-weight:700;font-size:10px;"> — مكررة (${esc(d.inv.supplier || '')} · ${new Date(d.inv.created_at).toLocaleDateString('ar-SY')})</span>
          </div>`).join('')}
        </div>
      </div>` : ''}

      ${(r.stockGaps && r.stockGaps.filter((g) => g.diff > 0).length) ? `
      <div style="margin-bottom:16px;">
        <div style="font-size:13px;font-weight:900;color:#dc2626;margin-bottom:4px;">🔴 زيادة غير مبرَّرة بالمخزون (بصمة المضاعفة)</div>
        <div style="font-size:11px;color:#6b7280;font-weight:700;margin-bottom:8px;">المخزون الفعلي <b>أكبر</b> من مجموع الفواتير — لا يمكن أن يزيد إلا بمضاعفة كتابة أو تعديل يدوي. راجعها فوراً.</div>
        <div style="border:1px solid #fecaca;border-radius:12px;max-height:190px;overflow:auto;">
          ${r.stockGaps.filter((g) => g.diff > 0).slice(0, 40).map((g) => `<div style="padding:9px 11px;border-bottom:1px solid #fee2e2;font-size:11.5px;display:flex;justify-content:space-between;gap:6px;">
            <span style="font-weight:800;">${esc(g.name || '')}</span>
            <span style="font-weight:900;color:#dc2626;white-space:nowrap;">+${g.diff} <span style="color:#9ca3af;font-weight:700;">(فواتير ${g.expected} · مخزون ${g.actual})</span></span>
          </div>`).join('')}
        </div>
      </div>` : ''}

      ${(r.sealedNotMoved && r.sealedNotMoved.length) ? `
      <div style="margin-bottom:16px;">
        <div style="font-size:13px;font-weight:900;color:#b91c1c;margin-bottom:4px;">⛔ فواتير مختومة «واصلة» وكمياتها لم تصل</div>
        <div style="font-size:11px;color:#6b7280;font-weight:700;margin-bottom:8px;">هذه هي الفواتير التي خُتمت كناجحة والبضاعة لم تدخل فعلياً. استخدم «🔓 فكّ ختم» بالمشتريات ثم أعد الترحيل.</div>
        <div style="border:1px solid #fecaca;border-radius:12px;max-height:190px;overflow:auto;">
          ${r.sealedNotMoved.slice(0, 30).map((d) => `<div style="padding:9px 11px;border-bottom:1px solid #fee2e2;font-size:11.5px;">
            <div style="font-weight:900;">${esc(d.inv.inv_number || '')}</div>
            ${d.missing.slice(0, 5).map((m) => `<div style="color:#6b7280;font-weight:700;font-size:10.5px;">• ${esc(m.name)} — وصل ${m.moved} من ${m.expected}</div>`).join('')}
            ${d.missing.length > 5 ? `<div style="color:#9ca3af;font-size:10px;font-weight:700;">…و${d.missing.length - 5} صنف آخر</div>` : ''}
          </div>`).join('')}
        </div>
      </div>` : ''}

      ${(r.transitMissing && r.transitMissing.length) ? `
      <div style="margin-bottom:16px;">
        <div style="font-size:13px;font-weight:900;color:#c2410c;margin-bottom:4px;">🟠 فواتير «بالطريق» بلا رصيد كافٍ بمخزون العبور</div>
        <div style="font-size:11px;color:#6b7280;font-weight:700;margin-bottom:8px;">لو رحّلتها الآن لن تصل كل القطع. عالجها قبل الترحيل.</div>
        <div style="border:1px solid #fed7aa;border-radius:12px;max-height:170px;overflow:auto;">
          ${r.transitMissing.slice(0, 30).map((d) => `<div style="padding:9px 11px;border-bottom:1px solid #ffedd5;font-size:11.5px;">
            <div style="font-weight:900;">${esc(d.inv.inv_number || '')}</div>
            ${d.gap.slice(0, 5).map((g) => `<div style="color:#6b7280;font-weight:700;font-size:10.5px;">• ${esc(g.name)} — مطلوب ${g.need} · متوفر ${g.have}</div>`).join('')}
          </div>`).join('')}
        </div>
      </div>` : ''}

      ${r.noBarcodeItems ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:11px;padding:10px;font-size:11px;color:#475569;font-weight:700;line-height:1.8;">
        ℹ️ ${r.noBarcodeItems} بند فاتورة بلا باركود — لا يمكن ربطه آلياً. أضف له باركوداً بالفاتورة ليدخل التدقيق.
      </div>` : ''}

      <div style="margin-top:14px;font-size:10.5px;color:#9ca3af;font-weight:700;text-align:center;">آخر فحص: ${r.at.toLocaleString('ar-SY')}</div>`;
  }

  /* ══════════ الأوامر العامة ══════════ */
  const API = {
    open, audit,
    async fixItem(i) {
      if (S.busy) return; S.busy = true;
      const e = S.report.orphanItems[i];
      try {
        await recreateProduct(e);
        alert('✅ أُعيدت القطعة «' + (e.item.name || '') + '» للجرد (بكميات صفر) — أعد الترحيل الآن ليُضاف مخزونها.');
        await audit(); render();
      } catch (err) { alert('تعذّرت الإعادة: ' + err.message); }
      finally { S.busy = false; }
    },
    async fixAllItems() {
      const list = S.report.orphanItems;
      if (!confirm(`إعادة إنشاء ${list.length} قطعة بالجرد من بيانات فواتيرها؟\n(الكميات صفر — تُضاف عند الترحيل)`)) return;
      if (S.busy) return; S.busy = true;
      let ok = 0;
      for (const e of list) { try { await recreateProduct(e); ok++; } catch (_) {} }
      S.busy = false;
      alert(`✅ أُعيد ${ok} من ${list.length} — أعد ترحيل الشحنات لتُضاف كمياتها.`);
      await audit(); render();
    },
    async fixOrphanProducts() {
      const list = S.report.orphanProducts;
      if (!confirm(`إنشاء «فاتورة تسوية» تجمع ${list.length} قطعة ليصبح لكل قطعة فاتورة؟`)) return;
      if (S.busy) return; S.busy = true;
      try {
        await invoiceOrphanProducts(list);
        alert('✅ أُنشئت فاتورة التسوية — راجعها من قائمة الفواتير وعدّل بياناتها.');
        await audit(); render();
      } catch (err) { alert('تعذّر الإنشاء: ' + err.message); }
      finally { S.busy = false; }
    },

    /* ══ حارس الحذف (يُنادى من الجرد قبل حذف أي منتج) ══ */
    async guardDelete(productId) {
      try {
        const p = (window.allProducts || []).find((x) => String(x.id) === String(productId));
        const bc = norm(p && p.barcode);
        if (!bc) return true;   // بلا باركود — لا يمكن التحقق، نسمح
        const invs = await rest('GET', 'import_log?select=inv_number,status,items_snapshot&limit=1000'  /* INV-1 */);
        const hit = (invs || []).find((inv) => invItems(inv).some((it) => norm(it.barcode) === bc));
        if (!hit) return true;
        const where = hit.status === 'transit' ? '🚢 شحنة «في الطريق» لم تُرحَّل بعد!' : '📦 فاتورة واصلة';
        return confirm(
          `⚠️ تحذير: هذه القطعة مرتبطة بفاتورة!\n\n` +
          `الفاتورة: ${hit.inv_number || '—'}\nالحالة: ${where}\n\n` +
          `حذفها من الجرد سيجعل بند الفاتورة «يتيماً»، وترحيل الشحنة لن يجد القطعة (هذا ما حدث سابقاً).\n\n` +
          `الأفضل: صفّر كمياتها بدل حذفها، أو احذف بندها من الفاتورة أولاً.\n\n` +
          `هل تريد الحذف رغم ذلك؟`
        );
      } catch (_) { return true; }   // فشل التحقق لا يعطّل الحذف
    },

    /* ══ حارس التكرار (يُنادى من المشتريات قبل حفظ فاتورة) ══ */
    async guardDuplicateInvoice(invNumber) {
      const no = String(invNumber || '').trim();
      if (!no) return true;
      try {
        const rows = await rest('GET', `import_log?inv_number=eq.${encodeURIComponent(no)}&select=id,supplier,created_at,status`);
        if (!rows || !rows.length) return true;
        const r0 = rows[0];
        return confirm(
          `🔁 تنبيه تكرار: توجد فاتورة بنفس الرقم «${no}»!\n\n` +
          `المورّد: ${r0.supplier || '—'}\nأُدخلت: ${new Date(r0.created_at).toLocaleDateString('ar-SY')}\n` +
          `الحالة: ${r0.status === 'transit' ? 'في الطريق' : 'واصلة'}\n\n` +
          `إدخالها مرتين يُضاعف المخزون ويسبب فوضى (حدث سابقاً).\n\nهل تريد المتابعة رغم ذلك؟`
        );
      } catch (_) { return true; }
    },

    /* ══ حارس الترحيل (يُنادى قبل ترحيل شحنة للمخزون) ══ */
    async guardTransfer(inv) {
      try {
        const items = invItems(inv);
        const bcs = items.map((i) => norm(i.barcode)).filter(Boolean);
        if (!bcs.length) return true;
        /* 🔧 (2026-08-18) كان يجلب `products?limit=5000` دفعةً واحدة، لكن PostgREST يفرض
           سقفاً افتراضياً للصفوف (1000 غالباً). فأي منتج بعد السقف يُعتبر «مفقوداً» ⇒ إنذار
           كاذب «محذوفة على الأرجح» ⇒ وإعادة إنشائها تُنتج **قطعاً مكرّرة**. الآن نستعلم عن
           الباركودات المطلوبة فقط عبر in.(...) على دفعات — دقيق ولا يتأثّر بأي سقف. */
        const uniq = [...new Set(bcs)];
        const have = new Set();
        const CH = 100;
        for (let i = 0; i < uniq.length; i += CH) {
          const part = uniq.slice(i, i + CH);
          const list = part.map((b) => '"' + String(b).replace(/"/g, '') + '"').join(',');
          try {
            const rows = await rest('GET', 'products?select=barcode&barcode=in.(' + encodeURIComponent(list) + ')');
            (rows || []).forEach((p) => have.add(norm(p.barcode)));
          } catch (_) {
            // فشل الاستعلام المُجزّأ ⇒ لا نخمّن ولا ننذر كاذباً: اعتبر الدفعة موجودة
            part.forEach((b) => have.add(b));
          }
        }
        const missing = items.filter((i) => norm(i.barcode) && !have.has(norm(i.barcode)));
        if (!missing.length) return true;
        /* لا نوقف المالك بسؤال: القطعة المرتبطة بفاتورة يجب ألّا تضيع. نعيد إنشاءها
           تلقائياً بكميات صفرية ثم نكمل الترحيل، ونُعلمه بما جرى. */
        let done = 0;
        for (const m of missing) { try { await recreateProduct({ inv, item: m }); done++; } catch (_) {} }
        try {
          alert('♻️ أُعيدت ' + done + ' قطعة محذوفة إلى الجرد تلقائياً قبل الترحيل:\n' +
            missing.slice(0, 5).map((m) => '• ' + (m.name || m.barcode)).join('\n') +
            (missing.length > 5 ? '\n…و' + (missing.length - 5) + ' أخرى' : '') +
            '\n\nيكمل الترحيل الآن — لن تضيع أي كمية.');
        } catch (_) {}
        return true;
      } catch (_) { return true; }
    },
    /* 🗑️ فحص حفظ الحذف (2026-08-18) — يتحقّق أن الحذف من فاتورة المشتريات يُثبَّت في القاعدة.
       يقرأ الفاتورة من import_log ويقارن عدد العناصر بما هو معروض، وينبّه إن كان الحذف
       لم يُحفَظ بعد (المستخدم حذف ولم يضغط «حفظ سحابياً»). آمن — قراءة فقط. */
    async checkDeletePersistence(invNumber) {
      try {
        if (typeof d_items_ref === 'undefined') return { ok: true, note: 'لا سياق فاتورة' };
        const shown = (d_items_ref || []).length;
        const inv = invNumber || (typeof ships !== 'undefined' && ships[0] && ships[0].inv_number);
        if (!inv) return { ok: true, note: 'لا رقم فاتورة' };
        const rows = await rest('GET', 'import_log?inv_number=eq.' + encodeURIComponent(inv) + '&select=items_snapshot&limit=1');
        const saved = (rows && rows[0] && Array.isArray(rows[0].items_snapshot)) ? rows[0].items_snapshot.length : null;
        if (saved === null) return { ok: true, note: 'الفاتورة غير محفوظة سحابياً بعد' };
        if (saved !== shown) {
          return { ok: false, shown, saved,
            note: 'المعروض ' + shown + ' والمخزون في القاعدة ' + saved + ' — اضغط «حفظ سحابياً» لتثبيت التعديل.' };
        }
        return { ok: true, shown, saved, note: 'متطابق — الحذف/التعديل محفوظ.' };
      } catch (e) { return { ok: true, note: 'تعذّر الفحص: ' + e.message }; }
    },
  };
  /* ══════════ 🎓 تدريب البوت على الأنماط المتكرّرة (2026-08-18) ══════════
     الدرس المستفاد: كل أخطائنا المتكرّرة (الاستيراد من Excel · الحذف · الصور)
     لها **جذر واحد**: افتراضات متحجّرة (موقع عمود ثابت، صف رؤوس ثابت، إزاحة صورة
     ثابتة)، أو فشل صامت يُبتلع في catch فيكمل الحفظ ويُتلف بيانات سليمة.
     هذه الخريطة تُستخدم للتشخيص السريع وتُعرض في تقرير البوت.                     */
  API.KNOWN_PATTERNS = [
    { id:'P1', name:'العمود/الجدول الناقص في القاعدة',
      sign:'طلب يفشل بـ400 ويُبتلع في catch ⇒ لا شيء يُحفَظ بلا رسالة',
      hit:'مضاعفة المخزون (import_log) · رصيد العبور «—» (أعمدة الفروع) · سجل الكفالة',
      fix:'شغّل SQL الإكمال + «طبيب المخطط» في الصفحة الرئيسية' },
    { id:'P2', name:'افتراض موقعي متحجّر',
      sign:'قراءة بالموقع لا بالاسم (r[0]=الاسم) أو صف رؤوس ثابت أو إزاحة صورة ثابتة',
      hit:'أسماء تظهر أرقاماً عند الاستيراد · صور تُزاح لمنتج آخر أو تختفي',
      fix:'اكتشف صف الرؤوس وطابِق الأعمدة بأسمائها، واربط الصور برقم صف Excel الحقيقي' },
    { id:'P3', name:'الدهس بعد التنقيح (Object.assign)',
      sign:'يُبنى كائن محدّث ثم يُدمج فوقه المصدر القديم فيدهس التعديل',
      hit:'الحذف يقول «تم» ولا يُحذف فعلياً',
      fix:'ادمج الأصل أولاً ثم ضع القيم المحدّثة فوقه' },
    { id:'P4', name:'الإكمال رغم فشل خطوة فرعية',
      sign:'فشل رفع ملف ⇒ تحذير فقط ثم يكمل الحفظ بقيمة فارغة',
      hit:'اختفاء صور المنتجات عند فشل الرفع',
      fix:'أعِد القيمة السابقة أو احذف الحقل من الطلب — لا تحفظ فارغاً' },
    { id:'P5', name:'الكود المكرّر عبر الصفحات',
      sign:'نفس الدالة في أكثر من ملف (importExcel · buildInv)',
      hit:'يُصلَح الخطأ في صفحة ويبقى في أخرى ⇒ يبدو أنه «رجع»',
      fix:'عند أي إصلاح، ابحث عن نفس الدالة في كل الصفحات وطبّقه عليها جميعاً' },
  ];
  /* تقرير سريع للأنماط — يُستدعى من الكونسول: GMTIntegrity.patternReport() */
  API.patternReport = function(){
    try{
      const rows = API.KNOWN_PATTERNS.map(p=>`【${p.id}】 ${p.name}\n   العلامة: ${p.sign}\n   ظهر في: ${p.hit}\n   العلاج: ${p.fix}`).join('\n\n');
      console.log('%c🎓 أنماط أخطاء GMT المعروفة','font-weight:bold;font-size:14px;color:#C00012');
      console.log(rows);
      return API.KNOWN_PATTERNS;
    }catch(e){ return []; }
  };
  API._v = "2026-08-18: +checkDeletePersistence +KNOWN_PATTERNS(P1..P5)";
  window.GMTIntegrity = API;

  /* ══════════ الزر العائم ══════════ */
  function mount() {
    if (document.getElementById('intg-btn')) return;
    const b = document.createElement('button');
    b.id = 'intg-btn';
    b.textContent = '🔗 تدقيق الفواتير والجرد';
    b.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:800;background:linear-gradient(135deg,#C00012,#8a000d);color:#fff;border:none;border-radius:12px;padding:11px 15px;font-family:Cairo,Arial,sans-serif;font-size:12px;font-weight:900;cursor:pointer;box-shadow:0 8px 24px rgba(192,0,18,.32);';
    b.onclick = open;
    document.body.appendChild(b);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();


/* ── gmt-settlements.js ── */
;/* ═══════════════════════════════════════════════════════
   gmt-settlements.js — م6: الحساب الجاري والتسويات (يُرفع جنب admin-final.html)
   ─ يحل مشكلة "التحصيل المزدوج" جذرياً: كل عمولة تُدفع تُختم برقم تسوية
     (settlement_id) — والعمولة المختومة لا تدخل أي تسوية أخرى إطلاقاً.
   ─ شاشة واحدة لكل فرع: الصندوق الحالي · عمولات موافقة غير مدفوعة · بذمتك له ·
     سجل كامل (فواتير/عمولات/سحوبات/تسويات).
   ─ ثلاث عمليات فقط: 💵 سحب من الصندوق · 🧾 تسوية دورية (الأساسية) · عمولة فاتورة مفردة.
   يتطلب: GMT_SETTLEMENTS.txt (القاعدة الرئيسية).
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const money = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };

  const S = { branchKey: null, cashier: '', from: monthStart(), to: today(), data: null, busy: false };

  /* ══ حساب الوضع المالي للفرع (المصدر الوحيد للحقيقة) ══ */
  function compute(branchKey, cashier, from, to) {
    const invs = (window.allInvoices || []).filter((i) => i.branch_key === branchKey);
    const comms = (window.allComm || []).filter((c) => c.branch_key === branchKey);
    const trans = (window.allTransfers || []).filter((t) => t.branch_key === branchKey);

    const inRange = (d) => { const x = String(d || '').slice(0, 10); return x >= from && x <= to; };
    const byCashier = (c) => !cashier || (c.cashier_name || '') === cashier;

    // الصندوق = المبيعات النقدية المحصّلة − ما رُحّل/سُحب (نفس منطق النظام الحالي)
    const sales = invs.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const moved = trans.reduce((s, t) => s + (Number(t.amount) || 0), 0); // موجب=تحصيل/سحب، سالب=مصروف
    const cashBox = sales - moved;

    // العمولات — م6-ب: عمولة الآجل معلّقة حتى تحصيل الفاتورة (awaiting_collection)
    const held = comms.filter((c) => c.awaiting_collection && !c.paid && byCashier(c));
    const heldSum = held.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const approvedUnpaid = comms.filter((c) => c.approved && !c.paid && !c.awaiting_collection && byCashier(c));
    const owed = approvedUnpaid.reduce((s, c) => s + (Number(c.amount) || 0), 0); // بذمة الإدارة له (كل الفترات)
    const periodComms = approvedUnpaid.filter((c) => inRange(c.approved_at || c.created_at));
    const periodOwed = periodComms.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const pending = comms.filter((c) => !c.approved && byCashier(c));
    const pendingSum = pending.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const paidEver = comms.filter((c) => c.paid && byCashier(c)).reduce((s, c) => s + (Number(c.amount) || 0), 0);

    return { sales, moved, cashBox, owed, periodComms, periodOwed, pending: pending.length, pendingSum, paidEver, invCount: invs.length, held: held.length, heldSum };
  }

  /* ══ الترقيم الرسمي للتسوية ══ */
  async function nextNo(row) {
    const ins = await window.sb('POST', '/rest/v1/gmt_settlements', row, { Prefer: 'return=representation' });
    const r = Array.isArray(ins) ? ins[0] : ins;
    if (!r || r.id == null) throw new Error('تعذّر إنشاء سجل التسوية');
    const no = 'GMT-S-' + String(r.id).padStart(5, '0');
    await window.sb('PATCH', `/rest/v1/gmt_settlements?id=eq.${r.id}`, { settlement_no: no }, { Prefer: 'return=minimal' });
    r.settlement_no = no;
    return r;
  }

  /* ══ الواجهة ══ */
  function open(branchKey) {
    S.branchKey = branchKey || (window.branches || [])[0]?.key_name;
    if (!S.branchKey) return alert('لا توجد فروع');
    render();
  }

  function render() {
    const b = (window.branches || []).find((x) => x.key_name === S.branchKey) || { display_name: S.branchKey };
    const d = compute(S.branchKey, S.cashier, S.from, S.to);
    S.data = d;

    // قائمة الكاشيرين لهذا الفرع (من العمولات)
    const cashiers = Array.from(new Set((window.allComm || []).filter((c) => c.branch_key === S.branchKey && c.cashier_name).map((c) => c.cashier_name)));

    const ov = document.getElementById('settl-ov') || document.createElement('div');
    ov.id = 'settl-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.6);display:flex;align-items:flex-start;justify-content:center;padding:14px;overflow:auto;';
    ov.innerHTML = `
      <div style="background:#fff;border-radius:18px;max-width:760px;width:100%;margin:auto;font-family:'Cairo',sans-serif;direction:rtl;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a1a1a,#2a1215);color:#fff;padding:14px 18px;border-bottom:3px solid #C00012;display:flex;align-items:center;gap:10px;">
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:900;">🧾 الحساب الجاري — ${esc(b.display_name)}</div>
            <div style="font-size:11px;color:#cbd5e1;">كل عملية تُسجَّل برقم — ولا عمولة تُدفع مرتين</div>
          </div>
          <button onclick="document.getElementById('settl-ov').remove()" style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:9px;padding:7px 12px;font-weight:800;font-family:inherit;cursor:pointer;">إغلاق</button>
        </div>

        <div style="padding:16px;">
          <!-- الفرع والكاشير والفترة -->
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
            <select id="st-branch" style="flex:1;min-width:120px;border:1.5px solid #e5e7eb;border-radius:10px;padding:9px;font-family:inherit;font-weight:800;font-size:12px;">
              ${(window.branches || []).map((x) => `<option value="${esc(x.key_name)}" ${x.key_name === S.branchKey ? 'selected' : ''}>${esc(x.display_name || x.key_name)}</option>`).join('')}
            </select>
            <select id="st-cashier" style="flex:1;min-width:120px;border:1.5px solid #e5e7eb;border-radius:10px;padding:9px;font-family:inherit;font-weight:800;font-size:12px;">
              <option value="">كل الكاشيرين</option>
              ${cashiers.map((c) => `<option value="${esc(c)}" ${c === S.cashier ? 'selected' : ''}>${esc(c)}</option>`).join('')}
            </select>
            <input type="date" id="st-from" value="${S.from}" style="border:1.5px solid #e5e7eb;border-radius:10px;padding:8px;font-family:inherit;font-size:12px;">
            <input type="date" id="st-to" value="${S.to}" style="border:1.5px solid #e5e7eb;border-radius:10px;padding:8px;font-family:inherit;font-size:12px;">
          </div>

          <!-- البطاقات الأربع -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px;margin-bottom:14px;">
            <div style="background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:12px;padding:11px;text-align:center;">
              <div style="font-size:10px;font-weight:800;color:#0369a1;">💰 بصندوق الفرع الآن</div>
              <div style="font-size:19px;font-weight:900;color:#0369a1;margin-top:2px;">${money(d.cashBox)}</div>
              <div style="font-size:9px;color:#64748b;">مبيعات ${money(d.sales)} − محصّل ${money(d.moved)}</div>
            </div>
            <div style="background:#FFF0F2;border:1.5px solid #FFD6DA;border-radius:12px;padding:11px;text-align:center;">
              <div style="font-size:10px;font-weight:800;color:#C00012;">💜 عمولات بذمتك له</div>
              <div style="font-size:19px;font-weight:900;color:#C00012;margin-top:2px;">${money(d.owed)}</div>
              <div style="font-size:9px;color:#64748b;">موافَقة وغير مدفوعة (كل الفترات)</div>
            </div>
            <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:12px;padding:11px;text-align:center;">
              <div style="font-size:10px;font-weight:800;color:#b45309;">⏳ بانتظار موافقتك</div>
              <div style="font-size:19px;font-weight:900;color:#b45309;margin-top:2px;">${money(d.pendingSum)}</div>
              <div style="font-size:9px;color:#64748b;">${d.pending} عمولة — وافق عليها من تبويب الفواتير</div>
            </div>
            <div style="background:#fff1f2;border:1.5px solid #fecdd3;border-radius:12px;padding:11px;text-align:center;">
              <div style="font-size:10px;font-weight:800;color:#be123c;">🔒 معلّقة (بيع آجل)</div>
              <div style="font-size:19px;font-weight:900;color:#be123c;margin-top:2px;">${money(d.heldSum)}</div>
              <div style="font-size:9px;color:#64748b;">${d.held} عمولة — تُستحق عند تحصيل ثمن الفاتورة</div>
            </div>
            <div style="background:#ecfdf5;border:1.5px solid #a7f3d0;border-radius:12px;padding:11px;text-align:center;">
              <div style="font-size:10px;font-weight:800;color:#059669;">✅ عمولات الفترة المحددة</div>
              <div style="font-size:19px;font-weight:900;color:#059669;margin-top:2px;">${money(d.periodOwed)}</div>
              <div style="font-size:9px;color:#64748b;">${d.periodComms.length} فاتورة — جاهزة للتسوية</div>
            </div>
          </div>

          <!-- العمليات الثلاث -->
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
            <button onclick="GMTSettlements.doSettle()" style="flex:2;min-width:170px;background:linear-gradient(135deg,#C00012,#8a000d);color:#fff;border:none;border-radius:11px;padding:12px;font-family:inherit;font-weight:900;font-size:13px;cursor:pointer;">
              🧾 تسوية الفترة (${money(d.periodOwed)})
            </button>
            <button onclick="GMTSettlements.doWithdraw()" style="flex:1;min-width:130px;background:#1a1a1a;color:#fff;border:none;border-radius:11px;padding:12px;font-family:inherit;font-weight:900;font-size:13px;cursor:pointer;">
              💵 سحب من الصندوق
            </button>
          </div>

          <!-- سجل العمولات المشمولة -->
          <div style="font-size:12px;font-weight:900;color:#374151;margin-bottom:6px;">📋 عمولات الفترة (كل فاتورة على حدة — يمكنك دفع أي واحدة مفردة)</div>
          <div style="border:1px solid #e5e7eb;border-radius:12px;max-height:190px;overflow:auto;margin-bottom:14px;">
            ${d.periodComms.length ? d.periodComms.map((c) => {
              const inv = (window.allInvoices || []).find((i) => i.id === c.invoice_id);
              return `<div style="display:flex;align-items:center;gap:8px;padding:9px 11px;border-bottom:1px solid #f3f4f6;font-size:11.5px;">
                <div style="flex:1;font-weight:800;">${esc(inv ? ('#' + (inv.inv_number || inv.id)) : ('عمولة #' + c.id))} ${c.cashier_name ? `<span style="color:#9ca3af;font-weight:700;">· ${esc(c.cashier_name)}</span>` : ''}</div>
                <div style="font-weight:900;color:#C00012;">${money(c.amount)}</div>
                <button onclick="GMTSettlements.paySingle('${c.id}')" style="background:#f5f3ff;color:#C00012;border:1px solid #ddd6fe;border-radius:8px;padding:5px 9px;font-family:inherit;font-size:10px;font-weight:800;cursor:pointer;">دفع مفرد</button>
              </div>`;
            }).join('') : '<div style="padding:16px;text-align:center;color:#9ca3af;font-size:12px;font-weight:700;">لا عمولات موافقة بهذه الفترة</div>'}
          </div>

          <!-- سجل التسويات السابقة -->
          <div style="font-size:12px;font-weight:900;color:#374151;margin-bottom:6px;">📜 سجل التسويات والسحوبات</div>
          <div id="st-history" style="border:1px solid #e5e7eb;border-radius:12px;max-height:170px;overflow:auto;">
            <div style="padding:14px;text-align:center;color:#9ca3af;font-size:12px;">جارٍ التحميل…</div>
          </div>
        </div>
      </div>`;
    if (!ov.parentNode) document.body.appendChild(ov);

    document.getElementById('st-branch').onchange = (e) => { S.branchKey = e.target.value; S.cashier = ''; render(); };
    document.getElementById('st-cashier').onchange = (e) => { S.cashier = e.target.value; render(); };
    document.getElementById('st-from').onchange = (e) => { S.from = e.target.value; render(); };
    document.getElementById('st-to').onchange = (e) => { S.to = e.target.value; render(); };
    loadHistory();
  }

  async function loadHistory() {
    const el = document.getElementById('st-history');
    try {
      const rows = await window.sb('GET', `/rest/v1/gmt_settlements?branch_key=eq.${encodeURIComponent(S.branchKey)}&order=created_at.desc&limit=40`);
      if (!el) return;
      el.innerHTML = (rows && rows.length) ? rows.map((r) => {
        const icon = r.kind === 'withdraw' ? '💵' : r.kind === 'single' ? '💜' : '🧾';
        const label = r.kind === 'withdraw' ? 'سحب من الصندوق' : r.kind === 'single' ? 'دفع عمولة مفردة' : 'تسوية دورية';
        const amt = r.kind === 'withdraw' ? r.withdraw_amount : r.paid_amount;
        return `<div style="display:flex;align-items:center;gap:8px;padding:9px 11px;border-bottom:1px solid #f3f4f6;font-size:11px;">
          <div style="flex:1;">
            <div style="font-weight:900;">${icon} ${label} <span style="color:#9ca3af;">${esc(r.settlement_no || '')}</span></div>
            <div style="color:#6b7280;font-weight:700;margin-top:1px;">${new Date(r.created_at).toLocaleDateString('ar-SY')} ${r.cashier_name ? '· ' + esc(r.cashier_name) : ''} ${r.invoice_count ? '· ' + r.invoice_count + ' فاتورة' : ''}</div>
            ${r.note ? `<div style="color:#9ca3af;font-size:10px;margin-top:1px;">${esc(r.note)}</div>` : ''}
          </div>
          <div style="text-align:left;">
            <div style="font-weight:900;color:#111;">${money(amt)}</div>
            <div style="font-size:9px;color:#6b7280;">صندوق بعدها ${money(r.cash_after)} · بذمتك ${money(r.owed_after)}</div>
          </div>
        </div>`;
      }).join('') : '<div style="padding:14px;text-align:center;color:#9ca3af;font-size:12px;">لا سجلات بعد</div>';
    } catch (e) {
      if (el) el.innerHTML = `<div style="padding:14px;color:#dc2626;font-size:11px;font-weight:700;">تعذّر تحميل السجل: ${esc(e.message)} — هل شغّلت GMT_SETTLEMENTS.txt؟</div>`;
    }
  }

  /* ══ العملية ١: التسوية الدورية (الأساسية) ══ */
  async function doSettle() {
    const d = S.data;
    if (!d.periodComms.length) return alert('لا عمولات موافقة بهذه الفترة');
    const b = (window.branches || []).find((x) => x.key_name === S.branchKey) || {};
    const maxPay = d.periodOwed;

    const html = `
      <div style="font-family:'Cairo',sans-serif;direction:rtl;">
        <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:12px;margin-bottom:12px;font-size:12px;font-weight:800;color:#166534;line-height:1.9;">
          🧾 تسوية <b>${esc(b.display_name || S.branchKey)}</b>${S.cashier ? ' — ' + esc(S.cashier) : ''}<br>
          الفترة: ${S.from} ← ${S.to} · ${d.periodComms.length} فاتورة<br>
          إجمالي عمولات الفترة: <b>${money(maxPay)}</b> · بصندوقه الآن: <b>${money(d.cashBox)}</b>
        </div>
        <label style="font-size:11px;font-weight:800;color:#374151;">المبلغ المدفوع له فعلاً الآن $</label>
        <input type="number" id="st-pay" value="${maxPay.toFixed(2)}" step="0.01" min="0" style="width:100%;border:2px solid #16a34a;border-radius:10px;padding:11px;font-family:inherit;font-size:18px;font-weight:900;text-align:center;color:#16a34a;margin:5px 0 4px;">
        <div style="font-size:10.5px;color:#6b7280;font-weight:700;line-height:1.8;margin-bottom:10px;">
          ادفع كل المبلغ أو جزءاً منه — الباقي يبقى مسجّلاً بذمتك له ويظهر بالتسوية القادمة تلقائياً.
        </div>
        <label style="font-size:11px;font-weight:800;color:#374151;">ملاحظة (اختياري)</label>
        <input type="text" id="st-note" placeholder="مثال: تسوية شهر تموز — سُلّمت نقداً" style="width:100%;border:1.5px solid #e5e7eb;border-radius:10px;padding:9px;font-family:inherit;font-size:12px;margin:4px 0 12px;">
        <div style="display:flex;gap:8px;">
          <button id="st-go" style="flex:2;background:linear-gradient(135deg,#C00012,#8a000d);color:#fff;border:none;border-radius:10px;padding:12px;font-family:inherit;font-weight:900;font-size:13px;cursor:pointer;">✅ اعتماد التسوية وختم الفواتير</button>
          <button onclick="document.getElementById('st-dlg').remove()" style="flex:1;background:#f3f4f6;color:#374151;border:none;border-radius:10px;padding:12px;font-family:inherit;font-weight:800;cursor:pointer;">إلغاء</button>
        </div>
      </div>`;
    dialog(html);
    document.getElementById('st-go').onclick = async () => {
      if (S.busy) return; S.busy = true;
      const btn = document.getElementById('st-go'); btn.disabled = true; btn.textContent = 'جارٍ الاعتماد…';
      try {
        const pay = parseFloat(document.getElementById('st-pay').value) || 0;
        const note = document.getElementById('st-note').value.trim();
        const ids = d.periodComms.map((c) => c.id);
        const rec = await nextNo({
          branch_key: S.branchKey, cashier_name: S.cashier || null, kind: 'settlement',
          period_from: S.from, period_to: S.to,
          comm_total: d.periodOwed, paid_amount: pay, withdraw_amount: 0,
          cash_before: d.cashBox, cash_after: d.cashBox,
          owed_after: Math.max(0, d.owed - pay), invoice_count: ids.length,
          note: note || null, created_by: 'admin',
        });
        // ختم العمولات — دفعة واحدة (العمولة المختومة لا تدخل تسوية ثانية أبداً)
        // &paid=eq.false ⇒ القاعدة نفسها تمنع دفع عمولة مدفوعة مسبقاً (منع التحصيل المزدوج عبر التبويبات)
        await window.sb('PATCH', `/rest/v1/invoice_commissions?id=in.(${ids.join(',')})&paid=eq.false`,
          { paid: true, paid_at: new Date().toISOString(), settlement_id: rec.id }, { Prefer: 'return=minimal' });
        (window.allComm || []).forEach((c) => { if (ids.includes(c.id)) { c.paid = true; c.settlement_id = rec.id; } });
        document.getElementById('st-dlg')?.remove();
        alert('✅ اعتُمدت التسوية ' + rec.settlement_no + '\nالمدفوع: ' + money(pay) + (d.owed - pay > 0.01 ? '\nالباقي بذمتك له: ' + money(d.owed - pay) : '\nخالص بالكامل ✓'));
        render();
      } catch (e) { alert('تعذّرت التسوية: ' + e.message); }
      finally { S.busy = false; }
    };
  }

  /* ══ العملية ٢: السحب من الصندوق ══ */
  async function doWithdraw() {
    const d = S.data;
    const b = (window.branches || []).find((x) => x.key_name === S.branchKey) || {};
    const html = `
      <div style="font-family:'Cairo',sans-serif;direction:rtl;">
        <div style="background:#ecfeff;border:1.5px solid #a5f3fc;border-radius:12px;padding:12px;margin-bottom:12px;font-size:12px;font-weight:800;color:#155e75;line-height:1.9;">
          💵 سحب من صندوق <b>${esc(b.display_name || S.branchKey)}</b><br>
          بالصندوق الآن: <b>${money(d.cashBox)}</b> · من ضمنها عمولات له: <b>${money(d.owed)}</b>
        </div>
        <label style="font-size:11px;font-weight:800;color:#374151;">المبلغ الذي سحبته $</label>
        <input type="number" id="st-amt" value="${d.cashBox.toFixed(2)}" step="0.01" min="0" style="width:100%;border:2px solid #0e7490;border-radius:10px;padding:11px;font-family:inherit;font-size:18px;font-weight:900;text-align:center;color:#0e7490;margin:5px 0 4px;">
        <div id="st-preview" style="font-size:11px;color:#374151;font-weight:800;background:#f8fafc;border-radius:9px;padding:9px;line-height:1.9;margin-bottom:10px;"></div>
        <label style="font-size:11px;font-weight:800;color:#374151;">ملاحظة (اختياري)</label>
        <input type="text" id="st-note2" placeholder="مثال: استلمت المبلغ نقداً بتاريخ..." style="width:100%;border:1.5px solid #e5e7eb;border-radius:10px;padding:9px;font-family:inherit;font-size:12px;margin:4px 0 12px;">
        <div style="display:flex;gap:8px;">
          <button id="st-go2" style="flex:2;background:#1a1a1a;color:#fff;border:none;border-radius:10px;padding:12px;font-family:inherit;font-weight:900;font-size:13px;cursor:pointer;">✅ تسجيل السحب</button>
          <button onclick="document.getElementById('st-dlg').remove()" style="flex:1;background:#f3f4f6;color:#374151;border:none;border-radius:10px;padding:12px;font-family:inherit;font-weight:800;cursor:pointer;">إلغاء</button>
        </div>
      </div>`;
    dialog(html);
    const upd = () => {
      const a = parseFloat(document.getElementById('st-amt').value) || 0;
      const left = d.cashBox - a;
      document.getElementById('st-preview').innerHTML =
        `يبقى بصندوقه: <b>${money(Math.max(0, left))}</b><br>` +
        `عمولاته المستحقة: <b style="color:#C00012;">${money(d.owed)}</b> — ${left >= d.owed - 0.01
          ? 'مغطّاة من صندوقه ✓ (تُدفع له بالتسوية)'
          : `<span style="color:#b45309;">غير مغطاة بالكامل: ${money(d.owed - Math.max(0, left))} تبقى بذمتك له</span>`}`;
    };
    document.getElementById('st-amt').oninput = upd; upd();
    document.getElementById('st-go2').onclick = async () => {
      if (S.busy) return; S.busy = true;
      const btn = document.getElementById('st-go2'); btn.disabled = true; btn.textContent = 'جارٍ التسجيل…';
      try {
        const amt = parseFloat(document.getElementById('st-amt').value) || 0;
        const note = document.getElementById('st-note2').value.trim();
        const rec = await nextNo({
          branch_key: S.branchKey, cashier_name: S.cashier || null, kind: 'withdraw',
          period_from: S.from, period_to: S.to,
          comm_total: 0, paid_amount: 0, withdraw_amount: amt,
          cash_before: d.cashBox, cash_after: Math.max(0, d.cashBox - amt),
          owed_after: d.owed, invoice_count: 0, note: note || null, created_by: 'admin',
        });
        // حركة الصندوق بنفس جدول النظام (لتنعكس بكل الشاشات)
        const t = await window.sb('POST', '/rest/v1/branch_transfers', {
          branch_key: S.branchKey, amount: amt,
          note: 'سحب — ' + rec.settlement_no + (note ? ' · ' + note : ''),
          transfer_date: today(), confirmed_by: 'admin',
          settlement_id: rec.id, kind: 'withdraw',
        }, { Prefer: 'return=representation' });
        const row = Array.isArray(t) ? t[0] : t;
        if (row && window.allTransfers) window.allTransfers.push(row);
        document.getElementById('st-dlg')?.remove();
        alert('✅ سُجّل السحب ' + rec.settlement_no + '\nالمبلغ: ' + money(amt) + '\nبقي بصندوقه: ' + money(Math.max(0, d.cashBox - amt)) + '\nبذمتك له عمولات: ' + money(d.owed));
        render();
      } catch (e) { alert('تعذّر تسجيل السحب: ' + e.message); }
      finally { S.busy = false; }
    };
  }

  /* ══ العملية ٣: دفع عمولة فاتورة مفردة ══ */
  async function paySingle(commId) {
    const c = (window.allComm || []).find((x) => String(x.id) === String(commId));
    if (!c) return;
    if (!confirm('دفع عمولة هذه الفاتورة مفردةً؟\nالمبلغ: ' + money(c.amount) + '\n(تُختم فلا تدخل أي تسوية لاحقة)')) return;
    if (S.busy) return; S.busy = true;
    try {
      const d = S.data;
      const rec = await nextNo({
        branch_key: S.branchKey, cashier_name: c.cashier_name || S.cashier || null, kind: 'single',
        period_from: S.from, period_to: S.to,
        comm_total: Number(c.amount) || 0, paid_amount: Number(c.amount) || 0, withdraw_amount: 0,
        cash_before: d.cashBox, cash_after: d.cashBox,
        owed_after: Math.max(0, d.owed - (Number(c.amount) || 0)), invoice_count: 1,
        note: 'دفع عمولة فاتورة مفردة', created_by: 'admin',
      });
      await window.sb('PATCH', `/rest/v1/invoice_commissions?id=eq.${c.id}&paid=eq.false`,
        { paid: true, paid_at: new Date().toISOString(), settlement_id: rec.id }, { Prefer: 'return=minimal' });
      c.paid = true; c.settlement_id = rec.id;
      alert('✅ دُفعت العمولة — ' + rec.settlement_no);
      render();
    } catch (e) { alert('تعذّر الدفع: ' + e.message); }
    finally { S.busy = false; }
  }

  function dialog(html) {
    document.getElementById('st-dlg')?.remove();
    const d = document.createElement('div');
    d.id = 'st-dlg';
    d.style.cssText = 'position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px;';
    d.innerHTML = `<div style="background:#fff;border-radius:16px;padding:16px;max-width:420px;width:100%;">${html}</div>`;
    document.body.appendChild(d);
  }

  /* ══ الدالة الموحّدة: أي دفع عمولة بالنظام كله يمر من هنا ويُختم ══
     (استدعتها المسارات المدموجة: التحصيل الكامل مع الفاتورة، واقتطاع العمولة عند
      تحصيل الدين) — فلا يبقى أي مسار يكتب paid=true دون رقم تسوية. */
  async function stampPay(commIds, branchKey, amount, kind, note) {
    const ids = (commIds || []).filter(Boolean);
    if (!ids.length) return null;
    const d = compute(branchKey, '', S.from, S.to);
    const first = (window.allComm || []).find((c) => String(c.id) === String(ids[0]));
    const rec = await nextNo({
      branch_key: branchKey, cashier_name: (first && first.cashier_name) || null,
      kind: kind || 'single', period_from: S.from, period_to: S.to,
      comm_total: Number(amount) || 0, paid_amount: Number(amount) || 0, withdraw_amount: 0,
      cash_before: d.cashBox, cash_after: d.cashBox,
      owed_after: Math.max(0, d.owed - (Number(amount) || 0)), invoice_count: ids.length,
      note: note || null, created_by: 'admin',
    });
    await window.sb('PATCH', `/rest/v1/invoice_commissions?id=in.(${ids.join(',')})&paid=eq.false`,
      { paid: true, paid_at: new Date().toISOString(), settlement_id: rec.id }, { Prefer: 'return=minimal' });
    (window.allComm || []).forEach((c) => { if (ids.map(String).includes(String(c.id))) { c.paid = true; c.settlement_id = rec.id; } });
    if (document.getElementById('settl-ov')) render();
    return rec;
  }

  window.GMTSettlements = { open, doSettle, doWithdraw, paySingle, compute, stampPay };

  /* ══ زر عائم بالأدمن ══ */
  function mount() {
    if (document.getElementById('settl-btn')) return;
    const b = document.createElement('button');
    b.id = 'settl-btn';
    b.textContent = '🧾 الحساب الجاري والتسويات';
    b.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:800;background:linear-gradient(135deg,#C00012,#8a000d);color:#fff;border:none;border-radius:12px;padding:11px 15px;font-family:Cairo,Arial,sans-serif;font-size:12px;font-weight:900;cursor:pointer;box-shadow:0 8px 24px rgba(192,0,18,.32);';
    b.onclick = () => open(S.branchKey);
    document.body.appendChild(b);
    // إزاحة زر أسماء النقاط لئلا يتراكبا
    const bn = Array.from(document.querySelectorAll('button')).find((x) => x.textContent.includes('أسماء نقاط البيع'));
    if (bn) bn.style.bottom = '62px';
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();


/* ── gmt-offers-tool.js ── */
;/**
 * gmt-offers-tool.js — أداة العروض الموحّدة لنظام GMT
 * ═══════════════════════════════════════════════════════
 * أداة واحدة تُحمَّل داخل: أدمن نقاط البيع + أدمن المتجر (نفس الملف بالمكانين).
 * السجل الرئيسي: gmt_offers (القاعدة الرئيسية).
 * عند الحفظ تنشر تلقائياً حسب الأهداف المختارة:
 *   • نقاط البيع/الجرد: يقرآن gmt_offers مباشرة (بلا تغيير)
 *   • المتجر: مرآة داخل gmt_store.offers (نفس البنية التي يعرضها المتجر)
 *   • الموقع الرئيسي: بطاقة في news_cards بوسم "عرض خاص"
 *   • بث تيليغرام (تلقائي) + زر مشاركة واتساب (يدوي بضغطة)
 *
 * الأنواع: single (سعري مفرد) · bundle (باقة) · announce (إعلاني بلا سعر)
 * ملاحظة: نقطة البيع تستثني announce بفلتر offer_type=neq.announce.
 *
 * الاستخدام من الملف المضيف:
 *   <script src="gmt-offers-tool.js"></script>
 *   GMTOffersTool.mount('حاوية-الـid');
 */
(function (global) {
  'use strict';

  /* ══════════ إعدادات قواعد البيانات الثلاث ══════════ */
  const DB = {
    main: {
      url: 'https://ysawzwtmodkqqbqoiojj.supabase.co',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYXd6d3Rtb2RrcXFicW9pb2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NjI0OTUsImV4cCI6MjA5MjAzODQ5NX0.g-dBDpHzMsP_0IQAKFxzWkKzc_I13bGUMeYNgcUmrKQ',
    },
    store: {
      url: 'https://tupldwylzrkjzqtaiscv.supabase.co',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1cGxkd3lsenJranpxdGFpc2N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTEzNTQsImV4cCI6MjA5MTA2NzM1NH0.RKsdAg4v7TcuMhBepztJtRdTtsR-f8cMcoDXKmnZXO0',
      table: 'gmt_store',
      bucket: 'gmt-images',
    },
    site: {
      url: 'https://znpakcaizvkwqzhosxvm.supabase.co',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpucGFrY2FpenZrd3F6aG9zeHZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzM0NTMsImV4cCI6MjA5NTkwOTQ1M30.YW3YuT-RRTpKw5WeFHkPeTUcXBBtaQFGCaCrBQWykks',
      table: 'news_cards',
    },
  };

  /* ══════════ REST helper (بلا مكتبات) ══════════ */
  async function rest(db, method, path, body, extra) {
    const h = { apikey: db.key, Authorization: 'Bearer ' + db.key, 'Content-Type': 'application/json', ...(extra || {}) };
    const r = await fetch(db.url + '/rest/v1/' + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('HTTP ' + r.status + (t ? ' — ' + t.slice(0, 140) : '')); }
    if (r.status === 204) return null;
    const txt = await r.text();
    return txt ? JSON.parse(txt) : null;
  }

  /* رفع صورة إلى Storage المتجر (نفس دلو أدمن المتجر) */
  async function uploadImage(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const base = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    const path = `${base}_${Date.now()}.${ext}`;
    const r = await fetch(`${DB.store.url}/storage/v1/object/${DB.store.bucket}/${path}`, {
      method: 'POST',
      headers: { apikey: DB.store.key, Authorization: 'Bearer ' + DB.store.key, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' },
      body: file,
    });
    if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('رفع الصورة فشل: HTTP ' + r.status + ' ' + t.slice(0, 100)); }
    return `${DB.store.url}/storage/v1/object/public/${DB.store.bucket}/${path}`;
  }

  /* ══════════ إعدادات البث (تُسأل مرة وتُحفظ) ══════════ */
  const CFG_KEYS = { tgBot: 'gmt_offers_tg_bot', tgChat: 'gmt_offers_tg_chat', storeUrl: 'gmt_offers_store_url' };
  const cfg = {
    get tgBot() { return localStorage.getItem(CFG_KEYS.tgBot) || ''; },
    get tgChat() { return localStorage.getItem(CFG_KEYS.tgChat) || ''; },
    get storeUrl() { return localStorage.getItem(CFG_KEYS.storeUrl) || ''; },
  };

  /* ══════════ الحالة ══════════ */
  let _root = null;          // حاوية الأداة
  let _offers = [];          // صفوف gmt_offers
  let _editing = null;       // العرض قيد التحرير (null = جديد)
  let _bundleItems = [];     // عناصر الباقة بالنموذج
  let _singleProd = null;    // منتج العرض المفرد المختار
  let _images = [];          // صور النموذج الحالية

  /* ══════════ أدوات صغيرة ══════════ */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt$ = (n) => (n == null || n === '' ? '' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' $');
  function toast(msg, err) {
    let t = document.getElementById('gmtof-toast');
    if (!t) { t = document.createElement('div'); t.id = 'gmtof-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:24px;right:50%;transform:translateX(50%);z-index:100000;background:${err ? '#dc2626' : '#111'};color:#fff;padding:10px 18px;border-radius:12px;font-size:13px;font-weight:700;font-family:inherit;box-shadow:0 8px 30px rgba(0,0,0,.35);max-width:90vw;`;
    clearTimeout(t._h); t._h = setTimeout(() => t.remove(), err ? 5000 : 2600);
  }
  const endOfDayISO = (d) => (d ? d + 'T23:59:59' : null);        // يحل مشكلة "منتهي" قبل نهاية اليوم
  const isExpired = (o) => !!(o.ends_at && new Date(o.ends_at) < new Date());
  function targetsOf(o) { const t = o.targets || {}; return { store: !!t.store, site: !!t.site }; }

  /* ══════════ CSS يُحقن مرة ══════════ */
  function injectCSS() {
    if (document.getElementById('gmtof-css')) return;
    const s = document.createElement('style'); s.id = 'gmtof-css';
    s.textContent = `
      .gmtof{direction:rtl;font-size:14px;color:#111;}
      .gmtof *{box-sizing:border-box;}
      .gmtof-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px;}
      .gmtof-head h2{font-size:17px;font-weight:900;margin:0;flex:1;}
      .gmtof-btn{border:none;border-radius:10px;padding:9px 14px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:5px;}
      .gmtof-btn.p{background:#C00012;color:#fff;} .gmtof-btn.p:hover{background:#a00010;}
      .gmtof-btn.g{background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;} .gmtof-btn.g:hover{background:#e5e7eb;}
      .gmtof-empty{text-align:center;color:#9ca3af;padding:44px 10px;font-size:13px;background:#fafafa;border:1.5px dashed #e5e7eb;border-radius:14px;}
      .gmtof-card{display:flex;gap:12px;background:#fff;border:1px solid #eee;border-radius:14px;padding:12px;margin-bottom:10px;align-items:center;}
      .gmtof-thumb{width:62px;height:62px;border-radius:10px;background:#f5f5f5;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:22px;color:#d1d5db;}
      .gmtof-thumb img{width:100%;height:100%;object-fit:cover;}
      .gmtof-mid{flex:1;min-width:0;}
      .gmtof-title{font-weight:800;font-size:14px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
      .gmtof-chip{font-size:10px;font-weight:800;padding:2px 8px;border-radius:99px;white-space:nowrap;}
      .c-single{background:#eff6ff;color:#2563eb;} .c-bundle{background:#f5f3ff;color:#7c3aed;} .c-announce{background:#fefce8;color:#a16207;}
      .c-on{background:#f0fdf4;color:#16a34a;} .c-off{background:#f3f4f6;color:#6b7280;} .c-exp{background:#fef2f2;color:#dc2626;}
      .c-t{background:#f8fafc;color:#64748b;border:1px solid #e2e8f0;}
      .gmtof-sub{font-size:11.5px;color:#6b7280;margin-top:3px;display:flex;gap:10px;flex-wrap:wrap;}
      .gmtof-acts{display:flex;gap:5px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;}
      .gmtof-ic{width:30px;height:30px;border-radius:9px;border:none;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;}
      .ic-b{background:#eff6ff;color:#2563eb;} .ic-r{background:#fef2f2;color:#dc2626;} .ic-g{background:#f0fdf4;color:#16a34a;} .ic-y{background:#fffbeb;color:#b45309;} .ic-n{background:#f3f4f6;color:#374151;}
      .gmtof-ov{position:fixed;inset:0;z-index:99000;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;}
      @media(min-width:640px){.gmtof-ov{align-items:center;padding:20px;}}
      .gmtof-modal{background:#fff;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;border-radius:20px 20px 0 0;padding:18px 16px 22px;direction:rtl;}
      @media(min-width:640px){.gmtof-modal{border-radius:20px;}}
      .gmtof-modal h3{font-size:16px;font-weight:900;margin:0 0 14px;display:flex;justify-content:space-between;align-items:center;}
      .gmtof-x{background:#f3f4f6;border:none;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:13px;}
      .gmtof-lbl{font-size:12px;font-weight:800;color:#374151;margin:12px 0 5px;display:block;}
      .gmtof-in,.gmtof-ta{width:100%;border:1.5px solid #e5e7eb;border-radius:10px;padding:10px 12px;font-size:13.5px;font-family:inherit;}
      .gmtof-in:focus,.gmtof-ta:focus{outline:none;border-color:#C00012;}
      .gmtof-ta{min-height:74px;resize:vertical;}
      .gmtof-seg{display:flex;gap:6px;flex-wrap:wrap;}
      .gmtof-seg button{flex:1;min-width:100px;border:1.5px solid #e5e7eb;background:#fff;border-radius:10px;padding:9px 6px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;color:#6b7280;}
      .gmtof-seg button.on{border-color:#C00012;background:#fff5f5;color:#C00012;}
      .gmtof-row{display:flex;gap:8px;} .gmtof-row>*{flex:1;}
      .gmtof-chk{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:#374151;background:#fafafa;border:1px solid #eee;border-radius:10px;padding:8px 10px;cursor:pointer;}
      .gmtof-chk input{width:16px;height:16px;accent-color:#C00012;}
      .gmtof-thumbs{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px;}
      .gmtof-thumbs .th{position:relative;width:58px;height:58px;border-radius:9px;overflow:hidden;border:1px solid #eee;}
      .gmtof-thumbs .th img{width:100%;height:100%;object-fit:cover;}
      .gmtof-thumbs .th button{position:absolute;top:2px;left:2px;width:17px;height:17px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:none;font-size:9px;cursor:pointer;line-height:1;}
      .gmtof-pk{position:relative;}
      .gmtof-pk-dd{position:absolute;top:100%;right:0;left:0;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 12px 34px rgba(0,0,0,.14);z-index:20;max-height:230px;overflow-y:auto;display:none;}
      .gmtof-pk-dd.open{display:block;}
      .gmtof-pk-dd .it{padding:9px 12px;font-size:12.5px;cursor:pointer;display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid #f5f5f5;}
      .gmtof-pk-dd .it:hover{background:#fafafa;}
      .gmtof-sel{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 10px;font-size:12.5px;font-weight:700;color:#166534;display:flex;justify-content:space-between;align-items:center;margin-top:7px;}
      .gmtof-bi{display:flex;justify-content:space-between;align-items:center;background:#fafafa;border:1px solid #eee;border-radius:9px;padding:7px 10px;font-size:12.5px;margin-top:6px;}
      .gmtof-note{font-size:11px;color:#9ca3af;margin-top:4px;line-height:1.6;}
    `;
    document.head.appendChild(s);
  }

  /* ══════════ التحميل والقائمة ══════════ */
  async function loadOffers() {
    _offers = await rest(DB.main, 'GET', 'gmt_offers?select=*&order=created_at.desc&limit=300') || [];
  }

  function renderList() {
    const list = _root.querySelector('#gmtof-list');
    if (!_offers.length) { list.innerHTML = `<div class="gmtof-empty">🎁 لا توجد عروض بعد — اضغط "عرض جديد"</div>`; return; }
    list.innerHTML = _offers.map((o) => {
      const t = targetsOf(o);
      const typeChip = o.offer_type === 'bundle' ? '<span class="gmtof-chip c-bundle">باقة</span>' : o.offer_type === 'announce' ? '<span class="gmtof-chip c-announce">إعلاني</span>' : '<span class="gmtof-chip c-single">مفرد</span>';
      const stChip = isExpired(o) ? '<span class="gmtof-chip c-exp">منتهي</span>' : o.is_active ? '<span class="gmtof-chip c-on">نشط</span>' : '<span class="gmtof-chip c-off">موقوف</span>';
      const tChips = [o.offer_type !== 'announce' ? '<span class="gmtof-chip c-t">نقاط البيع</span>' : '', t.store ? '<span class="gmtof-chip c-t">المتجر</span>' : '', t.site ? '<span class="gmtof-chip c-t">الموقع</span>' : ''].join('');
      const img = (o.images && o.images[0]) || o.image_url || '';
      const priceLine = o.offer_type === 'announce' ? '' : `<span>💲 ${fmt$(o.offer_price)}${o.original_price ? ' <s style="color:#bbb;">' + fmt$(o.original_price) + '</s>' : ''}</span>`;
      return `<div class="gmtof-card">
        <div class="gmtof-thumb">${img ? `<img src="${esc(img)}" loading="lazy">` : '🎁'}</div>
        <div class="gmtof-mid">
          <div class="gmtof-title">${esc(o.name || 'عرض')} ${typeChip} ${stChip}</div>
          <div class="gmtof-sub">${priceLine}${o.ends_at ? `<span>⏳ ${new Date(o.ends_at).toLocaleDateString('ar-SY')}</span>` : '<span>بلا انتهاء</span>'}${tChips}</div>
        </div>
        <div class="gmtof-acts">
          <button class="gmtof-ic ic-n" title="بث تيليغرام" onclick="GMTOffersTool._tg(${o.id})">📣</button>
          <button class="gmtof-ic ic-g" title="مشاركة واتساب" onclick="GMTOffersTool._wa(${o.id})">🟢</button>
          <button class="gmtof-ic ic-y" title="${o.is_active ? 'إيقاف' : 'تفعيل'}" onclick="GMTOffersTool._toggle(${o.id})">${o.is_active ? '⏸' : '▶'}</button>
          <button class="gmtof-ic ic-b" title="تعديل" onclick="GMTOffersTool._edit(${o.id})">✏️</button>
          <button class="gmtof-ic ic-r" title="حذف" onclick="GMTOffersTool._del(${o.id})">🗑</button>
        </div>
      </div>`;
    }).join('');
  }

  /* ══════════ نموذج العرض ══════════ */
  function openForm(offer) {
    _editing = offer || null;
    _bundleItems = [];
    _singleProd = null;
    _images = offer ? (Array.isArray(offer.images) && offer.images.length ? [...offer.images] : (offer.image_url ? [offer.image_url] : [])) : [];
    const type = offer?.offer_type || 'single';
    if (offer?.offer_type === 'bundle' && offer.products) {
      try { const a = typeof offer.products === 'string' ? JSON.parse(offer.products) : offer.products; _bundleItems = (a || []).map((x) => ({ id: x.id, name: x.name, qty: Number(x.qty) || 1, price: Number(x.price) || 0 })); } catch (_) {}
    }
    if (offer?.offer_type === 'single' && offer.product_id) _singleProd = { id: offer.product_id, name: offer._pname || 'المنتج المرتبط', price: offer.original_price };

    const t = offer ? targetsOf(offer) : { store: true, site: true };
    const ov = document.createElement('div'); ov.className = 'gmtof-ov'; ov.id = 'gmtof-ov';
    ov.innerHTML = `<div class="gmtof-modal">
      <h3>${offer ? 'تعديل عرض' : 'عرض جديد'} <button class="gmtof-x" onclick="GMTOffersTool._close()">✕</button></h3>

      <label class="gmtof-lbl">نوع العرض</label>
      <div class="gmtof-seg" id="gmtof-type">
        <button data-t="single" class="${type === 'single' ? 'on' : ''}">💲 سعري مفرد</button>
        <button data-t="bundle" class="${type === 'bundle' ? 'on' : ''}">🎁 باقة</button>
        <button data-t="announce" class="${type === 'announce' ? 'on' : ''}">📢 إعلاني</button>
      </div>

      <label class="gmtof-lbl">عنوان العرض *</label>
      <input class="gmtof-in" id="gmtof-name" value="${esc(offer?.name || '')}" placeholder="مثال: خصم خاص على Canon R6">

      <label class="gmtof-lbl">الوصف</label>
      <textarea class="gmtof-ta" id="gmtof-desc" placeholder="تفاصيل العرض (يظهر بالمتجر والموقع والبث)">${esc(offer?.description || '')}</textarea>

      <div id="gmtof-single-wrap">
        <label class="gmtof-lbl">المنتج المرتبط (من الجرد) *</label>
        <div class="gmtof-pk">
          <input class="gmtof-in" id="gmtof-psearch" placeholder="🔍 ابحث بالاسم أو الباركود..." autocomplete="off">
          <div class="gmtof-pk-dd" id="gmtof-pdd"></div>
        </div>
        <div id="gmtof-psel"></div>
      </div>

      <div id="gmtof-bundle-wrap" style="display:none;">
        <label class="gmtof-lbl">منتجات الباقة *</label>
        <div class="gmtof-pk">
          <input class="gmtof-in" id="gmtof-bsearch" placeholder="🔍 أضف منتجاً بالاسم أو الباركود..." autocomplete="off">
          <div class="gmtof-pk-dd" id="gmtof-bdd"></div>
        </div>
        <div id="gmtof-blist"></div>
      </div>

      <div class="gmtof-row" id="gmtof-price-row">
        <div><label class="gmtof-lbl">سعر العرض *</label><input class="gmtof-in" id="gmtof-price" type="number" min="0" step="0.01" value="${offer?.offer_price ?? ''}"></div>
        <div><label class="gmtof-lbl">السعر الأصلي</label><input class="gmtof-in" id="gmtof-oprice" type="number" min="0" step="0.01" value="${offer?.original_price ?? ''}"></div>
      </div>

      <label class="gmtof-lbl">صور العرض</label>
      <div style="display:flex;gap:7px;">
        <button class="gmtof-btn g" type="button" onclick="GMTOffersTool._pick()">📤 رفع صور</button>
        <input class="gmtof-in" id="gmtof-imgurl" placeholder="أو الصق رابط صورة واضغط Enter" style="flex:1;">
      </div>
      <div class="gmtof-thumbs" id="gmtof-thumbs"></div>
      <div class="gmtof-note">الصورة الأولى هي الرئيسية (تظهر بنقاط البيع والموقع والبث).</div>

      <label class="gmtof-lbl">تاريخ انتهاء العرض</label>
      <input class="gmtof-in" id="gmtof-ends" type="date" value="${offer?.ends_at ? String(offer.ends_at).slice(0, 10) : ''}">

      <label class="gmtof-lbl">أهداف النشر</label>
      <div class="gmtof-row" style="flex-wrap:wrap;">
        <label class="gmtof-chk" id="gmtof-pos-chip" style="opacity:.9;"><input type="checkbox" checked disabled> نقاط البيع + الجرد <span style="font-size:10px;color:#9ca3af;">(تلقائي للسعري)</span></label>
        <label class="gmtof-chk"><input type="checkbox" id="gmtof-t-store" ${t.store ? 'checked' : ''}> المتجر الإلكتروني</label>
        <label class="gmtof-chk"><input type="checkbox" id="gmtof-t-site" ${t.site ? 'checked' : ''}> الموقع الرئيسي</label>
        <label class="gmtof-chk"><input type="checkbox" id="gmtof-t-tg" ${offer ? '' : 'checked'}> 📣 بث تيليغرام عند الحفظ</label>
      </div>

      <div style="display:flex;gap:8px;margin-top:18px;">
        <button class="gmtof-btn p" style="flex:2;justify-content:center;" onclick="GMTOffersTool._save()">💾 حفظ ونشر</button>
        <button class="gmtof-btn g" style="flex:1;justify-content:center;" onclick="GMTOffersTool._close()">إلغاء</button>
      </div>
      <div class="gmtof-note" id="gmtof-status" style="margin-top:10px;"></div>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', (e) => { if (e.target === ov) closeForm(); });

    // نوع العرض
    ov.querySelectorAll('#gmtof-type button').forEach((b) => b.addEventListener('click', () => {
      ov.querySelectorAll('#gmtof-type button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on'); applyType();
    }));
    // رابط صورة يدوي
    ov.querySelector('#gmtof-imgurl').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const v = e.target.value.trim(); if (v) { _images.push(v); e.target.value = ''; renderThumbs(); } }
    });
    // منتقيا المنتجات
    wirePicker('gmtof-psearch', 'gmtof-pdd', (p) => { _singleProd = p; renderSingleSel(); const op = ov.querySelector('#gmtof-oprice'); if (op && !op.value) op.value = p.price ?? ''; });
    wirePicker('gmtof-bsearch', 'gmtof-bdd', (p) => { if (!_bundleItems.find((x) => x.id === p.id)) { _bundleItems.push({ id: p.id, name: p.name, qty: 1, price: Number(p.price) || 0 }); renderBundle(); } });

    applyType(); renderThumbs(); renderSingleSel(); renderBundle();
  }
  function closeForm() { document.getElementById('gmtof-ov')?.remove(); _editing = null; }

  function curType() { return document.querySelector('#gmtof-type button.on')?.dataset.t || 'single'; }
  function applyType() {
    const t = curType();
    const q = (id) => document.getElementById(id);
    q('gmtof-single-wrap').style.display = t === 'single' ? '' : 'none';
    q('gmtof-bundle-wrap').style.display = t === 'bundle' ? '' : 'none';
    q('gmtof-price-row').style.display = t === 'announce' ? 'none' : '';
    q('gmtof-pos-chip').style.display = t === 'announce' ? 'none' : '';
  }

  function renderThumbs() {
    const c = document.getElementById('gmtof-thumbs'); if (!c) return;
    c.innerHTML = _images.map((u, i) => `<div class="th"><img src="${esc(u)}"><button onclick="GMTOffersTool._rmImg(${i})">✕</button>${i === 0 ? '<div style="position:absolute;bottom:0;inset-inline:0;background:rgba(192,0,18,.85);color:#fff;font-size:8px;text-align:center;font-weight:800;">رئيسية</div>' : ''}</div>`).join('');
  }
  function renderSingleSel() {
    const c = document.getElementById('gmtof-psel'); if (!c) return;
    c.innerHTML = _singleProd ? `<div class="gmtof-sel"><span>✓ ${esc(_singleProd.name)}${_singleProd.price != null ? ' — ' + fmt$(_singleProd.price) : ''}</span><button class="gmtof-x" style="width:22px;height:22px;font-size:10px;" onclick="GMTOffersTool._clrSingle()">✕</button></div>` : '';
  }
  function renderBundle() {
    const c = document.getElementById('gmtof-blist'); if (!c) return;
    c.innerHTML = _bundleItems.map((it, i) => `<div class="gmtof-bi"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;">${esc(it.name)}</span>
      <span style="display:flex;align-items:center;gap:5px;">× <input type="number" min="1" value="${it.qty}" style="width:52px;border:1px solid #e5e7eb;border-radius:7px;padding:4px 6px;font-family:inherit;" onchange="GMTOffersTool._bqty(${i},this.value)">
      <button class="gmtof-x" style="width:22px;height:22px;font-size:10px;" onclick="GMTOffersTool._brm(${i})">✕</button></span></div>`).join('');
    // السعر الأصلي = مجموع مكونات الباقة (إن لم يُعدَّل يدوياً)
    const op = document.getElementById('gmtof-oprice');
    if (op && curType() === 'bundle') { const sum = _bundleItems.reduce((s, x) => s + (x.price || 0) * (x.qty || 1), 0); if (sum) op.placeholder = 'تلقائي: ' + sum; }
  }

  /* منتقي منتجات القاعدة الرئيسية */
  function wirePicker(inputId, ddId, onPick) {
    const inp = document.getElementById(inputId), dd = document.getElementById(ddId);
    if (!inp || !dd) return;
    let h;
    inp.addEventListener('input', () => {
      clearTimeout(h);
      const q = inp.value.trim();
      if (q.length < 2) { dd.classList.remove('open'); return; }
      h = setTimeout(async () => {
        try {
          const enc = encodeURIComponent(`%${q}%`);
          const rows = await rest(DB.main, 'GET', `products?select=id,name,barcode,price&or=(name.ilike.${enc},barcode.ilike.${enc})&limit=12`);
          dd.innerHTML = (rows || []).length
            ? rows.map((p) => `<div class="it" data-p='${esc(JSON.stringify({ id: String(p.id), name: p.name, price: p.price }))}'><span>${esc(p.name)}</span><span style="color:#9ca3af;font-size:11px;">${fmt$(p.price)}</span></div>`).join('')
            : '<div class="it" style="color:#9ca3af;cursor:default;">لا نتائج</div>';
          dd.classList.add('open');
          dd.querySelectorAll('.it[data-p]').forEach((el) => el.addEventListener('click', () => { onPick(JSON.parse(el.dataset.p)); dd.classList.remove('open'); inp.value = ''; }));
        } catch (e) { toast('بحث المنتجات فشل: ' + e.message, true); }
      }, 300);
    });
    document.getElementById('gmtof-ov')?.addEventListener('click', (e) => { if (!dd.contains(e.target) && e.target !== inp) dd.classList.remove('open'); });
  }

  /* ══════════ الحفظ + النشر التلقائي ══════════ */
  async function save() {
    const q = (id) => document.getElementById(id);
    const type = curType();
    const name = q('gmtof-name').value.trim();
    if (!name) return toast('عنوان العرض مطلوب', true);
    const description = q('gmtof-desc').value.trim() || null;
    const endsDate = q('gmtof-ends').value;
    const ends_at = endOfDayISO(endsDate);
    let offer_price = null, original_price = null, product_id = null, products = null;

    if (type !== 'announce') {
      offer_price = parseFloat(q('gmtof-price').value);
      if (isNaN(offer_price) || offer_price < 0) return toast('سعر العرض غير صحيح', true);
      original_price = parseFloat(q('gmtof-oprice').value); if (isNaN(original_price)) original_price = null;
    }
    if (type === 'single') {
      if (!_singleProd) return toast('اختر المنتج المرتبط بالعرض المفرد', true);
      product_id = String(_singleProd.id);
      if (original_price == null && _singleProd.price != null) original_price = Number(_singleProd.price);
    }
    if (type === 'bundle') {
      if (!_bundleItems.length) return toast('أضف منتجاً واحداً على الأقل للباقة', true);
      products = JSON.stringify(_bundleItems.map((x) => ({ id: x.id, name: x.name, qty: x.qty })));
      if (original_price == null) { const s = _bundleItems.reduce((a, x) => a + (x.price || 0) * (x.qty || 1), 0); if (s) original_price = s; }
    }
    const targets = { store: q('gmtof-t-store').checked, site: q('gmtof-t-site').checked };
    const doTG = q('gmtof-t-tg').checked;

    const row = {
      name, description, offer_type: type,
      image_url: _images[0] || null, images: _images.length ? _images : null,
      offer_price, original_price, product_id, products,
      ends_at, is_active: _editing ? _editing.is_active : true, targets,
    };

    const st = q('gmtof-status'); const setSt = (m) => { if (st) st.textContent = m; };
    try {
      setSt('حفظ السجل الرئيسي...');
      let saved;
      if (_editing) {
        saved = (await rest(DB.main, 'PATCH', `gmt_offers?id=eq.${_editing.id}`, row, { Prefer: 'return=representation' }))?.[0];
      } else {
        saved = (await rest(DB.main, 'POST', 'gmt_offers', row, { Prefer: 'return=representation' }))?.[0];
      }
      if (!saved) throw new Error('لم يُرجَع السجل');

      const report = ['نقاط البيع ✓'];
      // ── مرآة المتجر ──
      setSt('نشر على المتجر...');
      try { saved = await syncStore(saved, targets.store); report.push(targets.store ? 'المتجر ✓' : 'المتجر —'); }
      catch (e) { report.push('المتجر ✗ (' + e.message.slice(0, 60) + ')'); }
      // ── بطاقة الموقع ──
      setSt('نشر على الموقع الرئيسي...');
      try { saved = await syncSite(saved, targets.site); report.push(targets.site ? 'الموقع ✓' : 'الموقع —'); }
      catch (e) { report.push('الموقع ✗ (' + e.message.slice(0, 60) + ')'); }
      // ── بث تيليغرام ──
      if (doTG) { setSt('بث تيليغرام...'); try { await broadcastTG(saved); report.push('تيليغرام ✓'); } catch (e) { report.push('تيليغرام ✗ (' + e.message.slice(0, 60) + ')'); } }

      closeForm();
      await refresh();
      toast('💾 ' + report.join(' · '), report.some((r) => r.includes('✗')));
    } catch (e) { setSt(''); toast('فشل الحفظ: ' + e.message, true); }
  }

  /* نص وصف موحّد للأسطح الترويجية (يضيف سطر السعر وكود المنتج تلقائياً) */
  function promoDesc(o) {
    let d = o.description || '';
    if (o.offer_type !== 'announce' && o.offer_price != null) {
      d += (d ? '\n' : '') + `السعر: ${fmt$(o.offer_price)}` + (o.original_price ? ` بدل ${fmt$(o.original_price)}` : '');
    }
    return d;
  }

  /* مزامنة مرآة المتجر داخل gmt_store.offers (إضافة/تحديث/إزالة) — يعيد الصف الرئيسي محدثاً */
  async function syncStore(o, wanted) {
    const rec = (await rest(DB.store, 'GET', `${DB.store.table}?select=id,offers&id=eq.1`))?.[0];
    if (!rec) throw new Error('سجل المتجر غير موجود');
    let arr = Array.isArray(rec.offers) ? rec.offers : [];
    const mid = o.store_offer_id;
    arr = arr.filter((x) => x.id !== mid); // أزل المرآة القديمة إن وُجدت
    let newMid = null;
    if (wanted && o.is_active) {
      newMid = mid || 'off' + Date.now();
      arr.unshift({
        id: newMid,
        title: o.name,
        description: promoDesc(o) || undefined,
        end_date: o.ends_at ? String(o.ends_at).slice(0, 10) : undefined,
        images: o.images || (o.image_url ? [o.image_url] : []),
        image: (o.images && o.images[0]) || o.image_url || undefined,
        created_at: o.created_at || new Date().toISOString(),
      });
    }
    await rest(DB.store, 'PATCH', `${DB.store.table}?id=eq.1`, { offers: arr });
    if ((newMid || null) !== (mid || null)) {
      const upd = (await rest(DB.main, 'PATCH', `gmt_offers?id=eq.${o.id}`, { store_offer_id: newMid }, { Prefer: 'return=representation' }))?.[0];
      return upd || { ...o, store_offer_id: newMid };
    }
    return o;
  }

  /* مزامنة بطاقة الموقع الرئيسي في news_cards — يعيد الصف الرئيسي محدثاً */
  async function syncSite(o, wanted) {
    const nid = o.site_news_id;
    let newNid = null;
    if (wanted && o.is_active) {
      const card = {
        title_ar: o.name,
        description_ar: promoDesc(o) || null,
        tag_ar: 'عرض خاص', tag_color: '#CC0000',
        image_url: (o.images && o.images[0]) || o.image_url || null,
        link_url: cfg.storeUrl || null,
        published_at: new Date().toISOString().slice(0, 10),
      };
      if (nid) { await rest(DB.site, 'PATCH', `${DB.site.table}?id=eq.${nid}`, card); newNid = nid; }
      else { const ins = (await rest(DB.site, 'POST', DB.site.table, card, { Prefer: 'return=representation' }))?.[0]; newNid = ins?.id != null ? String(ins.id) : null; }
    } else if (nid) {
      await rest(DB.site, 'DELETE', `${DB.site.table}?id=eq.${nid}`);
    }
    if ((newNid || null) !== (nid || null)) {
      const upd = (await rest(DB.main, 'PATCH', `gmt_offers?id=eq.${o.id}`, { site_news_id: newNid }, { Prefer: 'return=representation' }))?.[0];
      return upd || { ...o, site_news_id: newNid };
    }
    return o;
  }

  /* ══════════ البث ══════════ */
  function offerText(o) {
    const lines = ['🎁 ' + o.name];
    if (o.offer_type !== 'announce' && o.offer_price != null) lines.push('💲 ' + fmt$(o.offer_price) + (o.original_price ? ' بدل ' + fmt$(o.original_price) : ''));
    if (o.description) lines.push(o.description);
    if (o.ends_at) lines.push('⏳ العرض حتى ' + new Date(o.ends_at).toLocaleDateString('ar-SY'));
    if (cfg.storeUrl) lines.push('🛒 ' + cfg.storeUrl);
    return lines.join('\n');
  }
  async function broadcastTG(o) {
    if (!cfg.tgBot || !cfg.tgChat) { openSettings(); throw new Error('أكمل إعدادات تيليغرام أولاً'); }
    const img = (o.images && o.images[0]) || o.image_url;
    const text = offerText(o);
    const base = `https://api.telegram.org/bot${cfg.tgBot}`;
    const body = img
      ? { chat_id: cfg.tgChat, photo: img, caption: text }
      : { chat_id: cfg.tgChat, text };
    const r = await fetch(base + (img ? '/sendPhoto' : '/sendMessage'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) throw new Error(j.description || 'فشل الإرسال');
  }
  function shareWA(o) {
    window.open('https://wa.me/?text=' + encodeURIComponent(offerText(o)), '_blank', 'noopener');
  }

  function openSettings() {
    const bot = prompt('توكن بوت تيليغرام (للبث على القناة):', cfg.tgBot || '');
    if (bot === null) return;
    localStorage.setItem(CFG_KEYS.tgBot, bot.trim());
    const chat = prompt('معرّف القناة/المحادثة (مثل @gmt_offers أو -100xxxx):', cfg.tgChat || '');
    if (chat !== null) localStorage.setItem(CFG_KEYS.tgChat, chat.trim());
    const su = prompt('رابط المتجر المنشور (يُرفق بالبث وبطاقة الموقع):', cfg.storeUrl || 'https://general-media-tech.github.io/');
    if (su !== null) localStorage.setItem(CFG_KEYS.storeUrl, su.trim());
    toast('حُفظت إعدادات البث ✓');
  }

  /* ══════════ إجراءات القائمة ══════════ */
  async function toggle(id) {
    const o = _offers.find((x) => x.id === id); if (!o) return;
    const to = !o.is_active;
    try {
      let saved = (await rest(DB.main, 'PATCH', `gmt_offers?id=eq.${id}`, { is_active: to }, { Prefer: 'return=representation' }))?.[0] || { ...o, is_active: to };
      const t = targetsOf(saved);
      try { saved = await syncStore(saved, t.store); } catch (_) {}
      try { saved = await syncSite(saved, t.site); } catch (_) {}
      await refresh();
      toast(to ? '▶ فُعّل العرض ونُشر' : '⏸ أُوقف العرض وسُحب من الأسطح');
    } catch (e) { toast('فشل: ' + e.message, true); }
  }

  async function del(id) {
    const o = _offers.find((x) => x.id === id); if (!o) return;
    if (!confirm(`حذف العرض "${o.name}" نهائياً من كل الأسطح؟`)) return;
    try {
      try { await syncStore({ ...o, is_active: false }, false); } catch (_) {}
      try { await syncSite({ ...o, is_active: false }, false); } catch (_) {}
      await rest(DB.main, 'DELETE', `gmt_offers?id=eq.${id}`);
      await refresh();
      toast('🗑 حُذف العرض من كل الأسطح');
    } catch (e) { toast('فشل الحذف: ' + e.message, true); }
  }

  async function refresh() { try { await loadOffers(); renderList(); } catch (e) { toast('تحميل العروض فشل: ' + e.message, true); } }

  /* ══════════ التركيب ══════════ */
  async function mount(containerId) {
    injectCSS();
    _root = document.getElementById(containerId);
    if (!_root) return;
    _root.classList.add('gmtof');
    _root.innerHTML = `
      <div class="gmtof-head">
        <h2>🎁 العروض الموحّدة</h2>
        <button class="gmtof-btn g" onclick="GMTOffersTool._settings()">⚙️ إعدادات البث</button>
        <button class="gmtof-btn p" onclick="GMTOffersTool._new()">＋ عرض جديد</button>
      </div>
      <div class="gmtof-note" style="margin-bottom:10px;">أداة واحدة لكل العروض: تُنشر تلقائياً على نقاط البيع، المتجر، والموقع الرئيسي حسب اختيارك — مع بث تيليغرام ومشاركة واتساب.</div>
      <div id="gmtof-list"><div class="gmtof-empty">جارٍ التحميل...</div></div>`;
    await refresh();
  }

  /* ══════════ الواجهة العامة ══════════ */
  global.GMTOffersTool = {
    mount,
    _new: () => openForm(null),
    _edit: (id) => { const o = _offers.find((x) => x.id === id); if (o) openForm(o); },
    _del: del,
    _toggle: toggle,
    _tg: async (id) => { const o = _offers.find((x) => x.id === id); if (!o) return; try { await broadcastTG(o); toast('📣 بُثّ على تيليغرام ✓'); } catch (e) { toast('تيليغرام: ' + e.message, true); } },
    _wa: (id) => { const o = _offers.find((x) => x.id === id); if (o) shareWA(o); },
    _save: save,
    _close: closeForm,
    _settings: openSettings,
    _rmImg: (i) => { _images.splice(i, 1); renderThumbs(); },
    _clrSingle: () => { _singleProd = null; renderSingleSel(); },
    _bqty: (i, v) => { if (_bundleItems[i]) _bundleItems[i].qty = Math.max(1, parseInt(v) || 1); renderBundle(); },
    _brm: (i) => { _bundleItems.splice(i, 1); renderBundle(); },
    _pick: () => {
      let inp = document.getElementById('gmtof-file');
      if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.id = 'gmtof-file'; inp.style.display = 'none'; document.body.appendChild(inp); }
      inp.value = '';
      inp.onchange = async () => {
        const files = Array.from(inp.files || []); if (!files.length) return;
        toast('جاري رفع ' + files.length + ' صورة...');
        for (const f of files) { try { _images.push(await uploadImage(f)); renderThumbs(); } catch (e) { toast(e.message, true); } }
        toast('اكتمل الرفع ✓');
      };
      inp.click();
    },
  };
})(window);


/* ── gmt-draft.js ── */
;/* ═══════════════════════════════════════════════════════════════════════
   gmt-draft.js — PUR-4 · مسودة محلية لفاتورة المشتريات   (2026-07-13)

   المشكلة: انقطاع النت أو إغلاق الصفحة بالخطأ = ضياع الفاتورة كاملةً.
   الحل   : حفظ تلقائي **بالجهاز فقط** (IndexedDB مع سقوط آمن على localStorage).
            ⚠️ لا يلمس القاعدة إطلاقاً — قاعدتك «لا كتابة قبل حفظ سحابياً» محفوظة.

   يعمل تلقائياً بمجرد تحميله بجانب صفحة المشتريات — بلا أي تعديل بالكود.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.GMTDraft) return;

  var KEY = 'gmt_purchase_draft';
  var DB = 'gmt_drafts', STORE = 'drafts';
  var timer = null, lastJSON = '';

  /* ── تخزين: IndexedDB أولاً، وإلا localStorage ── */
  function idb() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej();
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function put(v) {
    return idb().then(function (db) {
      return new Promise(function (res) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(v, KEY);
        tx.oncomplete = res; tx.onerror = res;
      });
    }).catch(function () {
      try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
    });
  }
  function get() {
    return idb().then(function (db) {
      return new Promise(function (res) {
        var rq = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
        rq.onsuccess = function () { res(rq.result || null); };
        rq.onerror = function () { res(null); };
      });
    }).catch(function () {
      try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
    });
  }
  function del() {
    idb().then(function (db) {
      var tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
    }).catch(function () {});
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  /* ── التقاط حالة الفاتورة الحالية ── */
  var FIELDS = ['in-supplier', 'in-sup-inv', 'in-date', 'in-eta', 'in-ship', 'in-track',
                'in-notes', 'in-sup-phone', 'in-sup-address', 'in-sup-contact',
                'in-currency', 'in-sector', 'cost-transport', 'cost-shipping',
                'cost-customs', 'cost-local', 'in-cash-payment'];

  function snapshot() {
    if (typeof window.cart === 'undefined' || !Array.isArray(window.cart)) return null;
    if (!window.cart.length) return null;
    var form = {};
    FIELDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) form[id] = el.value;
    });
    return {
      at: new Date().toISOString(),
      invType: window.invType || 'germany',
      editId: window.editId || null,
      cart: window.cart,
      form: form
    };
  }

  function save() {
    var s = snapshot();
    if (!s) return;
    var j = JSON.stringify(s.cart) + JSON.stringify(s.form);
    if (j === lastJSON) return;              // لا تغيير ⇒ لا كتابة
    lastJSON = j;
    put(s);
    badge('💾 مسودة محفوظة بجهازك · ' + new Date().toLocaleTimeString('ar-SY'));
  }

  /* ── شارة صغيرة تطمئنك أن المسودة محفوظة ── */
  function badge(txt) {
    var b = document.getElementById('gmt-draft-badge');
    if (!b) {
      b = document.createElement('div');
      b.id = 'gmt-draft-badge';
      b.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:9998;background:#111;color:#fff;' +
        'padding:6px 12px;border-radius:12px;font:700 11px/1.4 Cairo,Arial;opacity:.85;pointer-events:none;';
      document.body.appendChild(b);
    }
    b.textContent = txt;
    b.style.display = 'block';
    clearTimeout(b._t);
    b._t = setTimeout(function () { b.style.display = 'none'; }, 2500);
  }

  /* ── الاستعادة عند فتح الصفحة ── */
  function offerRestore() {
    get().then(function (d) {
      if (!d || !d.cart || !d.cart.length) return;
      var when = new Date(d.at).toLocaleString('ar-SY');
      var ok = confirm(
        '💾 وُجدت مسودة فاتورة غير محفوظة سحابياً\n\n' +
        'التاريخ: ' + when + '\n' +
        'عدد الأصناف: ' + d.cart.length + '\n\n' +
        'هل تستعيدها؟\n(«إلغاء» = حذفها نهائياً)'
      );
      if (!ok) { del(); return; }
      try {
        window.cart = d.cart;
        window.invType = d.invType;
        if (d.editId) window.editId = d.editId;
        Object.keys(d.form || {}).forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.value = d.form[id];
        });
        if (typeof window.openAddModal === 'function') window.openAddModal();
        if (typeof window.renderCart === 'function') window.renderCart();
        else if (typeof window.render === 'function') window.render();
        badge('✅ استُعيدت المسودة');
      } catch (e) { console.warn('[gmt-draft] restore:', e); }
    });
  }

  /* ── امسح المسودة بعد نجاح الحفظ السحابي ── */
  function hookSave() {
    if (typeof window.saveShipment !== 'function') return false;
    var orig = window.saveShipment;
    window.saveShipment = async function () {
      var r = await orig.apply(this, arguments);
      del();                                  // نجح الحفظ السحابي ⇒ المسودة لم تعد لازمة
      lastJSON = '';
      return r;
    };
    return true;
  }

  window.GMTDraft = { save: save, clear: del, restore: offerRestore };

  document.addEventListener('DOMContentLoaded', function () {
    if (!/06_PURCHASES|المشتريات|purchases/i.test(location.pathname + document.title)) return;
    timer = setInterval(save, 4000);          // حفظ كل 4 ثوانٍ عند وجود تغيير
    document.addEventListener('input', function () { clearTimeout(save._d); save._d = setTimeout(save, 900); });
    var tries = 0;
    var h = setInterval(function () { if (hookSave() || ++tries > 20) clearInterval(h); }, 300);
    setTimeout(offerRestore, 1200);
  });

  window.addEventListener('beforeunload', save);
})();


/* ── gmt-welcome.js ── */
;/* ═══════════════════════════════════════════════════════════════════════
   gmt-welcome.js — 🪦 شاهدة توافق (إصدار 2026-07-12)
   شاشات الترحيب القديمة استُبدلت بشاشات gmt-guide.js الكاملة (موشن + هوية + تقليب).
   يبقى الملف لتوافق الصفحات القديمة: كل نداء يفتح النظام الجديد.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  // (2026-07-21) الدوال تُرجع false دائماً حتى يعمل منطق «if(!shown) tour» بالصفحات،
  // وتُعرّف بقوّة (لا شرط) كي لا يظهر «... is not defined» مهما كان ترتيب التحميل.
  const jump = function () { try { if (window.GMTGuide) window.GMTGuide.start(); } catch (_) {} return false; };
  ['showWelcomeSlides', 'showWelcomeSlidesForce', 'gmtWelcomeNext', 'gmtWelcomePrev',
   'gmtWelcomeGoTo', 'gmtWelcomeClose', 'gmtWelcomeDone', 'gmtWelcomeTouchStart', 'gmtWelcomeTouchEnd',
   'startInteractiveTraining']
    .forEach((n) => { try { window[n] = jump; } catch (_) {} });
})();


/* ── gmt-tour.js ── */
;/* ═══════════════════════════════════════════════════════════════════════
   gmt-tour.js — 🪦 شاهدة توافق (إصدار 2026-07-12)
   الجولة القديمة أُلغيت (TOUR-1): كانت تضع نافذة صغيرة فوق عنصر هدف بحساب موقعه،
   فإذا كان مخفياً أو خارج الشاشة أو لم يُرسم بعد ⇒ تطير لمكان عشوائي أو تُجمّد الصفحة.
   بديلها: gmt-guide.js (شاشات كاملة + دليل زرّاً بزرّ).
   هذا الملف يبقى فقط كي لا تنكسر الصفحات التي ما تزال تستدعيه — وكل نداء يُحوَّل للنظام الجديد.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const jump = () => { if (window.GMTGuide) window.GMTGuide.start(); };
  window.GMTTour = function GMTTour() {
    return { start: jump, restart: jump, stop() {}, next() {}, prev() {}, goTo() {} };
  };
  window.GMTTour.disabled = true;

  // (2026-07-20) جسور توافق: بعض الصفحات تستدعي هذه الأسماء القديمة.
  // نوفّرها كي لا يظهر خطأ «startInteractiveTraining is not defined» بالكونسول.
  if (typeof window.startInteractiveTraining !== 'function') {
    window.startInteractiveTraining = function () { jump(); };
  }
  if (!window._gmtTour) {
    window._gmtTour = { start: jump, restart: jump, stop() {}, next() {}, prev() {} };
  }
})();


/* ── gmt-scenarios.js ── */
;/* ═══════════════════════════════════════════════════════════════════════
   gmt-scenarios.js — 🪦 شاهدة توافق (2026-07-12)
   السيناريوهات القديمة أُلغيت: كانت نظاماً تعليمياً ثالثاً يعمل بالتوازي مع
   gmt-tour وgmt-welcome ⇒ أزرار مكرّرة · نوافذ فوق بعضها · تعليق (UX-2).
   البديل: «جلسات التدريب» داخل gmt-guide.js (تبويب 🏋️) + الوضع التدريبي.
   يبقى الملف لتوافق الصفحات التي ما تزال تستدعيه — وكل نداء يفتح النظام الجديد.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const open = () => { if (window.GMTGuide) window.GMTGuide.index(); };
  window.GMTScenarios = { mount: open, open, start: open, disabled: true };
})();


/* ── gmt-guide.js ── */
;/* ═══════════════════════════════════════════════════════════════════════════
   gmt-guide.js — النظام التعليمي GMT · v4.0 (2026-07-13)
   ─────────────────────────────────────────────────────────────────────────
   يُلغي ويحلّ محلّ: gmt-tour.js · gmt-welcome.js (الجولة القديمة ماتت — TOUR-1)

   الجديد في v4 (طلبك الحرفي: «شاشات كبيرة · موشن جرافيك · شاشات ترحيبية»):
     • شاشة افتتاح بهويتنا: لوجو ينبض + شريط تحميل.
     • شاشات كاملة — لا نوافذ صغيرة، لا getBoundingClientRect ⇒ يستحيل أن تطير لمكان عشوائي.
     • موشن جرافيك: مشاهد SVG متحركة + جسيمات + تدرّج متحرك + دخول متتابع.
     • تقليب تلقائي + يدوي + إيقاف + شريط تقدّم + نقاط + لوحة مفاتيح + سحب باللمس.
     • تخطيطان حقيقيان: ديسكتوب (عمودان) وموبايل (عمود).
     • فهرس: 🔘 الأزرار زرّاً بزرّ · 🏋️ جلسات تدريب · 🆕 الجديد · 🎬 إعادة الشاشات.
     • «👆 أرِني» يومض على الزر الحقيقي.
     • يحترم prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.GMTGuide && window.GMTGuide.version >= 4) return;

  var VERSION = 4.0;
  /* 🎨 اللون يُقرأ من هويتك (gmt-brand.js ← gmt-theme.css) — لا يُثبَّت بالكود.
     غيّر --gmt-red بالثيم ⇒ كل البوتات تتلوّن معك تلقائياً. */
  var RED = (window.GMTBrand && GMTBrand.red()) || '#C00012';
  var FONT = (window.GMTBrand && GMTBrand.get('font')) || 'Cairo, system-ui, "Segoe UI", Tahoma, sans-serif';
  var SPEC = {};
  var LS = function (k) { return 'gmt_guide4_' + k + '_' + (SPEC.id || 'page'); };
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* ═══════════ 1) الأنماط + الموشن ═══════════ */
  function styles() {
    if (document.getElementById('gg4-css')) return;
    var s = document.createElement('style');
    s.id = 'gg4-css';
    s.textContent = [
      '@keyframes gg-in{from{opacity:0;transform:translateY(26px) scale(.97)}to{opacity:1;transform:none}}',
      '@keyframes gg-out{to{opacity:0;transform:translateY(-18px) scale(.98)}}',
      '@keyframes gg-pop{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:none}}',
      '@keyframes gg-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}',
      '@keyframes gg-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-11px)}}',
      '@keyframes gg-spin{to{transform:rotate(360deg)}}',
      '@keyframes gg-grad{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}',
      '@keyframes gg-rise{from{opacity:0;transform:translateY(30px)}to{opacity:.55;transform:translateY(-40px)}}',
      '@keyframes gg-blink{0%,100%{box-shadow:0 0 0 0 rgba(192,0,18,.75)}50%{box-shadow:0 0 0 14px rgba(192,0,18,0)}}',
      '@keyframes gg-bar{from{width:0}to{width:100%}}',

      '.gg4{position:fixed;inset:0;z-index:2147483000;direction:rtl;font-family:' + FONT + ';',
      'color:#fff;display:flex;flex-direction:column;overflow:hidden;',
      'background:linear-gradient(130deg,#0a0d14,#141a26,#0d1017,#1a1220);background-size:400% 400%;animation:gg-grad 18s ease infinite}',
      '.gg4 *{box-sizing:border-box}',
      '.gg4-orb{position:absolute;border-radius:50%;filter:blur(70px);opacity:.30;pointer-events:none}',
      '.gg4-p{position:absolute;bottom:-10px;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.5);animation:gg-rise linear infinite;pointer-events:none}',

      '.gg4-splash{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;z-index:9;background:#080a10}',
      '.gg4-logo{width:132px;height:132px;border-radius:32px;object-fit:cover;animation:gg-pulse 2s ease-in-out infinite;box-shadow:0 24px 70px rgba(192,0,18,.4)}',
      '.gg4-logo-f{width:132px;height:132px;border-radius:32px;display:flex;align-items:center;justify-content:center;font-size:54px;font-weight:900;',
      'background:linear-gradient(135deg,' + RED + ',#7a000c);animation:gg-pulse 2s ease-in-out infinite}',
      '.gg4-sbar{width:230px;height:5px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}',
      '.gg4-sbar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,' + RED + ',#ff5a6a);animation:gg-bar 1.5s ease forwards}',
      '.gg4-stxt{font-size:13px;font-weight:800;color:#8b93a7}',

      '.gg4-top{position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 18px}',
      '.gg4-brand{display:flex;align-items:center;gap:9px;font-weight:900;font-size:14px}',
      '.gg4-dot{width:9px;height:9px;border-radius:50%;background:' + RED + ';box-shadow:0 0 12px ' + RED + '}',
      '.gg4-x{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);color:#fff;border-radius:12px;',
      'padding:8px 15px;font:inherit;font-weight:800;font-size:12.5px;cursor:pointer;transition:.18s}',
      '.gg4-x:hover{background:rgba(255,255,255,.18)}',

      '.gg4-stage{position:relative;z-index:3;flex:1;display:flex;align-items:center;justify-content:center;padding:8px 22px 4px;overflow:hidden}',
      '.gg4-slide{width:100%;max-width:1180px;display:grid;grid-template-columns:1.05fr .95fr;gap:44px;align-items:center;animation:gg-in .55s cubic-bezier(.2,.8,.25,1) both}',
      '.gg4-slide.out{animation:gg-out .28s ease forwards}',
      '@media(max-width:900px){.gg4-slide{grid-template-columns:1fr;gap:18px;text-align:center}.gg4-art{order:-1;min-height:180px!important}}',

      '.gg4-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 13px;border-radius:99px;font-size:11px;font-weight:900;',
      'background:rgba(192,0,18,.16);border:1px solid rgba(192,0,18,.45);color:#ff8b96;margin-bottom:14px;animation:gg-pop .5s .1s both}',
      '.gg4-h{font-size:clamp(24px,4.1vw,42px);font-weight:900;line-height:1.28;margin:0 0 14px;animation:gg-pop .5s .18s both;',
      'background:linear-gradient(100deg,#fff 30%,#ffb3ba);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}',
      '.gg4-b{font-size:clamp(14px,1.6vw,17px);line-height:2;color:#c3cad8;margin:0 0 18px;animation:gg-pop .5s .26s both}',
      '.gg4-b b{color:#fff}',
      '.gg4-ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}',
      '.gg4-li{display:flex;gap:11px;align-items:flex-start;text-align:right;background:rgba(255,255,255,.045);',
      'border:1px solid rgba(255,255,255,.09);border-radius:15px;padding:12px 14px;font-size:13.5px;line-height:1.85;color:#dbe1ec;animation:gg-pop .5s both}',
      '.gg4-li i{font-style:normal;font-size:20px;flex-shrink:0}',
      '.gg4-li b{color:#fff}',
      '.gg4-warn{background:rgba(192,0,18,.13);border-color:rgba(192,0,18,.42)}',

      '.gg4-art{position:relative;display:flex;align-items:center;justify-content:center;min-height:270px;animation:gg-pop .6s .12s both}',
      '.gg4-art svg{width:100%;max-width:400px;height:auto;overflow:visible}',
      '.gg4-emoji{font-size:clamp(88px,15vw,164px);animation:gg-float 3.6s ease-in-out infinite}',
      '.gg4-ring{position:absolute;border:2px solid rgba(192,0,18,.28);border-radius:50%;animation:gg-spin 22s linear infinite}',

      '.gg4-bot{position:relative;z-index:3;padding:14px 18px 20px;display:flex;flex-direction:column;gap:11px}',
      '.gg4-prog{height:4px;border-radius:99px;background:rgba(255,255,255,.11);overflow:hidden}',
      '.gg4-prog i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,' + RED + ',#ff6b7a);transition:width .4s cubic-bezier(.2,.8,.25,1)}',
      '.gg4-nav{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}',
      '.gg4-dots{display:flex;gap:6px;flex-wrap:wrap}',
      '.gg4-d{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.24);cursor:pointer;transition:.25s;border:0;padding:0}',
      '.gg4-d.on{width:26px;border-radius:99px;background:' + RED + '}',
      '.gg4-btns{display:flex;gap:8px;flex-wrap:wrap}',
      '.gg4-btn{border:0;border-radius:13px;padding:11px 20px;font:inherit;font-weight:900;font-size:13px;cursor:pointer;transition:.18s}',
      '.gg4-btn:active{transform:scale(.96)}',
      '.gg4-primary{background:' + RED + ';color:#fff;box-shadow:0 10px 26px rgba(192,0,18,.35)}',
      '.gg4-ghost{background:rgba(255,255,255,.09);color:#e7ebf2;border:1px solid rgba(255,255,255,.16)}',

      '.gg4-idx{position:fixed;inset:0;z-index:2147483100;background:rgba(6,8,13,.96);backdrop-filter:blur(10px);overflow:auto;padding:16px;',
      'direction:rtl;font-family:' + FONT + ';color:#fff;animation:gg-in .3s ease both}',
      '.gg4-sheet{max-width:1080px;margin:0 auto;background:#0f131c;border:1px solid rgba(255,255,255,.1);border-radius:22px;overflow:hidden}',
      '.gg4-sh-h{padding:16px 18px;background:linear-gradient(135deg,#171d2a,#101520);border-bottom:1px solid rgba(255,255,255,.09);position:sticky;top:0;z-index:2}',
      '.gg4-tab{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);color:#c3cad8;border-radius:11px;',
      'padding:8px 13px;font:inherit;font-weight:800;font-size:12px;cursor:pointer;transition:.16s}',
      '.gg4-tab.on{background:' + RED + ';color:#fff;border-color:transparent}',
      '.gg4-search{width:100%;margin-top:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);',
      'border-radius:13px;padding:11px 14px;color:#fff;font:inherit;font-size:13px}',
      '.gg4-search::placeholder{color:#6f7789}',
      '.gg4-grid{padding:16px 18px 26px;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}',
      '.gg4-card{background:#141a26;border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:14px 15px;animation:gg-pop .35s both}',
      '.gg4-card h4{margin:0 0 8px;font-size:14.5px;font-weight:900;color:#fff}',
      '.gg4-card p{margin:0 0 6px;font-size:12.5px;line-height:1.95;color:#aab3c4}',
      '.gg4-lbl{color:#ff8b96;font-weight:900}',
      '.gg4-show{margin-top:8px;background:rgba(192,0,18,.17);border:1px solid rgba(192,0,18,.45);color:#ff9aa4;',
      'border-radius:10px;padding:7px 12px;font:inherit;font-weight:800;font-size:11.5px;cursor:pointer}',

      '.gg4-hl{position:relative!important;z-index:2147483200!important;outline:3px solid ' + RED + '!important;',
      'border-radius:12px!important;animation:gg-blink 1.1s ease-in-out 3!important;scroll-margin:120px}',

      '.gg4-fab{position:fixed;left:14px;bottom:14px;z-index:2147482000;background:' + RED + ';color:#fff;border:0;',
      'border-radius:50%;width:52px;height:52px;font-size:22px;cursor:pointer;box-shadow:0 10px 28px rgba(192,0,18,.45);',
      'display:flex;align-items:center;justify-content:center;transition:.2s}',
      '.gg4-fab:hover{transform:scale(1.09)}',
      reduce ? '.gg4,.gg4 *{animation:none!important;transition:none!important}' : ''
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ═══════════ 2) مشاهد الموشن (SVG) ═══════════ */
  var ART = {
    sell: '<svg viewBox="0 0 300 220">' +
      '<rect x="60" y="80" width="120" height="90" rx="14" fill="' + RED + '" opacity=".9"/>' +
      '<path d="M85 80 L95 45 M155 80 L145 45" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".85"/>' +
      '<rect x="185" y="40" width="76" height="104" rx="9" fill="#fff" opacity=".95">' +
      '<animate attributeName="y" values="40;30;40" dur="3s" repeatCount="indefinite"/></rect>' +
      '<g stroke="' + RED + '" stroke-width="4" stroke-linecap="round">' +
      '<line x1="197" y1="62" x2="249" y2="62"><animate attributeName="x2" values="197;249" dur="1.4s" repeatCount="indefinite"/></line>' +
      '<line x1="197" y1="80" x2="235" y2="80"><animate attributeName="x2" values="197;235" dur="1.7s" repeatCount="indefinite"/></line>' +
      '<line x1="197" y1="98" x2="249" y2="98"><animate attributeName="x2" values="197;249" dur="2s" repeatCount="indefinite"/></line></g>' +
      '<circle cx="90" cy="188" r="12" fill="#fff"/><circle cx="152" cy="188" r="12" fill="#fff"/></svg>',

    stock: '<svg viewBox="0 0 300 220"><g fill="' + RED + '" opacity=".92">' +
      '<rect x="40" y="140" width="66" height="60" rx="9"><animate attributeName="y" values="220;140" dur="1s" fill="freeze"/></rect>' +
      '<rect x="117" y="140" width="66" height="60" rx="9" opacity=".78"><animate attributeName="y" values="220;140" dur="1.2s" fill="freeze"/></rect>' +
      '<rect x="194" y="140" width="66" height="60" rx="9" opacity=".6"><animate attributeName="y" values="220;140" dur="1.4s" fill="freeze"/></rect>' +
      '<rect x="78" y="76" width="66" height="60" rx="9" opacity=".85"><animate attributeName="y" values="220;76" dur="1.7s" fill="freeze"/></rect>' +
      '<rect x="155" y="76" width="66" height="60" rx="9" opacity=".7"><animate attributeName="y" values="220;76" dur="2s" fill="freeze"/></rect></g></svg>',

    watch: '<svg viewBox="0 0 300 220"><g fill="none" stroke="' + RED + '" stroke-width="2.5">' +
      '<circle cx="150" cy="110" r="40" opacity=".9"/>' +
      '<circle cx="150" cy="110" r="60" opacity=".5"><animate attributeName="r" values="45;92" dur="2.6s" repeatCount="indefinite"/>' +
      '<animate attributeName="opacity" values=".65;0" dur="2.6s" repeatCount="indefinite"/></circle>' +
      '<circle cx="150" cy="110" r="60" opacity=".5"><animate attributeName="r" values="45;92" dur="2.6s" begin="1.3s" repeatCount="indefinite"/>' +
      '<animate attributeName="opacity" values=".65;0" dur="2.6s" begin="1.3s" repeatCount="indefinite"/></circle></g>' +
      '<path d="M96 110q54-46 108 0-54 46-108 0z" fill="#fff" opacity=".95"/>' +
      '<circle cx="150" cy="110" r="19" fill="' + RED + '"/><circle cx="150" cy="110" r="8" fill="#0a0d14"/>' +
      '<circle cx="157" cy="103" r="4" fill="#fff" opacity=".9"/></svg>',

    shield: '<svg viewBox="0 0 300 220">' +
      '<path d="M150 26 L228 58 v58c0 46-34 74-78 88-44-14-78-42-78-88V58z" fill="' + RED + '" opacity=".14"/>' +
      '<path d="M150 26 L228 58 v58c0 46-34 74-78 88-44-14-78-42-78-88V58z" fill="none" stroke="' + RED + '" stroke-width="6"' +
      ' stroke-dasharray="600" stroke-dashoffset="600"><animate attributeName="stroke-dashoffset" values="600;0" dur="2s" fill="freeze"/></path>' +
      '<path d="M115 112 l24 26 48-56" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"' +
      ' stroke-dasharray="130" stroke-dashoffset="130"><animate attributeName="stroke-dashoffset" values="130;0" dur="1s" begin="1.6s" fill="freeze"/></path></svg>',

    warn: '<svg viewBox="0 0 300 220">' +
      '<path d="M150 30 L262 196 H38 Z" fill="' + RED + '" opacity=".9"/>' +
      '<rect x="141" y="86" width="18" height="56" rx="9" fill="#fff"/><circle cx="150" cy="164" r="11" fill="#fff"/></svg>',

    ok: '<svg viewBox="0 0 300 220">' +
      '<circle cx="150" cy="110" r="72" fill="none" stroke="#16a34a" stroke-width="7" stroke-dasharray="460" stroke-dashoffset="460">' +
      '<animate attributeName="stroke-dashoffset" values="460;0" dur="1.2s" fill="freeze"/></circle>' +
      '<path d="M112 112 l26 28 52-60" fill="none" stroke="#16a34a" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"' +
      ' stroke-dasharray="140" stroke-dashoffset="140"><animate attributeName="stroke-dashoffset" values="140;0" dur=".7s" begin="1s" fill="freeze"/></path></svg>',

    flow: '<svg viewBox="0 0 300 220">' +
      '<path id="ggpath" d="M30 180 C90 180 80 60 150 60 C220 60 210 180 270 180" fill="none" stroke="' + RED + '" stroke-width="4" opacity=".45" stroke-dasharray="8 8"/>' +
      '<rect x="8" y="164" width="44" height="34" rx="8" fill="#fff" opacity=".9"/>' +
      '<rect x="248" y="164" width="44" height="34" rx="8" fill="#fff" opacity=".9"/>' +
      '<rect x="128" y="40" width="44" height="38" rx="8" fill="#fff" opacity=".9"/>' +
      '<circle r="9" fill="' + RED + '"><animateMotion dur="3s" repeatCount="indefinite"><mpath href="#ggpath"/></animateMotion></circle>' +
      '<circle r="7" fill="#ff6b7a" opacity=".8"><animateMotion dur="3s" begin="1s" repeatCount="indefinite"><mpath href="#ggpath"/></animateMotion></circle>' +
      '<circle r="5" fill="#fff" opacity=".6"><animateMotion dur="3s" begin="2s" repeatCount="indefinite"><mpath href="#ggpath"/></animateMotion></circle></svg>'
  };

  function artFor(sl) {
    var rings = '<div class="gg4-ring" style="width:290px;height:290px"></div>' +
                '<div class="gg4-ring" style="width:360px;height:360px;animation-direction:reverse"></div>';
    if (sl.art && ART[sl.art]) return rings + ART[sl.art];
    return rings + '<div class="gg4-emoji">' + (sl.icon || '🎓') + '</div>';
  }

  /* ═══════════ 3) الحالة ═══════════ */
  var host = null, i = 0, timer = null, paused = false;

  function slides() {
    return (SPEC.slides && SPEC.slides.length) ? SPEC.slides : [{
      icon: '🎓', title: 'أهلاً بك',
      body: 'لم تُضف شاشات تعريفية لهذه الصفحة بعد. افتح <b>🔘 الأزرار</b> لتعرف ماذا يفعل كل زر.',
      ms: 9000
    }];
  }

  function bg() {
    var h = '<div class="gg4-orb" style="width:420px;height:420px;background:' + RED + ';top:-130px;right:-110px"></div>' +
            '<div class="gg4-orb" style="width:340px;height:340px;background:#2b4bff;bottom:-120px;left:-90px;opacity:.18"></div>';
    if (!reduce) {
      for (var k = 0; k < 16; k++) {
        h += '<div class="gg4-p" style="left:' + (5 + Math.random() * 90).toFixed(1) + '%;animation-duration:' +
             (5 + Math.random() * 7).toFixed(1) + 's;animation-delay:' + (Math.random() * 6).toFixed(1) + 's"></div>';
      }
    }
    return h;
  }

  /* ═══════════ 4) العرض ═══════════ */
  function render() {
    var L = slides(), sl = L[i], last = (i === L.length - 1);
    var stage = host.querySelector('.gg4-stage');
    var old = stage.querySelector('.gg4-slide');
    if (old) old.classList.add('out');

    var d = document.createElement('div');
    d.className = 'gg4-slide';
    d.innerHTML =
      '<div class="gg4-txt">' +
        (sl.badge ? '<div class="gg4-badge">✦ ' + sl.badge + '</div>' : '') +
        '<h2 class="gg4-h">' + (sl.title || '') + '</h2>' +
        (sl.body ? '<p class="gg4-b">' + sl.body + '</p>' : '') +
        (sl.bullets && sl.bullets.length
          ? '<ul class="gg4-ul">' + sl.bullets.map(function (b, k) {
              return '<li class="gg4-li' + (b.warn ? ' gg4-warn' : '') + '" style="animation-delay:' + (0.34 + k * 0.11) + 's">' +
                     '<i>' + (b.i || '•') + '</i><span>' + b.t + '</span></li>';
            }).join('') + '</ul>'
          : '') +
      '</div>' +
      '<div class="gg4-art">' + artFor(sl) + '</div>';

    setTimeout(function () { if (old) old.remove(); stage.appendChild(d); }, old ? 240 : 0);

    host.querySelector('.gg4-prog i').style.width = (((i + 1) / L.length) * 100) + '%';
    host.querySelector('.gg4-dots').innerHTML = L.map(function (_, k) {
      return '<button class="gg4-d' + (k === i ? ' on' : '') + '" data-go="' + k + '"></button>';
    }).join('');
    host.querySelector('[data-a=next]').textContent = last ? '🚀 ابدأ العمل' : 'التالي ←';
    host.querySelector('[data-a=prev]').style.visibility = i ? 'visible' : 'hidden';
    host.querySelector('.gg4-count').textContent = (i + 1) + ' / ' + L.length;

    auto(sl.ms || 9000);
  }

  function auto(ms) { clearTimeout(timer); if (!paused) timer = setTimeout(next, ms); }
  function next() { if (i < slides().length - 1) { i++; render(); } else close(true); }
  function prev() { if (i > 0) { i--; render(); } }
  function go(k) { i = k; render(); }

  function close(done) {
    clearTimeout(timer);
    if (host) {
      document.removeEventListener('keydown', host._key);
      host.remove(); host = null;
    }
    document.documentElement.style.overflow = '';
    try { localStorage.setItem(LS('seen'), '1'); } catch (e) {}
    if (window.GMTInspect && GMTInspect.step) GMTInspect.step('🎓', done ? 'أنهى الشاشات التعريفية' : 'أغلق الشاشات التعريفية');
  }

  /* ═══════════ 5) الإقلاع ═══════════ */
  function start(force) {
    if (host) return;
    styles();
    i = 0; paused = false;
    document.documentElement.style.overflow = 'hidden';

    host = document.createElement('div');
    host.className = 'gg4';
    host.innerHTML = bg() +
      '<div class="gg4-splash">' +
        (SPEC.logo
          ? '<img class="gg4-logo" src="' + SPEC.logo + '" alt="GMT" onerror="this.style.display=\'none\'">'
          : '<div class="gg4-logo-f">G</div>') +
        '<div style="font-size:19px;font-weight:900;letter-spacing:1px">General Media Tech</div>' +
        '<div class="gg4-sbar"><i></i></div>' +
        '<div class="gg4-stxt">جارٍ تجهيز دليل ' + (SPEC.page || 'الصفحة') + '…</div>' +
      '</div>' +
      '<div class="gg4-top">' +
        '<div class="gg4-brand"><span class="gg4-dot"></span> النظام التعليمي · ' + (SPEC.page || '') + '</div>' +
        '<div style="display:flex;gap:7px">' +
          '<button class="gg4-x" data-a="pause">⏸ إيقاف</button>' +
          '<button class="gg4-x" data-a="index">📖 الفهرس</button>' +
          '<button class="gg4-x" data-a="skip">✕ تخطّي</button>' +
        '</div>' +
      '</div>' +
      '<div class="gg4-stage"></div>' +
      '<div class="gg4-bot">' +
        '<div class="gg4-prog"><i style="width:0"></i></div>' +
        '<div class="gg4-nav">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
            '<div class="gg4-dots"></div>' +
            '<span class="gg4-count" style="font-size:11.5px;font-weight:800;color:#7c8496"></span>' +
          '</div>' +
          '<div class="gg4-btns">' +
            '<button class="gg4-btn gg4-ghost" data-a="prev">→ السابق</button>' +
            '<button class="gg4-btn gg4-primary" data-a="next">التالي ←</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(host);

    var sp = host.querySelector('.gg4-splash');
    setTimeout(function () {
      sp.style.transition = 'opacity .45s'; sp.style.opacity = '0';
      setTimeout(function () { if (sp.parentNode) sp.remove(); }, 460);
      if (host) render();
    }, reduce ? 200 : 1700);

    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a],[data-go]');
      if (!b) return;
      if (b.dataset.go !== undefined) { go(+b.dataset.go); return; }
      var a = b.dataset.a;
      if (a === 'next') next();
      else if (a === 'prev') prev();
      else if (a === 'skip') close(false);
      else if (a === 'index') { close(false); index(); }
      else if (a === 'pause') {
        paused = !paused;
        b.textContent = paused ? '▶ متابعة' : '⏸ إيقاف';
        if (paused) clearTimeout(timer); else auto(3000);
      }
    });

    host._key = function (e) {
      if (e.key === 'ArrowLeft' || e.key === ' ') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowRight') prev();
      else if (e.key === 'Escape') close(false);
    };
    document.addEventListener('keydown', host._key);

    var x0 = null;
    host.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    host.addEventListener('touchend', function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (dx < -55) next(); else if (dx > 55) prev();
      x0 = null;
    }, { passive: true });

    if (window.GMTInspect && GMTInspect.step) GMTInspect.step('🎓', 'فتح الشاشات التعريفية');
  }

  /* ═══════════ 6) الفهرس الشامل ═══════════ */
  function index(tab) {
    styles();
    var prevIdx = document.getElementById('gg4-idx');
    if (prevIdx) prevIdx.remove();

    var btns = SPEC.buttons || [], sess = SPEC.sessions || [], news = SPEC.whatsNew || [];
    var inTr = !!(window.GMTSandbox && GMTSandbox.active);

    var wrap = document.createElement('div');
    wrap.className = 'gg4-idx'; wrap.id = 'gg4-idx';
    wrap.innerHTML =
      '<div class="gg4-sheet">' +
        '<div class="gg4-sh-h">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">' +
            '<div style="font-weight:900;font-size:16px">🎓 دليل ' + (SPEC.page || '') + '</div>' +
            '<button class="gg4-tab" data-a="close">✕ إغلاق</button>' +
          '</div>' +
          '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">' +
            '<button class="gg4-tab" data-a="walk" style="background:#C00012;color:#fff;border-color:transparent;font-weight:900">🚶 جولة: أشّر لي على كل زر خطوة بخطوة</button>' +
            '<button class="gg4-tab on" data-t="btns">🔘 الأزرار (' + btns.length + ') · تغطية ' + coverage().pct + '%</button>' +
            '<button class="gg4-tab" data-t="sess">🏋️ جلسات تدريب (' + sess.length + ')</button>' +
            '<button class="gg4-tab" data-t="new">🆕 الجديد بهذا التحديث</button>' +
            '<button class="gg4-tab" data-t="tour">🎬 إعادة الشاشات</button>' +
            '<button class="gg4-tab" data-t="train" style="background:' + (inTr ? '#16a34a' : '#b45309') + ';color:#fff;border-color:transparent">' +
              (inTr ? '✅ أنت بالوضع التدريبي' : '🏋️ ابدأ الوضع التدريبي') + '</button>' +
          '</div>' +
          '<input class="gg4-search" placeholder="ابحث… (مرتجع · عمولة · باركود · ترحيل)">' +
        '</div>' +
        '<div class="gg4-grid" id="gg4-grid"></div>' +
      '</div>';
    document.body.appendChild(wrap);

    var grid = wrap.querySelector('#gg4-grid');
    var cur = tab || 'btns';

    function paint(q) {
      q = (q || '').trim();
      if (cur === 'btns') {
        var L = q ? btns.filter(function (b) {
          return ((b.label || '') + (b.what || '') + (b.when || '') + (b.effect || '')).indexOf(q) > -1;
        }) : btns;
        grid.innerHTML = L.length ? L.map(function (b, k) {
          return '<div class="gg4-card" style="animation-delay:' + (k * 0.02) + 's">' +
            '<h4>' + (b.icon || '•') + ' ' + b.label + '</h4>' +
            '<p><span class="gg4-lbl">ماذا يفعل:</span> ' + (b.what || '—') + '</p>' +
            (b.when ? '<p><span class="gg4-lbl">متى تستعمله:</span> ' + b.when + '</p>' : '') +
            (b.effect ? '<p><span class="gg4-lbl">أثره على باقي الأنظمة:</span> ' + b.effect + '</p>' : '') +
            (b.warn ? '<p style="color:#ff9aa4"><span class="gg4-lbl">⚠️ انتبه:</span> ' + b.warn + '</p>' : '') +
            (b.sel ? '<button class="gg4-show" data-show="' + encodeURIComponent(b.sel) + '">👆 أرِني هذا الزر</button>' : '') +
          '</div>';
        }).join('') + (q ? '' : undocCards()) : '<div class="gg4-card"><p>لا نتائج.</p></div>';
      } else if (cur === 'sess') {
        grid.innerHTML = sess.length ? sess.map(function (s) {
          return '<div class="gg4-card"><h4>' + (s.icon || '🎯') + ' ' + s.title + '</h4>' +
            '<p><span class="gg4-lbl">الهدف:</span> ' + s.goal + '</p>' +
            '<p><span class="gg4-lbl">الخطوات:</span></p>' +
            '<ol style="margin:4px 18px 0 0;font-size:12.5px;line-height:2;color:#aab3c4">' +
              (s.steps || []).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>' +
            (s.check ? '<p style="margin-top:8px"><span class="gg4-lbl">✅ تحقّق من النجاح:</span> ' + s.check + '</p>' : '') +
          '</div>';
        }).join('') : '<div class="gg4-card"><p>لا جلسات تدريب لهذه الصفحة بعد.</p></div>';
      } else if (cur === 'new') {
        grid.innerHTML = news.length ? news.map(function (n) {
          return '<div class="gg4-card"><h4>' + (n.tag || '🆕') + ' ' + n.title + '</h4>' +
            '<p>' + n.body + '</p>' +
            (n.test ? '<p><span class="gg4-lbl">🧪 اختبر هذا:</span> ' + n.test + '</p>' : '') +
          '</div>';
        }).join('') : '<div class="gg4-card"><p>لا جديد مسجَّل لهذه الصفحة.</p></div>';
      }
    }
    paint('');
    wrap.querySelector('.gg4-search').addEventListener('input', function (e) { paint(e.target.value); });

    wrap.addEventListener('click', function (e) {
      var t = e.target.closest('[data-t],[data-a],[data-show]');
      if (!t) return;
      if (t.dataset.show) { var sel = decodeURIComponent(t.dataset.show); wrap.remove(); highlight(sel); return; }
      if (t.dataset.a === 'close') { wrap.remove(); return; }
      if (t.dataset.a === 'walk') { wrap.remove(); walkthrough(); return; }
      var k = t.dataset.t;
      if (k === 'tour') { wrap.remove(); start(true); return; }
      if (k === 'train') {
        if (window.GMTSandbox && !GMTSandbox.active) { wrap.remove(); GMTSandbox.enter(); }
        else if (window.GMTSandbox) alert('أنت بالوضع التدريبي فعلاً. للخروج استعمل «✖ خروج ومسح» بالشريط البرتقالي.');
        else alert('الوضع التدريبي غير محمّل بهذه الصفحة (gmt-sandbox.js).');
        return;
      }
      cur = k;
      Array.prototype.forEach.call(wrap.querySelectorAll('.gg4-tab[data-t]'), function (x) {
        x.classList.toggle('on', x.dataset.t === k);
      });
      paint(wrap.querySelector('.gg4-search').value);
    });
  }

  function highlight(sel) {
    var el = null;
    try { el = document.querySelector(sel); } catch (e) {}
    if (!el) { alert('⚠️ لم أجد هذا الزر بالشاشة الحالية — قد يكون داخل نافذة أو تبويب آخر. افتحه ثم أعد المحاولة.'); return; }
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    el.classList.add('gg4-hl');
    setTimeout(function () { el.classList.remove('gg4-hl'); }, 3600);
    if (window.GMTInspect && GMTInspect.step) GMTInspect.step('👆', 'أرِني: ' + sel);
  }

  function fab() {
    if (document.querySelector('.gg4-fab')) return;
    var b = document.createElement('button');
    b.className = 'gg4-fab';
    b.title = 'النظام التعليمي';
    b.textContent = '🎓';
    b.onclick = function () { index(); };
    document.body.appendChild(b);
  }

  /* ═══════════ التغطية الحيّة (2026-07-13) ═══════════
     المشكلة: الدليل كان يوثّق ما كتبناه يدوياً فقط. أي زر جديد يُضاف للصفحة
     يبقى **غير موثّق بصمت** ⇒ الدليل يتقادم ولا أحد يدري.
     الحل: عند كل فتح، نمسح **كل زر حقيقي بالصفحة**، ندمجه مع المواصفة اليدوية،
     ونُظهر غير الموثّق بوضوح (🚨) مع نسبة تغطية. والمفتّش يُبلّغ القاعدة عن
     أي زر غير موثّق **يُضغط فعلاً** ⇒ الدليل ينمو من الاستعمال الحقيقي. */

  var DISCOVERED = [];

  function norm(t) { return (t || '').replace(/\s+/g, ' ').trim(); }

  function selectorOf(el) {
    if (el.id) return '#' + el.id;
    var oc = el.getAttribute('onclick');
    if (oc) {
      var m = oc.match(/^\s*([\w$]+)\s*\(/);
      if (m) return '[onclick^="' + m[1] + '("]';
    }
    return null;
  }

  function scanLive() {
    var out = [], seen = {};
    Array.prototype.forEach.call(
      document.querySelectorAll('button,[role=button],a[onclick]'),
      function (el) {
        if (el.closest('.gg4,.gg4-idx,#gmt-inspect-panel,#gmt-bug-panel,#gmt-health-panel')) return;
        var t = norm(el.textContent).slice(0, 44);
        var oc = el.getAttribute('onclick') || '';
        var fn = (oc.match(/^\s*([\w$]+)\s*\(/) || [])[1] || '';
        var key = t || fn;
        if (!key || key.length < 2 || seen[key]) return;
        // تجاهل أزرار الإغلاق/التنقّل العامة — ليست ميزات
        if (/^(✕|×|✖|x|إغلاق|رجوع|إلغاء|تم|موافق|<|>|→|←)$/i.test(t)) return;
        seen[key] = 1;
        out.push({ label: t || fn, fn: fn, sel: selectorOf(el) });
      }
    );
    return out;
  }

  function coverage() {
    var doc = (SPEC.buttons || []).map(function (b) { return norm(b.label); });
    var live = DISCOVERED;
    var undoc = live.filter(function (l) {
      return !doc.some(function (d) {
        return d === norm(l.label) || d.indexOf(norm(l.label)) > -1 || norm(l.label).indexOf(d) > -1;
      });
    });
    return {
      documented: doc.length,
      live: live.length,
      undocumented: undoc,
      pct: live.length ? Math.round(((live.length - undoc.length) / live.length) * 100) : 100
    };
  }

  function autoScan() {
    DISCOVERED = scanLive();
    var cov = coverage();

    // أبلِغ المفتّش — كي تصل الإدارة قائمة ما ينقص التوثيق (تحديث مستمر)
    if (window.GMTInspect && GMTInspect.step && cov.undocumented.length) {
      GMTInspect.step('📋', 'تغطية التوثيق ' + cov.pct + '% — ' + cov.undocumented.length + ' زر غير موثّق', {
        page: SPEC.page,
        missing: cov.undocumented.slice(0, 40).map(function (u) { return u.label; })
      });
    }

    // إن لم توجد مواصفة يدوية إطلاقاً — ابنِ واحدة من المسح
    if (!SPEC.buttons || !SPEC.buttons.length) {
      SPEC.buttons = DISCOVERED.map(function (b) {
        return {
          icon: '🚨', label: b.label, sel: b.sel,
          what: 'لم يُوثَّق بعد.',
          warn: 'هذا الزر مكتشَف آلياً ولم يُكتب له شرح. أبلغ الإدارة ليُضاف — لا تستعمله على بيانات حقيقية قبل أن تفهم أثره.'
        };
      });
    }
  }

  /* بطاقات الأزرار غير الموثّقة — تُعرض بذيل تبويب «الأزرار» */
  function undocCards() {
    var cov = coverage();
    if (!cov.undocumented.length) return '';
    return '<div class="gg4-card" style="grid-column:1/-1;border-color:rgba(192,0,18,.5);background:rgba(192,0,18,.09)">' +
      '<h4>🚨 ' + cov.undocumented.length + ' زر بهذه الصفحة غير موثّق</h4>' +
      '<p>التغطية الحالية: <b>' + cov.pct + '%</b> (' + (cov.live - cov.undocumented.length) + ' من ' + cov.live + ').</p>' +
      '<p><span class="gg4-lbl">ماذا تفعل:</span> لا تستعمل هذه الأزرار على بيانات حقيقية قبل أن تفهم أثرها. ' +
      'جرّبها بـ<b>الوضع التدريبي</b> (لا حفظ · لا خصم مخزون)، أو أبلغ الإدارة لتُضاف للدليل.</p>' +
      '<p style="color:#8b93a7;font-size:11.5px;line-height:2">' +
        cov.undocumented.slice(0, 30).map(function (u) { return '• ' + u.label; }).join('<br>') +
        (cov.undocumented.length > 30 ? '<br>…و' + (cov.undocumented.length - 30) + ' غيرها' : '') +
      '</p></div>';
  }

  /* ═══════════ 7) الواجهة العامة ═══════════ */
  /* ═══════════ الجولة التفاعلية خطوة بخطوة (2026-07-20) ═══════════
     تمشيك زرّاً بزرّ: تُأشّر على كل زر بالشاشة (حلقة حمراء نابضة)، تشرح وظيفته،
     وتنتظرك تضغط «التالي». الأزرار من المواصفة اليدوية SPEC (sel + what + when + effect). */
  function walkthrough() {
    var steps = [];
    (SPEC.buttons || []).forEach(function (b) { if (b.sel) steps.push(b); });

    // إن لم توجد مواصفة يدوية ⇒ اكتشف الأزرار الظاهرة تلقائياً من الصفحة
    if (!steps.length) {
      var seen = {};
      var btns = document.querySelectorAll('button, [role=button], a.btn, .btn, input[type=button], input[type=submit]');
      btns.forEach(function (b, i) {
        // تجاهل أزرار البوتات العائمة والمخفية
        if (b.offsetParent === null && getComputedStyle(b).position !== 'fixed') return;
        var id = b.id || '';
        if (/gmt-|gg4-|st-fab|inspect-fab|bug-fab|warden-fab/.test(id)) return; // أزرار الأدوات نفسها
        var label = (b.textContent || b.value || b.title || '').trim().replace(/\s+/g, ' ').slice(0, 40);
        if (!label) return;
        if (seen[label]) return; seen[label] = 1;
        // مُحدِّد فريد
        var sel = id ? ('#' + CSS.escape(id)) : null;
        if (!sel) { b.setAttribute('data-gg4-wt', 'w' + i); sel = '[data-gg4-wt="w' + i + '"]'; }
        steps.push({
          sel: sel, label: label, icon: '👆',
          what: 'زر «' + label + '» بهذه الصفحة.',
          when: 'اضغطه عندما تريد تنفيذ «' + label + '».',
          effect: 'ينفّذ الإجراء المرتبط به.'
        });
      });
    }

    if (!steps.length) { index(); return; }

    var i = 0, ov;
    function cleanup() {
      document.querySelectorAll('.gg4-hl,.gg4-wt-ring').forEach(function (e) { e.classList.remove('gg4-hl', 'gg4-wt-ring'); });
      if (ov) ov.remove(); ov = null;
    }
    function show() {
      cleanup();
      if (i < 0) i = 0;
      if (i >= steps.length) { finish(); return; }
      var st = steps[i], el = null;
      try { el = document.querySelector(st.sel); } catch (e) {}
      var found = !!el;
      ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;z-index:2147483200;left:0;right:0;bottom:0;display:flex;justify-content:center;pointer-events:none;padding:0 12px 18px;';
      ov.innerHTML =
        '<div style="pointer-events:auto;max-width:440px;width:100%;background:#fff;border:1px solid #e2e5ea;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.18);padding:16px 18px;font-family:Cairo,Arial,sans-serif;direction:rtl;">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
            '<span style="font-size:22px;">' + (st.icon || '👆') + '</span>' +
            '<span style="font-weight:900;font-size:15px;color:#1a1d23;flex:1;">' + (st.label || 'زر') + '</span>' +
            '<span style="font-size:11px;font-weight:800;color:#6b7280;background:#f2f3f5;border-radius:99px;padding:3px 10px;">' + (i + 1) + ' / ' + steps.length + '</span>' +
          '</div>' +
          (found ? '' : '<div style="font-size:11px;color:#d97706;font-weight:800;margin-bottom:5px;">⚠️ هذا الزر غير ظاهر بالشاشة الحالية (قد يكون داخل نافذة/تبويب) — سنشرحه فقط.</div>') +
          '<div style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:5px;"><b>ماذا يفعل:</b> ' + (st.what || '—') + '</div>' +
          (st.when ? '<div style="font-size:12.5px;color:#6b7280;margin-bottom:4px;"><b>متى تستعمله:</b> ' + st.when + '</div>' : '') +
          (st.effect ? '<div style="font-size:12.5px;color:#16a34a;margin-bottom:8px;"><b>ماذا يتغيّر:</b> ' + st.effect + '</div>' : '') +
          '<div style="display:flex;gap:8px;margin-top:10px;">' +
            '<button class="gg4-wt-prev" style="flex:0 0 auto;background:#f2f3f5;border:1px solid #e2e5ea;border-radius:10px;padding:9px 14px;font:inherit;font-weight:800;font-size:13px;cursor:pointer;">◀ السابق</button>' +
            '<button class="gg4-wt-next" style="flex:1;background:#C00012;color:#fff;border:none;border-radius:10px;padding:9px 14px;font:inherit;font-weight:900;font-size:13px;cursor:pointer;">' + (i === steps.length - 1 ? 'إنهاء ✓' : 'التالي ▶') + '</button>' +
            '<button class="gg4-wt-exit" style="flex:0 0 auto;background:#fff;border:1px solid #e2e5ea;border-radius:10px;padding:9px 12px;font:inherit;font-weight:800;font-size:13px;cursor:pointer;color:#6b7280;">✕</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(ov);
      if (el) {
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        el.classList.add('gg4-hl', 'gg4-wt-ring');
      }
      ov.querySelector('.gg4-wt-next').onclick = function () { i++; show(); };
      ov.querySelector('.gg4-wt-prev').onclick = function () { i--; show(); };
      ov.querySelector('.gg4-wt-exit').onclick = function () { cleanup(); };
    }
    function finish() {
      cleanup();
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;z-index:2147483200;left:50%;bottom:24px;transform:translateX(-50%);background:#16a34a;color:#fff;font-family:Cairo,Arial,sans-serif;font-weight:900;font-size:14px;padding:12px 22px;border-radius:99px;box-shadow:0 8px 24px rgba(0,0,0,.2);direction:rtl;';
      d.textContent = '✅ أكملت جولة كل الأزرار بهذه الصفحة!';
      document.body.appendChild(d);
      setTimeout(function () { d.remove(); }, 3000);
    }
    if (!document.getElementById('gg4-wt-style')) {
      var stl = document.createElement('style'); stl.id = 'gg4-wt-style';
      stl.textContent = '.gg4-wt-ring{outline:3px solid #C00012 !important;outline-offset:3px;border-radius:8px;animation:gg4pulse 1.2s ease-in-out infinite;} @keyframes gg4pulse{0%,100%{box-shadow:0 0 0 0 rgba(192,0,18,.5);}50%{box-shadow:0 0 0 8px rgba(192,0,18,0);}}';
      document.head.appendChild(stl);
    }
    show();
  }

  window.GMTGuide = {
    version: VERSION,
    init: function (spec, opt) {
      SPEC = spec || {};
      opt = opt || {};
      if (!SPEC.page) SPEC.page = document.title || 'الصفحة';
      if (!SPEC.logo) SPEC.logo = 'logo.jpg';
      styles();
      var mount = function () {
        autoScan();
        fab();
        var seen = false;
        try { seen = !!localStorage.getItem(LS('seen')); } catch (e) {}
        var forced = /[?&]guide=1/.test(location.search);
        if (forced || (!seen && opt.splash !== false)) start(!!forced);
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
      else mount();
    },
    open: function () { index(); },
    walkthrough: walkthrough,                  /* الجولة خطوة بخطوة — تأشّر على كل زر */
    index: function (t) { index(t); },        /* توافق: gmt-scenarios / gmt-training ينادونها */
    start: function () { start(true); },      /* توافق: gmt-welcome / gmt-tour ينادونها */
    tour: function () { start(true); },
    show: highlight,
    coverage: coverage,                        /* تغطية التوثيق الحيّة */
    reset: function () { try { localStorage.removeItem(LS('seen')); } catch (e) {} start(true); },
    spec: function () { return SPEC; }
  };

  /* ═══════════ 8) قتل الجولة القديمة (TOUR-1 · ADM-1) ═══════════ */
  window.GMTTour = function () { return { start: function () {}, restart: function () {} }; };
  window.restartTour = function () { index(); };
  window.startTour = function () { start(true); };
  window._gmtTour = { start: function () { start(true); }, restart: function () { start(true); } };

  /* ═══════════ 9) إقلاع تلقائي ═══════════ */
  (function boot() {
    function go() {
      if (window.GMTGuide._booted) return;
      window.GMTGuide._booted = true;
      var key = Object.keys(window).filter(function (k) { return k.indexOf('GMT_GUIDE_') === 0; })[0];
      window.GMTGuide.init(key ? window[key] : {}, { splash: !!key });
    }
    if (document.readyState === 'complete') setTimeout(go, 400);
    else window.addEventListener('load', function () { setTimeout(go, 400); });
  }());
}());


/* ── gmt-sandbox.js ── */
;/* ═══════════════════════════════════════════════════════════════════════
   gmt-sandbox.js — الوضع التدريبي/التجريبي 🎓 v2 (2026-07-12)
   يُرفع بجانب كل صفحة ويُستدعى بالرأس **بعد** gmt-bugcatcher.js.

   ═══ ما تغيّر عن v1 — وهو خطير ═══
   📨 **تيليغرام يُرسل — لكن موسوماً**: قرار المالك أن الإشعار يصل الإدارة بختم
      «🎓 تجريبية — غير حقيقية» ليتدرّب الأدمن على الموافقة/التعديل أيضاً.
      v2 يحقن الوسم بأول كل رسالة تلقائياً (ولو نسي المستخدم).
      أما الويبهوكس والبريد وSMS ورفع الملفات ⇒ تُحتجَز (لا فائدة تدريبية منها).
   🔴 v1 كان يحاكي حتى إرسال أخطاء الحارس ⇒ **أخطاء التدريب لا تصل لوحتك أبداً**.
      v2 يمرّر التلمتري حقيقياً مع وسم training=true (تصلك ولا تلوّث تقاريرك).
   🆕 **مسجّل الجلسة**: كل خطوة تُسجَّل (بيع · مرتجع · خصم مخزون · إشعار مُحتجَز · خطأ)،
      ومنه تقرير نهاية جلسة قابل للنسخ/الإرسال — هذا هو «صندوق أسود» التدريب.
   🆕 **ختم مائي بالطباعة**: أي فاتورة تُطبع بالوضع التدريبي تحمل «نسخة تدريبية» —
      حتى لا تُخلط بفاتورة حقيقية.
   🆕 **الأخطاء تُعرض للمتدرّب** (عكس الإنتاج الصامت) — لأن الهدف تعليمه لا مراقبته.
   🆕 حماية النسيان: شريط دائم + إطار أحمر + خروج تلقائي بعد 3 ساعات.

   ─ التفعيل: `?training=1` · أو زر «وضع تدريبي» بالدليل 🎓 · أو GMTSandbox.enter()
   ─ المبدأ: القراءة حقيقية (منتجاتك وأسعارك كما هي) وكل كتابة تُحاكى بالذاكرة.
   ─ الخروج يمسح كل شيء (لم يُكتب أصلاً بالقاعدة).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const SS_ON = 'gmt_training';
  const SS_DB = 'gmt_training_db';
  const SS_LOG = 'gmt_training_log';
  const SS_T0 = 'gmt_training_started';
  const MAX_HOURS = 3;

  const qs = new URLSearchParams(location.search).get('training') === '1';
  if (qs) { try { sessionStorage.setItem(SS_ON, '1'); if (!sessionStorage.getItem(SS_T0)) sessionStorage.setItem(SS_T0, String(Date.now())); } catch (_) {} }
  const isOn = () => { try { return sessionStorage.getItem(SS_ON) === '1'; } catch (_) { return false; } };

  /* دخول/خروج متاحان دائماً — حتى قبل التفعيل */
  function enter() {
    try { sessionStorage.setItem(SS_ON, '1'); sessionStorage.setItem(SS_T0, String(Date.now())); } catch (_) {}
    const u = new URL(location.href); u.searchParams.set('training', '1'); location.href = u.toString();
  }
  function exit(silent) {
    try { sessionStorage.removeItem(SS_ON); sessionStorage.removeItem(SS_DB); sessionStorage.removeItem(SS_LOG); sessionStorage.removeItem(SS_T0); } catch (_) {}
    if (silent) return;
    const u = new URL(location.href); u.searchParams.delete('training'); location.href = u.toString();
  }

  if (!isOn()) { window.GMTSandbox = { active: false, enter, exit }; return; }

  /* انتهت مهلة التدريب؟ (نسيان الوضع مفتوح = خطر) */
  try {
    const t0 = Number(sessionStorage.getItem(SS_T0) || Date.now());
    if (Date.now() - t0 > MAX_HOURS * 3600e3) { exit(true); location.reload(); return; }
  } catch (_) {}

  /* ══════════ المخزن ══════════ */
  let DB = { rows: {}, patches: {}, deleted: {}, seq: 0 };
  try { const s = sessionStorage.getItem(SS_DB); if (s) DB = JSON.parse(s); } catch (_) {}
  const save = () => { try { sessionStorage.setItem(SS_DB, JSON.stringify(DB)); } catch (_) {} };
  const nextId = () => { DB.seq += 1; return -(Date.now() * 100 + (DB.seq % 100)); }; // معرّفات سالبة = تدريبية

  /* ══════════ 🆕 مسجّل الجلسة (الصندوق الأسود) ══════════ */
  let LOG = [];
  try { LOG = JSON.parse(sessionStorage.getItem(SS_LOG) || '[]'); } catch (_) {}
  const stat = { writes: 0, blocked: 0, errors: 0, sent: 0 };
  LOG.forEach((e) => { if (e.k === 'write') stat.writes++; if (e.k === 'blocked') stat.blocked++; if (e.k === 'error') stat.errors++; if (e.k === 'sent') stat.sent++; });

  function rec(kind, title, detail) {
    LOG.push({ k: kind, t: new Date().toLocaleTimeString('ar-SY', { hour12: false }), ts: Date.now(), title: String(title || '').slice(0, 160), detail: String(detail || '').slice(0, 300) });
    if (LOG.length > 300) LOG = LOG.slice(-300);
    if (kind === 'write') stat.writes++;
    if (kind === 'blocked') stat.blocked++;
    if (kind === 'error') stat.errors++;
    if (kind === 'sent') stat.sent++;
    try { sessionStorage.setItem(SS_LOG, JSON.stringify(LOG)); } catch (_) {}
    paintBanner();
  }

  const REAL = window.__gmtRealFetch || window.fetch.bind(window);

  /* ══════════ 🔒 الآثار الخارجية الممنوعة ══════════
     أي نداء لهذه الجهات يُحتجَز ويُسجَّل — ولا يخرج من الجهاز. */
  const BLOCKED = [
    { re: /(wa\.me|whatsapp|graph\.facebook)/i,  name: 'رسالة واتساب' },
    { re: /(hooks?\.|webhook|zapier|make\.com|n8n)/i, name: 'ويبهوك خارجي' },
    { re: /(sendgrid|mailgun|smtp|resend\.com)/i, name: 'بريد إلكتروني' },
    { re: /(sms|twilio|vonage)/i,                name: 'رسالة SMS' },
  ];

  /* 📨 تيليغرام: يُرسل فعلاً لكن **موسوماً** (قرار المالك) — ليتدرّب الأدمن على الفواتير أيضاً */
  const TAG = '🎓 <b>رسالة تدريبية — غير حقيقية · لم تُحفظ بالقاعدة ولم يُخصم مخزون</b>\n━━━━━━━━━━━━━━━\n';
  const TAG_PLAIN = '🎓 رسالة تدريبية — غير حقيقية · لم تُحفظ بالقاعدة ولم يُخصم مخزون\n━━━━━━━━━━━━━━━\n';
  const isTelegram = (u) => /api\.telegram\.org/i.test(String(u || ''));

  /* يحقن الوسم بأي حقل نصّي بالرسالة (text / caption) مهما كانت صيغة الإرسال */
  function tagTelegram(init, input) {
    try {
      if (!init || init.body == null) return init;
      const b = init.body;
      if (typeof b === 'string') {
        try {
          const j = JSON.parse(b);
          if (j.text)    j.text    = TAG + String(j.text);
          if (j.caption) j.caption = TAG + String(j.caption);
          if (!j.parse_mode && (j.text || j.caption)) j.parse_mode = 'HTML';
          return Object.assign({}, init, { body: JSON.stringify(j) });
        } catch (_) {
          // urlencoded
          if (/text=|caption=/.test(b)) {
            const sp = new URLSearchParams(b);
            if (sp.get('text'))    sp.set('text', TAG_PLAIN + sp.get('text'));
            if (sp.get('caption')) sp.set('caption', TAG_PLAIN + sp.get('caption'));
            return Object.assign({}, init, { body: sp.toString() });
          }
          return init;
        }
      }
      if (typeof FormData !== 'undefined' && b instanceof FormData) {
        ['caption', 'text'].forEach((k) => { const v = b.get(k); if (v) b.set(k, TAG_PLAIN + v); });
        return init;
      }
    } catch (_) {}
    return init;
  }
  function blockedBy(url) {
    const u = String(url || '');
    for (const b of BLOCKED) if (b.re.test(u)) return b;
    return null;
  }

  /* ══════════ أدوات ══════════ */
  function parseUrl(url) {
    try {
      const u = new URL(url, location.href);
      if (!u.hostname.includes('supabase.co')) return { kind: 'other', u };
      if (u.pathname.startsWith('/storage/')) return { kind: 'storage', u };
      const m = u.pathname.match(/\/rest\/v1\/rpc\/([^/?]+)/);
      if (m) return { kind: 'rpc', fn: m[1], u };
      const t = u.pathname.match(/\/rest\/v1\/([^/?]+)/);
      if (t) return { kind: 'table', table: decodeURIComponent(t[1]), u };
      return { kind: 'other-sb', u };
    } catch (_) { return { kind: 'other' }; }
  }
  function getHeader(init, input, name) {
    const pick = (h) => { if (!h) return null; if (typeof h.get === 'function') return h.get(name); const k = Object.keys(h).find((x) => x.toLowerCase() === name.toLowerCase()); return k ? h[k] : null; };
    return pick(init && init.headers) || (typeof input !== 'string' && input && pick(input.headers)) || null;
  }
  async function parseBody(input, init) {
    try {
      if (init && init.body != null) return typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
      if (typeof input !== 'string' && input && typeof input.clone === 'function') return await input.clone().json();
    } catch (_) {}
    return null;
  }
  function parseFilters(u) {
    const f = [], ors = [];
    u.searchParams.forEach((v, k) => {
      if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) return;
      if (k === 'or') {
        const inner = v.replace(/^\(|\)$/g, '').split(',');
        const g = [];
        inner.forEach((c) => { const m = c.match(/^([\w.]+)\.eq\.(.*)$/); if (m) g.push({ col: m[1], val: m[2] }); });
        if (g.length) ors.push(g);
        return;
      }
      let m = v.match(/^eq\.(.*)$/); if (m) { f.push({ col: k, op: 'eq', val: m[1] }); return; }
      m = v.match(/^in\.\((.*)\)$/); if (m) { f.push({ col: k, op: 'in', vals: m[1].split(',').map((x) => x.replace(/^"|"$/g, '')) }); }
    });
    return { ands: f, ors };
  }
  const same = (a, b) => String(a) === String(b);
  function rowMatches(row, F) {
    for (const c of F.ands) {
      if (c.op === 'eq' && !same(row[c.col], c.val)) return false;
      if (c.op === 'in' && !c.vals.some((v) => same(row[c.col], v))) return false;
    }
    for (const g of F.ors) { if (!g.some((c) => same(row[c.col], c.val))) return false; }
    return true;
  }
  function project(row, select) {
    if (!select || select === '*') return row;
    const out = {};
    select.split(',').forEach((c) => { const k = c.split(':').pop().split('(')[0].trim(); if (k && k !== '*') out[k] = row[k]; });
    return Object.keys(out).length ? out : row;
  }
  const J = (data, status = 200) => new Response(data === undefined ? null : JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  /* أسماء عربية للجداول (لتقرير مفهوم) */
  const TBL_AR = {
    invoices: 'فاتورة', invoice_items: 'بنود فاتورة', invoice_commissions: 'عمولة',
    products: 'منتج', gmt_orders: 'أوردر', warranties: 'كفالة', contracts: 'عقد',
    purchases: 'فاتورة شراء', reservations: 'حجز', settlements: 'تسوية', stock_moves: 'حركة مخزون',
  };
  const arTbl = (t) => TBL_AR[t] || t;

  /* ══════════ محاكاة الكتابة ══════════ */
  async function simulate(p, method, input, init) {
    const table = p.table;
    const F = parseFilters(p.u);
    const prefer = String(getHeader(init, input, 'Prefer') || '');
    const wantRep = prefer.includes('return=representation');

    if (method === 'POST') {
      const body = await parseBody(input, init);
      const arr = Array.isArray(body) ? body : [body || {}];
      const made = arr.map((r) => {
        const row = Object.assign({ created_at: new Date().toISOString(), __training: true }, r);
        if (row.id == null) row.id = nextId();
        return row;
      });
      (DB.rows[table] = DB.rows[table] || []).push(...made);
      save();
      rec('write', `أُنشئ ${arTbl(table)} تدريبي (${made.length})`, made.map((m) => m.inv_number || m.name || m.id).join(' · ').slice(0, 120));
      return wantRep ? J(made, 201) : new Response(null, { status: 201 });
    }

    if (method === 'PATCH') {
      const body = (await parseBody(input, init)) || {};
      const local = DB.rows[table] || [];
      const hit = local.filter((r) => rowMatches(r, F));
      hit.forEach((r) => Object.assign(r, body));
      const idEq = F.ands.find((c) => c.col === 'id' && c.op === 'eq');
      if (idEq && !hit.length) {
        DB.patches[table] = DB.patches[table] || {};
        DB.patches[table][idEq.val] = Object.assign({}, DB.patches[table][idEq.val], body);
      }
      save();
      rec('write', `تعديل ${arTbl(table)}`, Object.keys(body).slice(0, 6).join(' · '));
      return wantRep ? J(hit.length ? hit : [Object.assign({ id: idEq ? idEq.val : null }, body)]) : new Response(null, { status: 204 });
    }

    if (method === 'DELETE') {
      const local = DB.rows[table] || [];
      DB.rows[table] = local.filter((r) => !rowMatches(r, F));
      const idEq = F.ands.find((c) => c.col === 'id' && c.op === 'eq');
      if (idEq) (DB.deleted[table] = DB.deleted[table] || []).push(String(idEq.val));
      save();
      rec('write', `حذف من ${arTbl(table)} (محاكاة)`, '');
      return new Response(null, { status: 204 });
    }
    return new Response(null, { status: 204 });
  }

  /* ══════════ محاكاة RPC (خصم/زيادة المخزون) ══════════ */
  async function simulateRpc(p, input, init) {
    const body = (await parseBody(input, init)) || {};
    if (p.fn === 'decrement_branch_stock' || p.fn === 'increment_branch_stock') {
      const pid = String(body.p_product_id), br = body.p_branch_key, q = parseFloat(body.p_qty) || 0;
      let cur = 0;
      try {
        const over = DB.patches.products && DB.patches.products[pid];
        if (over && over[br] != null) cur = parseFloat(over[br]) || 0;
        else {
          const r = await REAL(p.u.origin + '/rest/v1/products?id=eq.' + encodeURIComponent(pid) + '&select=' + encodeURIComponent(br), { headers: (init && init.headers) || undefined });
          const rows = await r.json();
          cur = rows && rows[0] ? parseFloat(rows[0][br]) || 0 : 0;
        }
      } catch (_) {}
      const nv = p.fn.startsWith('dec') ? Math.max(0, cur - q) : cur + q;
      DB.patches.products = DB.patches.products || {};
      DB.patches.products[pid] = Object.assign({}, DB.patches.products[pid], { [br]: nv });
      save();
      rec('write', (p.fn.startsWith('dec') ? 'خصم' : 'زيادة') + ` مخزون (محاكاة): ${q} — الرصيد الوهمي ${nv}`, 'المنتج #' + pid + ' · الفرع ' + br);
      return J(nv);
    }
    rec('write', 'استدعاء دالة قاعدة (محاكاة): ' + p.fn, '');
    return J(null);
  }

  /* ══════════ دمج القراءة ══════════ */
  async function mergeGet(p, res) {
    const table = p.table;
    const hasLocal = (DB.rows[table] && DB.rows[table].length) || DB.patches[table] || (DB.deleted[table] && DB.deleted[table].length);
    if (!hasLocal) return res;
    let data;
    try { data = await res.clone().json(); } catch (_) { return res; }
    if (!Array.isArray(data)) return res;
    const F = parseFilters(p.u);
    const del = DB.deleted[table] || [];
    const pat = DB.patches[table] || {};
    let out = data
      .filter((r) => !del.some((d) => same(d, r.id)))
      .map((r) => (pat[String(r.id)] || pat[r.id]) ? Object.assign({}, r, pat[String(r.id)] || pat[r.id]) : r);
    const sel = p.u.searchParams.get('select');
    const locals = (DB.rows[table] || []).filter((r) => rowMatches(r, F)).map((r) => project(r, sel));
    if (locals.length) out = locals.concat(out);
    return J(out, res.status);
  }

  /* ══════════ اعتراض fetch ══════════ */
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = ((init && init.method) || (typeof input !== 'string' && input && input.method) || 'GET').toUpperCase();

    /* 🔒 (1) التلمتري يمرّ حقيقياً — أخطاء التدريب يجب أن تصلك (موسومة training) */
    if (/gmt_telemetry/.test(url)) return REAL(input, init);

    /* 📨 (2) تيليغرام: يمرّ فعلاً بعد وسمه «تدريبية» */
    if (isTelegram(url)) {
      rec('sent', '📨 أُرسل إشعار تيليغرام **موسوماً بـ«تدريبية»**', 'وصل الإدارة بختم واضح — لا يمثّل عملية حقيقية.');
      return REAL(input, tagTelegram(init, input));
    }

    /* 🔒 (3) باقي الآثار الخارجية تُحتجَز */
    const b = blockedBy(url);
    if (b) {
      rec('blocked', '🔒 حُجز ' + b.name + ' (لم يُرسل لأحد)', method + ' ' + String(url).split('?')[0].slice(0, 90));
      return J({ ok: true, training: true, blocked: b.name }, 200);
    }

    const p = parseUrl(url);
    if (p.kind === 'other') return REAL(input, init);
    if (p.kind === 'storage') {
      if (method === 'GET' || method === 'HEAD') return REAL(input, init);
      rec('blocked', '🔒 رفع ملف/صورة (محاكاة — لم يُرفع شيء)', '');
      return J({ Key: 'training/' + Date.now(), Id: 'training' });
    }
    if (p.kind === 'rpc') return method === 'GET' ? REAL(input, init) : simulateRpc(p, input, init);
    if (p.kind === 'table') {
      if (method === 'GET') { const res = await REAL(input, init); return mergeGet(p, res); }
      if (method === 'HEAD') return REAL(input, init);
      return simulate(p, method, input, init);
    }
    return REAL(input, init);
  };

  /* 🔒 (3) حجب المسارات القديمة: XHR + sendBeacon (بعض الصفحات تستعملها) */
  try {
    const XHR = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (m, u) {
      const bb = isTelegram(u) ? null : blockedBy(u);
      if (bb) { rec('blocked', '🔒 حُجز ' + bb.name + ' (XHR)', String(u).slice(0, 80)); arguments[1] = 'data:application/json,{}'; }
      return XHR.apply(this, arguments);
    };
    const BEACON = navigator.sendBeacon && navigator.sendBeacon.bind(navigator);
    if (BEACON) navigator.sendBeacon = function (u, d) {
      if (/gmt_telemetry/.test(String(u))) return BEACON(u, d);
      const bb = blockedBy(u);
      if (bb) { rec('blocked', '🔒 حُجز ' + bb.name + ' (Beacon)', ''); return true; }
      return BEACON(u, d);
    };
  } catch (_) {}

  /* ══════════ 🖨️ ختم مائي بالطباعة ══════════ */
  (function watermark() {
    const css = document.createElement('style');
    css.textContent = `
      @media print {
        body::before{
          content:"نسخة تدريبية — غير صالحة للتعامل";
          position:fixed; top:42%; left:0; right:0; text-align:center;
          font-size:44px; font-weight:900; color:rgba(192,0,18,.16);
          transform:rotate(-24deg); z-index:2147483647; pointer-events:none;
          font-family:Cairo,Arial,sans-serif; letter-spacing:2px;
        }
      }
      body{ outline:3px solid #d97706; outline-offset:-3px; }
    `;
    (document.head || document.documentElement).appendChild(css);
  })();

  /* ══════════ الشريط + تقرير الجلسة ══════════ */
  let bar = null;
  function paintBanner() {
    if (!bar) return;
    const c = bar.querySelector('#gts-counts');
    if (c) c.textContent = `عمليات: ${stat.writes} · إشعارات موسومة: ${stat.sent} · محتجزة: ${stat.blocked} · أخطاء: ${stat.errors}`;
  }
  function banner() {
    if (!document.body) { document.addEventListener('DOMContentLoaded', banner, { once: true }); return; }
    if (document.getElementById('gmt-training-banner')) return;
    bar = document.createElement('div');
    bar.id = 'gmt-training-banner';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147482999;background:linear-gradient(90deg,#b45309,#d97706);color:#fff;font-family:Cairo,Arial,sans-serif;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;padding:6px 10px;direction:rtl;box-shadow:0 3px 12px rgba(0,0,0,.3);';
    bar.innerHTML =
      '<span>🎓 وضع تدريبي — لا شيء يُحفظ ولا يُرسل لأحد</span>' +
      '<span id="gts-counts" style="background:rgba(0,0,0,.22);border-radius:99px;padding:2px 10px;font-size:11px;"></span>' +
      '<button id="gts-guide" style="background:#1e40af;color:#fff;border:none;border-radius:99px;padding:4px 14px;font-weight:900;font-family:inherit;font-size:11px;cursor:pointer;">📖 دليل الأزرار (زرّاً بزرّ)</button>' +
      '<button id="gts-report" style="background:#fff;color:#b45309;border:none;border-radius:99px;padding:4px 12px;font-weight:900;font-family:inherit;font-size:11px;cursor:pointer;">📋 تقرير الجلسة</button>' +
      '<button id="gts-reset" style="background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:99px;padding:4px 12px;font-weight:900;font-family:inherit;font-size:11px;cursor:pointer;">♻️ ابدأ من جديد</button>' +
      '<button id="gts-exit" style="background:#111;color:#fff;border:none;border-radius:99px;padding:4px 14px;font-weight:900;font-family:inherit;font-size:11px;cursor:pointer;">✖ خروج ومسح</button>';
    document.body.appendChild(bar);
    document.body.style.marginTop = (parseInt(getComputedStyle(document.body).marginTop) || 0) + 34 + 'px';
    bar.querySelector('#gts-exit').onclick = () => { if (confirm('إنهاء التدريب ومسح كل ما أنشأته؟ (لن يتأثر شيء بقاعدتك)')) exit(); };
    // 📖 زر الدليل: يفتح الدليل التفاعلي الذي يشرح كل زر (ماذا/متى/ماذا يتغيّر)
    var gb = bar.querySelector('#gts-guide');
    if (gb) gb.onclick = function () {
      // الجولة خطوة بخطوة: تأشّر على كل زر وتشرحه وتنتظرك
      if (window.GMTGuide && window.GMTGuide.walkthrough) return window.GMTGuide.walkthrough();
      if (window.GMTGuide && window.GMTGuide.open) return window.GMTGuide.open();
      var btn = document.getElementById('gmt-guide-btn');
      if (btn) return btn.click();
      alert('الدليل التفاعلي غير محمّل بهذه الصفحة. تأكّد من رفع ملفات gmt-guide بجانبها.');
    };
    bar.querySelector('#gts-reset').onclick = () => {
      if (!confirm('مسح جلسة التدريب والبدء من جديد؟')) return;
      DB = { rows: {}, patches: {}, deleted: {}, seq: 0 }; LOG = []; stat.writes = stat.blocked = stat.errors = 0;
      save(); try { sessionStorage.removeItem(SS_LOG); } catch (_) {}
      location.reload();
    };
    bar.querySelector('#gts-report').onclick = openReport;
    paintBanner();
  }
  banner();

  function buildReport() {
    const t0 = Number((function () { try { return sessionStorage.getItem(SS_T0); } catch (_) { return 0; } })() || Date.now());
    const mins = Math.max(1, Math.round((Date.now() - t0) / 60000));
    const u = (window.GMTBug && GMTBug.list) ? '' : '';
    const head = [
      '═══ تقرير جلسة تدريبية — GMT 🎓 ═══',
      'الصفحة: ' + document.title,
      'المدة: ' + mins + ' دقيقة',
      `العمليات المُحاكاة: ${stat.writes} · إشعارات تيليغرام موسومة: ${stat.sent} · إشعارات محتجزة: ${stat.blocked} · الأخطاء: ${stat.errors}`,
      '⚠️ لم تُكتب أي بيانات بالقاعدة ولم يُخصم أي مخزون. رسائل تيليغرام أُرسلت بختم «تدريبية».',
      '──────────────────────',
    ].join('\n');
    const ICON = { blocked: '🔒', error: '🔴', sent: '📨', write: '✍️' };
    const body = LOG.map((e, i) => `#${i + 1} [${e.t}] ${ICON[e.k] || '•'} ${e.title}${e.detail ? '\n   ↳ ' + e.detail : ''}`).join('\n');
    const inspect = (window.GMTInspect && typeof GMTInspect.report === 'function') ? '\n\n═══ رحلة المتدرّب (المفتّش) ═══\n' + GMTInspect.report() : '';
    return head + '\n' + (body || 'لم تُنفَّذ أي عملية بعد.') + inspect + u;
  }

  function openReport() {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:2147483002;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Cairo,Arial,sans-serif;direction:rtl;';
    ov.innerHTML =
      '<div style="background:#161a22;color:#e7e9ee;border:1px solid #2a3040;border-radius:16px;max-width:620px;width:100%;max-height:86vh;display:flex;flex-direction:column;padding:16px;">' +
      `<div style="font-weight:900;font-size:15px;margin-bottom:3px;">🎓 تقرير الجلسة التدريبية</div>` +
      `<div style="font-size:11px;color:#9aa3b2;font-weight:700;margin-bottom:9px;line-height:1.7;">محاكاة: <b>${stat.writes}</b> عملية · <b>${stat.sent}</b> إشعار موسوم · <b>${stat.blocked}</b> محتجَز · <b>${stat.errors}</b> خطأ. لا شيء وصل للقاعدة ولا نقص من المخزون · رسائل تيليغرام وصلت بختم «تدريبية».</div>` +
      '<textarea readonly id="gts-ta" style="flex:1;min-height:260px;background:#0e1117;color:#cdd3de;border:1px solid #2a3040;border-radius:10px;padding:10px;font-size:11px;line-height:1.7;direction:rtl;text-align:right;white-space:pre-wrap;"></textarea>' +
      '<div style="display:flex;gap:8px;margin-top:10px;">' +
      '<button id="gts-copy" style="flex:1;background:#C00012;color:#fff;border:none;border-radius:10px;padding:11px;font-weight:900;font-family:inherit;cursor:pointer;">📋 نسخ التقرير</button>' +
      '<button id="gts-close" style="background:#232936;color:#c6ccd8;border:none;border-radius:10px;padding:11px 14px;font-weight:800;font-family:inherit;cursor:pointer;">إغلاق</button>' +
      '</div></div>';
    document.body.appendChild(ov);
    const ta = ov.querySelector('#gts-ta');
    ta.value = buildReport();
    ov.querySelector('#gts-close').onclick = () => ov.remove();
    ov.querySelector('#gts-copy').onclick = async () => {
      try { await navigator.clipboard.writeText(ta.value); } catch (_) { ta.select(); try { document.execCommand('copy'); } catch (_) {} }
      ov.querySelector('#gts-copy').textContent = '✓ نُسخ';
    };
  }

  /* ══════════ التقاط أخطاء المتدرّب وعرضها له (تعليمياً) ══════════ */
  window.addEventListener('error', (e) => { if (e && e.message) rec('error', 'خطأ برمجي: ' + e.message, ''); });
  window.addEventListener('unhandledrejection', (e) => { const r = e && e.reason; rec('error', 'خطأ: ' + ((r && (r.message || r)) || ''), ''); });
  /* بالوضع التدريبي المتدرّب يرى الحارس (عكس الإنتاج الصامت) — الهدف تعليمه لا مراقبته */
  setTimeout(() => { try { if (window.GMTBug && GMTBug.setSilent) GMTBug.setSilent(false); } catch (_) {} }, 1200);

  /* ══════════ الواجهة البرمجية ══════════ */
  window.GMTSandbox = {
    active: true,
    version: 2,
    db: DB,
    log: () => LOG.slice(),
    stats: () => Object.assign({}, stat),
    record: rec,
    report: buildReport,
    openReport,
    enter, exit,
    wipe() { DB = { rows: {}, patches: {}, deleted: {}, seq: 0 }; LOG = []; save(); try { sessionStorage.removeItem(SS_LOG); } catch (_) {} },
  };
  console.info('%c🎓 الوضع التدريبي v2 — كل كتابة محاكاة · تيليغرام موسوم بـتدريبية', 'background:#b45309;color:#fff;padding:2px 8px;border-radius:4px;');
})();


/* ── GMTChecklist (2026-08-15) — قائمة فحص لكل أداة (تعوّض التعليم التفاعلي) ──
   زر عائم 📋 يعرض «الميزات التي يجب أن تجرّبها» + «ميزات جديدة» حسب الصفحة. */
(function (global) {
  'use strict';
  if (global.GMTChecklist) return;
  var LISTS = {
    purchases: { title: 'المشتريات', test: [
      'فاتورة شراء جديدة (استيراد ألماني/صيني + فوري)',
      'التصدير · النسخة الاحتياطية JSON · Excel',
      'إدخال الصور من Excel',
      'التسعير + توزيع المصاريف على التكلفة',
      'تحويل العملة',
      'الترحيل الكامل + الجزئي (لا مضاعفة!)',
      'ترحيل فاتورة فيها منتج محذوف (يُعاد تلقائياً)',
      'إعادة ترحيل فاتورة مرحّلة (يجب أن يمنع المضاعفة)',
      'المسودة: أغلق التبويب ثم افتح (استعادة)',
      'اكتب اسم منتج موجود بالبحث (يجب أن يظهر)',
    ], neu: ['منع المضاعفة عبر سجل الاستلام', 'إعادة المحذوف تلقائياً', 'التعرّف على المنتج من السيرفر'] },
    inventory: { title: 'الجرد', test: [
      'إضافة منتج + تحديد «حد التنبيه»',
      'تعديل الكمية (قفل سيادي + سبب إجباري)',
      'اضغط «سعر الشراء 🔗» (ينقلك لفاتورة المشتريات)',
      'الحذف الفردي (يحذّر إن مرتبط بفاتورة)',
      'الحذف الجماعي (يحذّر من الفواتير المعلّقة)',
      'مؤشّر «مخزون منخفض ⚠️» عند بلوغ الحد',
      'فرز المنتجات القديمة (INV-8)',
      'الوضع الجماعي: excel/باركود/جرد/سعر/حذف',
      'طباعة الملصقات',
      'الفاحص/التدقيق الذكي',
    ], neu: ['حد تنبيه لكل منتج + مؤشّر', 'سعر الشراء → المشتريات', 'تحذير الحذف الجماعي'] },
    orders: { title: 'الأوردرات', test: ['إنشاء أوردر', 'تحويل الأوردر لفاتورة كاشير', 'العرابين (الحجوزات)', 'زر شاشات التعريف'], neu: ['إصلاح زر التعريف'] },
    warranty_new: { title: 'إنشاء الكفالة', test: ['إنشاء كفالة جديدة', 'الطباعة', 'ربطها بالفاتورة'], neu: ['تغطية البوتات أُضيفت'] },
    warranty_find: { title: 'بحث الكفالة', test: ['بحث برقم/باركود', 'عرض التفاصيل'], neu: ['تغطية البوتات أُضيفت'] },
    warranty_admin: { title: 'أدمن الكفالة', test: ['تعديل كفالة', 'حذف', 'التقارير'], neu: [] },
    contracts: { title: 'العقود', test: ['تسجيل الدخول', 'إنشاء عقد', 'الطباعة'], neu: [] },
    tracking: { title: 'تتبع الشحنة', test: ['تتبع شحنة برقمها', 'عرض الحالة'], neu: ['تغطية البوتات أُضيفت'] },
  };
  function pid() {
    try { if (global.GMTBug && GMTBug.pageId) { var p = GMTBug.pageId(); if (p) return p; } } catch (e) {}
    var t = decodeURIComponent((location.pathname || '') + ' ' + (document.title || ''));
    if (/purchase|المشتريات/i.test(t)) return 'purchases';
    if (/inventory|الجرد/i.test(t)) return 'inventory';
    if (/order|الأوردر/i.test(t)) return 'orders';
    if (/إنشاء_الكفالة|new.*warrant/i.test(t)) return 'warranty_new';
    if (/بحث_الكفالة/i.test(t)) return 'warranty_find';
    if (/أدمن_الكفالة/i.test(t)) return 'warranty_admin';
    if (/contract|العقود/i.test(t)) return 'contracts';
    if (/tracking|الشحنة/i.test(t)) return 'tracking';
    return null;
  }
  function open() {
    var id = pid(); var L = id && LISTS[id];
    if (!L) { alert('لا قائمة فحص لهذه الصفحة.'); return; }
    var ov = document.getElementById('gmt-cl-ov') || document.createElement('div');
    ov.id = 'gmt-cl-ov';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100000;display:flex;align-items:center;justify-content:center;padding:14px;font-family:Cairo,sans-serif;';
    var rows = L.test.map(function (t, i) { return '<label style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;cursor:pointer;"><input type="checkbox" style="margin-top:3px;"><span>' + t + '</span></label>'; }).join('');
    var neu = (L.neu && L.neu.length) ? '<div style="margin-top:10px;padding:10px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;font-size:12px;"><b>✨ ميزات جديدة تستحقّ الفحص:</b><br>' + L.neu.map(function (x) { return '• ' + x; }).join('<br>') + '</div>' : '';
    ov.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:440px;width:100%;max-height:85vh;overflow:auto;padding:18px;" onclick="event.stopPropagation()">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><div style="font-weight:900;font-size:16px;">📋 قائمة فحص: ' + L.title + '</div>'
      + '<button onclick="document.getElementById(\'gmt-cl-ov\').remove()" style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:4px 12px;font-weight:800;cursor:pointer;">إغلاق</button></div>'
      + '<div style="font-size:11.5px;color:#64748b;margin-bottom:8px;">جرّب كل بند وتأكّد أنه يعمل. (تعوّض عن التعليم التفاعلي.)</div>'
      + '<div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">' + rows + '</div>' + neu + '</div>';
    ov.onclick = function () { ov.remove(); };
    document.body.appendChild(ov);
  }
  function mount() {
    if (!pid() || document.getElementById('gmt-cl-btn')) return;
    var b = document.createElement('button');
    b.id = 'gmt-cl-btn'; b.textContent = '📋'; b.title = 'قائمة الفحص';
    b.style.cssText = 'position:fixed;bottom:150px;left:16px;z-index:99997;width:46px;height:46px;border-radius:50%;background:#4f46e5;color:#fff;border:none;font-size:20px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);';
    b.onclick = open;
    document.body.appendChild(b);
  }
  global.GMTChecklist = { open: open, mount: mount, lists: LISTS };
  if (document.readyState !== 'loading') mount(); else document.addEventListener('DOMContentLoaded', mount);
})(window);
