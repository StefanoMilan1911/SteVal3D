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
const discount = (p, price = p.price) => (p.marketplacePrice > price && price > 0 ? Math.round((1 - price / p.marketplacePrice) * 100) : 0);
const norm = (r) => ({
  id: r.id, title: r.title, titleEn: r.title_en || '', description: r.description || '', descEn: r.description_en || '',
  category: r.category || 'General',
  price: Number(r.price) || 0, marketplacePrice: Number(r.marketplace_price) || 0,
  marketplaceName: r.marketplace_name || '', marketplaceUrl: safeUrl(r.marketplace_url), images: r.images || [],
  variants: Array.isArray(r.variants) ? r.variants.filter((g) => g && g.name && Array.isArray(g.options) && g.options.length) : [],
});

// ---------- variants (e.g. Colour: Black / White, Size: S / L) ----------
// A product has groups: [{name, name_en, options:[{label, label_en, price_delta}]}]. The cart stores the chosen label per group name.
const gname = (g) => (LANG === 'en' && g.name_en ? g.name_en : g.name);
const olabel = (o) => (LANG === 'en' && o.label_en ? o.label_en : o.label);
const delta = (o) => Number(o.price_delta) || 0;
const defaultOpts = (p) => Object.fromEntries(p.variants.map((g) => [g.name, g.options[0].label]));
const validOpts = (p, opts) => { // null if the saved choice no longer exists on the product
  const out = {};
  for (const g of p.variants) { const l = opts && opts[g.name]; if (!g.options.some((o) => o.label === l)) return null; out[g.name] = l; }
  return out;
};
const unitPrice = (p, opts) => p.price + p.variants.reduce((s, g) => { const o = g.options.find((x) => x.label === (opts || {})[g.name]); return s + (o ? delta(o) : 0); }, 0);
const lineKey = (l) => l.id + '|' + JSON.stringify(Object.keys(l.opts || {}).sort().map((k) => [k, l.opts[k]]));
const optText = (p, opts) => p.variants.map((g) => { const o = g.options.find((x) => x.label === (opts || {})[g.name]); return o ? `${gname(g)}: ${olabel(o)}` : null; }).filter(Boolean).join(' · ');
const optPlain = (opts) => Object.entries(opts || {}).map(([k, v]) => `${k}: ${v}`).join(', '); // for saved orders
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
  // drop cart lines whose product or chosen option no longer exists
  cart = cart.map((l) => { const p = products.find((x) => x.id === l.id); const o = p && validOpts(p, l.opts); return o ? { id: l.id, qty: l.qty, opts: o } : null; }).filter(Boolean);
  saveCart();
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
let modalSel = {}, modalSelId = null;
function priceBlock(p) {
  const unit = unitPrice(p, modalSel), d = discount(p, unit);
  return `<div class="prices"><span class="price" style="font-size:1.7rem">${eur(unit)}</span>${d ? `<span class="old">${eur(p.marketplacePrice)}</span><span class="badge" style="position:static">-${d}%</span>` : ''}</div>
      ${d && p.marketplaceName ? `<div class="compare">${t('compare', { name: p.marketplaceName, price: eur(p.marketplacePrice), save: eur(p.marketplacePrice - unit) })}</div>` : ''}`;
}
function openProduct(id, keepSel) {
  const p = products.find((x) => x.id === id); if (!p) return;
  currentId = id;
  if (!keepSel || modalSelId !== id) { modalSel = defaultOpts(p); modalSelId = id; }
  const x = tr(p), imgs = p.images;
  const mname = p.marketplaceName || t('marketplace');
  const groups = p.variants.map((g, gi) => `<div class="optgroup"><span class="lab">${esc(gname(g))}</span><div class="opts">${g.options.map((o) =>
    `<button type="button" class="opt ${modalSel[g.name] === o.label ? 'on' : ''}" data-g="${gi}" data-l="${esc(o.label)}">${esc(olabel(o))}${delta(o) ? `<small>${delta(o) > 0 ? '+' : ''}${eur(delta(o))}</small>` : ''}</button>`).join('')}</div></div>`).join('');
  $('#modalBody').innerHTML = `
    <div class="gallery">
      <div class="main">${imgs[0] ? `<img id="mainImg" src="${esc(imgs[0])}" alt="${esc(x.title)}">` : '<div class="noimg">🖨️</div>'}</div>
      ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((u, i) => `<img src="${esc(u)}" class="${i ? '' : 'on'}" data-u="${esc(u)}" alt="">`).join('')}</div>` : ''}
    </div>
    <div class="info">
      <span class="cat" style="color:var(--accent2);font-weight:700;font-size:.8rem;text-transform:uppercase">${esc(p.category)}</span>
      <h2>${esc(x.title)}</h2>
      <div id="priceBlock" style="display:flex;flex-direction:column;gap:12px">${priceBlock(p)}</div>
      <p class="desc">${esc(x.description)}</p>
      ${groups}
      <button class="btn primary" id="addBtn">${esc(t('addToCart'))}</button>
      ${p.marketplaceUrl ? `<a class="btn ghost" href="${esc(p.marketplaceUrl)}" target="_blank" rel="noopener noreferrer">${esc(t('alsoOn', { name: mname }).replace(/&amp;/g, '&'))}</a>` : ''}
    </div>`;
  $('#modalBody').querySelectorAll('.thumbs img').forEach((th) => th.onclick = () => {
    $('#mainImg').src = th.dataset.u;
    $('#modalBody').querySelectorAll('.thumbs img').forEach((y) => y.classList.toggle('on', y === th));
  });
  $('#modalBody').querySelectorAll('.opt').forEach((b) => b.onclick = () => {
    const g = p.variants[+b.dataset.g];
    modalSel[g.name] = b.dataset.l;
    b.parentElement.querySelectorAll('.opt').forEach((y) => y.classList.toggle('on', y === b));
    $('#priceBlock').innerHTML = priceBlock(p);
  });
  $('#addBtn').onclick = () => { addToCart(p.id, { ...modalSel }); closeAll(); openCart(); };
  $('#overlay').classList.add('open'); $('#modal').classList.add('open');
}

// ---------- cart ----------
function addToCart(id, opts) {
  const nl = { id, qty: 1, opts: opts || {} };
  const l = cart.find((x) => lineKey(x) === lineKey(nl));
  if (l) l.qty = Math.min(l.qty + 1, 99); else cart.push(nl);
  saveCart(); renderCart(); toast(t('added'));
}
function renderCart() {
  const lines = cart.map((l) => ({ ...l, p: products.find((p) => p.id === l.id) })).filter((l) => l.p);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  $('#cartCount').textContent = count; $('#cartCount').style.display = count ? 'grid' : 'none';
  $('#cartTotal').textContent = eur(lines.reduce((s, l) => s + unitPrice(l.p, l.opts) * l.qty, 0));
  $('#cartFoot').style.display = lines.length ? 'flex' : 'none';
  if (!lines.length) { $('#cartItems').innerHTML = `<p style="color:var(--muted);text-align:center;margin-top:40px">${esc(t('cartEmpty'))}</p>`; return; }
  $('#cartItems').innerHTML = lines.map((l) => `<div class="line">
      ${l.p.images[0] ? `<img src="${esc(l.p.images[0])}" alt="">` : '<div class="noimg">🖨️</div>'}
      <div><b>${esc(tr(l.p).title)}</b>${l.p.variants.length ? `<div class="optline">${esc(optText(l.p, l.opts))}</div>` : ''}<div class="qty"><button data-a="-" data-k="${esc(lineKey(l))}">−</button><span>${l.qty}</span><button data-a="+" data-k="${esc(lineKey(l))}">+</button></div></div>
      <b>${eur(unitPrice(l.p, l.opts) * l.qty)}</b></div>`).join('');
  $('#cartItems').querySelectorAll('.qty button').forEach((b) => b.onclick = () => {
    const l = cart.find((x) => lineKey(x) === b.dataset.k);
    l.qty = Math.min(l.qty + (b.dataset.a === '+' ? 1 : -1), 99);
    if (l.qty <= 0) cart = cart.filter((x) => x !== l);
    saveCart(); renderCart();
  });
}
function openCart() { $('#overlay').classList.add('open'); $('#drawer').classList.add('open'); }
function closeAll() { currentId = null; ['#overlay', '#modal', '#drawer', '#authModal'].forEach((s) => $(s).classList.remove('open')); }

$('#sendOrder').onclick = async () => {
  const name = $('#oName').value.trim(), email = $('#oEmail').value.trim();
  if (!sb) return toast(t('errNotConn'));
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return toast(t('errNameEmail'));
  if (!cart.length) return toast(t('errEmpty'));
  const btn = $('#sendOrder'); btn.disabled = true;
  const { error } = await sb.from('orders').insert({
    name, email, phone: $('#oPhone').value.trim(), note: $('#oNote').value.trim(),
    items: cart.map((l) => ({ id: l.id, qty: l.qty, opts: l.opts || {} })),
  });
  btn.disabled = false;
  if (error) { console.error(error); return toast(t('errSend')); }
  cart = []; saveCart(); renderCart(); closeAll();
  ['#oName', '#oEmail', '#oPhone', '#oNote'].forEach((s) => $(s).value = '');
  toast(t('orderSent'));
};

// ---------- customer accounts (Supabase Auth) ----------
let user = null, isAdmin = false, authMode = 'in', authNote = '';
const firstName = () => (user?.user_metadata?.full_name || '').split(' ')[0] || (user?.email || '').split('@')[0];
const siteRoot = () => new URL('./', location.href).href;

async function refreshUser() {
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  user = data?.session?.user || null; isAdmin = false;
  if (user) { const r = await sb.from('admins').select('user_id').maybeSingle(); isAdmin = !!(r && r.data); }
  updateAccountUI();
}
function updateAccountUI() {
  $('#accLabel').textContent = user ? firstName() : t('account');
  $('#accBtn').setAttribute('aria-label', t('account')); $('#cartBtn').setAttribute('aria-label', t('cart')); $('#installBtn').setAttribute('aria-label', t('install'));
  if (user) { // pre-fill the order form
    if (!$('#oEmail').value) $('#oEmail').value = user.email || '';
    if (!$('#oName').value) $('#oName').value = user.user_metadata?.full_name || '';
  }
  if ($('#authModal').classList.contains('open')) renderAuth();
}
function openAuth() {
  if (!sb) return toast(t('errNotConn'));
  if (authMode !== 'recovery') authMode = user ? 'account' : 'in';
  authNote = ''; renderAuth();
  $('#overlay').classList.add('open'); $('#authModal').classList.add('open');
}
const setNote = (m) => { authNote = m; const el = $('#authMsg'); if (el) { el.textContent = m; el.hidden = !m; } };
const authMsg = (e) => {
  const m = (e.message || '').toLowerCase();
  if (m.includes('invalid login')) return t('authWrong');
  if (m.includes('already')) return t('authExists');
  if (m.includes('not confirmed')) return t('authConfirm');
  if (m.includes('rate limit') || m.includes('too many')) return t('authRate');
  return t('authErr') + ' ' + (e.message || '');
};
const inp = (id, type, ph, extra = '') => `<input class="f" id="${id}" type="${type}" placeholder="${esc(ph)}" ${extra}>`;

function renderAuth() {
  const b = $('#authBody');
  const msg = `<div class="msg" id="authMsg" ${authNote ? '' : 'hidden'}>${esc(authNote)}</div>`;
  const go = (mode) => (btn) => { btn.onclick = () => { authMode = mode; authNote = ''; renderAuth(); }; };

  if (authMode === 'account' && user) {
    b.innerHTML = `<h2>${esc(t('account'))}</h2>
      <p style="color:var(--muted)">${esc(t('loggedAs'))} <b style="color:var(--text)">${esc(user.email)}</b></p>${msg}
      ${isAdmin ? `<a class="btn ghost" href="admin.html">${esc(t('adminPanel'))}</a>` : ''}
      <h3 style="margin-top:4px">${esc(t('myOrders'))}</h3>
      <div id="myOrders" class="myorders"><p style="color:var(--muted)">${esc(t('loading'))}</p></div>
      <button class="btn ghost" id="logoutBtn">${esc(t('logout'))}</button>`;
    $('#logoutBtn').onclick = async () => {
      await sb.auth.signOut(); user = null; isAdmin = false; authMode = 'in';
      updateAccountUI(); closeAll(); toast(t('loggedOut'));
    };
    loadMyOrders(); return;
  }
  if (authMode === 'recovery') {
    b.innerHTML = `<h2>${esc(t('titleNewPw'))}</h2><form id="authForm">${inp('aPw', 'password', t('pwPhNew'), 'autocomplete="new-password" required minlength="8"')}
      <button class="btn primary">${esc(t('savePw'))}</button>${msg}</form>`;
  } else if (authMode === 'forgot') {
    b.innerHTML = `<h2>${esc(t('titleForgot'))}</h2><form id="authForm">${inp('aEmail', 'email', t('emailPh').replace(' *', ''), 'autocomplete="email" required')}
      <button class="btn primary">${esc(t('sendLink'))}</button>${msg}<button type="button" class="linkbtn" id="swBack">${esc(t('backLogin'))}</button></form>`;
    go('in')($('#swBack'));
  } else if (authMode === 'up') {
    b.innerHTML = `<h2>${esc(t('titleUp'))}</h2><form id="authForm">${inp('aName', 'text', t('fullName'), 'autocomplete="name" maxlength="80"')}
      ${inp('aEmail', 'email', t('emailPh').replace(' *', ''), 'autocomplete="email" required')}${inp('aPw', 'password', t('pwPhNew'), 'autocomplete="new-password" required minlength="8"')}
      <button class="btn primary">${esc(t('signup'))}</button>${msg}<button type="button" class="linkbtn" id="swIn">${esc(t('haveAccount'))}</button></form>`;
    go('in')($('#swIn'));
  } else {
    b.innerHTML = `<h2>${esc(t('titleIn'))}</h2><form id="authForm">${inp('aEmail', 'email', t('emailPh').replace(' *', ''), 'autocomplete="email" required')}
      ${inp('aPw', 'password', t('pwPh'), 'autocomplete="current-password" required')}
      <button class="btn primary">${esc(t('login'))}</button>${msg}
      <button type="button" class="linkbtn" id="swForgot">${esc(t('forgot'))}</button>
      <button type="button" class="linkbtn" id="swUp">${esc(t('noAccount'))}</button></form>`;
    go('forgot')($('#swForgot')); go('up')($('#swUp'));
  }
  $('#authForm').onsubmit = async (e) => { e.preventDefault(); await submitAuth(); };
}

async function submitAuth() {
  const val = (id) => ($('#' + id) ? $('#' + id).value.trim() : '');
  const email = val('aEmail'), pw = $('#aPw') ? $('#aPw').value : '';
  if (authMode === 'in') {
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (error) return setNote(authMsg(error));
    await refreshUser(); authMode = 'account'; authNote = ''; renderAuth(); toast(t('welcome'));
  } else if (authMode === 'up') {
    if (pw.length < 8) return setNote(t('pwShort'));
    const { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { full_name: val('aName') }, emailRedirectTo: siteRoot() } });
    if (error) return setNote(authMsg(error));
    if (data.user && data.user.identities && data.user.identities.length === 0) return setNote(t('authExists'));
    if (!data.session) { authMode = 'in'; authNote = t('checkEmail'); return renderAuth(); }
    await refreshUser(); authMode = 'account'; authNote = ''; renderAuth();
  } else if (authMode === 'forgot') {
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: siteRoot() });
    if (error && /rate|too many/i.test(error.message || '')) return setNote(authMsg(error));
    setNote(t('resetSent'));
  } else if (authMode === 'recovery') {
    if (pw.length < 8) return setNote(t('pwShort'));
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) return setNote(authMsg(error));
    authMode = 'account'; authNote = ''; await refreshUser(); renderAuth(); toast(t('pwUpdated'));
  }
}

async function loadMyOrders() {
  const el = $('#myOrders'); if (!el || !user) return;
  const { data, error } = await sb.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) { el.innerHTML = ''; return; }
  const loc = LANG === 'it' ? 'it-IT' : 'en-GB';
  el.innerHTML = data.length ? data.map((o) => `<div class="myorder">
      <div><b>${eur(o.total)}</b> · <span class="st">${esc(t('st_' + o.status))}</span></div>
      <div class="meta">${new Date(o.created_at).toLocaleDateString(loc)} — ${(o.items || []).map((i) => `${esc(i.qty)}× ${esc(i.title)}${i.opts && Object.keys(i.opts).length ? ` (${esc(optPlain(i.opts))})` : ''}`).join(', ')}</div>
    </div>`).join('') : `<p style="color:var(--muted)">${esc(t('noMyOrders'))}</p>`;
}

if (sb) sb.auth.onAuthStateChange((ev) => {
  if (ev === 'PASSWORD_RECOVERY') { authMode = 'recovery'; setTimeout(openAuth, 0); }
  setTimeout(refreshUser, 0); // not awaited inside the callback (avoids a Supabase deadlock)
});
$('#accBtn').onclick = openAuth;
$('#authClose').onclick = closeAll;

$('#cartBtn').onclick = openCart;
$('#drawerClose').onclick = $('#modalClose').onclick = $('#overlay').onclick = closeAll;
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeAll());
$('#search').oninput = (e) => { query = e.target.value.toLowerCase(); renderGrid(); };

// re-draw everything when the language changes
document.addEventListener('langchange', () => {
  renderChips(); renderGrid(); renderCart(); updateAccountUI();
  if (currentId && $('#modal').classList.contains('open')) openProduct(currentId, true);
});

// ---------- PWA ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
let deferred;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('#installBtn').hidden = false; });
$('#installBtn').onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $('#installBtn').hidden = true; };

updateAccountUI();
load();
refreshUser();
