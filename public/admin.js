// SteVal admin panel
const $ = (s) => document.querySelector(s);
const eur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); };

let token = sessionStorage.getItem('steval_token') || '';
let products = [], orders = [];
let editing = null;          // product being edited
let newFiles = [];           // File[] chosen
let removeImages = [];       // existing urls to delete

async function api(url, opts = {}) {
  opts.headers = { ...(opts.headers || {}), Authorization: 'Bearer ' + token };
  const r = await fetch(url, opts);
  if (r.status === 401) { logout(); throw new Error('Session expired'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Error');
  return j;
}

function showDash(on) {
  $('#loginBox').hidden = on; $('#dash').hidden = !on; $('#logout').hidden = !on;
}
function logout() { token = ''; sessionStorage.removeItem('steval_token'); showDash(false); }
$('#logout').onclick = logout;

$('#loginForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('#pw').value }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    token = j.token; sessionStorage.setItem('steval_token', token);
    $('#pw').value = ''; start();
  } catch (err) { toast(err.message); }
};

async function start() {
  showDash(true);
  try {
    products = await (await fetch('/api/products')).json();
    orders = await api('/api/orders');
  } catch (e) { return; }
  renderProducts(); renderOrders();
}

// ---------- form ----------
$('#drop').onclick = () => $('#files').click();
$('#files').onchange = (e) => { newFiles.push(...e.target.files); e.target.value = ''; renderPreviews(); };

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

const FIELDS = ['title', 'description', 'price', 'marketplacePrice', 'marketplaceName', 'category', 'marketplaceUrl'];
function resetForm() {
  editing = null; newFiles = []; removeImages = [];
  $('#pform').reset(); $('#formTitle').textContent = 'Add product'; $('#cancelEdit').hidden = true; renderPreviews();
}
$('#cancelEdit').onclick = resetForm;

$('#pform').onsubmit = async (e) => {
  e.preventDefault();
  const fd = new FormData();
  FIELDS.forEach((k) => fd.append(k, $('#' + k).value));
  newFiles.forEach((f) => fd.append('images', f));
  if (editing) fd.append('removeImages', JSON.stringify(removeImages));
  $('#saveBtn').disabled = true;
  try {
    await api(editing ? '/api/products/' + editing.id : '/api/products', { method: editing ? 'PUT' : 'POST', body: fd });
    toast('Saved ✓'); resetForm(); await start();
  } catch (err) { toast(err.message); }
  $('#saveBtn').disabled = false;
};

// ---------- lists ----------
function renderProducts() {
  $('#plist').innerHTML = products.length ? products.map((p) => `<div class="prow">
      ${p.images[0] ? `<img src="${esc(p.images[0])}" alt="">` : '<div class="noimg">🖨️</div>'}
      <div><b>${esc(p.title)}</b><div class="meta">${eur(p.price)} · ${esc(p.category)} · ${p.images.length} photo(s)</div></div>
      <div style="display:flex;gap:6px"><button class="btn ghost sm" data-e="${p.id}">Edit</button><button class="btn danger sm" data-d="${p.id}">Delete</button></div>
    </div>`).join('') : '<p style="color:var(--muted)">No products yet. Add your first one on the left 👈</p>';
  $('#plist').querySelectorAll('[data-e]').forEach((b) => b.onclick = () => {
    editing = products.find((p) => p.id === b.dataset.e); newFiles = []; removeImages = [];
    FIELDS.forEach((k) => $('#' + k).value = editing[k] || '');
    $('#formTitle').textContent = 'Edit product'; $('#cancelEdit').hidden = false; renderPreviews();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('#plist').querySelectorAll('[data-d]').forEach((b) => b.onclick = async () => {
    if (!confirm('Delete this product and its photos?')) return;
    try { await api('/api/products/' + b.dataset.d, { method: 'DELETE' }); toast('Deleted'); start(); } catch (e) { toast(e.message); }
  });
}

const STATUSES = ['new', 'confirmed', 'printing', 'shipped', 'done', 'cancelled'];
function renderOrders() {
  const n = orders.filter((o) => o.status === 'new').length;
  $('#newCount').textContent = n ? `(${n})` : '';
  $('#olist').innerHTML = orders.length ? orders.map((o) => `<div class="order">
      <div class="h"><b>${esc(o.name)}</b><span style="color:var(--muted)">${new Date(o.createdAt).toLocaleString()}</span></div>
      <div><a href="mailto:${esc(o.email)}" style="color:var(--accent2)">${esc(o.email)}</a>${o.phone ? ' · ' + esc(o.phone) : ''}</div>
      <div>${o.items.map((i) => `${i.qty}× ${esc(i.title)}`).join(', ')}</div>
      ${o.note ? `<div style="color:var(--muted);white-space:pre-wrap">${esc(o.note)}</div>` : ''}
      <div class="h"><b>${eur(o.total)}</b>
        <select class="f" style="width:auto" data-o="${o.id}">${STATUSES.map((s) => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    </div>`).join('') : '<p style="color:var(--muted)">No orders yet.</p>';
  $('#olist').querySelectorAll('select').forEach((s) => s.onchange = async () => {
    try { await api('/api/orders/' + s.dataset.o, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s.value }) }); toast('Updated'); start(); } catch (e) { toast(e.message); }
  });
}

$('#tabP').onclick = () => { $('#tabP').classList.add('active'); $('#tabO').classList.remove('active'); $('#plist').hidden = false; $('#olist').hidden = true; };
$('#tabO').onclick = () => { $('#tabO').classList.add('active'); $('#tabP').classList.remove('active'); $('#plist').hidden = true; $('#olist').hidden = false; };

if (token) start();
