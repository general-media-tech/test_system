/* ═══════════════════════════════════════════════════════════════════════════
   🔬 GMT Deep Inspector — الفاحص العميق الذاتي
   الإصدار: 2026-08-18

   الفكرة (بطلب المالك): لا يكتفي بفحص «هل الزر موجود؟» بل **ينفّذ العمليات فعلياً**:
   يعرّف منتجاً · يعدّل سعره · يغيّر العملة · ينشئ فاتورة · يصدّر/يستورد · يرحّل ·
   يحذف · ثم **يقرأ من القاعدة** ليتأكّد ممّا جرى حقاً — ويسجّل النتيجة في القاعدة
   وفي الصفحة، ويربط كل فشل بنمط الخطأ المعروف (P1..P6).

   🛡️ الأمان (غير قابل للتفاوض):
     • كل ما يُنشئه يحمل الوسم __GMT_TEST__ وباركود يبدأ بـ TEST- ⇒ لا يختلط ببياناتك.
     • لا يلمس أي سجل لا يحمل الوسم. أبداً.
     • ينظّف نفسه في النهاية (ويُبقي التقرير).
     • الوضع الافتراضي «قراءة فقط»؛ الكتابة تتطلّب تأكيداً صريحاً من المالك.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const TAG      = '__GMT_TEST__';
  const BARPFX   = 'TEST-';
  const VERSION  = '2026-08-18';

  /* ── اكتشاف بيانات الاتصال من الصفحة المضيفة (كل صفحة تسمّيها بطريقتها) ── */
  function creds() {
    const url = global.SB || global.SUPABASE_URL || global.SUPA_URL || null;
    const key = global.KEY || global.SUPABASE_KEY || global.SUPABASE_ANON_KEY || null;
    return { url, key };
  }
  function ready() { const c = creds(); return !!(c.url && c.key); }

  async function api(method, path, body, extra) {
    const { url, key } = creds();
    if (!url || !key) throw new Error('لا توجد بيانات اتصال بالقاعدة في هذه الصفحة');
    const res = await fetch(url + '/rest/v1/' + path, {
      method,
      headers: Object.assign({
        apikey: key, Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json', Prefer: 'return=representation'
      }, extra || {}),
      body: body ? JSON.stringify(body) : null
    });
    const txt = await res.text();
    let data = null; try { data = txt ? JSON.parse(txt) : null; } catch (_) { data = txt; }
    if (!res.ok) { const e = new Error((data && data.message) || ('HTTP ' + res.status)); e.status = res.status; e.body = data; throw e; }
    return data;
  }

  /* ── الأنماط المعروفة (تُربط بها كل نتيجة فشل) ── */
  const PATTERNS = {
    P1: 'عمود/جدول ناقص في القاعدة (400 يُبتلع بصمت)',
    P2: 'افتراض موقعي متحجّر (عمود/صف/إزاحة ثابتة)',
    P3: 'الدهس بعد التنقيح (Object.assign يدهس التعديل)',
    P4: 'الإكمال رغم فشل خطوة فرعية (يحفظ قيمة فارغة)',
    P5: 'كود مكرّر عبر الصفحات (يُصلَح هنا ويبقى هناك)',
    P6: 'حارس مكتوب لكنه غير مُنادى (كود ميت)'
  };

  /* ── سجل النتائج ── */
  let LOG = [];
  const now = () => new Date().toISOString();
  function rec(o) {
    const row = Object.assign({ at: now() }, o);
    LOG.push(row);
    const ic = row.ok === true ? '✅' : row.ok === false ? '❌' : row.ok === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`${ic} [${row.area}] ${row.step}` + (row.detail ? ' — ' + row.detail : ''));
    if (typeof global.__gmtInspectorTick === 'function') { try { global.__gmtInspectorTick(row); } catch (_) {} }
    return row;
  }

  /* ── مساعدات ── */
  async function branchKeys() {
    const base = ['germany','china','haleb','homs','daraa','kurani','sarmada','fakhouri','hny_sbyl'];
    try {
      const rows = await api('GET', 'inv_columns?select=key_name');
      const dyn = (rows || []).map(r => r.key_name).filter(k => /^[A-Za-z_][A-Za-z0-9_]*$/.test(k || ''));
      return [...new Set([...base, ...dyn])];
    } catch (_) { return base; }
  }
  const testBarcode = () => BARPFX + Date.now() + '-' + Math.floor(Math.random() * 1000);

  /* ═══════════════ الفحوصات ═══════════════ */
  const SUITES = {

    /* ①  المخطط — هل الأعمدة التي يكتبها الكود موجودة فعلاً؟ [P1] */
    async schema() {
      const area = 'المخطط';
      const need = {
        products: ['name','barcode','price','wholesale_price','cost_price','net_cost','count','in_transit','min_stock','image_url','created_at'],
        import_log: ['inv_number','supplier','status','items_snapshot','transfer_moved','transferred','transferred_at','transferred_by','source_branch','dest_branch','total_amount','items_count','total_qty','currency'],
        stock_receipts: ['import_id','product_id','branch_key','qty','kind','note','created_by']
      };
      need.products = need.products.concat(await branchKeys());
      let bad = 0;
      for (const [tbl, cols] of Object.entries(need)) {
        const missing = [];
        for (const c of cols) {
          try { await api('GET', `${tbl}?select=${encodeURIComponent(c)}&limit=1`); }
          catch (e) { if (/does not exist|column|schema cache/i.test(e.message || '')) missing.push(c); }
        }
        if (missing.length) { bad++; rec({ area, step: `أعمدة ${tbl}`, ok: false, pattern: 'P1', detail: 'ناقص: ' + missing.join(', '), fix: `alter table ${tbl} add column if not exists …` }); }
        else rec({ area, step: `أعمدة ${tbl}`, ok: true, detail: cols.length + ' عمود موجود' });
      }
      return bad === 0;
    },

    /* ②  دورة حياة المنتج كاملة: إنشاء ← قراءة ← تعديل سعر ← حذف ← تأكيد الحذف */
    async productLifecycle(write) {
      const area = 'المنتجات';
      if (!write) { rec({ area, step: 'دورة حياة المنتج', ok: null, detail: 'تخطّي — وضع القراءة فقط' }); return true; }
      const bc = testBarcode();
      let id = null, allOk = true;
      try {
        const np = { name: TAG + ' منتج فحص', barcode: bc, price: 100, wholesale_price: 80, net_cost: 60, cost_price: 55 };
        (await branchKeys()).forEach(k => { np[k] = 0; });
        const created = await api('POST', 'products', np);
        id = (Array.isArray(created) ? created[0] : created)?.id;
        rec({ area, step: 'إنشاء منتج', ok: !!id, detail: id ? 'id=' + id : 'لم يُرجَع id' });
        if (!id) return false;

        const back = await api('GET', `products?id=eq.${id}&select=id,name,barcode,price,net_cost`);
        const p = (back || [])[0];
        const okRead = p && p.barcode === bc && Number(p.price) === 100;
        rec({ area, step: 'قراءة ما كُتب', ok: !!okRead, pattern: okRead ? null : 'P1',
              detail: okRead ? 'القيم مطابقة' : 'القيم غير مطابقة: ' + JSON.stringify(p || {}) });
        allOk = allOk && !!okRead;

        await api('PATCH', `products?id=eq.${id}`, { price: 175.5 }, { Prefer: 'return=minimal' });
        const after = ((await api('GET', `products?id=eq.${id}&select=price`)) || [])[0];
        const okUpd = after && Math.abs(Number(after.price) - 175.5) < 0.001;
        rec({ area, step: 'تعديل السعر ويُحفظ', ok: !!okUpd, pattern: okUpd ? null : 'P1',
              detail: okUpd ? '100 ⇐ 175.5' : 'السعر لم يتغيّر: ' + JSON.stringify(after || {}) });
        allOk = allOk && !!okUpd;

        // [P4] فحص عدم مسح الصورة: ضع صورة ثم عدّل حقلاً آخر
        await api('PATCH', `products?id=eq.${id}`, { image_url: 'https://example.com/t.png' }, { Prefer: 'return=minimal' });
        await api('PATCH', `products?id=eq.${id}`, { name: TAG + ' منتج فحص 2' }, { Prefer: 'return=minimal' });
        const img = ((await api('GET', `products?id=eq.${id}&select=image_url`)) || [])[0];
        const okImg = img && img.image_url;
        rec({ area, step: 'الصورة تبقى بعد تعديل حقل آخر', ok: !!okImg, pattern: okImg ? null : 'P4',
              detail: okImg ? 'محفوظة' : '⚠️ الصورة مُسِحت — نمط P4' });
        allOk = allOk && !!okImg;
      } catch (e) {
        rec({ area, step: 'دورة حياة المنتج', ok: false, pattern: 'P1', detail: e.message });
        allOk = false;
      } finally {
        if (id) {
          try {
            await api('DELETE', `products?id=eq.${id}`, null, { Prefer: 'return=minimal' });
            const gone = await api('GET', `products?id=eq.${id}&select=id`);
            const okDel = !gone || !gone.length;
            rec({ area, step: 'الحذف يُثبَّت في القاعدة', ok: okDel, pattern: okDel ? null : 'P3',
                  detail: okDel ? 'اختفى فعلياً' : '⚠️ ما زال موجوداً بعد الحذف' });
            allOk = allOk && okDel;
          } catch (e) { rec({ area, step: 'تنظيف المنتج', ok: 'warn', detail: e.message }); }
        }
      }
      return allOk;
    },

    /* ③  دورة الفاتورة: إنشاء ← تعديل حالة (جذر المضاعفة) ← سجل الاستلام ← حذف */
    async invoiceLifecycle(write) {
      const area = 'الفواتير';
      if (!write) { rec({ area, step: 'دورة الفاتورة', ok: null, detail: 'تخطّي — وضع القراءة فقط' }); return true; }
      let invId = null, allOk = true;
      const no = TAG + '-INV-' + Date.now();
      try {
        const snap = [{ id: null, name: TAG + ' بند', barcode: testBarcode(), qty: 3, unit_price: 10, sale_price: 20 }];
        const body = { inv_number: no, supplier: TAG, status: 'transit', items_snapshot: snap,
                       items_count: 1, total_qty: 3, total_amount: 30, currency: 'USD',
                       source_branch: 'germany', dest_branch: 'haleb' };
        const created = await api('POST', 'import_log', body);
        invId = (Array.isArray(created) ? created[0] : created)?.id;
        rec({ area, step: 'إنشاء فاتورة (كل الأعمدة)', ok: !!invId, pattern: invId ? null : 'P1',
              detail: invId ? 'id=' + invId : 'فشل — غالباً عمود ناقص' });
        if (!invId) return false;

        // 🔴 جذر المضاعفة: هل تُحفظ أعمدة حالة الترحيل؟
        await api('PATCH', `import_log?id=eq.${invId}`,
          { status: 'arrived', transferred: true, transferred_at: now(), transferred_by: 'inspector', transfer_moved: 1 },
          { Prefer: 'return=minimal' });
        const st = ((await api('GET', `import_log?id=eq.${invId}&select=status,transferred,transferred_at`)) || [])[0];
        const okSt = st && st.status === 'arrived' && st.transferred === true;
        rec({ area, step: '🔴 تحديث حالة الترحيل يُحفظ (جذر المضاعفة)', ok: !!okSt, pattern: okSt ? null : 'P1',
              detail: okSt ? 'الحالة ثابتة ⇒ لن تتكرّر' : 'لم تُحفظ ⇒ ستُرحَّل ثانيةً وتتضاعف الكمية!' });
        allOk = allOk && !!okSt;

        // سجل الاستلام — الحماية الثانية
        try {
          const r = await api('POST', 'stock_receipts',
            { import_id: invId, product_id: null, branch_key: 'haleb', qty: 3, kind: 'transfer_arrive', note: TAG, created_by: 'inspector' });
          const rid = (Array.isArray(r) ? r[0] : r)?.id;
          rec({ area, step: 'سجل الاستلام يقبل الكتابة', ok: !!rid, pattern: rid ? null : 'P1',
                detail: rid ? 'مكتوب' : 'فشل — تحقّق من note/created_by' });
          if (rid) await api('DELETE', `stock_receipts?id=eq.${rid}`, null, { Prefer: 'return=minimal' });
          allOk = allOk && !!rid;
        } catch (e) {
          rec({ area, step: 'سجل الاستلام يقبل الكتابة', ok: false, pattern: 'P1', detail: e.message });
          allOk = false;
        }

        // تعديل العملة
        await api('PATCH', `import_log?id=eq.${invId}`, { currency: 'EUR' }, { Prefer: 'return=minimal' });
        const cur = ((await api('GET', `import_log?id=eq.${invId}&select=currency`)) || [])[0];
        const okCur = cur && cur.currency === 'EUR';
        rec({ area, step: 'تغيير العملة يُحفظ', ok: !!okCur, pattern: okCur ? null : 'P1',
              detail: okCur ? 'USD ⇐ EUR' : 'لم تتغيّر' });
        allOk = allOk && !!okCur;

        // حذف بند من items_snapshot [P3]
        await api('PATCH', `import_log?id=eq.${invId}`, { items_snapshot: [], items_count: 0 }, { Prefer: 'return=minimal' });
        const sn = ((await api('GET', `import_log?id=eq.${invId}&select=items_snapshot`)) || [])[0];
        const okSnap = sn && Array.isArray(sn.items_snapshot) && sn.items_snapshot.length === 0;
        rec({ area, step: 'حذف بند من الفاتورة يُثبَّت', ok: !!okSnap, pattern: okSnap ? null : 'P3',
              detail: okSnap ? 'القائمة فرغت فعلياً' : '⚠️ البند عاد — نمط P3 (الدهس)' });
        allOk = allOk && !!okSnap;
      } catch (e) {
        rec({ area, step: 'دورة الفاتورة', ok: false, pattern: 'P1', detail: e.message });
        allOk = false;
      } finally {
        if (invId) { try { await api('DELETE', `import_log?id=eq.${invId}`, null, { Prefer: 'return=minimal' }); } catch (_) {} }
      }
      return allOk;
    },

    /* ④  الحُرّاس — مكتوبة **ومُنادَاة**؟ [P6] */
    async guards() {
      const area = 'الحُرّاس';
      const G = global.GMTIntegrity;
      if (!G) { rec({ area, step: 'GMTIntegrity محمّل', ok: false, pattern: 'P6', detail: 'غير موجود في هذه الصفحة' }); return false; }
      let ok = true;
      ['guardDelete','guardTransfer','guardDuplicateInvoice'].forEach(fn => {
        const has = typeof G[fn] === 'function';
        if (!has) ok = false;
        rec({ area, step: 'الحارس ' + fn + ' معرّف', ok: has, pattern: has ? null : 'P6' });
      });
      // هل الحارس مُنادى في هذه الصفحة؟ (فحص نصّي على الصفحة نفسها)
      try {
        const src = document.documentElement.innerHTML;
        [['guardTransfer','الترحيل'],['guardDelete','الحذف'],['guardDuplicateInvoice','تكرار الفاتورة']].forEach(([fn,label]) => {
          const called = new RegExp('GMTIntegrity\\s*\\.\\s*' + fn + '\\s*\\(').test(src);
          rec({ area, step: `حارس ${label} مُنادى في الصفحة`, ok: called ? true : 'warn', pattern: called ? null : 'P6',
                detail: called ? 'موصول' : 'غير مُنادى هنا (قد يكون طبيعياً إن كانت الصفحة لا تنفّذ هذه العملية)' });
        });
      } catch (_) {}
      return ok;
    },

    /* ⑤  الأزرار — كل onclick يشير إلى دالة موجودة فعلاً */
    async buttons() {
      const area = 'الأزرار';
      const BUILTIN = new Set(['if','for','while','return','function','switch','catch','typeof','new','this','alert','confirm','parseInt','parseFloat','setTimeout','event']);
      const found = new Map(); let broken = 0;
      document.querySelectorAll('[onclick],[onchange],[oninput],[onsubmit]').forEach(el => {
        ['onclick','onchange','oninput','onsubmit'].forEach(a => {
          const v = el.getAttribute(a); if (!v) return;
          (v.match(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g) || []).forEach(m => {
            const fn = m.replace(/\s*\($/, '');
            if (!BUILTIN.has(fn)) found.set(fn, (found.get(fn) || 0) + 1);
          });
        });
      });
      found.forEach((n, fn) => {
        if (typeof global[fn] !== 'function') {
          broken++;
          rec({ area, step: 'زر يستدعي دالة غير موجودة: ' + fn + '()', ok: false, pattern: 'P6', detail: n + ' موضع' });
        }
      });
      rec({ area, step: 'فحص الأزرار', ok: broken === 0, detail: found.size + ' دالة مرتبطة، ' + broken + ' مكسورة' });
      return broken === 0;
    },

    /* ⑥  سلامة البيانات — يتائم ومكرّرات (قراءة فقط) */
    async dataIntegrity() {
      const area = 'سلامة البيانات';
      let ok = true;
      try {
        const prods = await api('GET', 'products?select=id,name,barcode&limit=1000');
        const seen = new Map(); const dup = [];
        (prods || []).forEach(p => {
          const b = String(p.barcode || '').trim().toLowerCase();
          if (!b) return;
          if (seen.has(b)) dup.push(p.name); else seen.set(b, p.id);
        });
        rec({ area, step: 'باركودات مكرّرة', ok: dup.length === 0 ? true : 'warn',
              detail: dup.length ? dup.slice(0, 5).join(' · ') + (dup.length > 5 ? ` …و${dup.length - 5}` : '') : 'لا تكرار في أول 1000' });
        if (dup.length) ok = false;

        const invs = await api('GET', 'import_log?select=inv_number,status,transferred&limit=500');
        const risky = (invs || []).filter(i => i.status === 'arrived' && i.transferred !== true);
        rec({ area, step: 'فواتير «واصلة» بلا ختم ترحيل (خطر مضاعفة)', ok: risky.length === 0 ? true : false,
              pattern: risky.length ? 'P1' : null,
              detail: risky.length ? risky.slice(0, 5).map(r => r.inv_number).join(' · ') : 'لا شيء' });
        if (risky.length) ok = false;
      } catch (e) { rec({ area, step: 'سلامة البيانات', ok: 'warn', detail: e.message }); }
      return ok;
    },

    /* ⑦  بقايا الفحوصات السابقة */
    async leftovers(write) {
      const area = 'التنظيف';
      let n = 0;
      for (const [t, f] of [['products', 'barcode=like.' + BARPFX + '*'], ['import_log', 'inv_number=like.*' + TAG + '*']]) {
        try {
          const rows = await api('GET', `${t}?select=id&${f}&limit=200`);
          if (rows && rows.length) {
            n += rows.length;
            if (write) { for (const r of rows) { try { await api('DELETE', `${t}?id=eq.${r.id}`, null, { Prefer: 'return=minimal' }); } catch (_) {} } }
          }
        } catch (_) {}
      }
      rec({ area, step: 'بقايا بيانات الفحص', ok: n === 0 ? true : 'warn',
            detail: n === 0 ? 'نظيف' : (write ? 'حُذفت ' + n + ' سجلاً' : n + ' سجلاً — شغّل بوضع الكتابة للتنظيف') });
      return true;
    }
  };

  /* ═══════════════ المُشغّل ═══════════════ */
  async function run(opts) {
    opts = opts || {};
    const write = opts.write === true;
    LOG = [];
    rec({ area: 'بدء', step: `الفاحص العميق v${VERSION} — الوضع: ${write ? '✍️ كتابة حقيقية (بيانات موسومة)' : '👁️ قراءة فقط'}`, ok: null });
    if (!ready()) { rec({ area: 'بدء', step: 'الاتصال بالقاعدة', ok: false, detail: 'لا توجد مفاتيح في هذه الصفحة' }); return report(); }

    await SUITES.schema();
    await SUITES.guards();
    await SUITES.buttons();
    await SUITES.dataIntegrity();
    await SUITES.productLifecycle(write);
    await SUITES.invoiceLifecycle(write);
    await SUITES.leftovers(write);

    return report();
  }

  function report() {
    const fail = LOG.filter(r => r.ok === false);
    const warn = LOG.filter(r => r.ok === 'warn');
    const pass = LOG.filter(r => r.ok === true);
    const byPattern = {};
    fail.forEach(r => { if (r.pattern) (byPattern[r.pattern] = byPattern[r.pattern] || []).push(r.step); });
    const out = { version: VERSION, at: now(), pass: pass.length, warn: warn.length, fail: fail.length, byPattern, log: LOG };
    console.log(`%c🔬 النتيجة: ✅ ${pass.length} · ⚠️ ${warn.length} · ❌ ${fail.length}`,
                'font-weight:bold;font-size:14px;color:' + (fail.length ? '#C00012' : '#16a34a'));
    Object.entries(byPattern).forEach(([p, steps]) =>
      console.log(`  【${p}】 ${PATTERNS[p] || ''} → ${steps.length} إخفاق`));
    global.__gmtLastReport = out;
    return out;
  }

  function toText(r) {
    r = r || global.__gmtLastReport; if (!r) return 'لا يوجد تقرير — شغّل الفحص أولاً.';
    const L = ['🔬 تقرير الفاحص العميق GMT', 'التاريخ: ' + new Date(r.at).toLocaleString('ar-SY'),
               `النتيجة: ✅ ${r.pass} · ⚠️ ${r.warn} · ❌ ${r.fail}`, ''];
    if (Object.keys(r.byPattern).length) {
      L.push('أنماط الإخفاق:');
      Object.entries(r.byPattern).forEach(([p, s]) => L.push(`  【${p}】 ${PATTERNS[p] || ''} (${s.length})`));
      L.push('');
    }
    r.log.forEach(x => L.push(`${x.ok === true ? '✅' : x.ok === false ? '❌' : x.ok === 'warn' ? '⚠️' : 'ℹ️'} [${x.area}] ${x.step}${x.detail ? ' — ' + x.detail : ''}${x.pattern ? ' «' + x.pattern + '»' : ''}`));
    return L.join('\n');
  }

  global.GMTDeepInspector = {
    version: VERSION, PATTERNS,
    scan: () => run({ write: false }),
    full: async function () {
      const go = confirm(
        '🔬 الفحص العميق الكامل\n\n' +
        'سيُنشئ الفاحص بيانات فحص حقيقية في القاعدة (منتج + فاتورة + سجل استلام)،\n' +
        'يقرأها ليتأكّد ممّا حدث فعلاً، ثم **يحذفها كلها**.\n\n' +
        'كل ما يُنشئه موسوم بـ ' + TAG + ' وباركود ' + BARPFX + '… ولا يلمس أي سجل آخر.\n\n' +
        'هل تريد المتابعة؟');
      if (!go) return null;
      return run({ write: true });
    },
    cleanup: () => SUITES.leftovers(true),
    report: () => global.__gmtLastReport,
    text: toText,
    copy: function () {
      const t = toText(); const ta = document.createElement('textarea');
      ta.value = t; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta); return t;
    }
  };

  console.log('%c🔬 GMTDeepInspector جاهز — GMTDeepInspector.scan() للقراءة، .full() للفحص الكامل',
              'color:#C00012;font-weight:bold');
})(window);
