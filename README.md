# SteVal 🖨️

3D printed projects store. Web + installable app (PWA), with an admin panel to upload photos and descriptions.

## Run it (GitHub Codespaces or locally)

```bash
npm install
ADMIN_PASSWORD="choose-a-long-password" npm start
```

- Store: http://localhost:3000 (in Codespaces, open the forwarded port 3000 from the **Ports** tab)
- Admin: `/admin.html` — log in with your `ADMIN_PASSWORD`

Products, orders and photos are saved in the `data/` folder (git-ignored).

## Install as an app
Open the site on your phone in Chrome/Safari → menu → **Add to Home Screen** (Chrome also shows an "Install app" button in the page). It needs HTTPS, which Codespaces and any real host provide.

## Files
- `server.js` — backend (Express, JSON storage, image uploads, admin login)
- `public/index.html, style.css, app.js` — storefront
- `public/admin.html, admin.js` — admin panel
- `public/manifest.webmanifest, sw.js, icons/` — app install + offline shell

## Going live (important)
A Codespace stops when idle and is not a public host. To go live, deploy to a Node host with a **persistent disk** for `data/` (Render, Railway, Fly.io). Set `ADMIN_PASSWORD` there as a secret.

## Next steps
- Online payments (Stripe Checkout) instead of order requests
- Email notification when an order arrives
- Move storage to a real database (SQLite/Postgres) when you have many products
