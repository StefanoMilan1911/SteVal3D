// SteVal storefront (static site + Supabase) — needs i18n.js loaded first
const $ = (s) => document.querySelector(s);
const eur = (n) => new Intl.NumberFormat(LANG === 'it' ? 'it-IT' : 'en-IE', { style: 'currency', currency: 'EUR' }).format(n);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');

const cfg = window.STEVAL || {};
const sb = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase
  ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

let products = [];
let cart = [];
try { cart = JSON.parse(localStorage.getItem('steval_cart') || '[]'); } catch {}
let cat = 'All', query = '', currentId = null;

const saveCart = () => { try { localStorage.setItem('steval_cart', JSON.stringify(cart)); } catch {} };
const discount = (p) => (p.marketplacePrice > p.price && p.price > 0 ? Math.round((1 - p.price / p.marketplacePrice) * 100) : 0);
const norm = (r) => ({
  id: r.id, title: r.title, titleEn: r.title_en || '', description: r.description || '', descEn: r.description_en || '',
  category: r.category || 'General',
  price: Number(r.price) || 0, marketplacePrice: Number(r.marketplace_price) || 0,
  marketplaceName: r.marketplace_name || '', marketplaceUrl: safeUrl(r.marketplace_url), images: r.images || [],
});
// show the English text when the site is in English and an English version exists
const tr = (p) => ({
  title: LANG === 'en' && p.titleEn ? p.titleEn : p.title,
  description: LANG === 'en' && p.descEn ? p.descEn : p.description,
});

function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2600);
}

async function load() {
  if (!sb) { renderGrid(); renderCart(); return; }
  const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); toast(t('errLoad')); }
  products = (data || []).map(norm);
  cart = cart.filter((l) => products.some((p) => p.id === l.id));
  renderChips(); renderGrid(); renderCart();
}

function renderChips() {
  const cats = ['All', ...new Set(products.map((p) => p.category))];
  $('#chips').innerHTML = cats.map((c) => `<button class="chip ${c === cat ? 'active' : ''}" data-c="${esc(c)}">${esc(c === 'All' ? t('all') : c)}</button>`).join('');
  $('#chips').querySelectorAll('.chip').forEach((b) => b.onclick = () => { cat = b.dataset.c; renderChips(); renderGrid(); });
}

function renderGrid() {
  if (!sb) { $('#grid').innerHTML = `<div class="empty">${t('notConnected')}</div>`; return; }
  const list = products.filter((p) => {
    const hay = [p.title, p.titleEn, p.description, p.descEn].join(' ').toLowerCase();
    return (cat === 'All' || p.category === cat) && hay.includes(query);
  });
  if (!list.length) {
    $('#grid').innerHTML = `<div class="empty">${esc(products.length ? t('noMatch') : t('noProducts'))}</div>`;
    return;
  }
  $('#grid').innerHTML = list.map((p) => {
    const d = discount(p), x = tr(p);
    return `<article class="card" data-id="${esc(p.id)}">
      <div class="thumb">${p.images[0] ? `<img loading="lazy" src="${esc(p.images[0])}" alt="${esc(x.title)}">` : '<div class="noimg">🖨️</div>'}
        ${d ? `<span class="badge">-${d}%</span>` : ''}</div>
      <div class="body"><span class="cat">${esc(p.category)}</span><h3>${esc(x.title)}</h3>
        <div class="prices"><span class="price">${eur(p.price)}</span>${d ? `<span class="old">${eur(p.marketplacePrice)}</span>` : ''}</div></div>
    </article>`;
  }).join('');
  document.querySelectorAll('.card').forEach((c) => c.onclick = () => openProduct(c.dataset.id));
}

