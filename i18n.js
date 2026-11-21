// SteVal translations (IT / EN). To add a language (e.g. Spanish) copy a block, translate it,
// and add a <button data-lang="es">ES</button> in the header.
const I18N = {
  it: {
    pageTitle: 'SteVal — Progetti stampati in 3D, a prezzi migliori',
    navShop: 'Negozio', navWhy: 'Perché SteVal', install: '⬇ Installa app', cart: 'Carrello',
    pill: '🖨️ Stampato strato dopo strato, spedito a casa tua',
    heroH1: 'Ottime stampe 3D, <span>più economiche</span> dei grandi marketplace',
    heroP: 'Gli stessi modelli che vedi sui grandi store: acquistali direttamente da noi con uno sconto esclusivo.',
    browse: 'Vai al negozio',
    perk1t: '💸 Sconto diretto', perk1d: 'Ogni prodotto mostra il prezzo del marketplace accanto al nostro.',
    perk2t: '🎨 Su ordinazione', perk2d: 'Stampato al momento, nel colore che preferisci.',
    perk3t: '✅ Qualità controllata', perk3d: 'Ogni pezzo viene ispezionato prima della spedizione.',
    shop: 'Negozio', searchPh: 'Cerca prodotti…', loading: 'Caricamento…',
    notConnected: 'Negozio non ancora collegato.<br>Apri <code>config.js</code> e inserisci URL e chiave di Supabase.',
    noMatch: 'Nessun prodotto corrisponde alla ricerca.', noProducts: 'Ancora nessun prodotto: torna presto! 🖨️',
    all: 'Tutti', addToCart: 'Aggiungi al carrello', alsoOn: 'Anche su {name} ↗', marketplace: 'marketplace',
    compare: 'Su {name} costa {price}. Comprando qui <b>risparmi {save}</b>.',
    cartTitle: 'Il tuo carrello', cartEmpty: 'Il carrello è vuoto.', total: 'Totale',
    namePh: 'Il tuo nome *', emailPh: 'Email *', phonePh: 'Telefono (facoltativo)',
    notePh: 'Colore, misura, indirizzo di consegna, note…',
    sendOrder: "Invia richiesta d'ordine", orderNote: 'Ti contatteremo per confermare e accordarci su pagamento e spedizione.',
    added: 'Aggiunto al carrello', errNameEmail: "Inserisci il tuo nome e un'email valida", errEmpty: 'Il carrello è vuoto',
    errSend: "Impossibile inviare l'ordine, riprova", orderSent: 'Ordine inviato! Ti contatteremo presto 🎉',
    errLoad: 'Impossibile caricare i prodotti', errNotConn: 'Negozio non collegato',
    footer: '© {year} SteVal · Stampato in 3D con ❤️',
    // ----- admin -----
    a_title: 'SteVal Admin', a_admin: 'admin', a_viewStore: 'Vai al negozio', a_logout: 'Esci',
    a_loginTitle: 'Accesso admin', a_emailPh: 'Email', a_pwPh: 'Password', a_login: 'Accedi', a_wrong: 'Email o password errate',
    a_add: 'Aggiungi prodotto', a_edit: 'Modifica prodotto',
    a_fTitle: 'Titolo (italiano) *', a_fTitleEn: 'Titolo (inglese, facoltativo)',
    a_fDesc: 'Descrizione (italiano)', a_fDescEn: 'Descrizione (inglese, facoltativa)',
    a_descPh: 'Materiale, misure, tempo di stampa, colori…',
    a_fPrice: 'Il tuo prezzo (€) *', a_fMarketPrice: 'Prezzo sul marketplace (€)', a_fMarketName: 'Nome marketplace', a_fCategory: 'Categoria',
    a_fMarketLink: 'Link al marketplace', a_fPhotos: 'Foto (max 8, 8MB ciascuna)', a_choose: '📷 Clicca per scegliere le foto',
    a_save: 'Salva prodotto', a_cancel: 'Annulla',
    a_tabP: 'Prodotti', a_tabO: 'Ordini', a_noProducts: 'Ancora nessun prodotto. Aggiungi il primo qui a sinistra 👈',
    a_noOrders: 'Ancora nessun ordine.', a_editBtn: 'Modifica', a_delBtn: 'Elimina', a_confirmDel: 'Eliminare questo prodotto e le sue foto?',
    a_photos: 'foto', a_saved: 'Salvato ✓', a_deleted: 'Eliminato', a_updated: 'Aggiornato',
    a_errMax: 'Massimo 8 foto per prodotto', a_errUrl: 'Il link deve iniziare con http(s)://', a_errType: 'solo JPG, PNG, WEBP, GIF',
    a_errBig: 'supera gli 8MB', a_errLoad: 'Impossibile caricare i dati (hai eseguito supabase.sql?)', a_errPrefix: 'Errore: ',
    a_notConfTitle: 'Non configurato', a_notConfText: 'Apri <code>config.js</code> e inserisci URL e chiave di Supabase.',
    st_new: 'nuovo', st_confirmed: 'confermato', st_printing: 'in stampa', st_shipped: 'spedito', st_done: 'completato', st_cancelled: 'annullato',
  },
  en: {
    pageTitle: 'SteVal — 3D printed projects, better prices',
    navShop: 'Shop', navWhy: 'Why SteVal', install: '⬇ Install app', cart: 'Cart',
    pill: '🖨️ Printed layer by layer, shipped to you',
    heroH1: 'Great 3D prints, <span>cheaper</span> than the big marketplaces',
    heroP: 'Same designs you see on famous stores — buy them directly from us and get an exclusive discount.',
    browse: 'Browse the shop',
    perk1t: '💸 Direct discount', perk1d: 'Every product shows the marketplace price next to ours.',
    perk2t: '🎨 Made to order', perk2d: 'Printed fresh in the colour you like.',
    perk3t: '✅ Quality checked', perk3d: 'Each piece is inspected before it ships.',
    shop: 'Shop', searchPh: 'Search products…', loading: 'Loading…',
    notConnected: 'Store not connected yet.<br>Open <code>config.js</code> and add your Supabase URL and key.',
    noMatch: 'No products match your search.', noProducts: 'No products yet — check back soon! 🖨️',
    all: 'All', addToCart: 'Add to cart', alsoOn: 'Also on {name} ↗', marketplace: 'marketplace',
    compare: 'On {name} it costs {price}. Buy here and <b>save {save}</b>.',
    cartTitle: 'Your cart', cartEmpty: 'Your cart is empty.', total: 'Total',
    namePh: 'Your name *', emailPh: 'Email *', phonePh: 'Phone (optional)',
    notePh: 'Colour, size, delivery address, notes…',
    sendOrder: 'Send order request', orderNote: "We'll contact you to confirm and arrange payment & shipping.",
    added: 'Added to cart', errNameEmail: 'Please enter your name and a valid email', errEmpty: 'Your cart is empty',
    errSend: 'Could not send the order, please try again', orderSent: 'Order sent! We will contact you soon 🎉',
    errLoad: 'Could not load products', errNotConn: 'Store not connected',
    footer: '© {year} SteVal · 3D printed with ❤️',
    // ----- admin -----
    a_title: 'SteVal Admin', a_admin: 'admin', a_viewStore: 'View store', a_logout: 'Log out',
    a_loginTitle: 'Admin login', a_emailPh: 'Email', a_pwPh: 'Password', a_login: 'Log in', a_wrong: 'Wrong email or password',
    a_add: 'Add product', a_edit: 'Edit product',
    a_fTitle: 'Title (Italian) *', a_fTitleEn: 'Title (English, optional)',
    a_fDesc: 'Description (Italian)', a_fDescEn: 'Description (English, optional)',
    a_descPh: 'Material, size, print time, colours…',
    a_fPrice: 'Your price (€) *', a_fMarketPrice: 'Marketplace price (€)', a_fMarketName: 'Marketplace name', a_fCategory: 'Category',
    a_fMarketLink: 'Marketplace link', a_fPhotos: 'Photos (max 8, 8MB each)', a_choose: '📷 Click to choose photos',
    a_save: 'Save product', a_cancel: 'Cancel',
    a_tabP: 'Products', a_tabO: 'Orders', a_noProducts: 'No products yet. Add your first one on the left 👈',
    a_noOrders: 'No orders yet.', a_editBtn: 'Edit', a_delBtn: 'Delete', a_confirmDel: 'Delete this product and its photos?',
    a_photos: 'photo(s)', a_saved: 'Saved ✓', a_deleted: 'Deleted', a_updated: 'Updated',
    a_errMax: 'Max 8 photos per product', a_errUrl: 'Marketplace link must start with http(s)://', a_errType: 'only JPG, PNG, WEBP, GIF',
    a_errBig: 'is bigger than 8MB', a_errLoad: 'Could not load data (did you run supabase.sql?)', a_errPrefix: 'Error: ',
    a_notConfTitle: 'Not configured', a_notConfText: 'Open <code>config.js</code> and add your Supabase URL and key.',
    st_new: 'new', st_confirmed: 'confirmed', st_printing: 'printing', st_shipped: 'shipped', st_done: 'done', st_cancelled: 'cancelled',
  },
};

