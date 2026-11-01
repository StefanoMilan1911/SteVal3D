// SteVal - backend (Express + JSON file storage + image uploads)
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me';
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

if (ADMIN_PASSWORD === 'change-me') {
  console.warn('⚠️  Using default admin password. Set ADMIN_PASSWORD (see .env.example).');
}

// ---------- tiny JSON "database" ----------
function load() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { products: [], orders: [] }; }
}
function save(db) {
  fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db, null, 2));
  fs.renameSync(DB_FILE + '.tmp', DB_FILE);
}
const uid = () => crypto.randomBytes(6).toString('hex');

// ---------- auth (in-memory sessions) ----------
const sessions = new Map(); // token -> expiry
const attempts = new Map(); // ip -> {n, until}
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const exp = sessions.get(token);
  if (!exp || exp < Date.now()) return res.status(401).json({ error: 'Not authorized' });
  next();
}

// ---------- uploads ----------
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, uid() + Date.now().toString(36) + EXT[file.mimetype]),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (req, file, cb) => cb(null, !!EXT[file.mimetype]),
});
const removeFile = (url) => {
  const f = path.join(UPLOAD_DIR, path.basename(url));
  fs.unlink(f, () => {});
};

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- helpers ----------
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : 0; };
const str = (v, max) => String(v ?? '').trim().slice(0, max);
function productFromBody(b) {
  return {
    title: str(b.title, 120),
    description: str(b.description, 4000),
    category: str(b.category, 40) || 'General',
    price: num(b.price),
    marketplacePrice: num(b.marketplacePrice),
    marketplaceName: str(b.marketplaceName, 40),
    marketplaceUrl: /^https?:\/\//i.test(b.marketplaceUrl || '') ? str(b.marketplaceUrl, 500) : '',
  };
}

// ---------- public API ----------
app.get('/api/products', (req, res) => {
  res.json(load().products.sort((a, b) => b.createdAt - a.createdAt));
});

app.post('/api/orders', (req, res) => {
  const { name, email, phone, note, items } = req.body || {};
  if (!str(name, 80) || !/^\S+@\S+\.\S+$/.test(email || '')) return res.status(400).json({ error: 'Name and a valid email are required.' });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Cart is empty.' });
  const db = load();
  const lines = [];
  for (const it of items.slice(0, 50)) {
    const p = db.products.find((x) => x.id === it.id);
    const qty = Math.min(Math.max(parseInt(it.qty, 10) || 1, 1), 99);
    if (p) lines.push({ id: p.id, title: p.title, price: p.price, qty });
  }
  if (!lines.length) return res.status(400).json({ error: 'No valid products.' });
  const order = {
    id: uid(), createdAt: Date.now(), status: 'new',
    name: str(name, 80), email: str(email, 120), phone: str(phone, 30), note: str(note, 1000),
    items: lines, total: +lines.reduce((s, l) => s + l.price * l.qty, 0).toFixed(2),
  };
  db.orders.push(order);
  save(db);
  res.json({ ok: true, id: order.id });
});

// ---------- admin API ----------
app.post('/api/login', (req, res) => {
  const ip = req.ip;
  const a = attempts.get(ip) || { n: 0, until: 0 };
  if (a.until > Date.now()) return res.status(429).json({ error: 'Too many attempts. Try later.' });
  const given = Buffer.from(String(req.body?.password || ''));
  const real = Buffer.from(ADMIN_PASSWORD);
  const ok = given.length === real.length && crypto.timingSafeEqual(given, real);
  if (!ok) {
    a.n++; if (a.n >= 5) { a.until = Date.now() + 5 * 60 * 1000; a.n = 0; }
    attempts.set(ip, a);
    return res.status(401).json({ error: 'Wrong password' });
  }
  attempts.delete(ip);
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, Date.now() + 12 * 3600 * 1000);
  res.json({ token });
});

app.post('/api/products', auth, upload.array('images', 8), (req, res) => {
  const data = productFromBody(req.body);
  if (!data.title) { (req.files || []).forEach((f) => removeFile(f.filename)); return res.status(400).json({ error: 'Title is required' }); }
  const db = load();
  const p = { id: uid(), createdAt: Date.now(), ...data, images: (req.files || []).map((f) => '/uploads/' + f.filename) };
  db.products.push(p);
  save(db);
  res.json(p);
});

app.put('/api/products/:id', auth, upload.array('images', 8), (req, res) => {
  const db = load();
  const p = db.products.find((x) => x.id === req.params.id);
  if (!p) { (req.files || []).forEach((f) => removeFile(f.filename)); return res.status(404).json({ error: 'Not found' }); }
  Object.assign(p, productFromBody(req.body));
  let remove = [];
  try { remove = JSON.parse(req.body.removeImages || '[]'); } catch {}
  remove.forEach((u) => { if (p.images.includes(u)) { removeFile(u); p.images = p.images.filter((i) => i !== u); } });
  p.images.push(...(req.files || []).map((f) => '/uploads/' + f.filename));
  save(db);
  res.json(p);
});

app.delete('/api/products/:id', auth, (req, res) => {
  const db = load();
  const p = db.products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  p.images.forEach(removeFile);
  db.products = db.products.filter((x) => x !== p);
  save(db);
  res.json({ ok: true });
});

app.get('/api/orders', auth, (req, res) => res.json(load().orders.sort((a, b) => b.createdAt - a.createdAt)));
app.patch('/api/orders/:id', auth, (req, res) => {
  const db = load();
  const o = db.orders.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found' });
  if (['new', 'confirmed', 'printing', 'shipped', 'done', 'cancelled'].includes(req.body.status)) o.status = req.body.status;
  save(db);
  res.json(o);
});

// multer / generic errors -> JSON
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Error' });
});

app.listen(PORT, () => console.log(`SteVal running on http://localhost:${PORT}  (admin: /admin.html)`));
