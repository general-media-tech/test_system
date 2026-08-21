/* gmt-core.js — النواة المشتركة · دُمج 2026-07-24 · يشمل التحكّم بالظهور + تذكير التحديث */

/* ── gmt-brand.js ── */
;/* ═══════════════════════════════════════════════════════════════════════════
   gmt-brand.js — 🎨 محرّك الهوية البصرية · v1.0 · 2026-07-13
   ─────────────────────────────────────────────────────────────────────────
   طلبك الحرفي: «الواجهات والموشن والأزرار والأيقونات **تتعلّم من الهوية
   البصرية تبعيتي**».

   المشكلة: البوتات كانت تحمل الأحمر مثبّتاً بالكود (#C00012). لو غيّرت
   هويتك غداً ⇒ تبقى البوتات بلون قديم ⇒ تبدو غريبة عن نظامك.

   الحل: هذا الملف **يقرأ الهوية من الصفحة نفسها وقت التشغيل**:
     ① متغيّرات gmt-theme.css   (--gmt-red · --gmt-ink · --gmt-line …)
     ② أو <meta name="theme-color">
     ③ أو يستنبطها من ألوان الأزرار الفعلية بالصفحة
   ثم يُصدّرها لكل البوتات كمتغيّرات CSS (--gg-*) ⇒ **بوت واحد يتلوّن بلونك**.

   + يعالج **الصور المكسورة**: أي صورة 404 تُستبدل ببديل مرسوم بلونك
     (بدل أيقونة الصورة المكسورة القبيحة) — يغطّي canonlogo/mark/truck…

   يجب أن يُحمَّل **أولاً** قبل باقي البوتات.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.GMTBrand) return;

  var DEFAULTS = {
    red:       '#C00012',
    redDark:   '#8E000D',
    redLight:  '#FEE2E2',
    ink:       '#111827',
    line:      '#E5E7EB',
    surface:   '#FFFFFF',
    ok:        '#16A34A',
    warn:      '#D97706',
    danger:    '#B91C1C',
    font:      'Cairo, system-ui, "Segoe UI", Tahoma, sans-serif',
    radius:    '14px',
    logo:      'logo.jpg',
    name:      'General Media Tech'
  };

  function cssVar(name) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name);
      return (v || '').trim() || null;
    } catch (e) { return null; }
  }

  /* ① من الثيم — المصدر الأول والأصحّ */
  function fromTheme() {
    return {
      red:      cssVar('--gmt-red'),
      redDark:  cssVar('--gmt-red-dark'),
      redLight: cssVar('--gmt-red-light'),
      ink:      cssVar('--gmt-ink'),
      line:     cssVar('--gmt-line'),
      surface:  cssVar('--gmt-surface'),
      ok:       cssVar('--gmt-ok'),
      warn:     cssVar('--gmt-warn'),
      danger:   cssVar('--gmt-danger'),
      radius:   cssVar('--gmt-radius'),
      font:     cssVar('--gmt-font')
    };
  }

  /* ② من meta theme-color */
  function fromMeta() {
    var m = document.querySelector('meta[name="theme-color"]');
    return m ? { red: m.getAttribute('content') } : {};
  }

  /* ③ استنباط: أكثر لون خلفية شيوعاً بين الأزرار البارزة */
  function fromButtons() {
    try {
      var counts = {};
      var els = document.querySelectorAll('button,.btn,[class*=primary]');
      for (var i = 0; i < Math.min(els.length, 90); i++) {
        var bg = getComputedStyle(els[i]).backgroundColor;
        var m = bg && bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!m) continue;
        var r = +m[1], g = +m[2], b = +m[3];
        if (r + g + b > 690 || r + g + b < 40) continue;    // تجاهل الأبيض والأسود
        if (r < g || r < b) continue;                        // نبحث عن لون هوية دافئ/أحمر
        var hex = '#' + [r, g, b].map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join('').toUpperCase();
        counts[hex] = (counts[hex] || 0) + 1;
      }
      var best = null, n = 0;
      Object.keys(counts).forEach(function (k) { if (counts[k] > n) { n = counts[k]; best = k; } });
      return n >= 2 ? { red: best } : {};
    } catch (e) { return {}; }
  }

  /* اللوجو: أول صورة تحمل اسماً يشبه اللوجو */
  function findLogo() {
    var el = document.querySelector('img[src*="logo" i], link[rel*="icon"]');
    if (!el) return null;
    return el.getAttribute('src') || el.getAttribute('href');
  }

  function build() {
    var b = {};
    var sources = [fromButtons(), fromMeta(), fromTheme()];   // الثيم آخِراً ⇒ أعلى أولوية
    Object.keys(DEFAULTS).forEach(function (k) {
      var v = null;
      sources.forEach(function (s) { if (s && s[k]) v = s[k]; });
      b[k] = v || DEFAULTS[k];
    });
    b.logo = findLogo() || DEFAULTS.logo;
    b.source = cssVar('--gmt-red') ? 'gmt-theme.css' : (fromMeta().red ? 'meta theme-color' : (fromButtons().red ? 'استنباط من الأزرار' : 'افتراضي'));
    return b;
  }

  var B = build();

  /* ── صدّر الهوية لكل البوتات كمتغيّرات CSS موحّدة ── */
  function inject() {
    var s = document.getElementById('gmt-brand-vars') || document.createElement('style');
    s.id = 'gmt-brand-vars';
    s.textContent =
      ':root{' +
        '--gg-red:' + B.red + ';' +
        '--gg-red-dark:' + B.redDark + ';' +
        '--gg-red-light:' + B.redLight + ';' +
        '--gg-ink:' + B.ink + ';' +
        '--gg-line:' + B.line + ';' +
        '--gg-surface:' + B.surface + ';' +
        '--gg-ok:' + B.ok + ';' +
        '--gg-warn:' + B.warn + ';' +
        '--gg-danger:' + B.danger + ';' +
        '--gg-radius:' + B.radius + ';' +
        '--gg-font:' + B.font + ';' +
      '}';
      /* ملاحظة: لا نحقن أي نمط على عناصر تصميمك. المتغيّرات --gg-* للبوتات فقط،
         ولا تستعملها أي صفحة قديمة ⇒ تصميمك لا يتغيّر إطلاقاً. */
    if (!s.parentNode) document.head.appendChild(s);
  }

  /* ── الصور المكسورة (يغطّي canonlogo · mark · shamcash · truck …) ── */
  var broken = [];
  function guardImages() {
    function handle(img) {
      if (img.dataset.gmtGuarded) return;
      img.dataset.gmtGuarded = '1';
      img.addEventListener('error', function () {
        if (img.dataset.gmtFallen) return;
        img.dataset.gmtFallen = '1';
        var src = img.getAttribute('src') || '';
        var name = src.split('/').pop().split('?')[0];
        if (broken.indexOf(name) === -1) broken.push(name);

        // أبلِغ الحارس دائماً — لا تمرّ الصور المفقودة بصمت
        if (window.GMTBug && GMTBug.log) {
          GMTBug.log('warn', 'صورة مفقودة (404): ' + name, { type: 'missing_asset', file: name, page: document.title });
        }
        if (window.GMTInspect && GMTInspect.step) GMTInspect.step('🖼️', 'صورة مفقودة: ' + name);

        /* 🚫 قاعدة صارمة (طلبك): لا نمسح أي شعار ولا نرسم بديلاً «من عندنا».
           إن كانت الصورة المكسورة شعاراً/أيقونة، نحاول شعارك الحقيقي (logo.jpg)
           — لا نستبدله بمربّع مصمَّم. لو فشل هذا أيضاً، نُخفيها بهدوء ونترك
           تصميمك كما هو (لا عنصر غريب مكانها). */
        var looksLikeLogo = /logo|mark|brand|icon/i.test(name) ||
                            /logo|mark|brand|icon/i.test(img.className || '') ||
                            /شعار|لوغو|logo/i.test(img.alt || '');

        if (looksLikeLogo && B.logo && name.toLowerCase() !== (B.logo.split('/').pop() || '').toLowerCase()) {
          // بدّل المصدر إلى شعارك الفعلي مرّة واحدة فقط
          img.dataset.gmtFallen = '';        // اسمح بمحاولة أخيرة على logo.jpg
          img.dataset.gmtLogoTried = '1';
          img.src = B.logo;
          return;
        }

        // ليس شعاراً (أو حتى logo.jpg غير موجود): أخفِها بهدوء — لا نضع شيئاً من تصميمنا
        img.style.visibility = 'hidden';
      }, { once: false });
      // إن كانت قد فشلت مسبقاً
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) {
        img.dispatchEvent(new Event('error'));
      }
    }
    Array.prototype.forEach.call(document.images, handle);
    // راقب الصور المضافة لاحقاً
    try {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          Array.prototype.forEach.call(m.addedNodes || [], function (n) {
            if (n.tagName === 'IMG') handle(n);
            else if (n.querySelectorAll) Array.prototype.forEach.call(n.querySelectorAll('img'), handle);
          });
        });
      }).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
  }

  window.GMTBrand = {
    version: 1.0,
    get: function (k) { return k ? B[k] : B; },
    red: function () { return B.red; },
    css: function (k) { return 'var(--gg-' + k + ',' + (B[k] || '') + ')'; },
    brokenImages: function () { return broken.slice(); },
    refresh: function () { B = build(); inject(); return B; }
  };

  inject();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', guardImages);
  else guardImages();
}());


/* ── gmt-config.js ── */
;/* ══════════════════════════════════════════════════════════════════════
   gmt-config.js — مصدر الحقيقة الوحيد لمفاتيح قواعد البيانات
   أُنشئ 2026-07-12 · توصية المهندس المعتمدة من المالك.

   المشكلة التي يحلّه: رابط القاعدة والمفتاح كانا مكرَّرين يدوياً في 16 ملفاً
   عبر 4 قواعد مختلفة. أي تدوير مفتاح = 16 تعديل يدوي — وأول ملف تنساه يفشل
   بصمت (لا رسالة خطأ، فقط بيانات لا تُحمَّل).

   بعد اليوم: أي مفتاح جديد يُغيَّر هنا فقط، ويُنشر هذا الملف على المجلدات.
   ⚠️ الملفات القديمة ما زالت تحمل مفاتيحها المضمّنة (لم نلمسها كي لا تنكسر)؛
   الهجرة تدريجية: كل ملف يُعدَّل مستقبلاً يقرأ من هنا:
       const { url, key } = GMT_DB.MAIN;
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const GMT_DB = {
    /* القاعدة الرئيسية — نقاط البيع · الجرد · الأوردرات · المشتريات · العمولات */
    MAIN: {
      url: 'https://ysawzwtmodkqqbqoiojj.supabase.co',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYXd6d3Rtb2RrcXFicW9pb2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NjI0OTUsImV4cCI6MjA5MjAzODQ5NX0.g-dBDpHzMsP_0IQAKFxzWkKzc_I13bGUMeYNgcUmrKQ',
    },

    /* قاعدة الكفالات — إنشاء الكفالة · إدارتها · البحث عنها */
    WARRANTY: {
      url: 'https://abppuwylukzpqckazegk.supabase.co',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFicHB1d3lsdWt6cHFja2F6ZWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNTQ4NzYsImV4cCI6MjA5ODczMDg3Nn0.Dx6WCUfXD4T8D_tJclB9VuMUS3B0YSwejexrRrYhnqo',
    },

    /* قاعدة المتجر — المنتجات · الطلبات · العروض */
    STORE: {
      url: 'https://tupldwylzrkjzqtaiscv.supabase.co',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1cGxkd3lsenJranpxdGFpc2N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTEzNTQsImV4cCI6MjA5MTA2NzM1NH0.RKsdAg4v7TcuMhBepztJtRdTtsR-f8cMcoDXKmnZXO0',
    },

    /* قاعدة الموقع الرئيسي — الأخبار · الوكلاء · بطاقات العروض */
    SITE: {
      url: 'https://znpakcaizvkwqzhosxvm.supabase.co',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpucGFrY2FpenZrd3F6aG9zeHZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzM0NTMsImV4cCI6MjA5NTkwOTQ1M30.YW3YuT-RRTpKw5WeFHkPeTUcXBBtaQFGCaCrBQWykks',
    },

  };

  /* رؤوس REST جاهزة لأي قاعدة: GMT_DB.headers(GMT_DB.MAIN) */
  GMT_DB.headers = (db, extra) => Object.assign({
    apikey         : db.key,
    Authorization  : 'Bearer ' + db.key,
    'Content-Type' : 'application/json',
  }, extra || {});

  /* عميل supabase-js جاهز (إن كانت المكتبة محمّلة) */
  GMT_DB.client = (db) => (global.supabase && global.supabase.createClient)
    ? global.supabase.createClient(db.url, db.key)
    : null;

  Object.freeze(GMT_DB);
  global.GMT_DB = GMT_DB;
})(window);


