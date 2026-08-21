/* ═══════════════════════════════════════════════════════════════════════════
   gmt-updater.js — 🔄 التحديث القسري التلقائي · v1.0 · 2026-07-28
   يحل مشكلة "المتصفح يعرض نسخة قديمة" جذرياً وتلقائياً بلا تدخّل المستخدم:
   1. يُلغي تسجيل أي Service Worker قديم فوراً.
   2. يمسح كل الكاشات القديمة.
   3. يفرض إعادة تحميل مرة واحدة عند تغيّر النسخة.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // رقم النسخة — يتغيّر مع كل نشر (تاريخ + وقت)
  var BUILD = '20260728-2200';
  var KEY = 'gmt_build_version';

  // ── 1) ألغِ تسجيل كل Service Workers القديمة فوراً ──
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      var hadOld = false;
      regs.forEach(function (reg) {
        // ألغِ التسجيل القديم (سيُعاد تسجيل الجديد بواسطة الصفحة)
        reg.unregister();
        hadOld = true;
      });
    }).catch(function () {});
  }

  // ── 2) امسح كل الكاشات القديمة ──
  if ('caches' in window) {
    caches.keys().then(function (names) {
      names.forEach(function (n) {
        // احذف أي كاش لا يطابق النسخة الحالية
        if (n.indexOf(BUILD) < 0) {
          caches.delete(n);
        }
      });
    }).catch(function () {});
  }

  // ── 3) سجّل النسخة الحالية (بلا إعادة تحميل قسري — تجنّباً لقطع تحميل core) ──
  try {
    var saved = localStorage.getItem(KEY);
    if (saved !== BUILD) {
      localStorage.setItem(KEY, BUILD);
    }
  } catch (e) {}

  window.GMT_BUILD = BUILD;
})();
