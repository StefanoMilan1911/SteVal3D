// SteVal storefront
const $ = (s) => document.querySelector(s);
const eur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let products = [];
let cart = [];
try { cart = JSON.parse(localStorage.getItem('steval_cart') || '[]'); } catch {}
let cat = 'All', query = '';

const saveCart = () => { try { localStorage.setItem('steval_cart', JSON.stringify(cart)); } catch {} };
const discount = (p) => (p.marketplacePrice > p.price && p.price > 0 ? Math.round((1 - p.price / p.marketplacePrice) * 100) : 0);

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400);
}

async function load() {
  try {
    const r = await fetch('/api/products');
    products = await r.json();
  } catch { products = []; }
  // drop cart lines for products that no longer exist
  cart = cart.filter((l) => products.some((p) => p.id === l.id));
  renderChips(); renderGrid(); renderCart();
}

function renderChips() {
  const cats = ['All', ...new Set(products.map((p) => p.category))];
  $('#chips').innerHTML = cats.map((c) => `<button class="chip ${c === cat ? 'active' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
  $('#chips').querySelectorAll('.chip').forEach((b) => b.onclick = () => { cat = b.dataset.c; renderChips(); renderGrid(); });
}

function renderGrid() {
  const list = products.filter((p) => (cat === 'All' || p.category === cat) && (p.title + ' ' + p.description).toLowerCase().includes(query));
  if (!list.length) {
    $('#grid').innerHTML = `<div class="empty">${products.length ? 'No products match your search.' : 'No products yet — check back soon! 🖨️'}</div>`;
    return;
  }
  $('#grid').innerHTML = list.map((p) => {
    const d = discount(p);
    return `<article class="card" data-id="${p.id}">
      <div class="thumb">${p.images[0] ? `<img loading="lazy" src="${esc(p.images[0])}" alt="${esc(p.title)}">` : '<div class="noimg">🖨️</div>'}
        ${d ? `<span class="badge">-${d}%</span>` : ''}</div>
      <div class="body"><span class="cat">${esc(p.category)}</span><h3>${esc(p.title)}</h3>
        <div class="prices"><span class="price">${eur(p.price)}</span>${d ? `<span class="old">${eur(p.marketplacePrice)}</span>` : ''}</div></div>
    </article>`;
  }).join('');
  document.querySelectorAll('.card').forEach((c) => c.onclick = () => openProduct(c.dataset.id));
}

// ---------- product modal ----------
function openProduct(id) {
  const p = products.find((x) => x.id === id); if (!p) return;
  const d = discount(p);
  const imgs = p.images.length ? p.images : [];
  $('#modalBody').innerHTML = `
    <div class="gallery">
      <div class="main">${imgs[0] ? `<img id="mainImg" src="${esc(imgs[0])}" alt="${esc(p.title)}">` : '<div class="noimg">🖨️</div>'}</div>
      ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((u, i) => `<img src="${esc(u)}" class="${i ? '' : 'on'}" data-u="${esc(u)}" alt="">`).join('')}</div>` : ''}
    </div>
    <div class="info">
      <span class="cat" style="color:var(--accent2);font-weight:700;font-size:.8rem;text-transform:uppercase">${esc(p.category)}</span>
      <h2>${esc(p.title)}</h2>
      <div class="prices"><span class="price" style="font-size:1.7rem">${eur(p.price)}</span>${d ? `<span class="old">${eur(p.marketplacePrice)}</span><span class="badge" style="position:static">-${d}%</span>` : ''}</div>
      ${d && p.marketplaceName ? `<div class="compare">On ${esc(p.marketplaceName)} it costs ${eur(p.marketplacePrice)}. Buy here and <b>save ${eur(p.marketplacePrice - p.price)}</b>.</div>` : ''}
      <p class="desc">${esc(p.description)}</p>
      <button class="btn primary" id="addBtn">Add to cart</button>
      ${p.marketplaceUrl ? `<a class="btn ghost" href="${esc(p.marketplaceUrl)}" target="_blank" rel="noopener noreferrer">Also on ${esc(p.marketplaceName || 'marketplace')} ↗</a>` : ''}
    </div>`;
  $('#modalBody').querySelectorAll('.thumbs img').forEach((t) => t.onclick = () => {
    $('#mainImg').src = t.dataset.u;
    $('#modalBody').querySelectorAll('.thumbs img').forEach((x) => x.classList.toggle('on', x === t));
  });
  $('#addBtn').onclick = () => { addToCart(p.id); closeAll(); openCart(); };
  $('#overlay').classList.add('open'); $('#modal').classList.add('open');
}

// ---------- cart ----------
function addToCart(id) {
  const l = cart.find((x) => x.id === id);
  if (l) l.qty = Math.min(l.qty + 1, 99); else cart.push({ id, qty: 1 });
  saveCart(); renderCart(); toast('Added to cart');
}
function renderCart() {
  const lines = cart.map((l) => ({ ...l, p: products.find((p) => p.id === l.id) })).filter((l) => l.p);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  $('#cartCount').textContent = count; $('#cartCount').style.display = count ? 'grid' : 'none';
  $('#cartTotal').textContent = eur(lines.reduce((s, l) => s + l.p.price * l.qty, 0));
  $('#cartFoot').style.display = lines.length ? 'flex' : 'none';
  if (!lines.length) { $('#cartItems').innerHTML = '<p style="color:var(--muted);text-align:center;margin-top:40px">Your cart is empty.</p>'; return; }
  $('#cartItems').innerHTML = lines.map((l) => `<div class="line">
      ${l.p.images[0] ? `<img src="${esc(l.p.images[0])}" alt="">` : '<div class="noimg">🖨️</div>'}
      <div><b>${esc(l.p.title)}</b><div class="qty"><button data-a="-" data-id="${l.id}">−</button><span>${l.qty}</span><button data-a="+" data-id="${l.id}">+</button></div></div>
      <b>${eur(l.p.price * l.qty)}</b></div>`).join('');
  $('#cartItems').querySelectorAll('.qty button').forEach((b) => b.onclick = () => {
    const l = cart.find((x) => x.id === b.dataset.id);
    l.qty += b.dataset.a === '+' ? 1 : -1;
    if (l.qty <= 0) cart = cart.filter((x) => x !== l);
    l.qty = Math.min(l.qty, 99);
    saveCart(); renderCart();
  });
}
function openCart() { $('#overlay').classList.add('open'); $('#drawer').classList.add('open'); }
function closeAll() { ['#overlay', '#modal', '#drawer'].forEach((s) => $(s).classList.remove('open')); }

$('#sendOrder').onclick = async () => {
  const btn = $('#sendOrder');
  const body = { name: $('#oName').value, email: $('#oEmail').value, phone: $('#oPhone').value, note: $('#oNote').value, items: cart };
  btn.disabled = true;
  try {
    const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Error');
    cart = []; saveCart(); renderCart(); closeAll();
    toast('Order sent! We will contact you soon 🎉');
  } catch (e) { toast(e.message); }
  btn.disabled = false;
};

$('#cartBtn').onclick = openCart;
$('#drawerClose').onclick = $('#modalClose').onclick = $('#overlay').onclick = closeAll;
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeAll());
$('#search').oninput = (e) => { query = e.target.value.toLowerCase(); renderGrid(); };
$('#year').textContent = new Date().getFullYear();

// ---------- PWA ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
let deferred;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('#installBtn').hidden = false; });
$('#installBtn').onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $('#installBtn').hidden = true; };

load();
