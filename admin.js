// SteVal admin panel (Supabase Auth + Database + Storage) — needs i18n.js loaded first
const $ = (s) => document.querySelector(s);
const eur = (n) => new Intl.NumberFormat(LANG === 'it' ? 'it-IT' : 'en-IE', { style: 'currency', currency: 'EUR' }).format(n);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toast = (m) => { const el = $('#toast'); el.textContent = m; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2800); };
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : 0; };

const cfg = window.STEVAL || {};
if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) {
  document.querySelector('main').innerHTML = `<div class="panel login"><h2>${esc(t('a_notConfTitle'))}</h2><p style="color:var(--muted)">${t('a_notConfText')}</p></div>`;
  throw new Error('Supabase not configured');
}
const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const BUCKET = 'products';
const MARK = `/storage/v1/object/public/${BUCKET}/`;
const pathFromUrl = (u) => { const i = u.indexOf(MARK); return i < 0 ? null : decodeURIComponent(u.slice(i + MARK.length)); };
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

let products = [], orders = [];
let editing = null, newFiles = [], removeImages = [];

function showDash(on) { $('#loginBox').hidden = on; $('#dash').hidden = !on; $('#logout').hidden = !on; }
const setFormTitle = () => { $('#formTitle').textContent = t(editing ? 'a_edit' : 'a_add'); };

$('#logout').onclick = async () => { await sb.auth.signOut(); showDash(false); };
$('#loginForm').onsubmit = async (e) => {
  e.preventDefault();
  const { error } = await sb.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#pw').value });
  if (error) return toast(t('a_wrong'));
  $('#pw').value = ''; start();
};

async function start() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return showDash(false);
  showDash(true); setFormTitle();
  await refresh();
}
async function refresh() {
  const [p, o] = await Promise.all([
    sb.from('products').select('*').order('created_at', { ascending: false }),
    sb.from('orders').select('*').order('created_at', { ascending: false }),
  ]);
  if (p.error || o.error) { console.error(p.error || o.error); toast(t('a_errLoad')); }
  products = p.data || []; orders = o.data || [];
  renderProducts(); renderOrders();
}

// ---------- form ----------
$('#drop').onclick = () => $('#files').click();
// Phone photos are huge: shrink to max 1600px and convert to WebP before uploading
// (≈10x smaller → faster site and the free 1GB storage lasts much longer). GIFs are kept as they are.
const MAX_SIDE = 1600, MAX_RAW = 30 * 1024 * 1024, MAX_UPLOAD = 8 * 1024 * 1024;
async function shrink(f) {
  if (f.type === 'image/gif') return f;
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.82));
    if (!blob || blob.type !== 'image/webp' || blob.size >= f.size) return f; // already small: keep original
    return new File([blob], f.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' });
  } catch { return f; }
}

$('#files').onchange = async (e) => {
  const picked = [...e.target.files];
  e.target.value = '';
  for (const f of picked) {
    if (!EXT[f.type]) { toast(`${f.name}: ${t('a_errType')}`); continue; }
    if (f.size > MAX_RAW) { toast(`${f.name} ${t('a_errBig')}`); continue; }
    const s = await shrink(f);
    if (s.size > MAX_UPLOAD) { toast(`${f.name} ${t('a_errBig')}`); continue; }
    newFiles.push(s);
    renderPreviews();
  }
};

function renderPreviews() {
  const old = editing ? editing.images.filter((u) => !removeImages.includes(u)) : [];
  $('#previews').innerHTML =
    old.map((u) => `<div class="pv"><img src="${esc(u)}" alt=""><button type="button" class="x" data-old="${esc(u)}">✕</button></div>`).join('') +
    newFiles.map((f, i) => `<div class="pv"><img src="${URL.createObjectURL(f)}" alt=""><button type="button" class="x" data-new="${i}">✕</button></div>`).join('');
  $('#previews').querySelectorAll('.x').forEach((b) => b.onclick = () => {
    if (b.dataset.old) removeImages.push(b.dataset.old); else newFiles.splice(+b.dataset.new, 1);
    renderPreviews();
  });
}

const FIELDS = {
  title: 'title', titleEn: 'title_en', description: 'description', descriptionEn: 'description_en',
  price: 'price', marketplacePrice: 'marketplace_price', marketplaceName: 'marketplace_name',
  category: 'category', marketplaceUrl: 'marketplace_url',
};
function resetForm() {
  editing = null; newFiles = []; removeImages = [];
  $('#pform').reset(); setFormTitle(); $('#cancelEdit').hidden = true; renderPreviews();
}
$('#cancelEdit').onclick = resetForm;