/* ── gmt-ui.js ── */
;/* ═══════════════════════════════════════════════════════════════════════
   gmt-ui.js — طبقة الواجهة الموحّدة 🎨 v1 (2026-07-12)
   يُرفع بجانب كل صفحة ويُستدعى بالرأس بعد gmt-bugcatcher.js.

   يحلّ ثلاث شكاوى متكرّرة من تجربتك الفعلية:

   ① 🔗 «كل ما أضغط زر يطلب مني رابطاً ويقول: يعرض موقع general-media-tech…»
      السبب: الصفحات تخزّن روابط الأدوات بـlocalStorage، وإن كانت فارغة تنادي
      `prompt()` — وكروم يضع اسم الدومين فوق النافذة فتبدو إنذاراً خارجياً.
      الحل: **الروابط تُزرع هنا مسبقاً** (مصدر حقيقة واحد) ⇒ لا يُسأل المستخدم أبداً.
      وتُعدَّل من الإعدادات فقط، لا أثناء العمل.

   ② 💬 «رسالة تعرض موقع…» بكل تنبيه — `alert()` الأصلي.
      الحل: نافذة بهويتنا (أحمر GMT + خط Cairo) تحلّ محلّ alert وprompt.
      (confirm يبقى أصلياً لأن الكود يعتمد على جوابه الفوري — يُهاجَر لاحقاً.)

   ③ 📤 «Failed to execute share: An earlier share has not yet completed»
      السبب: نداءان لـnavigator.share قبل انتهاء الأول.
      الحل: قفل + طابور + تراجع تلقائي (نسخ للحافظة أو تنزيل الصورة).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.GMTUI) return;

  const RED = '#C00012';

  /* ═══════════ ① روابط النظام — مصدر الحقيقة الوحيد ═══════════
     ⚠️ عدّل هنا فقط عند تغيير أسماء المجلدات المنشورة. */
  const BASE = 'https://general-media-tech.github.io/System-/';
  const LINKS = {
    pos:            BASE + '02_POS/',
    inventory:      BASE + '03_INVENTORY/',
    admin_pos:      BASE + '04_ADMIN_POS/',
    orders:         BASE + '05_ORDERS/',
    purchases:      BASE + '06_PURCHASES/',
    bridge:         BASE + '07_BRIDGE/',
    store:          BASE + '08_STORE/',
    admin_store:    BASE + '09_ADMIN_STORE/',
    warranty_create:BASE + '10_WARRANTY_CREATE/',
    warranty_admin: BASE + '11_WARRANTY_ADMIN/',
    warranty_view:  BASE + '12_WARRANTY_SEARCH/',
    contracts:      BASE + '14_CONTRACTS/',
    site:           BASE + '15_SITE/',
    tracking:       BASE + '16_TRACKING/',
    backup:         BASE + '17_BACKUP/',
  };
  /* مفاتيح localStorage التي تقرأها الصفحات ⇒ نزرعها إن كانت فارغة (لا نكسر ما ضبطه المستخدم) */
  const SEED = {
    gmt_warranty_create_url: LINKS.warranty_create,
    warranty_view_url:       LINKS.warranty_view,
    gmt_store_preview_url:   LINKS.store,
    br_store_url:            LINKS.store,
    gmt_offers_store_url:    LINKS.store,
    admin_inventory_url:     LINKS.inventory,
    br_inv_url:              LINKS.inventory,
    inv_bridge_url:          LINKS.bridge,
  };
  (function seed() {
    try {
      Object.entries(SEED).forEach(([k, v]) => {
        const cur = localStorage.getItem(k);
        if (!cur || !/^https?:\/\//.test(cur)) localStorage.setItem(k, v);
      });
    } catch (_) {}
  })();

  /* ═══════════ الأنماط ═══════════ */
  (function styles() {
    const s = document.createElement('style');
    s.textContent = `
      .gu-ov{position:fixed;inset:0;z-index:2147483100;background:rgba(6,8,12,.72);display:flex;align-items:center;
        justify-content:center;padding:18px;font-family:Cairo,system-ui,Arial,sans-serif;direction:rtl;
        animation:gu-fade .16s ease-out;}
      @keyframes gu-fade{from{opacity:0}to{opacity:1}}
      @keyframes gu-up{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
      .gu-box{background:#fff;border-radius:18px;max-width:420px;width:100%;padding:20px 18px 16px;
        box-shadow:0 24px 60px rgba(0,0,0,.4);animation:gu-up .2s ease-out;}
      .gu-ic{width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;
        font-size:24px;margin-bottom:10px;background:#fef2f2;color:${RED};}
      .gu-t{font-size:16px;font-weight:900;color:#111;margin-bottom:5px;}
      .gu-m{font-size:13px;font-weight:700;color:#4b5563;line-height:1.85;white-space:pre-wrap;}
      .gu-in{width:100%;margin-top:10px;padding:11px;border:1.5px solid #e5e7eb;border-radius:11px;
        font-size:13px;font-family:inherit;}
      .gu-in:focus{outline:none;border-color:${RED};}
      .gu-btns{display:flex;gap:8px;margin-top:14px;}
      .gu-b{flex:1;border:none;border-radius:12px;padding:12px;font-weight:900;font-size:13.5px;
        font-family:inherit;cursor:pointer;}
      .gu-b.p{background:${RED};color:#fff;} .gu-b.g{background:#eef0f3;color:#374151;}
      .gu-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);z-index:2147483200;
        background:#111;color:#fff;padding:11px 18px;border-radius:14px;font-size:13px;font-weight:800;
        font-family:Cairo,Arial,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);max-width:92vw;direction:rtl;}
    `;
    (document.head || document.documentElement).appendChild(s);
  })();

  function modal({ icon = 'ℹ️', title = 'تنبيه', message = '', input = null, okText = 'حسناً', cancel = false }) {
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.className = 'gu-ov';
      ov.innerHTML = `<div class="gu-box">
        <div class="gu-ic">${icon}</div>
        <div class="gu-t">${title}</div>
        <div class="gu-m">${String(message).replace(/</g, '&lt;')}</div>
        ${input !== null ? `<input class="gu-in" id="gu-input" value="${String(input).replace(/"/g, '&quot;')}">` : ''}
        <div class="gu-btns">
          ${cancel ? '<button class="gu-b g" data-x="0">إلغاء</button>' : ''}
          <button class="gu-b p" data-x="1">${okText}</button>
        </div></div>`;
      document.body.appendChild(ov);
      const inp = ov.querySelector('#gu-input');
      if (inp) setTimeout(() => inp.focus(), 60);
      ov.addEventListener('click', (e) => {
        const b = e.target.closest('[data-x]');
        if (!b && e.target !== ov) return;
        const ok = b && b.dataset.x === '1';
        ov.remove();
        resolve(input !== null ? (ok ? (inp ? inp.value : '') : null) : !!ok);
      });
    });
  }

  function toast(msg, ms) {
    const t = document.createElement('div');
    t.className = 'gu-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms || 2800);
  }

  /* ═══════════ ② استبدال alert / prompt الأصليين ═══════════ */
  const nativeAlert = window.alert.bind(window);
  window.alert = function (m) {
    if (!document.body) return nativeAlert(m);
    const s = String(m == null ? '' : m);
    const err = /خطأ|فشل|تعذّر|تعذر|لا يمكن|❌|🚫/.test(s);
    modal({ icon: err ? '⚠️' : 'ℹ️', title: err ? 'تنبيه' : 'رسالة', message: s });
  };
  const nativePrompt = window.prompt.bind(window);
  window.prompt = function (m, def) {
    /* أي طلب رابط أثناء العمل = خطأ تصميم؛ نُبلّغ الحارس ونعيد الرابط المزروع إن وُجد */
    const s = String(m || '');
    if (/رابط|url|link/i.test(s)) {
      if (window.GMTBug) GMTBug.add('warn', 'إعداد', 'الصفحة طلبت رابطاً أثناء العمل: ' + s.slice(0, 80), 'يجب أن يُضبط مسبقاً بـgmt-ui.js (LINKS).');
      const guess = LINKS.warranty_create;
      return def || guess;
    }
    return nativePrompt(m, def);
  };

  /* ═══════════ ③ المشاركة — قفل وطابور وتراجع ═══════════ */
  let sharing = false;
  async function share(data) {
    if (sharing) { toast('⏳ هناك مشاركة جارية — انتظر ثانية'); return false; }
    sharing = true;
    try {
      if (navigator.canShare && data.files && !navigator.canShare({ files: data.files })) delete data.files;
      if (navigator.share) { await navigator.share(data); return true; }
      throw new Error('المشاركة غير مدعومة بهذا المتصفح');
    } catch (e) {
      const msg = String((e && e.message) || e);
      if (/abort|cancel/i.test(msg)) return false;            // المستخدم ألغى — ليس خطأ
      /* تراجع: نسخ النص أو تنزيل الصورة */
      try {
        if (data.files && data.files[0]) {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(data.files[0]);
          a.download = data.files[0].name || 'gmt.png';
          a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
          toast('📥 تعذّرت المشاركة — نُزّلت الصورة بدلاً منها');
        } else if (data.text || data.url) {
          await navigator.clipboard.writeText([data.text, data.url].filter(Boolean).join('\n'));
          toast('📋 تعذّرت المشاركة — نُسخ النص للحافظة');
        }
      } catch (_) { toast('تعذّرت المشاركة: ' + msg.slice(0, 60)); }
      if (window.GMTBug) GMTBug.add('warn', 'مشاركة', 'فشل navigator.share: ' + msg.slice(0, 90), 'فُعّل التراجع التلقائي (نسخ/تنزيل).');
      return false;
    } finally {
      setTimeout(() => { sharing = false; }, 700);   // يمنع «مشاركة سابقة لم تنتهِ»
    }
  }
  /* نلفّ navigator.share نفسه ليستفيد كل الكود القديم بلا تعديل */
  try {
    if (navigator.share) {
      const real = navigator.share.bind(navigator);
      navigator.share = function (d) {
        if (sharing) return Promise.reject(new Error('AbortError: مشاركة جارية'));
        sharing = true;
        return real(d).finally(() => setTimeout(() => { sharing = false; }, 700));
      };
    }
  } catch (_) {}

  window.GMTUI = { modal, toast, share, LINKS, alert: window.alert, confirm: (m) => modal({ icon: '❓', title: 'تأكيد', message: m, cancel: true, okText: 'نعم' }) };
})();


/* ── gmt-cache.js ── */
;/* ═══════════════════════════════════════════════════════
   gmt-cache.js — مكتبة التخزين المؤقت المحلي لأنظمة GMT (IndexedDB + وضع عدم الاتصال)
   استُخرجت حرفياً 2026-07-06 من النسخة المدمجة بملف الجرد.
   السبب: Bridge.html يستدعي هذا الملف خارجياً منذ البداية (باستدعاء محمي
   if(window.GMTCache)) لكن الملف لم يكن موجوداً قط — فكان تخزينه المحلي معطلاً بصمت.
   يُرفع جنب Bridge.html. الجرد والمشتريات يبقيان بنسختيهما المدمجتين (لا تعديل عليهما)
   حتى جلسة التوحيد.
   ═══════════════════════════════════════════════════════ */

/* ══ gmt-cache.js (embedded) ══ */
/**
 * gmt-cache.js — مكتبة التخزين المؤقت المحلي لـ GMT Systems
 * تستخدم IndexedDB لتخزين بيانات المنتجات والصور محلياً
 * تدعم وضع عدم الاتصال (Offline Mode)
 * الإصدار: 2.0
 */

(function () {
  'use strict';

  const DB_NAME    = 'gmt_cache_db';
  const DB_VERSION = 3;
  const STORE_DATA = 'gmt_collections';
  const STORE_IMG  = 'gmt_images';
  const STORE_META = 'gmt_meta';

  // ── فتح قاعدة البيانات (مع تخزين الاتصال — singleton) ──────────
  // مهم للأداء: كانت كل عملية قراءة/كتابة تفتح اتصال IndexedDB جديد وما تسكّره،
  // فتتراكم اتصالات مفتوحة وتبطّئ المتصفح تدريجياً لدرجة الحاجة للريفرش. الآن
  // نفتح اتصال واحد ونعيد استخدامه طول الجلسة.
  let _dbConn = null;
  let _dbConnPromise = null;
  function openDB() {
    if (_dbConn) return Promise.resolve(_dbConn);
    if (_dbConnPromise) return _dbConnPromise;
    _dbConnPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        _dbConnPromise = null;
        reject(new Error('IndexedDB not supported'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_DATA)) {
          db.createObjectStore(STORE_DATA, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_IMG)) {
          db.createObjectStore(STORE_IMG, { keyPath: 'url' });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };

      req.onsuccess  = (e) => {
        _dbConn = e.target.result;
        // لو انغلق الاتصال لأي سبب (مثلاً ترقية من تبويب آخر)، نصفّر الكاش ليُعاد فتحه
        _dbConn.onclose = () => { _dbConn = null; _dbConnPromise = null; };
        _dbConn.onversionchange = () => { try { _dbConn.close(); } catch(e){} _dbConn = null; _dbConnPromise = null; };
        resolve(_dbConn);
      };
      req.onerror    = (e) => { _dbConnPromise = null; reject(e.target.error); };
      req.onblocked  = ()  => { _dbConnPromise = null; reject(new Error('IndexedDB blocked')); };
    });
    return _dbConnPromise;
  }

  // ── قراءة من مخزن ────────────────────────────────────────────
  async function dbGet(store, key) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx  = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => resolve(null);
      });
    } catch (e) { return null; }
  }

  // ── كتابة في مخزن ────────────────────────────────────────────
  async function dbPut(store, value) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx  = db.transaction(store, 'readwrite');
        const req = tx.objectStore(store).put(value);
        req.onsuccess = () => resolve(true);
        req.onerror   = () => resolve(false);
      });
    } catch (e) { return false; }
  }

  // ── حذف من مخزن ────────────────────────────────────────────
  async function dbDelete(store, key) {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx  = db.transaction(store, 'readwrite');
        tx.objectStore(store).delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror    = () => resolve(false);
      });
    } catch (e) { return false; }
  }

  // ── طلب Supabase مباشر ──────────────────────────────────────
  async function sbRequest(sbConfig, path) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(sbConfig.url + path, {
        headers: {
          'apikey': sbConfig.key,
          'Authorization': 'Bearer ' + sbConfig.key,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  }

  // ════════════════════════════════════════════════════════════
  // GMTCache — الكلاس الرئيسي
  // ════════════════════════════════════════════════════════════
  const GMTCache = {

    /**
     * syncCollection — المزامنة الذكية بين Supabase والكاش المحلي
     * @param {Object} opts
     *   name        — اسم المجموعة (مفتاح الكاش)
     *   table       — اسم جدول Supabase
     *   sbConfig    — { url, key }
     *   liveFields  — حقول تُحدَّث دائماً (الكميات)
     *   imageField  — اسم حقل الصورة
     *   idField     — المعرّف الفريد (افتراضي: 'id')
     * @returns { rows, fromCache, offline }
     */
    async syncCollection({ name, table, sbConfig, liveFields = [], imageField = 'image_url', idField = 'id' }) {
      const cacheKey  = 'col_' + name;
      const metaKey   = 'meta_' + name;
      const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

      // 1. حاول الجلب من الخادم
      let rows = null;
      let offline = false;

      try {
        // جلب كامل للبيانات من Supabase
        const path = `/rest/v1/${table}?order=${idField}.asc&limit=10000`;
        const fresh = await sbRequest(sbConfig, path);

        if (Array.isArray(fresh)) {
          rows = fresh;

          // حفظ في الكاش مع الطابع الزمني
          await dbPut(STORE_DATA, { key: cacheKey, rows, savedAt: Date.now() });
          await dbPut(STORE_META, { key: metaKey, count: rows.length, updatedAt: Date.now() });

          return { rows, fromCache: false, offline: false };
        }
      } catch (e) {
        // فشل الاتصال — جرّب الكاش
        offline = true;
        console.warn('[GMTCache] Supabase unreachable, using cache:', e.message);
      }

      // 2. إذا فشل الاتصال، استخدم الكاش المحلي
      const cached = await dbGet(STORE_DATA, cacheKey);
      if (cached && Array.isArray(cached.rows) && cached.rows.length > 0) {
        return { rows: cached.rows, fromCache: true, offline: true };
      }

      // 3. لا اتصال ولا كاش
      return { rows: [], fromCache: false, offline: true };
    },

    /**
     * cacheImage — تخزين صورة محلياً كـ Base64 وإعادة Blob URL
     * @param {string} url — رابط الصورة الأصلي
     * @returns {string} — Blob URL محلي أو الرابط الأصلي عند الفشل
     */
    async cacheImage(url) {
      if (!url || url.startsWith('blob:') || url.startsWith('data:')) return url;

      // تحقق من الكاش أولاً
      const cached = await dbGet(STORE_IMG, url);
      if (cached && cached.dataUrl) {
        return cached.dataUrl;
      }

      // جلب الصورة وتحويلها
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) return url;
        const blob   = await res.blob();
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });

        // حفظ في الكاش (مع حد حجم 2MB للصورة)
        if (dataUrl.length < 2 * 1024 * 1024) {
          await dbPut(STORE_IMG, { url, dataUrl, cachedAt: Date.now() });
        }

        return dataUrl;
      } catch (e) {
        return url; // إعادة الرابط الأصلي عند الفشل
      }
    },

    /**
     * bulkPut — تحديث مجموعة من السجلات في الكاش دفعةً
     * @param {string} name   — اسم المجموعة
     * @param {Array}  items  — السجلات المراد تحديثها
     */
    async bulkPut(name, items) {
      if (!items || !items.length) return;
      const cacheKey = 'col_' + name;

      const cached = await dbGet(STORE_DATA, cacheKey);
      let rows = (cached && Array.isArray(cached.rows)) ? [...cached.rows] : [];

      // دمج/تحديث السجلات
      items.forEach(item => {
        const idx = rows.findIndex(r => r.id === item.id);
        if (idx >= 0) {
          rows[idx] = { ...rows[idx], ...item };
        } else {
          rows.push(item);
        }
      });

      await dbPut(STORE_DATA, { key: cacheKey, rows, savedAt: Date.now() });
    },

    /**
     * invalidate — مسح كاش مجموعة معينة لإجبار إعادة التحميل
     * @param {string} name — اسم المجموعة
     */
    async invalidate(name) {
      await dbDelete(STORE_DATA, 'col_' + name);
      await dbDelete(STORE_META, 'meta_' + name);
    },

    /**
     * clearAll — مسح كل الكاش
     */
    async clearAll() {
      try {
        const db = await openDB();
        [STORE_DATA, STORE_IMG, STORE_META].forEach(store => {
          const tx = db.transaction(store, 'readwrite');
          tx.objectStore(store).clear();
        });
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * getStats — إحصائيات الكاش
     */
    async getStats() {
      try {
        const db = await openDB();
        const counts = {};
        for (const store of [STORE_DATA, STORE_IMG, STORE_META]) {
          counts[store] = await new Promise(resolve => {
            const tx  = db.transaction(store, 'readonly');
            const req = tx.objectStore(store).count();
            req.onsuccess = () => resolve(req.result);
            req.onerror   = () => resolve(0);
          });
        }
        return counts;
      } catch (e) {
        return {};
      }
    }
  };

  // ── تصدير عالمي ─────────────────────────────────────────────
  window.GMTCache = GMTCache;

  // ── تشخيص سريع عند التحميل ──────────────────────────────────
  (async function () {
    try {
      await openDB();
      console.log('[GMTCache] ✅ IndexedDB جاهز');
    } catch (e) {
      console.warn('[GMTCache] ⚠️ IndexedDB غير متاح — سيعمل النظام بدون تخزين محلي:', e.message);
      // Fallback: In-memory cache only
      const _memCache = {};
      window.GMTCache = {
        async syncCollection({ name, table, sbConfig }) {
          const cacheKey = 'col_' + name;
          try {
            const path = `/rest/v1/${table}?order=id.asc&limit=10000`;
            const rows = await sbRequest(sbConfig, path);
            if (Array.isArray(rows)) {
              _memCache[cacheKey] = rows;
              return { rows, fromCache: false, offline: false };
            }
          } catch (err) {
            if (_memCache[cacheKey]) {
              return { rows: _memCache[cacheKey], fromCache: true, offline: true };
            }
          }
          return { rows: [], fromCache: false, offline: true };
        },
        async cacheImage(url) { return url; },
        async bulkPut(name, items) {
          const key = 'col_' + name;
          if (!_memCache[key]) _memCache[key] = [];
          items.forEach(item => {
            const idx = _memCache[key].findIndex(r => r.id === item.id);
            if (idx >= 0) _memCache[key][idx] = { ..._memCache[key][idx], ...item };
            else _memCache[key].push(item);
          });
        },
        async invalidate(name) { delete _memCache['col_' + name]; },
        async clearAll() { Object.keys(_memCache).forEach(k => delete _memCache[k]); },
        async getStats() { return { memory: Object.keys(_memCache).length }; }
      };
    }
  })();

})();


/* ── gmt-features.js ── */
;/* ═══════════════════════════════════════════════════════════════════════════
   gmt-features.js — 📚 سجل الميزات المركزي (Feature Registry) · v1.0 · 2026-07-17
   ─────────────────────────────────────────────────────────────────────────
   الفكرة (طلب المالك): تحويل البوتات من «أدوات منفصلة» إلى «نظام مراقبة واحد
   يفهم النظام». هذا الملف هو **مصدر المعرفة الموحّد**:
     • كل ميزة + ماذا تفعل + آلية عملها + كيف انبنت + كيف تُراقَب.
   تقرأه كل البوتات (الحارس · المفتّش · الفاحص الذاتي · التعليمي) ليعرفوا
   *ما يُفترض أن يحدث* فيكشفوا *ما لا يحدث*.

   ⚠️ هذا **ملف بيانات نقي** — لا منطق، لا يلمس أي كود قائم. آمن تماماً.
   إضافته لا تكسر شيئاً؛ البوتات تقرأه إن وُجد، وتعمل عادةً إن غاب.

   البنية لكل ميزة:
     id       : رمز البند الموثّق (PUR-1 …)
     title    : اسم مقروء
     what     : ماذا تفعل (بلغة المستخدم)
     how      : آلية عملها (تقنياً — للبوتات والمطوّر)
     built    : كيف انبنت / أين بالكود (للمراقبة والصيانة)
     watch    : كيف يراقبها الحارس/المفتّش (توقيع النجاح/الفشل)
     status   : done | partial | pending | conflict
     severity : لو مكسورة، خطورتها
     page     : الصفحة المعنية
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  window.GMT_FEATURES = [
    /* ─────────── المشتريات ─────────── */
    {
      id: 'PUR-1', title: 'منع مضاعفة الكميات', status: 'done', severity: 'critical', page: 'المشتريات',
      what: 'كل فاتورة شراء تُدخل الكمية مرة واحدة، لا مرتين.',
      how: 'مصدر واحد لكتابة الكميات هو syncTransitToInv الذي يعيد قراءة القيمة للتحقق. حُذفت الحلقة المكررة القديمة.',
      built: '06_المشتريات.html — syncTransitToInv (~2684). حُذفت حلقتا التعديل عند 2582–2603.',
      watch: 'المفتّش يكشف «كتابة مزدوجة» (نفس PATCH على نفس الصف خلال 3ث). لوحة التدقيق تكشف «زيادة غير مبرَّرة».'
    },
    {
      id: 'PUR-2', title: 'الترحيل الآمن + فكّ الختم', status: 'done', severity: 'critical', page: 'المشتريات',
      what: 'لا تُختم الفاتورة «واصلة» إلا بوصول كل القطع فعلياً. ويمكن فكّ ختم فاتورة خُتمت خطأً.',
      how: 'transfer_moved يتتبّع المُرحَّل فعلياً؛ الختم مشروط بمطابقة المُرحَّل للمطلوب. فكّ الختم يعيد الحالة لـtransit.',
      built: '06_المشتريات.html — markArrived/openArrivalModal/executeArrival. عمود transfer_moved بالقاعدة.',
      watch: 'الفاحص الذاتي: «فواتير مختومة لم تصل كمياتها». لوحة التدقيق: sealedNotMoved.'
    },
    {
      id: 'PUR-6', title: 'اختيار فرع الوجهة + ترحيل جزئي', status: 'done', severity: 'high', page: 'المشتريات',
      what: 'عند الوصول، تختار الفرع والكمية لكل صنف، ويمكن ترحيل جزء وإكمال الباقي لاحقاً.',
      how: 'نافذة openArrivalModal تعرض فروع الوجهة والكميات؛ الترحيل الجزئي يُسجَّل بـtransfer_moved بلا تكرار.',
      built: '06_المشتريات.html — openArrivalModal.',
      watch: 'المفتّش يسجّل خطوات الترحيل؛ عدم اتساق يظهر بلوحة التدقيق.'
    },
    {
      id: 'PUR-7', title: 'توزيع المصاريف على التكلفة', status: 'done', severity: 'high', page: 'المشتريات',
      what: 'الشحن والجمارك تُوزَّع على القطع بالتناسب مع قيمتها ⇒ تكلفة واصلة حقيقية.',
      how: 'computeLandedCosts يوزّع المصاريف نسبةً لقيمة كل سطر ويكتب cost_price = التكلفة الواصلة.',
      built: '06_المشتريات.html — computeLandedCosts + landed_cost بالـsnapshot.',
      watch: 'لا مراقبة آلية مباشرة — يُدقَّق يدوياً عبر تقرير العمولات.'
    },
    {
      id: 'PUR-4', title: 'مسودة الفاتورة المحلية', status: 'done', severity: 'medium', page: 'المشتريات',
      what: 'الفاتورة تُحفظ بالجهاز أثناء الكتابة؛ انقطاع النت لا يُضيّعها.',
      how: 'بوت GMTDraft (gmt-staff) يحفظ بـIndexedDB كل 4ث ويعرض الاستعادة عند العودة. يقرأ window.cart/invType/editId.',
      built: '✅ اكتمل فعلياً (2026-08-03): البوت كان موجوداً لكنه معطّل — الصفحة تصرّح cart بـlet (لا تُعلَّق على window) فكان snapshot يرجع null دائماً. صُحّح: cart/invType/editId على window (var).', watch: 'ما قد يفشل: لو أُعيد cart إلى let تنكسر المسودة. جرّب: اكتب فاتورة، أغلق التبويب، أعد الفتح ⇒ يجب أن تُعرض الاستعادة.'
    },

    /* ─────────── الجرد ─────────── */
    {
      id: 'INV-5', title: 'حماية تعديل الكمية اليدوي', status: 'done', severity: 'critical', page: 'الجرد',
      what: 'تعديل الكمية يدوياً يتطلب صلاحية سيادية + سبب إجباري + تسجيل.',
      how: 'المودال: حقول الكمية readonly إلا للسيادي. الجدول (startInlineEdit): بوّابة gmt_qty_unlock نفسها + تسجيل السبب بالمراقب.',
      built: '✅ اكتمل (2026-08-03): كان مسار الجدول (دابل-كليك) يتخطّى الحماية — أُغلق. الآن المساران محميّان + كل تعديل يُسجَّل بالسبب (rule OWN-QTY-MANUAL).',
      watch: 'ما قد يفشل: أي PATCH على عمود فرع في products بلا فكّ قفل سيادي = انتهاك INV-5 — يجب أن يرصده المفتّش. تحقّق أن التعديل بلا سبب مسجَّل لا يمرّ.'
    },
    {
      id: 'INV-6', title: 'قفل سعر الشراء بالجرد', status: 'done', severity: 'medium', page: 'الجرد',
      what: 'سعر الشراء لا يُعدَّل من الجرد — من فاتورة الاستيراد فقط (يحمي العمولات).',
      how: 'حقل cost_price مقفل بواجهة تعديل المنتج.',
      built: '03_الجرد.html — تعديل المنتج.', watch: 'المفتّش يكشف أي PATCH على cost_price من الجرد.'
    },
    {
      id: 'INV-9', title: 'لوحة التدقيق الذكية', status: 'done', severity: 'high', page: 'الجرد',
      what: 'تكشف 3 تناقضات: زيادة غير مبرَّرة · فواتير مختومة لم تصل · «بالطريق» بلا رصيد.',
      how: 'gmt-integrity.js يقارن مجموع الفواتير بالمخزون الفعلي ويُخرج الفروق.',
      built: 'gmt-integrity.js — stockGaps/sealedNotMoved/transitMissing.',
      watch: 'هذه الميزة نفسها أداة مراقبة — الفاحص الذاتي يستدعي منطقها.'
    },
    {
      id: 'INV-2', title: 'استيراد Excel', status: 'done', severity: 'medium', page: 'الجرد',
      what: 'قراءة ملف Excel ومطابقة المنتجات بالباركود.',
      how: 'مكتبة SheetJS (كانت غير محمّلة — أُصلح).',
      built: '03_الجرد.html + xlsx.', watch: 'الفاحص الذاتي يتحقق من تحميل المكتبة.'
    },
    {
      id: 'INV-3', title: 'طابعة الملصقات', status: 'done', severity: 'low', page: 'الجرد',
      what: 'بطاقات باركود + QR للمنتجات.',
      how: 'صفحة مستقلة طابعة_الملصقات.html.',
      built: '✅ الصفحة موجودة. أُصلح رابط الزر (2026-08-03): كان يشير لاسم قديم 18_طابعة_الملصقات.html.', watch: 'الفاحص يتحقق من وجود الملف.'
    },
    {
      id: 'INV-8', title: 'فرز المنتجات القديمة', status: 'done', severity: 'medium', page: 'الجرد',
      what: 'منتجات موجودة بلا فاتورة شراء ⇒ فاتورة أثرية تُرضي التدقيق دون لمس الكميات.',
      how: 'أداة بقائمة «المزيد» تُنشئ import_log بحالة arrived + transferred=true + transfer_moved يغطّي الكمية. التكلفة من cost_price المسجّل.',
      built: '✅ بُنيت (2026-08-03) في الجرد.html — مودال ath-modal + منطق مكتفٍ بذاته. لا تعدّل جدول products إطلاقاً.', watch: 'المراقب: يجب ألّا تتغيّر أي كمية بعد الفرز. التدقيق (inv_no_items) يجب أن ينقص.'
    },

    /* ─────────── نقطة البيع ─────────── */
    {
      id: 'POS-1', title: 'المرتجع', status: 'done', severity: 'high', page: 'نقطة البيع',
      what: 'إرجاع صنف يعيده للمخزون ويعكس العمولة.',
      how: 'أعمدة original_invoice_id/is_refund/refund_reason (معرّفة في _SQL/1️⃣) + إعادة المخزون عبر increment_branch_stock (_SQL/🔟).',
      built: '✅ العمود موجود بالمخطط الأساسي، والكود يفشل فشلاً ناعماً بلا تجميد إن غاب. لا يحتاج الملف الوهمي GMT_POS_FIXES.', watch: 'الفاحص يتحقق من فحص الإرجاعات السابقة.'
    },
    {
      id: 'POS-4', title: 'صلاحية البيع تحت التكلفة', status: 'done', severity: 'high', page: 'نقطة البيع',
      what: 'ممنوع البيع تحت سعر التكلفة (net_cost) على الكل، إلا: جهاز حلب (الشريك) · دور أدمن/سيادي · العروض المُسعّرة مسبقاً · الكوبونات على الإجمالي.',
      how: 'حارس موحّد gmtPriceGuard يُستدعى من كل مسارات تغيير السعر. gmtCanSellBelowCost = أدمن أو حلب.',
      built: '✅ أُصلح (2026-07-17): وُحّدت المسارات على gmtPriceGuard. updPriceCart يمنع ويُرجع السعر ويبلّغ المراقب. changePreviewPrice يمنع أصلاً.',
      watch: 'المراقب يسجّل كل محاولة بيع تحت التكلفة محظورة (OWN-BELOW-COST).'
    },
    {
      id: 'POS-ATOMIC', title: 'الخصم الذرّي للمخزون', status: 'ready', severity: 'critical', page: 'نقطة البيع',
      what: 'خصم المخزون بأمان يمنع ضياع كمية عند بيعين متزامنين.',
      how: 'RPC ذرّية decrement_branch_stock/increment_branch_stock (قفل صف FOR UPDATE) — تُرجعان الكمية الجديدة. عند تعذّر الاتصال فقط ترجع لـread-then-write.',
      built: '✅ حُلّ جذرياً (2026-08-03): أُنشئت الدالتان الذرّيتان في _SQL/🔟_دوال_المخزون_الموحّدة.sql (كانتا غير معرّفتين والملف GMT_POS_FIXES.sql وهمياً). add/deduct صارتا غلافَي توافق. يصبح ok فور تشغيل 🔟 على القاعدة.',
      watch: 'المراقب يسجّل استخدام fallback فقط عند انقطاع الشبكة (بعد تشغيل 🔟 يجب أن يختفي atomic_fallback).'
    },

    /* ─────────── الأدمن والعمولات ─────────── */
    {
      id: 'ADM-4', title: 'لا حذف نهائي للسجلّات المالية (إبطال بأثر)', status: 'done', severity: 'high', page: 'أدمن نقاط البيع',
      what: 'السجلّات المالية لا تُحذف نهائياً — تُبطَل/تُصفَّر مع من ومتى ولماذا، وتبقى للتدقيق.',
      how: 'العمولات: zeroComm (سبب إجباري + zeroed_by/at/reason). الديون والمصاريف: إبطال voided+void_reason/by/at (سبب إجباري) وتُخفى من القائمة — _SQL/1️⃣2️⃣.',
      built: '✅ العمولات + الديون + المصاريف (2026-08-03). ⏳ متبقٍّ: فاتورة الشراء import_log بالمشتريات ما زالت حذفاً نهائياً (مع نسخة احتياطية JSON) — يُحوَّل لإبطال بمتابعة.',
      watch: 'ما قد يفشل: أي DELETE مباشر على gmt_manual_debts/gmt_expenses/invoice_commissions = انتهاك ADM-4. يجب أن يرصده المفتّش. تحقّق أن الإبطال يكتب سبباً.'
    },
    {
      id: 'POS-PROFIT', title: 'رقم ربح الكاشير بالسجل', status: 'done', severity: 'low', page: 'نقطة البيع',
      what: 'كل فاتورة بسجل الكاشير تعرض ربحه برقم كبير معزول. شفافيته تعكس المراجعة: واضح=معتمدة · شبه شفاف=قيد المراجعة.',
      how: 'inv._comm_amount + gmtCommState. opacity حسب الحالة.',
      built: '✅ أُضيف (2026-07-17) بـrenderInvoiceHistory. الكاشير يرى ربحه، الأدمن يرى ربح الشركة.',
      watch: 'لا مراقبة — عرض للكاشير.'
    },
    {
      id: 'ADM-PROFIT', title: 'تصنيف ربح الفاتورة (لون)', status: 'done', severity: 'medium', page: 'أدمن نقاط البيع',
      what: 'لون الفاتورة عند الأدمن يعكس ربح الشركة الحقيقي = (سعر البيع − سعر الشراء) − العمولة، لكل قطعة.',
      how: 'estimateProfitClass تحسب من inv.items بدقة (لا من فرضية العمولة×2). أحمر=لا ربح · أخضر=ربح جيد.',
      built: '✅ أُصلح M-1 (2026-07-17): استبدال الفرضية بالحساب الحقيقي. الكاشير يرى ربحه (نصف فرق الجملة)، الأدمن يرى ربح الشركة.',
      watch: 'المراقب يمكنه رصد تصنيف ربح شاذّ.'
    },
    {
      id: 'ADM-1', title: 'زر الجولة التعليمية', status: 'done', severity: 'medium', page: 'أدمن نقاط البيع',
      what: 'زر يفتح النظام التعليمي (كان ميتاً).',
      how: 'restartTour يفتح gmt-guide.', built: '04_أدمن — restartTour.', watch: 'الفاحص يتحقق من تعريف الدالة.'
    },
    {
      id: 'SETTLE', title: 'التسويات ومنع التحصيل المزدوج', status: 'done', severity: 'high', page: 'التسويات',
      what: 'كل عمولة تُدفع تُختم برقم تسوية لمنع دفعها مرتين. وحساب صندوق كل فرع.',
      how: 'gmt-settlements.js: compute يفصل المُعلّق/المستحق/المدفوع؛ stampPay يختم بـpaid=true.',
      built: '✅ الصندوق صحيح (cashBox = sales − moved = الموجود حالياً، تحقّق 2026-07-17). يبقى H-1: الختم يعتمد فلترة بالذاكرة لا WHERE paid=false بالقاعdة.',
      watch: 'المفتّش يرصد ختم عمولة مدفوعة مسبقاً.',
      note: 'C-3 كان إنذاراً كاذباً — الصندوق يعرض الموجود فعلاً. يبقى H-1 (idempotency).'
    },

    /* ─────────── الأوردرات ─────────── */
    {
      id: 'ORD-1', title: 'رسائل تيليغرام للأوردرات', status: 'done', severity: 'medium', page: 'الأوردرات',
      what: 'تحديث الطلب يعدّل رسالة تيليغرام بدل إرسال جديدة.',
      how: 'عمود tg_msg_id يخزّن معرّف الرسالة.',
      built: 'gmt_orders.tg_msg_id (SQL) + منطق الأوردرات.', watch: 'المفتّش يرصد فشل تحديث تيليغرام.'
    },
    {
      id: 'ORD-2', title: 'عدّاد أرقام الأوردرات', status: 'done', severity: 'critical', page: 'الأوردرات',
      what: 'كل أوردر يأخذ رقماً تسلسلياً فريداً.',
      how: 'RPC increment_settings_counter بقفل for update (نسخة ORDERS_FIXES).',
      built: '✅ أُصلح (2026-07-17): نسخة واحدة بعمود value + قفل for update + DROP تلقائي. نسخة MASTER الخاطئة أُزيلت.',
      watch: 'الفاحص الذاتي يتحقق من استجابة الدالة (probe-counter).'
    },
    {
      id: 'ORD-5', title: 'مساءلة الأوردرات', status: 'done', severity: 'high', page: 'الأوردرات',
      what: 'من أنشأ/عدّل/حذف كل طلب + حذف ناعم + سجل تدقيق.',
      how: 'created_by/deleted_at + audit_log.',
      built: 'gmt_orders (SQL) + منطق الأوردرات.', watch: 'المفتّش يتحقق أن كل حذف يكتب deleted_by.'
    },
    {
      id: 'ORD-6', title: 'متابعة الطلبات المتأخرة', status: 'done', severity: 'medium', page: 'الأوردرات',
      what: 'أي طلب غير مكتمل تجاوز 5 أيام يظهر بقائمة المتابعة.',
      how: 'فلترة بالحالة والتاريخ.', built: '05_الأوردرات.html.', watch: 'ميزة عرض — لا مراقبة.'
    },

    /* ─────────── الكفالة والتتبّع ─────────── */
    {
      id: 'STORE-COUPON', title: 'الكوبونات بالمتجر', status: 'done', severity: 'medium', page: 'المتجر · نقطة البيع',
      what: 'الزبون يطبّق كوبونه بالمتجر فوراً؛ عند تحويل الأوردر لفاتورة كاشير ينتقل الكوبون مع الاسم والرقم ويُختم هناك.',
      how: 'validateStoreCoupon بالمتجر يحفظ coupon بالأوردر. selectExistingOrder بنقطة البيع ينقله لحقل الكوبون. markCouponUsedInPOS يختمه عند الحفظ.',
      built: '✅ أُضيف (2026-07-17). الكوبون يُختم مرة واحدة فقط (عند فاتورة الكاشير، لا المتجر). ختم **ذرّي مشروط** (2026-08-04): يُمنع الاستهلاك المزدوج عند بيعين متزامنين.',
      watch: 'ما قد يفشل: سباق استهلاك. المراقب يرصد «كوبون استُعمل مرّتين» (OWN-COUPON-ONCE) إن فشل الختم الذرّي.'
    },
    {
      id: 'BRIDGE-LINK', title: 'ربط الجرد بالمتجر (الجسر)', status: 'done', severity: 'medium', page: 'الجسر',
      what: 'أداة موحّدة تربط منتجات الجرد بمنتجات المتجر عبر الباركود، مع مزامنة سعر وفروقات.',
      how: 'الجسر (3 تبويبات) هو المصدر الوحيد للربط اليدوي؛ الجرد يفوّض إليه عبر openBridgeTool. الربط يكتب barcode+price بالمتجر و store_url+price بالجرد.',
      built: '✅ موحّد. متبقٍّ dedup: مزامنة السعر (syncPriceToStore بالجرد ↔ msSyncPrice بالجسر) توحَّد لاحقاً (R5).',
      watch: 'ما قد يفشل: تحديث المتجر يعيد كتابة الكتالوج كله (نموذج بيانات المتجر — انظر STORE-MODEL).'
    },
    {
      id: 'STORE-MODEL', title: '⚠️ نموذج بيانات المتجر (توسّع)', status: 'conflict', severity: 'critical', page: 'المتجر · الجسر',
      what: 'المتجر يجب أن يتوسّع لآلاف المنتجات دون فقدان بيانات.',
      how: 'المطلوب: جدول منتجات (صفّ لكل منتج) مع كتابة ذرّية للصف المتغيّر فقط.',
      built: '⚠️ الحالي: كامل الكتالوج في صفٍّ واحد JSON (store?id=eq.1). كل كتابة تعيد كتابة الكل ⇒ لا يتوسّع + آخر-كتابة-تفوز (ضياع بيانات متزامنة).',
      watch: 'بند كبير R-STORE-MODEL — يُناقش عند مراجعة المتجر. يفرضه الدستور (التوسّع).'
    },
    {
      id: 'BACKUP-FULL', title: 'الاستعادة الكاملة', status: 'done', severity: 'high', page: 'النسخ الاحتياطي',
      what: 'من نسخة احتياطية إلى نظام شغّال فوراً: ملفات بنية كاملة لكل قاعدة + استعادة البيانات.',
      how: 'مجلد 07_SQL_استعادة_كاملة فيه بنية كل قاعدة موحّدة بالترتيب الصحيح. النسخة تحوي البيانات + دليل.',
      built: '✅ أُضيف (2026-07-17). البنية (SQL) + البيانات (النسخة) = نظام فوري. البديل الأضمن: Supabase Backups.',
      watch: 'الفاحص الذاتي يتحقق من اكتمال الجداول بعد الاستعادة.'
    },
    {
      id: 'WAR-1', title: 'الكفالة الجديدة', status: 'done', severity: 'high', page: 'إنشاء الكفالة',
      what: 'نظام كفالة كامل: 3 باقات · تفعيل بتوقيع بيومتري · PDF · تيليغرام.',
      how: 'نُسخ حرفياً من ملف المالك القديم + أُضيف الحارس والهوية فقط (صفحة زبون).',
      built: '10_إنشاء_الكفالة.html (2170 سطر). brand + bugcatcher فقط.',
      watch: 'الحارس يرصد أخطاء الزبون. ⚠️ توكن تيليغرام مكشوف بالكود (H-4).'
    },
    {
      id: 'WAR-2', title: 'البحث بالرقم التسلسلي', status: 'done', severity: 'medium', page: 'بحث الكفالة',
      what: 'الزبون يبحث بالرقم أو الفاتورة أو التسلسلي.',
      how: 'استعلام بثلاثة مفاتيح.', built: '12_بحث_الكفالة.html.', watch: 'الحارس يرصد أخطاء البحث.'
    },
    {
      id: 'TRK-1', title: 'تتبّع الشحنة', status: 'done', severity: 'medium', page: 'تتبع الشحنة',
      what: 'الزبون يتتبّع شحنته برقمها.',
      how: 'ربط برقم الشحنة من الأوردر.', built: '16_تتبع_الشحنة.html.', watch: 'الحارس فقط.'
    },

    /* ─────────── الأمان ─────────── */
    {
      id: 'SEC-1', title: 'حماية RLS على القاعدة', status: 'done', severity: 'critical', page: 'كل النظام',
      what: 'قاعدة البيانات تمنع الحذف وتضبط القراءة/الكتابة بمفتاح anon.',
      how: 'حلقة تفعّل RLS على الجداول الأساسية بسياسات read/write/edit بلا delete.',
      built: '⚠️ GMT_MASTER_SCHEMA — لكن يفعّل RLS على audit_log الذي يُنشأ بملف آخر (ACCOUNTING_GUARDS). لو شُغّل بترتيب خاطئ، audit_log بلا حماية.',
      watch: 'الفاحص الذاتي: اختبار كتابة حقيقي يكشف صمت RLS.',
      note: 'SQL-2 مُصلح: الترتيب موثّق بخطة تشغيل SQL.'
    },
    {
      id: 'SEC-SOV', title: 'حراسة الأدمن السيادي', status: 'conflict', severity: 'critical', page: 'الأدمن السيادي',
      what: 'أعلى صلاحية بالنظام يجب أن تكون محميّة بحاجز حقيقي.',
      how: 'المفترض: تحقق على القاعدة (RLS/دور).',
      built: '⚠️ 13_الأدمن_السيادي.html:199 — كلمة سر افتراضية 0000، client-side، قابلة للتجاوز من F12.',
      watch: 'يجب نقل الحراسة للقاعdة. الفاحص يحذّر من الاعتماد على القفل الحالي.',
      note: 'C-1: أخطر ثغرة أمنية.'
    },

    /* ─────────── البوتات نفسها ─────────── */
    {
      id: 'BOT-2', title: 'الحارس (جامع الأخطاء)', status: 'done', severity: 'high', page: 'كل النظام',
      what: 'كل خطأ يحدث لأي مستخدم يصل الإدارة تلقائياً، صامت للكاشير.',
      how: 'يعترض onerror/unhandledrejection/fetch ويرسل لـerror_log.',
      built: 'gmt-bugcatcher.js.', watch: 'هو أداة المراقبة نفسها.'
    },
    {
      id: 'BOT-3', title: 'المفتّش (الأخطاء الصامتة)', status: 'done', severity: 'high', page: 'كل النظام',
      what: 'يكشف: زر بلا أثر · كتابة لم تُطبَّق · كتابة مزدوجة · بطء · ميزات لم تُجرَّب.',
      how: 'يبصم الصفحة قبل/بعد الضغط، ويعيد قراءة الكتابات للتحقق. يقرأ GMT_FEATURES للتغطية.',
      built: 'gmt-inspector.js.', watch: 'هو أداة المراقبة نفسها.'
    },
    {
      id: 'BOT-SELFTEST', title: 'الفاحص الذاتي', status: 'done', severity: 'high', page: 'كل النظام',
      what: 'يشغّل 30+ فحصاً على القاعدة والصلاحيات والمخزون ويقول ماذا تفعل.',
      how: 'يفحص وجود الأعمدة/الجداول + اختبار كتابة + سلامة المخزون.',
      built: 'gmt-selftest.js.', watch: 'يقرأ هذا السجل ليعرف ما يفحص.'
    },
    {
      id: 'SEC-XSS', title: 'تنظيف مدخلات المستخدم (XSS)', status: 'done', severity: 'medium', page: 'المتجر · نقطة البيع',
      what: 'كل ما يُدخله المستخدم (اسم منتج، بحث الزبون، ملاحظات، سبب) يُنظَّف قبل عرضه.',
      how: 'دوال escHtml/escH/eh تُطبَّق على كل innerHTML يدمج مدخلات.',
      built: 'أُصلح M-2 (2026-07-17): نُظّف بحث الزبون واسم المنتج بالمتجر + سبب التصفير.',
      watch: 'الحارس يرصد أخطاء runtime.'
    },
    {
      id: 'BOT-AUTOTEST', title: 'الفاحص الشامل الآلي', status: 'done', severity: 'high', page: 'كل النظام',
      what: 'يشغّل النظام كله كأنه مستخدم: يجرّب كل زر · كل معاينة رقمية · كل طباعة · كل شكل، ويسجّل النتائج.',
      how: 'يفرض الوضع التدريبي (حاجز مزدوج) ثم يضغط كل زر ويقارن الحالة قبل/بعد. الأزرار الخطيرة بحاجز ثلاثي.',
      built: 'gmt-autotest.js. تلقائي بعد كل نشر + زر يدوي 🤖. يقرأ سجل الميزات ليحكم على منطقية النتائج.',
      watch: 'يبلّغ المراقب السيادي بكل زر ميت أو نتيجة شاذّة.'
    },
    {
      id: 'INSPECTOR-CENTER', title: 'مركز الفحص الشامل', status: 'done', severity: 'high', page: 'مركز الفحص',
      what: 'زر واحد يفتح كل صفحة داخل إطار ويفحصها آلياً: كل زر · رابط · صورة · حقل · التنسيق (تراكب/طفح/خارج الشاشة) · أخطاء الكونسول · تنسيق العقود.',
      how: 'صفحة 21_مركز_الفحص_الشامل.html — تفتح 18 صفحة تباعاً بـiframe (نفس الموقع = وصول كامل) وتجمع تقريراً موحّداً قابلاً للنسخ.',
      built: '✅ أُضيف (2026-07-20) بطلب المالك: أداة مركزية تراجع الملفات صفحة صفحة زرّاً زرّاً.',
      watch: 'تكشف الأزرار الميتة والتنسيق المكسور والصور المفقودة عبر كل الصفحات.'
    },
    {
      id: 'KNOWLEDGE-CENTER', title: 'مركز المعرفة الموحّد', status: 'done', severity: 'high', page: 'مركز المعرفة',
      what: 'ملف واحد ينتشر مع النظام يحوي كل شيء: البوتات · التعليم · التجريب · تقارير الأخطاء · التوثيق · سجل التعديلات · دليل المستخدم · السجلات.',
      how: 'يقرأ سجل الميزات وقواعد المالك حيّاً، ويجمع كل التوثيق بتبويبات. يشغّل الاختبارات والتقارير مباشرة.',
      built: '✅ أُضيف ومُقوّى (2026-07-17): 20_مركز_المعرفة.html — يقرأ كل التقارير والدليل والسجلات فعلياً (fetch) + التوثيق منشور بجانبه. 9 تبويبات.',
      watch: 'يعرض حالة كل ميزة وكل تقرير حيّاً، ويقرأ الملفات مباشرة.'
    },
    {
      id: 'BOT-INTEGRATION', title: 'اختبارات الترابط', status: 'done', severity: 'high', page: 'كل النظام',
      what: 'يفحص تدفّق البيانات بين الوحدات: المشتريات→الجرد · الجرد→المتجر · البيع→العمولة · العمولة→التسوية · الأوردر→الفاتورة · الكوبون(المتجر→الكاشير) · الكفالة→الفاتورة.',
      how: 'كل ترابط له فحص يقرأ القاعدتين المعنيّتين ويتأكد أن البيانات متّسقة. الترابط المكسور يُبلَّغ للمراقب.',
      built: 'gmt-integration-tests.js. يُشغَّل من صفحة الحماية أو ضمن الفاحص الشامل.',
      watch: 'يبلّغ المراقب بأي ترابط مكسور (kind=operational).'
    },
    {
      id: 'VISIBILITY', title: 'التحكّم بالظهور', status: 'done', severity: 'high', page: 'كل الصفحات',
      what: 'يخفي كل أزرار البوتات عن المستخدم العادي. يبقى الوضع التدريبي فقط. زر تقارير واحد بالصفحة الرئيسية للمالك.',
      how: 'gmt-visibility.js — يخفي الأزرار العائمة بصرياً. التسجيل يستمر بالخلفية (كل نقرة/خطأ/استعمال يُخزّن). بوابة التقارير للمالك فقط (دور admin أو reports=1).',
      built: '✅ أُضيف (2026-07-24) بطلب المالك: البوتات مستقلة تماماً، غير مرئية، وصول واحد، تشرح وتسجّل كل شيء.',
      watch: 'الإخفاء بصري فقط — البوتات تعمل وتسجّل كالمعتاد بالخلفية.'
    },
    {
      id: 'MASTER-REPORT', title: 'المصبّ الموحّد', status: 'done', severity: 'critical', page: 'كل الصفحات',
      what: 'كل الأخطاء من كل البوتات تصبّ في تقرير واحد قابل للنسخ ويُخزَّن ويتراكم. فحص تلقائي فور فتح الصفحة + زر إعادة فحص يعمل فعلياً.',
      how: 'gmt-master-report.js — زر 🎯. التقرير يوثّق: ماذا فُحص · كيف فُحص · النتيجة · وما لم يُفحص ولماذا وكيف يُفحص.',
      built: '✅ أُضيف (2026-07-23) بطلب المالك: مصبّ واحد لكل شيء. يشمل عمق الفحص (كامل/متوسط/سطحي) ليعرف المطوّر ما بقي.',
      watch: 'نقطة واحدة تجمع كل شيء — لا حاجة لجمع تقارير متفرقة.'
    },
    {
      id: 'CODE-SENTINEL', title: 'حارس الكود الاستباقي', status: 'done', severity: 'high', page: 'صفحات الموظف',
      what: 'يفحص الكود فور تحميل الصفحة ويكشف المخاطر قبل أن يلمسها المستخدم: أزرار بدوال مفقودة · صور مكسورة · معالجات تشير لدوال غير معرّفة.',
      how: 'gmt-code-sentinel.js — يفحص كل onclick ويتأكد أن دالته معرّفة (بفحصين: فوري + بعد اكتمال السكربتات). يبلّغ المراقب فوراً.',
      built: '✅ أُضيف (2026-07-21): يكمّل الحارس (bugcatcher) — ذاك ينتظر الخطأ، وهذا يكتشفه استباقياً. لا حاجة لمبرمج يراجع الكود يدوياً.',
      watch: 'يمسك الأزرار الميتة والدوال المفقودة قبل أن يضغطها موظف.'
    },
    {
      id: 'MONEY-GUARD', title: 'الحارس المالي الرياضي', status: 'done', severity: 'critical', page: 'صفحات الموظف',
      what: 'يعيد حساب كل عملية مالية بنفسه (عمولة · ربح · إجمالي · تحت التكلفة) ويقارن بما سجّله النظام. أي فرق ⇒ يبلّغ المراقب فوراً.',
      how: 'gmt-money-guard.js — يعترض حفظ الفواتير، يحسب من المبادئ الأولى، يقارن ضمن حد تقريب القروش. القواعد (النسب/الحدود) يضبطها المالك مرة عبر GMT_MONEY_RULES.',
      built: '✅ أُضيف (2026-07-21): أقصى حد عملي — يفرض قواعد المالك المالية بصرامة دون مراجعة يومية. اختبار ذاتي 4/4.',
      watch: 'يكشف أي رقم مالي خاطئ رياضياً — العين البشرية تحتاج فقط لوضع القواعد مرة، لا لمراجعة كل فاتورة.'
    },
    {
      id: 'BOT-WARDEN', title: 'المراقب السيادي', status: 'done', severity: 'critical', page: 'كل صفحات الموظف',
      what: 'العقل المركزي للحماية: يقرأ الميزات وقواعد المالك، يراقب حيّاً، يكتب تقارير حوادث (ماذا/متى/أين/من/كيف/لماذا/الخطورة/فرق المال).',
      how: 'gmt-warden.js (378 سطر). دفتر المال لا يُمسح أبداً. زر 🛡️ للأدمن. اختبارات وهمية ذاتية.',
      built: 'يستقبل البلاغات من كل البوتات ويوحّدها بتقرير واحد. window.GMTWarden.',
      watch: 'هو المراقب نفسه — يسجّل كل مخالفة لقواعد المالك.'
    },
    {
      id: 'BOT-SANDBOX', title: 'الوضع التدريبي', status: 'done', severity: 'high', page: 'كل صفحات الموظف',
      what: 'يحاكي القاعدة محلياً بالكامل — كل كتابة تذهب لقاعdة وهمية بالمتصفح، لا تمسّ الحقيقية. أساس أمان الفاحص الشامل.',
      how: 'gmt-sandbox.js (454 سطر) يعترض fetch. window.GMTSandbox.active. يمنع الرسائل الخارجية (واتساب/بريد).',
      built: 'للتدريب الآمن + حاجز أمان الفاحص الشامل. يدخل/يخرج بأمر.',
      watch: 'يضمن ألا يمسّ أي اختبار البيانات الحقيقية.'
    },
    {
      id: 'BOT-HEALTH', title: 'مراقب الصحة', status: 'done', severity: 'medium', page: 'كل صفحات الموظف',
      what: 'يرسل كل خطأ يحدث إلى جدول gmt_telemetry ليراه الأدمن بلوحة مركزية. صحة النظام الحيّة.',
      how: 'gmt-health.js (324 سطر) + gmt-health-panel.js للعرض. يلتقط أخطاء runtime ويصنّفها.',
      built: 'مراقبة صحة مستمرة. التقارير بجدول gmt_telemetry.',
      watch: 'يكمّل المراقب السيادي بمراقبة الأخطاء التقنية.'
    },
    {
      id: 'BOT-CACHE', title: 'مدير التخزين المؤقت', status: 'done', severity: 'low', page: 'كل النظام',
      what: 'يسرّع تحميل البيانات المتكررة ويقلّل طلبات القاعدة.',
      how: 'gmt-cache.js (340 سطر). window.GMTCache.',
      built: 'تحسين أداء — يخزّن البيانات الثابتة مؤقتاً.',
      watch: 'لا يخزّن بيانات مالية حسّاسة.'
    },
    {
      id: 'BOT-INTEGRITY', title: 'حارس السلامة', status: 'done', severity: 'medium', page: 'كل صفحات الموظف',
      what: 'يتحقق من سلامة البيانات وتماسكها (لا قيم متناقضة، لا حسابات مكسورة).',
      how: 'gmt-integrity.js.',
      built: 'فحص تماسك مستمر يكمّل المفتّش.',
      watch: 'يبلّغ المراقب عن أي تناقض بيانات.'
    },
    {
      id: 'BOT-GUIDE', title: 'الدليل التعليمي التفاعلي', status: 'done', severity: 'low', page: 'كل صفحة',
      what: 'جولة تعليمية سينمائية لكل صفحة تشرح كل زر ووظيفة. لكل صفحة دليلها (gmt-guide-*.js).',
      how: 'gmt-guide.js + 9 ملفات guide لكل صفحة + gmt-scenarios + gmt-training + gmt-welcome + gmt-tour.',
      built: 'تعليم المستخدم خطوة بخطوة. زر الجولة بكل صفحة.',
      watch: 'لا يراقب — تعليمي.'
    },
    {
      id: 'BOT-OFFERS', title: 'أداة العروض', status: 'done', severity: 'medium', page: 'أدمن المتجر · نقطة البيع',
      what: 'إنشاء وإدارة العروض (منتجات بسعر خاص) التي تظهر بالمتجر ونقطة البيع، مع أهداف النشر.',
      how: 'gmt-offers-tool.js (572 سطر) + جدول gmt_offers. العرض مُسعّر مسبقاً (معفى من حظر البيع تحت التكلفة).',
      built: 'أداة كاملة لإدارة العروض. window يفتح واجهتها.',
      watch: 'العروض تُطبّق أسعارها كما حدّدها الأدمن.'
    },
    {
      id: 'BOT-BRAND', title: 'محرّك الهوية', status: 'done', severity: 'medium', page: 'كل النظام',
      what: 'يوحّد لون البوتات من هويتك ويعالج الصور المكسورة بشعارك الحقيقي.',
      how: 'يقرأ --gmt-red من الثيم؛ لا يلمس التصميم.',
      built: 'gmt-brand.js.', watch: 'لا يراقب — يخدم البوتات.'
    }
  ];

  /* دالة مساعدة للبوتات: أعطني الميزات حسب الحالة */
  window.GMT_FEATURES.byStatus = function (st) {
    return window.GMT_FEATURES.filter(function (f) { return f.status === st; });
  };
  window.GMT_FEATURES.get = function (id) {
    return window.GMT_FEATURES.filter(function (f) { return f.id === id; })[0] || null;
  };
}());


/* ── gmt-owner-requests.js ── */
;/* ═══════════════════════════════════════════════════════════════════════════
   gmt-owner-requests.js — 📜 قاعدة طلبات المالك · v1.0 · 2026-07-17
   ─────────────────────────────────────────────────────────────────────────
   طلب المالك: «البوتات تعرف شو طلبي وكيف طلبته، عندها كل القاعدة».
   هذا الملف يوثّق كل قاعدة/طلب/قرار للمالك، بصيغة تقرأها البوتات لتراقب
   *على أساس نية المالك* لا مجرد الكود. إن رأى المراقب سلوكاً يخالف هذه
   القواعد، يكتب تقريراً فورياً.

   ⚠️ ملف بيانات نقي — لا منطق، آمن تماماً.

   لكل قاعدة:
     id      : رمز
     rule    : القاعدة كما طلبها المالك (حرفياً قدر الإمكان)
     why     : لماذا طلبها (السياق)
     check   : كيف يتحقق المراقب من احترامها (توقيع المخالفة)
     severity: خطورة المخالفة
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  window.GMT_OWNER_RULES = [
    {
      id: 'OWN-STOCK-TRUTH',
      rule: 'المخزون حقيقة مقدّسة: كل كمية مصدرها فاتورة. لا زيادة بلا فاتورة، لا نقص بلا بيع/نقل.',
      why: 'فوضى المخزون (المضاعفة) كانت المشكلة الأصلية التي بُني النظام لحلّها.',
      check: 'أي تغيّر بالمخزون لا يقابله فاتورة/بيع/نقل/تعديل سيادي مسجَّل = مخالفة حرجة.',
      severity: 'critical'
    },
    {
      id: 'OWN-MONEY-TRACE',
      rule: 'كل قرش له أثر: أي خصم أو إضافة مالية يجب أن يُسجَّل — ولا يضيع حتى لو أُصلح الخطأ لاحقاً.',
      why: 'المالك: «لو صار شيء منخصم أو منضاف، ما يضيع — نسجّله ونصلحه بعد التحديث».',
      check: 'أي فرق مالي (عمولة/سعر/رصيد) بين المتوقّع والفعلي يُسجَّل بتقرير مستقل يبقى حتى بعد الإصلاح.',
      severity: 'critical'
    },
    {
      id: 'OWN-NO-SILENT',
      rule: 'لا خطأ صامت: أي فشل — حتى لو لم يُظهر رسالة — يجب أن يُلتقط ويُبلَّغ.',
      why: 'الأخطاء الصامتة (زر بلا أثر، كتابة لم تُطبَّق) دمّرت المخزون شهوراً بلا أن يدري أحد.',
      check: 'المفتّش يرصد dead_click/silent_write/double_write ويكتبها فوراً.',
      severity: 'high'
    },
    {
      id: 'OWN-ACCOUNTABILITY',
      rule: 'المساءلة قبل الحذف: لا حذف نهائي. كل عملية حسّاسة تُسجَّل باسم من نفّذها ووقتها وسببها.',
      why: 'حماية من التلاعب والتستّر على العجز.',
      check: 'أي حذف/تصفير/تعديل حسّاس بلا (من+متى+سبب) = مخالفة.',
      severity: 'high'
    },
    {
      id: 'OWN-SOVEREIGN-REAL',
      rule: 'الصلاحية السيادية حقيقية: تعديل الكميات والعمليات الخطيرة تتطلب صلاحية فعلية + سبب.',
      why: 'المالك وثّق INV-5 صراحةً؛ يجب أن يكون منفَّذاً لا مدّعىً.',
      check: 'أي تعديل كمية/عملية سيادية بلا بوابة صلاحية + سبب = مخالفة (INV-5 حالياً مكسور).',
      severity: 'critical'
    },
    {
      id: 'OWN-BELOW-COST',
      rule: 'لا بيع تحت التكلفة إلا بصلاحية: يُمنع فعلياً لا يُحذَّر منه فقط.',
      why: 'المالك يريد منعاً حقيقياً؛ POS-4 موثّق كمنع.',
      check: 'أي بيع بسعر < cost_price بلا صلاحية = مخالفة تُسجَّل بقيمة الخسارة.',
      severity: 'high'
    },
    {
      id: 'OWN-DESIGN-UNTOUCHED',
      rule: 'البوتات لا تلمس التصميم: الهوية والألوان والشعار للمالك — البوتات تراقب فقط.',
      why: 'المالك: «البوت للبوتات فقط، ما يغيّر شي مصمّم».',
      check: 'أي كتابة على ألوان/خطوط/شعار عناصر التصميم من بوت = مخالفة (حالياً محترمة).',
      severity: 'medium'
    },
    {
      id: 'OWN-CUSTOMER-PAGES',
      rule: 'صفحات الزبون خفيفة: حارس + هوية فقط. لا تعليمي/مفتّش/فاحص للزبون.',
      why: 'الزبون لا يرى أدوات الموظفين.',
      check: 'أي صفحة زبون (متجر/كفالة/موقع/تتبّع) تحمّل بوتات الموظف = مخالفة.',
      severity: 'low'
    },
    {
      id: 'OWN-SQL-ORDER',
      rule: 'ترتيب SQL صحيح: audit_log قبل RLS، والدالة الصحيحة للعدّاد.',
      why: 'خطأ الترتيب يترك المساءلة بلا حماية ويكسر ترقيم الأوردرات (SQL-1/SQL-2).',
      check: 'الفاحص الذاتي يتحقق من نوع دالة العدّاد ووجود audit_log مع RLS.',
      severity: 'critical'
    }
  ];
}());


/* ── gmt-bugcatcher.js ── */
;/* ═══════════════════════════════════════════════════════════════════════
   gmt-bugcatcher.js — الحارس 🐞 v3
   يُرفع بجانب كل صفحة ويُستدعى **أول شيء** بالرأس (قبل أي سكربت آخر).

   ما تغيّر عن v2 (وهو سبب أن أخطاءك عاشت شهوراً بلا دليل):
   ① 💾 يحفظ فعلاً — v2 كان يخزّن بالذاكرة فقط، فأي تحديث أو تعليق للصفحة
      يمسح التقرير. v3 يحفظ بـlocalStorage ويصمد عبر الجلسات.
   ② 🤫 وضع صامت — الكاشير لا يرى زر 🐞 ولا أي نافذة. يسجّل بالخلفية فقط.
   ③ 📡 يرسل للأدمن — كل خطأ يذهب لجدول gmt_telemetry، فتراه أنت بلوحة
      «صحة النظام» لحظياً من كل نقاط البيع، بلا أن يخبرك أحد.
   ④ 🧬 يكشف أعطالاً كان يفوّتها:
      • كتابتان على **نفس الصف** خلال ثانيتين (هذا بالضبط نمط مضاعفة فاتورة
        الشراء — لو كان موجوداً لَكُشِف من أول فاتورة).
      • عمود مفقود بالقاعدة (PGRST204 / 42703) — يترجمها لرسالة مفهومة.
      • تجميد الواجهة (Freeze) عبر نبض rAF.
      • كتابة نجحت شكلاً ولم تُعدّل أي صف.
      • زر بلا أثر · بطء · تكرار · مخزون لم يُخصم.

   التعريف بالمستخدم (سطر واحد بكل صفحة بعد تسجيل الدخول):
      GMTBug.identify({ user:'محمد', branch:'حلب', role:'cashier', page:'نقطة البيع', pageId:'pos' });
   فتح اللوحة يدوياً (للأدمن/الدعم): Ctrl+Shift+B  أو  ضغطة مطوّلة على اللوجو.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.GMTBug && window.GMTBug.version >= 3) return;

  /* ─────────── الإعدادات ─────────── */
  const MAX_LOCAL = 400;
  const LS_KEY = 'gmt_bugs_v3';
  const SS_KEY = 'gmt_session_v3';
  const FLUSH_MS = 12000;
  const SEV_AR = { crit: '🔴 حرج', warn: '🟠 تحذير', info: '🔵 ملاحظة' };

  const t0 = Date.now();
  let queue = [];              // بانتظار الإرسال
  let errors = [];             // كل ما بهذا الجهاز (يصمد)
  let ident = { user: '', branch: '', role: '', page: document.title || '', pageId: '' };
  let silent = true;           // 🔒 صامت افتراضاً حتى يثبت أن المستخدم أدمن (كان false ⇒ الكاشير يرى الزر)

  /* ─────────── الجلسة ─────────── */
  const sid = (function () {
    try {
      let s = sessionStorage.getItem(SS_KEY);
      if (!s) { s = 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); sessionStorage.setItem(SS_KEY, s); }
      return s;
    } catch (_) { return 'S' + Date.now().toString(36); }
  })();

  /* ─────────── التخزين الدائم ─────────── */
  function load() { try { errors = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (_) { errors = []; } }
  function persist() {
    try {
      if (errors.length > MAX_LOCAL) errors = errors.slice(-MAX_LOCAL);
      localStorage.setItem(LS_KEY, JSON.stringify(errors));
    } catch (_) { /* الحصة ممتلئة — نُبقي الأحدث */ try { errors = errors.slice(-100); localStorage.setItem(LS_KEY, JSON.stringify(errors)); } catch (__) {} }
  }
  load();

  /* ─────────── إعدادات القاعدة (تكتشف نفسها من الصفحة) ─────────── */
  let sniffed = null;               // إعدادات مُلتقَطة من طلبات الصفحة نفسها
  function sb() {
    const url = (window.GMT_CONFIG && GMT_CONFIG.SUPABASE_URL) || window.SUPABASE_URL || window.SUPA_URL ||
                (window.CONFIG && (CONFIG.SUPABASE_URL || CONFIG.supabaseUrl)) || (sniffed && sniffed.url);
    const key = (window.GMT_CONFIG && GMT_CONFIG.SUPABASE_ANON_KEY) || window.SUPABASE_ANON_KEY || window.SUPA_KEY ||
                (window.CONFIG && (CONFIG.SUPABASE_ANON_KEY || CONFIG.supabaseKey)) || (sniffed && sniffed.key);
    return (url && key) ? { url: String(url).replace(/\/$/, ''), key } : null;
  }
  /* 🔑 التقاط المفتاح من أي طلب تُرسله الصفحة نفسها لسوبابيس.
     السبب: 13 من 17 صفحة لا تستدعي gmt-config.js — المفاتيح مضمَّنة بداخلها.
     بدون هذا الالتقاط كان الحارس يحفظ محلياً و**لا يرسل شيئاً للوحة الأدمن أبداً**. */
  function sniff(url, init) {
    if (sniffed) return;
    try {
      const u = new URL(url, location.href);
      if (!/supabase\.co$/i.test(u.hostname) || !/\/rest\/v1\//.test(u.pathname)) return;
      let key = u.searchParams.get('apikey');
      const h = init && init.headers;
      if (!key && h) {
        if (typeof h.get === 'function') key = h.get('apikey');
        else key = h.apikey || h.Apikey || h.APIKEY;
      }
      if (key) { sniffed = { url: u.origin, key }; window.GMT_SB = sniffed; }
    } catch (_) {}
  }

  const redact = (u) => String(u || '').replace(/([?&](apikey|token|key|authorization)=)[^&]+/gi, '$1***');
  const now = () => new Date().toLocaleTimeString('ar-SY', { hour12: false });
  const training = () => !!(window.GMTSandbox && window.GMTSandbox.active);

  /* عدّادات الضجيج (2026-07-23): تُجمّع الأخطاء التافهة بدل تكرارها */
  var NOISE = { productImgs: 0, htmlAsImg: 0 };

  /* ─────────── تسجيل خطأ ─────────── */
  function add(sev, type, msg, detail, url) {
    const key = type + '|' + String(msg).slice(0, 60);
    const dup = errors.find((e) => e._k === key && Date.now() - e.ts < 60000);
    if (dup) { dup.count = (dup.count || 1) + 1; persist(); paint(); return; }

    const rec = {
      _k: key, ts: Date.now(), t: now(), sev, type,
      msg: String(msg || '').slice(0, 400),
      detail: String(detail || '').slice(0, 600),
      url: redact(url || ''), count: 1,
      page: ident.page, pageId: ident.pageId,
      user: ident.user, branch: ident.branch, role: ident.role,
      training: training(),
    };
    errors.push(rec);
    queue.push(rec);
    persist();
    paint();
    if (sev === 'crit') flush();          // الحرج يُرسل فوراً
  }

  /* ─────────── الإرسال للأدمن ─────────── */
  let flushing = false;
  async function flush(useBeacon) {
    if (!queue.length || flushing) return;
    const cfg = sb();
    if (!cfg) return;                      // لا إعدادات — نكتفي بالحفظ المحلي
    const batch = queue.splice(0, 25);
    const rows = batch.map((e) => ({
      kind: 'error', severity: e.sev, page: e.page, page_id: e.pageId,
      user_name: e.user || null, branch: e.branch || null, role: e.role || null,
      session_id: sid, err_type: e.type, message: e.msg, detail: e.detail,
      url: e.url, device: navigator.userAgent.slice(0, 120),
      count: e.count, training: e.training,
      source: (window.__GMT_SOURCE || 'usage'),
    }));
    const body = JSON.stringify(rows);
    const endpoint = cfg.url + '/rest/v1/gmt_telemetry';

    if (useBeacon && navigator.sendBeacon) {
      try { navigator.sendBeacon(endpoint + '?apikey=' + cfg.key, new Blob([body], { type: 'application/json' })); } catch (_) {}
      return;
    }
    flushing = true;
    try {
      await (window.__gmtRealFetch || fetch)(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: cfg.key, Authorization: 'Bearer ' + cfg.key, Prefer: 'return=minimal' },
        body,
      });
    } catch (_) { queue = batch.concat(queue); }   // فشل الإرسال — نعيدها للطابور
    finally { flushing = false; }
  }
  setInterval(() => flush(), FLUSH_MS);
  window.addEventListener('pagehide', () => flush(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true); });

  /* ═══════════ ① الأخطاء الصريحة ═══════════ */
  window.addEventListener('error', (e) => {
    if (e && e.message) {
      add('crit', 'JS', e.message, (e.filename ? redact(e.filename) + ':' + e.lineno : '') + (e.error && e.error.stack ? '\n' + String(e.error.stack).slice(0, 300) : ''));
    } else if (e && e.target && (e.target.src || e.target.href)) {
      var _u = String(e.target.src || e.target.href);
      var _n = _u.split('/').pop();
      /* (2026-07-23) تمييز الضجيج عن الخطأ الحقيقي:
         • صور المنتجات المحذوفة من التخزين ⇒ ليست خطأ برمجياً. تُجمَّع بسطر واحد بدل عشرات.
         • ملفات النظام (لوغو/أيقونة/سكربت) المفقودة ⇒ خطأ حقيقي يستحق التسجيل. */
      var isProductImg = /supabase\.co\/storage|products-images|\/products\//.test(_u);
      var isHtmlAsImg  = /\.html(\?|$)/i.test(_u) && e.target.tagName === 'IMG';
      if (isProductImg) {
        NOISE.productImgs++;
        if (NOISE.productImgs === 1) {
          add('info', 'صور المنتجات', 'صور منتجات محذوفة من التخزين (تُجمَّع — ليست خطأ برمجياً)', 'ستُحدَّث العدّة تلقائياً');
        } else {
          var last = errors.find(function (x) { return x.type === 'صور المنتجات'; });
          if (last) last.msg = NOISE.productImgs + ' صورة منتج محذوفة من التخزين (ليست خطأ برمجياً — ارفعها أو أزل روابطها)';
        }
      } else if (isHtmlAsImg) {
        NOISE.htmlAsImg++;
        if (NOISE.htmlAsImg === 1) add('info', 'تنسيق', 'عنصر <img> يشير لصفحة HTML بدل صورة (تجميلي — لا يؤثر على العمل)', _n);
      } else {
        add('warn', 'مورد', 'فشل تحميل ' + (e.target.tagName || '') + ': ' + _n, redact(_u));
      }
    }
  }, true);

  window.addEventListener('unhandledrejection', (e) => {
    const r = e && e.reason;
    add('crit', 'Promise', (r && (r.message || r)) || 'رفض غير معالج', r && r.stack ? String(r.stack).slice(0, 300) : '');
  });

  const _cerr = console.error.bind(console);
  console.error = function () {
    try { add('warn', 'console', Array.from(arguments).map((a) => { try { return typeof a === 'string' ? a : JSON.stringify(a); } catch (_) { return String(a); } }).join(' ').slice(0, 300)); } catch (_) {}
    return _cerr.apply(console, arguments);
  };

  /* ═══════════ ② الشبكة + الأخطاء الصامتة ═══════════ */
  const REAL_FETCH = window.fetch.bind(window);
  window.__gmtRealFetch = REAL_FETCH;

  const net = { last: 0, stockOps: 0 };
  const recentWrites = new Map();   // توقيع الكتابة → وقتها
  const recentRows   = new Map();   // جدول+صف → وقت آخر كتابة (كشف المضاعفة)

  /* ترجمة أخطاء القاعدة لرسالة يفهمها الإنسان */
  function explainDb(body) {
    try {
      const j = JSON.parse(body);
      if (j.code === 'PGRST204') {
        const col = (j.message.match(/'([^']+)' column/) || [])[1];
        return `عمود «${col || '؟'}» غير موجود بالقاعدة — الكود يخاطب عموداً لا وجود له. (خطأ مخطّط، لا خطأ إدخال.)`;
      }
      if (j.code === '42703') return 'دالة/عمود غير موجود بالقاعدة (42703) — تعريف خاطئ بالقاعدة.';
      if (j.code === '23505') return 'قيمة مكرّرة — السجل موجود مسبقاً.';
      if (j.code === '23503') return 'ارتباط مفقود — السجل المرتبط غير موجود.';
      return j.message || body;
    } catch (_) { return body; }
  }

  /* استخراج «الصف» المستهدف من رابط PostgREST: /products?id=eq.55 */
  function rowKey(url) {
    try {
      const u = new URL(url, location.href);
      const table = (u.pathname.match(/\/rest\/v1\/([^/?]+)/) || [])[1];
      if (!table) return null;
      const idp = Array.from(u.searchParams.entries()).find(([k, v]) => /^(id|barcode|inv_number)$/.test(k) && /^eq\./.test(v));
      return idp ? table + '#' + idp[1] : null;
    } catch (_) { return null; }
  }

  /* ⏱️ مهلة عامة لكل طلب (UX-2 «تعليق/تجميد متكرر»)
     السبب الجذري: طلبات بلا مهلة ولا AbortController — إن لم يردّ السيرفر تبقى
     الصفحة تنتظر إلى الأبد وتبدو «معلّقة». الآن: أي طلب بلا signal يُقطع بعد 20ث
     ويُسجَّل خطأ مفهوم بدل تجميد صامت. */
  const REQ_TIMEOUT = 20000;
  function withTimeout(init) {
    if (init && init.signal) return { init, done: () => {} };
    let ctrl;
    try { ctrl = new AbortController(); } catch (_) { return { init, done: () => {} }; }
    const t = setTimeout(() => { try { ctrl.abort(); } catch (_) {} }, REQ_TIMEOUT);
    return { init: Object.assign({}, init || {}, { signal: ctrl.signal }), done: () => clearTimeout(t) };
  }

  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = ((init && init.method) || (typeof input !== 'string' && input && input.method) || 'GET').toUpperCase();
    const isWrite = method !== 'GET' && method !== 'HEAD';
    const started = Date.now();
    net.last = started;
    if (!/gmt_telemetry/.test(url)) sniff(url, init);

    if (isWrite && !/gmt_telemetry/.test(url)) {
      const sig = method + ' ' + url.split('?')[0] + ' ' + String((init && init.body) || '').slice(0, 80);
      const prev = recentWrites.get(sig);
      if (prev && started - prev < 2000) add('warn', 'تكرار', 'نفس عملية الكتابة تكرّرت خلال ثانيتين — خطر ازدواج', method + ' ' + redact(url));
      recentWrites.set(sig, started);
      setTimeout(() => recentWrites.delete(sig), 4000);

      /* 🔴 كشف المضاعفة: كتابتان على نفس الصف خلال ثانيتين (ولو بقيمتين مختلفتين) */
      const rk = rowKey(url);
      if (rk) {
        const p = recentRows.get(rk);
        if (p && started - p < 2000) {
          add('crit', 'كتابة مزدوجة',
            `كُتب على نفس السجل (${rk}) مرتين خلال ثانيتين — هذا نمط المضاعفة: قد تُطبَّق الكمية أو المبلغ مرّتين.`,
            method + ' ' + redact(url));
        }
        recentRows.set(rk, started);
        setTimeout(() => recentRows.delete(rk), 4000);
      }

      if (/products|decrement_branch_stock|increment_branch_stock/i.test(url)) net.stockOps++;
      if (/\/invoices\b/i.test(url) && method === 'POST') checkStockAfterSale();
    }

    const T = withTimeout(init);
    try {
      const res = await REAL_FETCH(input, T.init);
      T.done();
      const took = Date.now() - started;
      if (took > 8000) add('warn', 'بطء', `الطلب استغرق ${(took / 1000).toFixed(1)} ثانية`, method + ' ' + redact(url));

      if (!res.ok && res.status !== 406) {
        let body = '';
        try { body = (await res.clone().text()).slice(0, 300); } catch (_) {}
        add('crit', 'HTTP ' + res.status, explainDb(body), method + ' ' + redact(url) + '\n' + body);
        return res;
      }
      if (isWrite && res.status === 200) {
        try {
          const txt = await res.clone().text();
          if (txt && txt.trim() === '[]') add('crit', 'كتابة بلا أثر', `${method} نجح لكنه لم يُعدّل أي صف — العملية لم تحدث فعلياً!`, redact(url));
        } catch (_) {}
      }
      return res;
    } catch (err) {
      T.done();
      const aborted = err && (err.name === 'AbortError' || /abort/i.test(err.message || ''));
      add('crit', 'شبكة', method + ' ' + redact(url),
        aborted ? `انقطع الطلب بعد ${REQ_TIMEOUT / 1000} ثانية (مهلة) — السيرفر لم يردّ. الصفحة لم تتجمّد.` : ((err && err.message) || 'فشل الاتصال'));
      throw err;
    }
  };

  function checkStockAfterSale() {
    const before = net.stockOps;
    setTimeout(() => {
      if (net.stockOps === before) add('crit', 'مخزون', 'حُفظت فاتورة بيع ولم يُرصد أي خصم من المخزون خلال 5 ثوانٍ!', 'راجع الفاتورة الأخيرة يدوياً.');
    }, 5000);
  }

  /* ═══════════ ③ زر بلا أثر ═══════════ */
  let domDirty = false;
  try { new MutationObserver(() => { domDirty = true; }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true }); } catch (_) {}

  document.addEventListener('click', (e) => {
    const el = e.target && e.target.closest && e.target.closest('button, [onclick], .btn, a[role="button"]');
    if (!el || el.disabled) return;
    const label = (el.textContent || el.title || el.id || 'زر').trim().slice(0, 40);
    /* (2026-07-23) استثناء الأزرار التي تعمل بأثر غير مرئي:
       نسخ للحافظة · تحديث/إعادة رسم · طباعة (تفتح نافذة النظام) · إغلاق نوافذ.
       تسجيلها كـ«بلا أثر» كان ضجيجاً — تعمل فعلياً لكنها لا تغيّر DOM ولا تطلب الشبكة. */
    if (/🐞|🔍|🎓|🎯|📋|🔄|🖨|تقرير|إغلاق|نسخ|مسح|تحديث|إعادة|طباعة|طباعه|A4|حرارية|التالي|تخطّ|رجوع|السابق/.test(label)) return;
    const before = net.last;
    domDirty = false;
    setTimeout(() => {
      if (net.last === before && !domDirty) {
        add('warn', 'زر بلا أثر', `ضغطت «${label}» ولم يحدث شيء (لا طلب شبكة ولا تغيّر بالواجهة)`, 'قد يكون الزر معطّلاً أو دالته مفقودة.');
      }
    }, 2000);
  }, true);

  /* ═══════════ ④ تجميد الواجهة ═══════════ */
  let hiddenSince = false;
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') hiddenSince = true; });
  (function heartbeat() {
    let last = performance.now();
    function tick(t) {
      const gap = t - last;
      /* لا نُبلّغ إذا كان التبويب مخفياً — rAF يتوقف طبيعياً حينها (كان مصدر إنذارات كاذبة) */
      if (gap > 3000 && document.visibilityState === 'visible' && !hiddenSince) {
        add('warn', 'تجميد', `تجمّدت الواجهة ${(gap / 1000).toFixed(1)} ثانية`, 'عملية ثقيلة أو حلقة لا تنتهي.');
      }
      hiddenSince = false;
      last = t;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  /* ═══════════ ⑤ فحوصات الصحة الحسابية ═══════════ */
  function check(name, ok, details) {
    if (ok) return true;
    add('crit', 'حساب', 'فحص فشل: ' + name, details || '');
    return false;
  }
  const invariants = {
    invoiceTotal(total, items) {
      const sum = (items || []).reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
      return check('إجمالي الفاتورة = مجموع البنود', Math.abs(sum - Number(total)) < 0.02, `الإجمالي: ${total} · مجموع البنود: ${sum.toFixed(2)}`);
    },
    stockNonNegative(name, qty) { return check('المخزون لا يكون سالباً', Number(qty) >= 0, `${name}: ${qty}`); },
    notBelowCost(price, cost, who) {
      return check('لا بيع تحت سعر التكلفة', Number(price) >= Number(cost), `السعر ${price} · التكلفة ${cost} · المستخدم ${who || '؟'}`);
    },
    commission(comm, price, wholesale) {
      const expect = (Number(price) - Number(wholesale)) / 2;
      return check('العمولة = نصف (البيع − الجملة)', Math.abs(expect - Number(comm)) < 0.02, `المتوقع ${expect.toFixed(2)} · المسجَّل ${comm}`);
    },
  };

  /* ═══════════ الواجهة (تظهر للأدمن فقط) ═══════════ */
  let btn = null, panel = null;

  function paint() {
    if (silent) { if (btn) btn.style.display = 'none'; return; }
    if (!document.body) { document.addEventListener('DOMContentLoaded', paint, { once: true }); return; }
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'gmt-bug-btn';
      btn.setAttribute('aria-label', 'تقرير الأخطاء');
      btn.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2147483000;width:52px;height:52px;border-radius:50%;color:#fff;border:2px solid rgba(255,255,255,.2);font-size:22px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Cairo,Arial,sans-serif;';
      btn.onclick = openPanel;
      document.body.appendChild(btn);
    }
    const crit = errors.filter((e) => e.sev === 'crit').length;
    btn.style.background = crit ? '#C00012' : '#b45309';
    btn.innerHTML = '🐞<span style="position:absolute;top:-4px;left:-4px;background:#111;color:#fff;font-size:10px;font-weight:900;border-radius:99px;padding:2px 6px;">' + errors.length + '</span>';
    btn.style.display = errors.length ? 'flex' : 'none';
  }

  function buildReport() {
    const crit = errors.filter((e) => e.sev === 'crit');
    const head = [
      '═══ تقرير الحارس — GMT 🐞 v3 ═══',
      'الصفحة: ' + (ident.page || document.title),
      'المستخدم: ' + (ident.user || '—') + ' · الفرع: ' + (ident.branch || '—') + ' · الدور: ' + (ident.role || '—'),
      'الجلسة: ' + sid,
      'الرابط: ' + redact(location.href),
      'الوقت: ' + new Date().toLocaleString('ar-SY') + ' (بعد ' + Math.round((Date.now() - t0) / 1000) + 'ث من الفتح)',
      'الجهاز: ' + navigator.userAgent.slice(0, 110),
      'وضع تدريبي: ' + (training() ? 'نعم' : 'لا'),
      `الإجمالي: ${errors.length} (حرج: ${crit.length})`,
      '──────────────────────',
    ];
    const body = errors.map((e, i) =>
      `#${i + 1} [${e.t}] ${SEV_AR[e.sev]} — ${e.type}${e.count > 1 ? ` (تكرّر ${e.count}×)` : ''}\n${e.msg}${e.detail ? '\n↳ ' + e.detail : ''}`
    ).join('\n─────\n');
    return head.join('\n') + '\n' + body;
  }

  function openPanel() {
    if (panel) panel.remove();
    panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Cairo,Arial,sans-serif;direction:rtl;';
    const crit = errors.filter((e) => e.sev === 'crit').length;
    panel.innerHTML =
      '<div style="background:#161a22;color:#e7e9ee;border:1px solid #2a3040;border-radius:16px;max-width:600px;width:100%;max-height:86vh;display:flex;flex-direction:column;padding:16px;">' +
      `<div style="font-weight:900;font-size:15px;margin-bottom:3px;">🐞 الحارس — ${errors.length} ملاحظة${crit ? ` (<span style="color:#f87171;">${crit} حرجة</span>)` : ''}</div>` +
      '<div style="font-size:11px;color:#9aa3b2;font-weight:700;margin-bottom:9px;line-height:1.7;">محفوظ على الجهاز ومُرسَل للوحة الأدمن. يراقب: البرمجة · الشبكة · <b>الصامت</b> (زر بلا أثر · كتابة مزدوجة · كتابة بلا نتيجة · مخزون لم يُخصم · تجميد · عمود مفقود).</div>' +
      '<textarea readonly id="gmt-bug-ta" style="flex:1;min-height:250px;background:#0e1117;color:#cdd3de;border:1px solid #2a3040;border-radius:10px;padding:10px;font-size:11px;line-height:1.7;direction:ltr;text-align:left;white-space:pre;"></textarea>' +
      '<div style="display:flex;gap:8px;margin-top:10px;">' +
      '<button id="gmt-bug-copy" style="flex:1;background:#C00012;color:#fff;border:none;border-radius:10px;padding:11px;font-weight:900;font-family:inherit;cursor:pointer;">📋 نسخ التقرير</button>' +
      '<button id="gmt-bug-clear" style="background:#232936;color:#c6ccd8;border:none;border-radius:10px;padding:11px 14px;font-weight:800;font-family:inherit;cursor:pointer;">مسح</button>' +
      '<button id="gmt-bug-close" style="background:#232936;color:#c6ccd8;border:none;border-radius:10px;padding:11px 14px;font-weight:800;font-family:inherit;cursor:pointer;">إغلاق</button>' +
      '</div></div>';
    document.body.appendChild(panel);
    const ta = panel.querySelector('#gmt-bug-ta');
    ta.value = buildReport();
    panel.querySelector('#gmt-bug-close').onclick = () => { panel.remove(); panel = null; };
    panel.querySelector('#gmt-bug-clear').onclick = () => { errors = []; persist(); paint(); panel.remove(); panel = null; };
    panel.querySelector('#gmt-bug-copy').onclick = async () => {
      try { await navigator.clipboard.writeText(ta.value); } catch (_) { ta.select(); try { document.execCommand('copy'); } catch (_) {} }
      panel.querySelector('#gmt-bug-copy').textContent = '✓ نُسخ — ألصقه بالرسالة';
    };
  }

  /* فتح سرّي للأدمن/الدعم حتى بالوضع الصامت */
  document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.shiftKey && (e.key === 'B' || e.key === 'b')) openPanel(); });
  let holdT = null;
  document.addEventListener('pointerdown', (e) => {
    const el = e.target && e.target.closest && e.target.closest('img[src*="logo"], .logo, #logo');
    if (!el) return;
    holdT = setTimeout(openPanel, 1800);
  });
  document.addEventListener('pointerup', () => { if (holdT) clearTimeout(holdT); });

  /* ─────────── الواجهة البرمجية ─────────── */
  /* ═══════════ ⑥ التعريف التلقائي (بلا تعديل أي صفحة) ═══════════
     الصفحات تستعمل متغيراً عاماً currentUser + branch — نقرأهما دورياً.
     الدور: سيادي (?sovereign=1) · أدمن (صفحات الإدارة) · كاشير (الباقي). */
  const PAGES = [
    [/02_|pos|نقطة/i,        { page: 'نقطة البيع', pageId: 'pos', admin: false }],
    [/03_|inventory|الجرد/i, { page: 'الجرد', pageId: 'inventory', admin: true }],
    [/04_|admin_pos|أدمن_نقاط/i, { page: 'أدمن نقاط البيع', pageId: 'admin_pos', admin: true }],
    [/05_|orders|الأوردرات/i,{ page: 'الأوردرات', pageId: 'orders', admin: false }],
    [/06_|purchase|المشتريات/i, { page: 'المشتريات', pageId: 'purchases', admin: true }],
    [/07_|bridge|الجسر/i,    { page: 'الجسر', pageId: 'bridge', admin: true }],
    [/08_|store|المتجر\.|المتجر\b/i, { page: 'المتجر', pageId: 'store', admin: false }],
    [/09_|أدمن_المتجر/i,     { page: 'أدمن المتجر', pageId: 'admin_store', admin: true }],
    [/10_|إنشاء_الكفالة/i,   { page: 'إنشاء الكفالة', pageId: 'warranty_new', admin: false }],
    [/11_|أدمن_الكفالة/i,    { page: 'أدمن الكفالة', pageId: 'warranty_admin', admin: true }],
    [/12_|بحث_الكفالة/i,     { page: 'بحث الكفالة', pageId: 'warranty_find', admin: false }],
    [/13_|sovereign|السيادي/i, { page: 'الأدمن السيادي', pageId: 'sovereign', admin: true }],
    [/14_|contract|العقود/i, { page: 'العقود', pageId: 'contracts', admin: false }],
    [/15b|أدمن_الموقع/i,     { page: 'أدمن الموقع', pageId: 'admin_site', admin: true }],
    [/15_|الموقع_الرئيسي/i,  { page: 'الموقع', pageId: 'site', admin: false }],
    [/16_|tracking|التتبع|الشحنة/i, { page: 'تتبع الشحنة', pageId: 'tracking', admin: false }],
    [/17_|backup|النسخ/i,    { page: 'النسخ الاحتياطي', pageId: 'backup', admin: true }],
  ];
  function autoIdentify() {
    const path = decodeURIComponent(location.pathname + location.search);
    const hit = (PAGES.find(([re]) => re.test(path)) || [])[1];
    const sov = /[?&]sovereign=1/.test(location.search) || (function () { try { return sessionStorage.getItem('gmt_sov_ok') === '1'; } catch (_) { return false; } })();
    const u = window.currentUser || null;
    const b = window.branch || null;
    const o = {
      page: (hit && hit.page) || document.title || '',
      pageId: (hit && hit.pageId) || '',
      user: (u && (u.display_name || u.username || u.name)) || ident.user || '',
      branch: (b && (b.name || b.key || b.branch_key)) || (u && u.branch_key) || ident.branch || '',
      role: sov ? 'sovereign' : (hit && hit.admin ? 'admin' : 'cashier'),
    };
    if (o.page !== ident.page || o.user !== ident.user || o.role !== ident.role || o.branch !== ident.branch) {
      window.GMTBug.identify(o);
    }
  }

  window.GMTBug = {
    version: 3.1,
    role: () => ident.role,
    config: sb,
    list: () => errors.slice(),
    report: buildReport,
    add, check, invariants,
    open: openPanel,
    flush,
    session: sid,
    identify(o) {
      ident = Object.assign(ident, o || {});
      /* الصمت التلقائي: أي دور غير الأدمن/السيادي = صامت */
      silent = !/admin|sovereign|owner/i.test(ident.role || '');
      if (o && typeof o.silent === 'boolean') silent = o.silent;
      paint();
    },
    setSilent(v) { silent = !!v; paint(); },
    clear() { errors = []; persist(); paint(); },
  };

  autoIdentify();
  setInterval(autoIdentify, 2000);
  paint();
})();