// ---------- product modal ----------
function openProduct(id) {
  const p = products.find((x) => x.id === id); if (!p) return;
  currentId = id;
  const d = discount(p), x = tr(p), imgs = p.images;
  const mname = p.marketplaceName || t('marketplace');
  $('#modalBody').innerHTML = `
    <div class="gallery">
      <div class="main">${imgs[0] ? `<img id="mainImg" src="${esc(imgs[0])}" alt="${esc(x.title)}">` : '<div class="noimg">🖨️</div>'}</div>
      ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((u, i) => `<img src="${esc(u)}" class="${i ? '' : 'on'}" data-u="${esc(u)}" alt="">`).join('')}</div>` : ''}
    </div>
    <div class="info">
      <span class="cat" style="color:var(--accent2);font-weight:700;font-size:.8rem;text-transform:uppercase">${esc(p.category)}</span>
      <h2>${esc(x.title)}</h2>
      <div class="prices"><span class="price" style="font-size:1.7rem">${eur(p.price)}</span>${d ? `<span class="old">${eur(p.marketplacePrice)}</span><span class="badge" style="position:static">-${d}%</span>` : ''}</div>
      ${d && p.marketplaceName ? `<div class="compare">${t('compare', { name: p.marketplaceName, price: eur(p.marketplacePrice), save: eur(p.marketplacePrice - p.price) })}</div>` : ''}
      <p class="desc">${esc(x.description)}</p>
      <button class="btn primary" id="addBtn">${esc(t('addToCart'))}</button>
      ${p.marketplaceUrl ? `<a class="btn ghost" href="${esc(p.marketplaceUrl)}" target="_blank" rel="noopener noreferrer">${esc(t('alsoOn', { name: mname }).replace(/&amp;/g, '&'))}</a>` : ''}
    </div>`;
  $('#modalBody').querySelectorAll('.thumbs img').forEach((th) => th.onclick = () => {
    $('#mainImg').src = th.dataset.u;
    $('#modalBody').querySelectorAll('.thumbs img').forEach((y) => y.classList.toggle('on', y === th));
  });
  $('#addBtn').onclick = () => { addToCart(p.id); closeAll(); openCart(); };
  $('#overlay').classList.add('open'); $('#modal').classList.add('open');
}

// ---------- cart ----------
function addToCart(id) {
  const l = cart.find((x) => x.id === id);
  if (l) l.qty = Math.min(l.qty + 1, 99); else cart.push({ id, qty: 1 });
  saveCart(); renderCart(); toast(t('added'));
}
function renderCart() {
  const lines = cart.map((l) => ({ ...l, p: products.find((p) => p.id === l.id) })).filter((l) => l.p);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  $('#cartCount').textContent = count; $('#cartCount').style.display = count ? 'grid' : 'none';
  $('#cartTotal').textContent = eur(lines.reduce((s, l) => s + l.p.price * l.qty, 0));
  $('#cartFoot').style.display = lines.length ? 'flex' : 'none';
  if (!lines.length) { $('#cartItems').innerHTML = `<p style="color:var(--muted);text-align:center;margin-top:40px">${esc(t('cartEmpty'))}</p>`; return; }
  $('#cartItems').innerHTML = lines.map((l) => `<div class="line">
      ${l.p.images[0] ? `<img src="${esc(l.p.images[0])}" alt="">` : '<div class="noimg">🖨️</div>'}
      <div><b>${esc(tr(l.p).title)}</b><div class="qty"><button data-a="-" data-id="${esc(l.id)}">−</button><span>${l.qty}</span><button data-a="+" data-id="${esc(l.id)}">+</button></div></div>
      <b>${eur(l.p.price * l.qty)}</b></div>`).join('');
  $('#cartItems').querySelectorAll('.qty button').forEach((b) => b.onclick = () => {
    const l = cart.find((x) => x.id === b.dataset.id);
    l.qty = Math.min(l.qty + (b.dataset.a === '+' ? 1 : -1), 99);
    if (l.qty <= 0) cart = cart.filter((x) => x !== l);
    saveCart(); renderCart();
  });
}
function openCart() { $('#overlay').classList.add('open'); $('#drawer').classList.add('open'); }
function closeAll() { currentId = null; ['#overlay', '#modal', '#drawer'].forEach((s) => $(s).classList.remove('open')); }

$('#sendOrder').onclick = async () => {
  const name = $('#oName').value.trim(), email = $('#oEmail').value.trim();
  if (!sb) return toast(t('errNotConn'));
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return toast(t('errNameEmail'));
  if (!cart.length) return toast(t('errEmpty'));
  const btn = $('#sendOrder'); btn.disabled = true;
  const { error } = await sb.from('orders').insert({
    name, email, phone: $('#oPhone').value.trim(), note: $('#oNote').value.trim(),
    items: cart.map((l) => ({ id: l.id, qty: l.qty })),
  });
  btn.disabled = false;
  if (error) { console.error(error); return toast(t('errSend')); }
  cart = []; saveCart(); renderCart(); closeAll();
  ['#oName', '#oEmail', '#oPhone', '#oNote'].forEach((s) => $(s).value = '');
  toast(t('orderSent'));
};

$('#cartBtn').onclick = openCart;
$('#drawerClose').onclick = $('#modalClose').onclick = $('#overlay').onclick = closeAll;
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeAll());
$('#search').oninput = (e) => { query = e.target.value.toLowerCase(); renderGrid(); };

// re-draw everything when the language changes
document.addEventListener('langchange', () => {
  renderChips(); renderGrid(); renderCart();
  if (currentId && $('#modal').classList.contains('open')) openProduct(currentId);
});

// ---------- PWA ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
let deferred;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('#installBtn').hidden = false; });
$('#installBtn').onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $('#installBtn').hidden = true; };

load();