$('#pform').onsubmit = async (e) => {
  e.preventDefault();
  const total = (editing ? editing.images.length - removeImages.length : 0) + newFiles.length;
  if (total > 8) return toast(t('a_errMax'));
  const url = $('#marketplaceUrl').value.trim();
  if (url && !/^https?:\/\//i.test(url)) return toast(t('a_errUrl'));
  $('#saveBtn').disabled = true;
  try {
    const uploaded = [];
    for (const f of newFiles) {
      const path = `${crypto.randomUUID()}.${EXT[f.type]}`;
      const { error } = await sb.storage.from(BUCKET).upload(path, f, { contentType: f.type, cacheControl: '31536000' });
      if (error) throw error;
      uploaded.push(sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    }
    const kept = editing ? editing.images.filter((u) => !removeImages.includes(u)) : [];
    const row = {
      title: $('#title').value.trim(), title_en: $('#titleEn').value.trim(),
      description: $('#description').value.trim(), description_en: $('#descriptionEn').value.trim(),
      category: $('#category').value.trim() || 'General',
      price: num($('#price').value), marketplace_price: num($('#marketplacePrice').value),
      marketplace_name: $('#marketplaceName').value.trim(), marketplace_url: url,
      images: [...kept, ...uploaded],
    };
    const q = editing ? sb.from('products').update(row).eq('id', editing.id) : sb.from('products').insert(row);
    const { error } = await q;
    if (error) throw error;
    const del = removeImages.map(pathFromUrl).filter(Boolean);
    if (del.length) await sb.storage.from(BUCKET).remove(del);
    toast(t('a_saved')); resetForm(); await refresh();
  } catch (err) { console.error(err); toast(t('a_errPrefix') + (err.message || '')); }
  $('#saveBtn').disabled = false;
};

// ---------- lists ----------
function renderProducts() {
  $('#plist').innerHTML = products.length ? products.map((p) => `<div class="prow">
      ${p.images[0] ? `<img src="${esc(p.images[0])}" alt="">` : '<div class="noimg">🖨️</div>'}
      <div><b>${esc(p.title)}</b><div class="meta">${eur(p.price)} · ${esc(p.category)} · ${p.images.length} ${esc(t('a_photos'))}${p.title_en ? ' · 🇬🇧' : ''}</div></div>
      <div style="display:flex;gap:6px"><button class="btn ghost sm" data-e="${esc(p.id)}">${esc(t('a_editBtn'))}</button><button class="btn danger sm" data-d="${esc(p.id)}">${esc(t('a_delBtn'))}</button></div>
    </div>`).join('') : `<p style="color:var(--muted)">${esc(t('a_noProducts'))}</p>`;
  $('#plist').querySelectorAll('[data-e]').forEach((b) => b.onclick = () => {
    editing = products.find((p) => p.id === b.dataset.e); newFiles = []; removeImages = [];
    for (const [k, col] of Object.entries(FIELDS)) $('#' + k).value = editing[col] ?? '';
    setFormTitle(); $('#cancelEdit').hidden = false; renderPreviews();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('#plist').querySelectorAll('[data-d]').forEach((b) => b.onclick = async () => {
    if (!confirm(t('a_confirmDel'))) return;
    const p = products.find((x) => x.id === b.dataset.d);
    const { error } = await sb.from('products').delete().eq('id', p.id);
    if (error) return toast(t('a_errPrefix') + error.message);
    const del = p.images.map(pathFromUrl).filter(Boolean);
    if (del.length) await sb.storage.from(BUCKET).remove(del);
    toast(t('a_deleted')); refresh();
  });
}

const STATUSES = ['new', 'confirmed', 'printing', 'shipped', 'done', 'cancelled'];
function renderOrders() {
  const n = orders.filter((o) => o.status === 'new').length;
  $('#newCount').textContent = n ? `(${n})` : '';
  const loc = LANG === 'it' ? 'it-IT' : 'en-GB';
  $('#olist').innerHTML = orders.length ? orders.map((o) => `<div class="order">
      <div class="h"><b>${esc(o.name)}</b><span style="color:var(--muted)">${new Date(o.created_at).toLocaleString(loc)}</span></div>
      <div><a href="mailto:${esc(o.email)}" style="color:var(--accent2)">${esc(o.email)}</a>${o.phone ? ' · ' + esc(o.phone) : ''}</div>
      <div>${(o.items || []).map((i) => `${esc(i.qty)}× ${esc(i.title)}`).join(', ')}</div>
      ${o.note ? `<div style="color:var(--muted);white-space:pre-wrap">${esc(o.note)}</div>` : ''}
      <div class="h"><b>${eur(o.total)}</b>
        <select class="f" style="width:auto" data-o="${esc(o.id)}">${STATUSES.map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${esc(t('st_' + s))}</option>`).join('')}</select></div>
    </div>`).join('') : `<p style="color:var(--muted)">${esc(t('a_noOrders'))}</p>`;
  $('#olist').querySelectorAll('select').forEach((s) => s.onchange = async () => {
    const { error } = await sb.from('orders').update({ status: s.value }).eq('id', s.dataset.o);
    toast(error ? t('a_errPrefix') + error.message : t('a_updated')); refresh();
  });
}

$('#tabP').onclick = () => { $('#tabP').classList.add('active'); $('#tabO').classList.remove('active'); $('#plist').hidden = false; $('#olist').hidden = true; };
$('#tabO').onclick = () => { $('#tabO').classList.add('active'); $('#tabP').classList.remove('active'); $('#plist').hidden = true; $('#olist').hidden = false; };

document.addEventListener('langchange', () => { setFormTitle(); renderProducts(); renderOrders(); });
setFormTitle();
start();