/* ── gmt-master-report.js ── */
;/* ═══════════════════════════════════════════════════════════════════════════
   gmt-master-report.js — 🎯 المصبّ الموحّد · v1.0 · 2026-07-23
   كل الأخطاء من كل البوتات تصبّ هنا. تقرير واحد قابل للنسخ يُخزَّن ويتراكم.
   يشغّل فحصاً تلقائياً فور فتح الصفحة، وزر «إعادة الفحص» يعمل فعلياً.
   التقرير يذكر: ماذا فُحص · كيف فُحص · ما نجح · ما فشل · ما لم يُفحص · ما يحتاج فحصاً أعمق.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.GMTMaster) return;

  var LS = 'gmt_master_report_v1';
  var S = { runs: [], lastRun: null, version: '1.0' };
  try { var o = JSON.parse(localStorage.getItem(LS) || 'null'); if (o) S = o; } catch (e) {}
  function save() { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} }

  var page = document.title || location.pathname.split('/').pop();

  /* ═══ سجل الفحوص: كل فحص يوثّق نفسه ═══ */
  function mkRun() {
    return {
      at: Date.now(), page: page, url: location.href,
      checks: [],        // {area, how, status, detail, depth}
      notChecked: [],    // {area, why, needs}
      collected: {}      // ما جُمع من البوتات الأخرى
    };
  }

  function add(run, area, how, status, detail, depth) {
    run.checks.push({ area: area, how: how, status: status, detail: detail, depth: depth || 'سطحي' });
  }
  function skip(run, area, why, needs) {
    run.notChecked.push({ area: area, why: why, needs: needs });
  }

  /* ═══ الفحص التلقائي الشامل ═══ */
  function runCheck() {
    var run = mkRun();

    /* ① البوتات المحمّلة */
    var bots = [
      ['gmt-bugcatcher', 'GMTBug', 'الحارس — يلتقط الأخطاء لحظة وقوعها'],
      ['gmt-inspector', 'GMTInspect', 'المفتّش — الأخطاء الصامتة'],
      ['gmt-warden', 'GMTWarden', 'المراقب السيادي'],
      ['gmt-selftest', 'GMTSelfTest', 'الفاحص الذاتي'],
      ['gmt-guide', 'GMTGuide', 'الدليل التعليمي'],
      ['gmt-sandbox', 'GMTSandbox', 'الوضع التدريبي'],
      ['gmt-brand', 'GMTBrand', 'الهوية'],
      ['gmt-money-guard', 'GMTMoneyGuard', 'الحارس المالي'],
      ['gmt-code-sentinel', 'GMTCodeSentinel', 'حارس الكود']
    ];
    var loaded = 0, missing = [];
    bots.forEach(function (b) {
      if (window[b[1]]) { loaded++; }
      else missing.push(b[0]);
    });
    add(run, 'البوتات', 'فحص وجود كائن كل بوت بـwindow',
      missing.length ? 'warn' : 'ok',
      loaded + '/' + bots.length + ' محمّل' + (missing.length ? ' · ناقص: ' + missing.join('، ') : ''),
      'كامل');

    /* ② الأزرار — استدعاء دوالها معرّف؟ */
    var btns = document.querySelectorAll('[onclick]');
    var dead = [];
    btns.forEach(function (el) {
      var expr = el.getAttribute('onclick') || '';
      var m = expr.trim().match(/^([\w$]+)\s*\(/);
      if (m && m[1].indexOf('.') < 0 && typeof window[m[1]] !== 'function') {
        if (!/^(if|for|while|return|this|event)$/.test(m[1])) dead.push(m[1]);
      }
    });
    add(run, 'الأزرار', 'قراءة كل onclick والتأكد أن دالته معرّفة بـwindow',
      dead.length ? 'fail' : 'ok',
      btns.length + ' زر' + (dead.length ? ' · 🔴 دوال مفقودة: ' + dead.slice(0, 5).join('، ') : ' · كل الدوال معرّفة'),
      'كامل');

    /* ③ الصور */
    var imgs = document.querySelectorAll('img'), broken = [];
    imgs.forEach(function (im) {
      if (im.complete && im.naturalWidth === 0 && im.getAttribute('src')) {
        broken.push((im.getAttribute('src') || '').split('/').pop());
      }
    });
    add(run, 'الصور', 'فحص naturalWidth لكل صورة بعد اكتمال التحميل',
      broken.length ? 'warn' : 'ok',
      imgs.length + ' صورة' + (broken.length ? ' · مكسورة: ' + broken.slice(0, 4).join('، ') : ' · كلها تُحمّل'),
      'كامل');

    /* ④ الإعداد (مفاتيح القاعدة) */
    var hasCfg = !!(window.SUPABASE_URL || window.GMT_CONFIG || window.URL_SB ||
                    (window.GMTConfig && GMTConfig.url));
    add(run, 'الإعداد', 'البحث عن مفاتيح Supabase بالنطاق العام',
      hasCfg ? 'ok' : 'fail',
      hasCfg ? 'المفاتيح موجودة' : '🔴 مفاتيح القاعدة غير موجودة — تأكّد من رفع gmt-config.js قبل باقي السكربتات',
      'سطحي');

    /* ⑤ التنسيق */
    var vw = document.documentElement.clientWidth, overflow = 0, offscreen = 0;
    document.querySelectorAll('div,section,table,form').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width > vw + 60) overflow++;
      if (r.left < -120 || r.right > vw + 160) offscreen++;
    });
    add(run, 'التنسيق', 'قياس getBoundingClientRect لكل كتلة ومقارنتها بعرض الشاشة',
      (overflow > 3 || offscreen > 5) ? 'warn' : 'ok',
      overflow ? (overflow + ' عنصر أوسع من الشاشة') : 'لا طفح أفقي',
      'متوسط');

    /* ⑥ جمع تقارير البوتات الأخرى (المصبّ) */
    try { if (window.GMTBug && GMTBug.report) run.collected.bugcatcher = String(GMTBug.report()).slice(0, 4000); } catch (e) {}
    try { if (window.GMTInspect && GMTInspect.report) run.collected.inspector = String(GMTInspect.report()).slice(0, 4000); } catch (e) {}
    try { if (window.GMTWarden && GMTWarden.report) run.collected.warden = String(GMTWarden.report()).slice(0, 4000); } catch (e) {}
    try { if (window.GMTCodeSentinel && GMTCodeSentinel.findings) {
      var f = GMTCodeSentinel.findings();
      run.collected.sentinel = f.length ? f.map(function (x) { return x.kind + ': ' + x.detail; }).join('\n') : 'لا اكتشافات';
    } } catch (e) {}
    try { if (window.GMTMoneyGuard && GMTMoneyGuard.incidents) {
      var mi = GMTMoneyGuard.incidents();
      run.collected.money = mi.length ? mi.map(function (x) { return x.title + ': ' + x.detail; }).join('\n') : 'لا تباينات مالية';
    } } catch (e) {}

    /* ═══ ما لم يُفحص (شفافية كاملة) ═══ */
    skip(run, 'قاعدة البيانات (الجداول/الأعمدة)',
      'يحتاج اتصالاً حياً بالقاعدة واستعلامات فعلية',
      'اضغط 🧪 الفاحص الذاتي — هو يفحصها فعلياً');
    skip(run, 'صحة الأرقام المالية (عمولة/ربح)',
      'تُفحص فقط عند حفظ فاتورة حقيقية',
      'الحارس المالي 🧮 يفحصها تلقائياً عند كل بيع');
    skip(run, 'الطباعة والفوترة الفعلية',
      'تحتاج ضغطاً بشرياً على طباعة مع طابعة متصلة',
      'جرّبها يدوياً مرة بعد النشر');
    skip(run, 'صفحات النظام الأخرى',
      'كل صفحة تفحص نفسها فقط (عزل المتصفح)',
      'افتح 🔬 الفاحص المركزي (21_INSPECTOR) — يفحص كل الصفحات');
    skip(run, 'التزامن (بيعان في نفس اللحظة)',
      'يحتاج جهازين يبيعان معاً',
      'يُغطّى بـPOS-ATOMIC بعد تشغيل _SQL/🔟_دوال_المخزون_الموحّدة.sql');

    run.summary = {
      ok: run.checks.filter(function (c) { return c.status === 'ok'; }).length,
      warn: run.checks.filter(function (c) { return c.status === 'warn'; }).length,
      fail: run.checks.filter(function (c) { return c.status === 'fail'; }).length,
      skipped: run.notChecked.length
    };

    S.lastRun = run;
    S.runs.unshift({ at: run.at, page: run.page, summary: run.summary });
    if (S.runs.length > 50) S.runs.length = 50;
    save();
    return run;
  }

  /* ═══ بناء التقرير النصي (قابل للنسخ · يفهمه المطوّر وكلود) ═══ */
  function buildText(run) {
    run = run || S.lastRun; if (!run) return 'لم يُجرَ فحص بعد.';
    var L = [];
    L.push('╔══════════════════════════════════════════╗');
    L.push('║   🎯 التقرير الموحّد الشامل — GMT          ║');
    L.push('╚══════════════════════════════════════════╝');
    L.push('التاريخ: ' + new Date(run.at).toLocaleString('ar-SY'));
    L.push('الصفحة: ' + run.page);
    L.push('الرابط: ' + run.url);
    L.push('إصدار المصبّ: ' + S.version);
    L.push('');
    L.push('── الخلاصة ──');
    L.push('  ✅ نجح: ' + run.summary.ok + '  ⚠️ تنبيه: ' + run.summary.warn +
           '  🔴 فشل: ' + run.summary.fail + '  ⚪ لم يُفحص: ' + run.summary.skipped);
    L.push('');
    L.push('═══════ ① ما الذي فُحص وكيف ═══════');
    run.checks.forEach(function (c) {
      var ic = c.status === 'ok' ? '✅' : (c.status === 'warn' ? '⚠️' : '🔴');
      L.push('');
      L.push(ic + ' [' + c.area + ']  (عمق الفحص: ' + c.depth + ')');
      L.push('   كيف فُحص: ' + c.how);
      L.push('   النتيجة: ' + c.detail);
    });
    L.push('');
    L.push('═══════ ② ما لم يُفحص (ولماذا) ═══════');
    run.notChecked.forEach(function (n) {
      L.push('');
      L.push('⚪ ' + n.area);
      L.push('   السبب: ' + n.why);
      L.push('   كيف يُفحص: ' + n.needs);
    });
    L.push('');
    L.push('═══════ ③ تقارير البوتات (المصبّ الموحّد) ═══════');
    var names = { bugcatcher: '🐞 الحارس', inspector: '🔍 المفتّش', warden: '🛡️ المراقب',
                  sentinel: '🛰️ حارس الكود', money: '🧮 الحارس المالي' };
    var any = false;
    Object.keys(run.collected).forEach(function (k) {
      any = true;
      L.push('');
      L.push('───── ' + (names[k] || k) + ' ─────');
      L.push(run.collected[k] || '(فارغ)');
    });
    if (!any) L.push('  (لا بوتات أخرى محمّلة بهذه الصفحة)');
    L.push('');
    L.push('═══════ ④ سجل الفحوص السابقة ═══════');
    S.runs.slice(0, 10).forEach(function (r) {
      L.push('  ' + new Date(r.at).toLocaleString('ar-SY') + ' · ' + r.page +
             ' · ✅' + r.summary.ok + ' ⚠️' + r.summary.warn + ' 🔴' + r.summary.fail);
    });
    L.push('');
    L.push('═══════ ⑤ ملاحظة للمطوّر / كلود ═══════');
    L.push('هذا التقرير يوثّق: ماذا فُحص · كيف · النتيجة · وما لم يُفحص ولماذا.');
    L.push('العناصر تحت «لم يُفحص» ليست أخطاء — هي فحوص تحتاج أدوات أخرى (مذكورة).');
    L.push('عمق الفحص: «كامل» = فُحص كل عنصر · «متوسط» = عيّنة · «سطحي» = وجود فقط.');
    return L.join('\n');
  }

  /* ═══ الواجهة ═══ */
  function panel() {
    var run = S.lastRun || runCheck();
    var d = document.getElementById('gmt-master-panel');
    if (d) d.remove();
    d = document.createElement('div');
    d.id = 'gmt-master-panel';
    d.style.cssText = 'position:fixed;inset:0;z-index:2147482000;background:rgba(15,18,25,.72);' +
      'display:flex;align-items:center;justify-content:center;padding:14px;direction:rtl;font-family:Cairo,system-ui,sans-serif;';
    var s = run.summary;
    var verdict = s.fail ? '🔴 ' + s.fail + ' مشكلة تحتاج إصلاحاً' :
                  (s.warn ? '⚠️ ' + s.warn + ' تنبيه' : '✅ لا مشاكل بهذه الصفحة');
    d.innerHTML =
      '<div style="background:#fff;border-radius:16px;max-width:720px;width:100%;max-height:88vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)">' +
        '<div style="background:linear-gradient(135deg,#C00012,#8E000D);color:#fff;padding:16px 20px;border-radius:16px 16px 0 0">' +
          '<div style="font-size:18px;font-weight:900">🎯 التقرير الموحّد الشامل</div>' +
          '<div style="font-size:12.5px;opacity:.9;margin-top:3px">' + verdict + ' · ' + run.page + '</div>' +
        '</div>' +
        '<div style="padding:16px 20px">' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">' +
            '<button id="gm-recheck" style="background:#C00012;color:#fff;border:0;border-radius:10px;padding:10px 18px;font:inherit;font-weight:900;font-size:13px;cursor:pointer">🔄 إعادة الفحص</button>' +
            '<button id="gm-copy" style="background:#111827;color:#fff;border:0;border-radius:10px;padding:10px 18px;font:inherit;font-weight:900;font-size:13px;cursor:pointer">📋 نسخ التقرير الكامل</button>' +
            '<button id="gm-clear" style="background:#fff;color:#b91c1c;border:1px solid #fecaca;border-radius:10px;padding:10px 16px;font:inherit;font-weight:800;font-size:13px;cursor:pointer">🗑️ مسح السجل</button>' +
            '<button id="gm-close" style="background:#f3f4f6;color:#374151;border:0;border-radius:10px;padding:10px 16px;font:inherit;font-weight:800;font-size:13px;cursor:pointer">✕ إغلاق</button>' +
          '</div>' +
          '<pre id="gm-text" style="white-space:pre-wrap;font-size:11.5px;line-height:1.75;background:#f8f9fb;border:1px solid #e5e7eb;border-radius:10px;padding:12px;max-height:60vh;overflow:auto;color:#1f2937;margin:0">' +
            buildText(run).replace(/[<>&]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]; }) +
          '</pre>' +
        '</div>' +
      '</div>';
    document.body.appendChild(d);

    d.querySelector('#gm-close').onclick = function () { d.remove(); };
    d.querySelector('#gm-recheck').onclick = function () {
      this.textContent = '⏳ يفحص…';
      var self = this;
      setTimeout(function () {
        var r = runCheck();
        d.querySelector('#gm-text').textContent = buildText(r);
        self.textContent = '🔄 إعادة الفحص';
        try { if (window.GMTUI && GMTUI.toast) GMTUI.toast('✅ اكتمل الفحص'); } catch (e) {}
      }, 120);
    };
    d.querySelector('#gm-copy').onclick = function () {
      var t = buildText(S.lastRun), self = this;
      function done() { self.textContent = '✅ نُسخ!'; setTimeout(function () { self.textContent = '📋 نسخ التقرير الكامل'; }, 1600); }
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(done).catch(fallback);
      else fallback();
      function fallback() {
        var ta = document.createElement('textarea'); ta.value = t;
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        ta.remove(); done();
      }
    };
    d.querySelector('#gm-clear').onclick = function () {
      if (!confirm('مسح كل سجلات الفحص المخزّنة؟')) return;
      S = { runs: [], lastRun: null, version: '1.0' }; save();
      // امسح تقارير البوتات القديمة المتراكمة
      try {
        var ks = []; for (var i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i));
        ks.forEach(function (k) {
          if (k && /gmt.*(inspect|bug|warden|autotest|selftest|report|journey|incident|silent)/i.test(k)
              && !/money|ledger|دفتر|config|user|token/i.test(k)) localStorage.removeItem(k);
        });
        sessionStorage.clear();
      } catch (e) {}
      alert('✅ مُسح السجل. سيبدأ فحص نظيف.');
      location.reload();
    };
  }

  /* ═══ الزر العائم ═══ */
  function fab() {
    if (document.getElementById('gmt-master-fab') || !document.body) return;
    var b = document.createElement('button');
    b.id = 'gmt-master-fab';
    b.textContent = '🎯';
    b.title = 'التقرير الموحّد الشامل';
    b.style.cssText = 'position:fixed;left:14px;bottom:132px;z-index:2147481500;width:46px;height:46px;' +
      'border-radius:50%;border:0;background:#C00012;color:#fff;font-size:20px;cursor:pointer;' +
      'box-shadow:0 8px 22px rgba(192,0,18,.35)';
    b.onclick = panel;
    document.body.appendChild(b);
  }

  /* ═══ التشغيل التلقائي ═══ */
  function boot() {
    fab();
    // فحص تلقائي فور الفتح (بعد أن تستقر الصفحة)
    setTimeout(function () {
      var r = runCheck();
      // نبّه فقط لو في فشل
      if (r.summary.fail > 0) {
        var b = document.getElementById('gmt-master-fab');
        if (b) { b.style.background = '#dc2626'; b.textContent = '🎯' ; b.title = r.summary.fail + ' مشكلة — اضغط للتقرير'; }
      }
    }, 2600);
  }

  window.GMTMaster = {
    version: '1.0',
    check: runCheck,
    report: function () { return buildText(); },
    open: panel,
    last: function () { return S.lastRun; },
    history: function () { return S.runs.slice(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();


/* ── gmt-visibility.js ── */
;/* ═══════════════════════════════════════════════════════════════════════════
   gmt-visibility.js — 🔒 التحكّم بالظهور · v1.0 · 2026-07-24
   طلب المالك: البوتات تعمل وتُسجّل كل شيء بالخلفية، لكن أزرارها لا تظهر للمستخدم.
   • تُخفى كل أزرار البوتات العائمة (الحارس · المفتّش · المراقب · الفاحص الذاتي ·
     الفحص الشامل · المصبّ ...).
   • يبقى الوضع التدريبي ظاهراً (زر 🎓).
   • زر التقارير الموحّد (🎯) يظهر فقط بالصفحة الرئيسية (بوابة واحدة للمالك).
   • كل شيء يُسجَّل ويُخزَّن كالمعتاد — الإخفاء بصري فقط، لا يوقف التسجيل.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.GMTVisibility) return;

  // معرّفات أزرار البوتات التي تُخفى عن المستخدم العادي
  var HIDE_IDS = [
    'gmt-master-fab',     // المصبّ الموحّد 🎯
    'gmt-inspect-fab',    // المفتّش 🔍
    'gmt-warden-fab',     // المراقب 🛡️
    'gmt-st-fab',         // الفاحص الذاتي 🧪
    'gmt-autotest-fab',   // الفحص الشامل 🤖
    'gmt-bug-fab', 'bug-btn', 'gmt-bug-btn'  // الحارس 🐞
  ];

  // هل هذه صفحة بوابة التقارير؟ (لوحة المالك أو صفحة البوتات)
  function isHomePage() {
    var loc=(window.location||{});var p = decodeURIComponent((loc.pathname || '')).toLowerCase();
    // البوابة = الأدمن السيادي (لوحة المالك) أو صفحة بوتات الحماية
    return /13_sovereign|سيادي|19_protection|بوتات_الحماية|بوتات الحماية/.test(p);
  }

  // هل المستخدم مخوّل برؤية التقارير؟ (المالك/السيادي، أو ?reports=1)
  function isOwner() {
    if (/[?&]reports=1/.test((window.location||{}).search||'')) return true;
    try {
      var u = JSON.parse(localStorage.getItem('gmt_user') || '{}');
      return /admin|sovereign|owner/i.test(u.role || '');
    } catch (e) { return false; }
  }

  function hideBotButtons() {
    HIDE_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.setProperty('display', 'none', 'important');
    });
    // أي زر عائم آخر للبوتات (احتياط) — عدا الوضع التدريبي وزر التقارير
    document.querySelectorAll('button[id*="fab"],button[id*="-btn"]').forEach(function (b) {
      var id = (b.id || '').toLowerCase();
      var keep = /sandbox|train|تدريب|gmt-reports-gate|guide/.test(id);
      if (!keep && HIDE_IDS.indexOf(b.id) < 0 &&
          /bug|inspect|warden|autotest|selftest|master|money|sentinel|st-fab/.test(id)) {
        b.style.setProperty('display', 'none', 'important');
      }
    });
  }

  // بوابة التقارير: زر واحد بالصفحة الرئيسية يفتح المصبّ الموحّد
  function reportsGate() {
    if (!isHomePage() || !isOwner()) return;
    if (document.getElementById('gmt-reports-gate') || !document.body) return;
    var b = document.createElement('button');
    b.id = 'gmt-reports-gate';
    b.textContent = '📊 تقارير النظام';
    b.title = 'تقارير البوتات — كل الأخطاء والاستعمال (للمالك)';
    b.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:2147481900;' +
      'background:linear-gradient(135deg,#C00012,#8E000D);color:#fff;border:0;border-radius:12px;' +
      'padding:12px 18px;font-family:Cairo,system-ui,sans-serif;font-weight:900;font-size:14px;' +
      'cursor:pointer;box-shadow:0 6px 20px rgba(192,0,18,.35)';
    b.onclick = function () {
      // افتح المصبّ الموحّد إن وُجد
      if (window.GMTMaster && GMTMaster.open) return GMTMaster.open();
      // أو المفتّش/المراقب كبديل
      if (window.GMTWarden && GMTWarden.panel) return GMTWarden.panel();
      alert('تقارير النظام غير محمّلة بهذه الصفحة.');
    };
    document.body.appendChild(b);
  }

  function apply() {
    hideBotButtons();
    reportsGate();
  }

  // طبّق باستمرار (البوتات قد تُنشئ أزرارها متأخرة)
  function boot() {
    apply();
    setTimeout(apply, 1000);
    setTimeout(apply, 3000);
    setTimeout(apply, 6000);
    // راقب أي زر جديد يُضاف
    try {
      var mo = new MutationObserver(function () { hideBotButtons(); });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  window.GMTVisibility = {
    version: '1.0',
    hide: hideBotButtons,
    showReportsGate: reportsGate,
    isOwner: isOwner,
    // للمالك: إظهار كل الأزرار مؤقتاً (تشخيص)
    showAll: function () {
      HIDE_IDS.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.style.removeProperty('display');
      });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();


/* ── gmt-cache-notice.js ── */
;/* ═══════════════════════════════════════════════════════════════════════════
   gmt-cache-notice.js — 💡 تذكير تحديث البيانات · v1.0 · 2026-07-24
   يظهر شريطاً أول فتح لكل نسخة جديدة: «امسح البيانات القديمة» + كيف.
   يظهر مرة واحدة لكل نسخة (يُخزّن رقم النسخة). لا يزعج بعد ذلك.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.GMTCacheNotice) return;
  var VERSION = 'v20260724';           // يُحدّث مع كل نشر
  var KEY = 'gmt_cache_notice_seen';

  function seen() { try { return localStorage.getItem(KEY) === VERSION; } catch (e) { return false; } }
  function markSeen() { try { localStorage.setItem(KEY, VERSION); } catch (e) {} }

  function show() {
    if (seen() || !document.body) return;
    var bar = document.createElement('div');
    bar.id = 'gmt-cache-notice';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147482500;' +
      'background:linear-gradient(135deg,#C00012,#8E000D);color:#fff;padding:11px 16px;' +
      'font-family:Cairo,system-ui,sans-serif;font-size:13px;font-weight:700;' +
      'display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;' +
      'box-shadow:0 3px 12px rgba(0,0,0,.2);direction:rtl';
    bar.innerHTML =
      '<span>💡 نسخة محدّثة! للحصول على أفضل أداء، امسح بيانات المتصفح القديمة.</span>' +
      '<button id="gmt-cn-how" style="background:#fff;color:#C00012;border:0;border-radius:8px;padding:6px 14px;font:inherit;font-weight:800;cursor:pointer">كيف؟</button>' +
      '<button id="gmt-cn-ok" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.5);border-radius:8px;padding:6px 14px;font:inherit;font-weight:800;cursor:pointer">فهمت ✓</button>';
    document.body.appendChild(bar);

    document.getElementById('gmt-cn-ok').onclick = function () { markSeen(); bar.remove(); };
    document.getElementById('gmt-cn-how').onclick = function () { showHow(); };
  }

  function showHow() {
    var m = document.createElement('div');
    m.style.cssText = 'position:fixed;inset:0;z-index:2147482600;background:rgba(15,18,25,.75);' +
      'display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl;font-family:Cairo,system-ui,sans-serif';
    m.innerHTML =
      '<div style="background:#fff;border-radius:16px;max-width:520px;width:100%;max-height:85vh;overflow:auto;padding:22px">' +
        '<div style="font-size:18px;font-weight:900;color:#C00012;margin-bottom:14px">💡 كيف تمسح البيانات القديمة</div>' +
        '<div style="font-size:13.5px;line-height:1.9;color:#374151">' +
          '<b>📱 على الهاتف (كروم):</b><br>' +
          '1. اضغط القفل 🔒 جنب الرابط.<br>' +
          '2. «معلومات الموقع» ← «مسح البيانات».<br>' +
          '3. أعد فتح الصفحة.<br><br>' +
          '<b>📱 لو مثبّت كتطبيق:</b><br>' +
          '1. اضغط مطوّلاً على أيقونة التطبيق.<br>' +
          '2. «معلومات التطبيق» ← «التخزين» ← «مسح التخزين».<br>' +
          '3. أو احذف التطبيق وأعد تثبيته.<br><br>' +
          '<b>💻 على الكمبيوتر:</b><br>' +
          'اضغط <b>Ctrl + Shift + R</b> (تحديث قوي).<br><br>' +
          '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;color:#15803d;font-size:12.5px">' +
          '✅ ملاحظة: هذه النسخة تتحدّث تلقائياً غالباً. هذا التذكير احتياطي فقط.</div>' +
        '</div>' +
        '<button id="gmt-cn-close" style="margin-top:16px;background:#C00012;color:#fff;border:0;border-radius:10px;padding:11px 22px;font:inherit;font-weight:800;font-size:14px;cursor:pointer;width:100%">فهمت، شكراً</button>' +
      '</div>';
    document.body.appendChild(m);
    document.getElementById('gmt-cn-close').onclick = function () {
      markSeen(); m.remove();
      var bar = document.getElementById('gmt-cache-notice'); if (bar) bar.remove();
    };
  }

  window.GMTCacheNotice = { show: show, version: VERSION };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(show, 800); });
  else setTimeout(show, 800);
})();
