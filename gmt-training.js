/* ═══════════════════════════════════════════════════════════════════════
   gmt-training.js — 🪦 شاهدة توافق (2026-07-12)
   نظام التدريب القديم (1033 سطراً) كان يقلع تلقائياً بالجرد والمشتريات
   ويحقن عناصره فوق الصفحة ⇒ تعارض مع الجولة والسيناريوهات + تعليق.
   البديل: gmt-guide.js (شاشات + دليل زرّاً بزرّ + جلسات) و gmt-sandbox.js (وضع تدريبي حقيقي).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const open = () => { if (window.GMTGuide) window.GMTGuide.index(); };
  const train = () => { if (window.GMTSandbox && !GMTSandbox.active) GMTSandbox.enter(); };
  window.GMTTraining = { mount: open, open, start: train, disabled: true };
})();
