// SteVal admin panel (Supabase Auth + Database + Storage)
const $ = (s) => document.querySelector(s);
const eur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2800); };
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : 0; };

const cfg = window.STEVAL || {};
if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) {
  document.querySelector('main').innerHTML = '<div class="panel login"><h2>Not configured</h2><p style="color:var(--muted)">Open <code>config.js</code> and add your Supabase URL and anon key.</p></div>';
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

$('#logout').onclick = async () => { await sb.auth.signOut(); showDash(false); };
$('#loginForm').onsubmit = async (e) => {
  e.preventDefault();
  const { error } = await sb.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#pw').value });
  if (error) return toast('Wrong email or password');
  $('#pw').value = ''; start();
};

async function start() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return showDash(false);
  showDash(true);
  await refresh();
}
async function refresh() {
  const [p, o] = await Promise.all([
    sb.from('products').select('*').order('created_at', { ascending: false }),
    sb.from('orders').select('*').order('created_at', { ascending: false }),
  ]);
  if (p.error || o.error) { console.error(p.error || o.error); toast('Could not load data (did you run supabase.sql?)'); }
  products = p.data || []; orders = o.data || [];
  renderProducts(); renderOrders();
}

// ---------- form ----------
$('#drop').onclick = () => $('#files').click();
$('#files').onchange = (e) => {
  for (const f of e.target.files) {
    if (!EXT[f.type]) { toast(f.name + ': only JPG, PNG, WEBP, GIF'); continue; }
    if (f.size > 8 * 1024 * 1024) { toast(f.name + ' is bigger than 8MB'); continue; }
    newFiles.push(f);
  }
  e.target.value = ''; renderPreviews();
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

const FIELDS = { title: 'title', description: 'description', price: 'price', marketplacePrice: 'marketplace_price', marketplaceName: 'marketplace_name', category: 'category', marketplaceUrl: 'marketplace_url' };
function resetForm() {
  editing = null; newFiles = []; removeImages = [];
  $('#pform').reset(); $('#formTitle').textContent = 'Add product'; $('#cancelEdit').hidden = true; renderPreviews();
}
$('#cancelEdit').onclick = resetForm;

$('#pform').onsubmit = async (e) => {
  e.preventDefault();
  const total = (editing ? editing.images.length - removeImages.length : 0) + newFiles.length;
  if (total > 8) return toast('Max 8 photos per product');
  const url = $('#marketplaceUrl').value.trim();
  if (url && !/^https?:\/\//i.test(url)) return toast('Marketplace link must start with http(s)://');
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
      title: $('#title').value.trim(), description: $('#description').value.trim(),
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
    toast('Saved ✓'); resetForm(); await refresh();
  } catch (err) { console.error(err); toast('Error: ' + (err.message || 'could not save')); }
  $('#saveBtn').disabled = false;
};

// ---------- lists ----------
function renderProducts() {
  $('#plist').innerHTML = products.length ? products.map((p) => `<div class="prow">
      ${p.images[0] ? `<img src="${esc(p.images[0])}" alt="">` : '<div class="noimg">🖨️</div>'}
      <div><b>${esc(p.title)}</b><div class="meta">${eur(p.price)} · ${esc(p.category)} · ${p.images.length} photo(s)</div></div>
      <div style="display:flex;gap:6px"><button class="btn ghost sm" data-e="${esc(p.id)}">Edit</button><button class="btn danger sm" data-d="${esc(p.id)}">Delete</button></div>
    </div>`).join('') : '<p style="color:var(--muted)">No products yet. Add your first one on the left 👈</p>';
  $('#plist').querySelectorAll('[data-e]').forEach((b) => b.onclick = () => {
    editing = products.find((p) => p.id === b.dataset.e); newFiles = []; removeImages = [];
    for (const [k, col] of Object.entries(FIELDS)) $('#' + k).value = editing[col] ?? '';
    $('#formTitle').textContent = 'Edit product'; $('#cancelEdit').hidden = false; renderPreviews();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('#plist').querySelectorAll('[data-d]').forEach((b) => b.onclick = async () => {
    if (!confirm('Delete this product and its photos?')) return;
    const p = products.find((x) => x.id === b.dataset.d);
    const { error } = await sb.from('products').delete().eq('id', p.id);
    if (error) return toast('Error: ' + error.message);
    const del = p.images.map(pathFromUrl).filter(Boolean);
    if (del.length) await sb.storage.from(BUCKET).remove(del);
    toast('Deleted'); refresh();
  });
}

const STATUSES = ['new', 'confirmed', 'printing', 'shipped', 'done', 'cancelled'];
function renderOrders() {
  const n = orders.filter((o) => o.status === 'new').length;
  $('#newCount').textContent = n ? `(${n})` : '';
  $('#olist').innerHTML = orders.length ? orders.map((o) => `<div class="order">
      <div class="h"><b>${esc(o.name)}</b><span style="color:var(--muted)">${new Date(o.created_at).toLocaleString()}</span></div>
      <div><a href="mailto:${esc(o.email)}" style="color:var(--accent2)">${esc(o.email)}</a>${o.phone ? ' · ' + esc(o.phone) : ''}</div>
      <div>${(o.items || []).map((i) => `${esc(i.qty)}× ${esc(i.title)}`).join(', ')}</div>
      ${o.note ? `<div style="color:var(--muted);white-space:pre-wrap">${esc(o.note)}</div>` : ''}
      <div class="h"><b>${eur(o.total)}</b>
        <select class="f" style="width:auto" data-o="${esc(o.id)}">${STATUSES.map((s) => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    </div>`).join('') : '<p style="color:var(--muted)">No orders yet.</p>';
  $('#olist').querySelectorAll('select').forEach((s) => s.onchange = async () => {
    const { error } = await sb.from('orders').update({ status: s.value }).eq('id', s.dataset.o);
    toast(error ? 'Error: ' + error.message : 'Updated'); refresh();
  });
}

$('#tabP').onclick = () => { $('#tabP').classList.add('active'); $('#tabO').classList.remove('active'); $('#plist').hidden = false; $('#olist').hidden = true; };
$('#tabO').onclick = () => { $('#tabO').classList.add('active'); $('#tabP').classList.remove('active'); $('#plist').hidden = true; $('#olist').hidden = false; };

start();