let LANG = (() => {
  try { const s = localStorage.getItem('steval_lang'); if (s === 'it' || s === 'en') return s; } catch {}
  return (navigator.language || 'en').toLowerCase().startsWith('it') ? 'it' : 'en';
})();

// t('key', {name: 'x'}) — values are HTML-escaped because some strings are inserted as HTML
const escT = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function t(key, vars = {}) {
  let s = (I18N[LANG] && I18N[LANG][key]) ?? I18N.en[key] ?? key;
  const all = { year: new Date().getFullYear(), ...vars };
  for (const [k, v] of Object.entries(all)) s = s.split('{' + k + '}').join(escT(v));
  return s;
}

function applyI18n() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach((e) => { e.innerHTML = t(e.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-ph]').forEach((e) => { e.placeholder = t(e.dataset.i18nPh); });
  document.title = t(document.body.dataset.title || 'pageTitle');
  document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('on', b.dataset.lang === LANG));
}

function setLang(l) {
  if (!I18N[l] || l === LANG) return;
  LANG = l;
  try { localStorage.setItem('steval_lang', l); } catch {}
  applyI18n();
  document.dispatchEvent(new Event('langchange'));
}

document.querySelectorAll('[data-lang]').forEach((b) => { b.onclick = () => setLang(b.dataset.lang); });
applyI18n();
