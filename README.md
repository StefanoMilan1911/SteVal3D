# SteVal 🖨️ (versione statica + Supabase)

Sito statico: funziona su **Netlify** e su **GitHub Pages** (percorsi relativi, nessun server).
Dati, foto e login admin sono su **Supabase**.

## 1. Crea il progetto Supabase (gratis)
1. Vai su supabase.com → **New project** (scegli una regione EU, es. Frankfurt) e una password per il database.
2. Quando è pronto, apri **SQL Editor → New query**, incolla tutto il contenuto di `supabase.sql` e premi **Run**.
   (Crea tabelle prodotti/ordini, regole di sicurezza e il bucket per le foto.)
3. **Project Settings → API**: copia **Project URL** e la chiave **anon public**.
   ⚠️ Mai la chiave `service_role`.
4. Incollali in `config.js`.

## 2. Admin e account clienti
**Admin** = l'utente che gestisce il negozio. **Clienti** = chiunque si registri dal sito (vedono solo i propri ordini).
1. **Authentication → Users → Add user → Create new user**: crea l'utente admin (email + password lunga, spunta "Auto Confirm User").
2. Apri `supabase.sql` (installazione nuova) oppure `migration-02-account.sql` (se avevi già il database): cerca `TUA-EMAIL@esempio.com`, sostituisci con l'email dell'admin, poi incolla tutto nel **SQL Editor** e premi Run.
3. **Solo DOPO il punto 2**: Authentication → Sign In / Providers → attiva **"Allow new users to sign up"**.
4. Authentication → **URL Configuration**: metti in *Site URL* l'indirizzo del tuo sito (es. `https://nome.netlify.app`) e aggiungi `https://nome.netlify.app/**` in *Redirect URLs*. Senza questo i link nelle email puntano a localhost.
5. Email: lascia attiva "Confirm email". Con le email predefinite di Supabase i messaggi sono pochi all'ora: va bene per provare; per il lancio serve un servizio email (SMTP, es. Resend).

Per aggiungere un altro admin: crea l'utente, poi nel SQL Editor `insert into public.admins (user_id) select id from auth.users where email = 'nuovo@admin.it';`

## 3. Metti il sito online
Nel repository i file di questo progetto devono stare **nella radice** (`index.html` accanto a `config.js`, non dentro una sottocartella). Cancella i vecchi file (`server.js`, `package.json`, cartella `public`).

**Netlify** (consigliato): Add new site → Import from GitHub → scegli il repo. Build command: vuoto. Publish directory: `.` (c'è già `netlify.toml`).

**GitHub Pages** (alternativa, scegline una sola): Settings → Pages → Deploy from a branch → `main` / `(root)`. L'indirizzo sarà `https://tuonome.github.io/nome-repo/`.

## 3b. Aggiornamenti
Se avevi già il database: `migration-01-lingue.sql` (testi inglesi) e `migration-02-account.sql` (account) si eseguono UNA volta ciascuno. Se parti da zero basta `supabase.sql`.

## 4. Usa il negozio
- Negozio: `/` — Admin: `/admin.html` (accedi con l'email e la password del punto 2).
- Il sito è in **italiano e inglese** (pulsante IT/EN in alto; di default segue la lingua del browser). Nel form prodotto i campi "inglese" sono facoltativi: se vuoti, in inglese si vede il testo italiano. Per aggiungere un'altra lingua copia un blocco in `i18n.js`.
- Aggiungi un prodotto con foto e descrizione. Gli ordini arrivano nella scheda **Orders**.

## Provarlo sul PC
Non aprire `index.html` con doppio clic. In VS Code usa l'estensione **Live Server** (porta 5500) oppure `npx serve .` nella cartella.

## Note
- Il totale degli ordini è ricalcolato dal database: il cliente non può modificare i prezzi.
- Niente pagamenti online per ora: ti arriva una richiesta d'ordine e ti accordi col cliente. Prossimo passo: Stripe.
- Foto: max 8 per prodotto, 8MB l'una (JPG, PNG, WEBP, GIF).
