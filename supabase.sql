-- SteVal: installazione NUOVA. Incolla TUTTO nel SQL Editor di Supabase e premi "Run".
-- (Se hai già un database SteVal funzionante, usa invece migration-02-account.sql)
--
-- PRIMA di eseguire: crea l'utente admin in Authentication → Users → Add user,
-- poi cambia l'email qui sotto (cerca TUA-EMAIL@esempio.com) con la SUA email.

-- ========== TABELLE ==========
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null check (char_length(title) between 1 and 120),
  title_en text not null default '' check (char_length(title_en) <= 120),
  description text not null default '' check (char_length(description) <= 4000),
  description_en text not null default '' check (char_length(description_en) <= 4000),
  category text not null default 'General' check (char_length(category) <= 40),
  price numeric(10,2) not null default 0 check (price >= 0),
  marketplace_price numeric(10,2) not null default 0 check (marketplace_price >= 0),
  marketplace_name text not null default '' check (char_length(marketplace_name) <= 40),
  marketplace_url text not null default '' check (marketplace_url = '' or marketplace_url ~* '^https?://'),
  images text[] not null default '{}'
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'new' check (status in ('new','confirmed','printing','shipped','done','cancelled')),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (email ~* '^\S+@\S+\.\S+$' and char_length(email) <= 120),
  phone text not null default '' check (char_length(phone) <= 30),
  note text not null default '' check (char_length(note) <= 1000),
  items jsonb not null,
  total numeric(10,2) not null default 0
);
create index if not exists orders_user_idx on public.orders(user_id);

-- Chi può gestire il negozio. I clienti registrati NON sono qui.
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- Registra l'admin (CAMBIA L'EMAIL!)
do $$
declare uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower('TUA-EMAIL@esempio.com');
  if uid is null then
    raise exception 'Utente non trovato: sostituisci TUA-EMAIL@esempio.com con l''email dell''admin creata in Authentication → Users';
  end if;
  insert into public.admins (user_id) values (uid) on conflict do nothing;
end $$;

-- Ordine: totale ricalcolato dal server, stato forzato a "new", user_id preso dal login (non falsificabile)
create or replace function public.compute_order() returns trigger
language plpgsql set search_path = public as $$
declare it jsonb; p record; lines jsonb := '[]'::jsonb; t numeric := 0; q int;
begin
  if jsonb_typeof(new.items) <> 'array' then raise exception 'invalid items'; end if;
  for it in select * from jsonb_array_elements(new.items) loop
    select * into p from public.products where id = (it->>'id')::uuid;
    if found then
      q := least(greatest(coalesce((it->>'qty')::int, 1), 1), 99);
      lines := lines || jsonb_build_object('id', p.id, 'title', p.title, 'price', p.price, 'qty', q);
      t := t + p.price * q;
    end if;
  end loop;
  if jsonb_array_length(lines) = 0 then raise exception 'no valid items'; end if;
  new.items := lines; new.total := round(t, 2); new.status := 'new'; new.user_id := auth.uid();
  return new;
end $$;

drop trigger if exists orders_compute on public.orders;
create trigger orders_compute before insert on public.orders
for each row execute function public.compute_order();

-- ========== SICUREZZA (RLS) ==========
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.admins enable row level security;

drop policy if exists "products public read" on public.products;
drop policy if exists "products admin write" on public.products;
drop policy if exists "products admin insert" on public.products;
drop policy if exists "products admin update" on public.products;
drop policy if exists "products admin delete" on public.products;
drop policy if exists "orders public insert" on public.orders;
drop policy if exists "orders admin read" on public.orders;
drop policy if exists "orders read own or admin" on public.orders;
drop policy if exists "orders admin update" on public.orders;
drop policy if exists "admins read self" on public.admins;

create policy "products public read" on public.products for select to anon, authenticated using (true);
create policy "products admin insert" on public.products for insert to authenticated with check (public.is_admin());
create policy "products admin update" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products admin delete" on public.products for delete to authenticated using (public.is_admin());

create policy "orders public insert" on public.orders for insert to anon, authenticated with check (true);
create policy "orders read own or admin" on public.orders for select to authenticated using (public.is_admin() or user_id = auth.uid());
create policy "orders admin update" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admins read self" on public.admins for select to authenticated using (user_id = auth.uid());

grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant insert on public.orders to anon;
grant select, insert, update on public.orders to authenticated;
grant select on public.admins to authenticated;

-- ========== FOTO (Storage) ==========
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists "photos admin insert" on storage.objects;
drop policy if exists "photos admin update" on storage.objects;
drop policy if exists "photos admin delete" on storage.objects;
create policy "photos admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'products' and public.is_admin());
create policy "photos admin update" on storage.objects for update to authenticated using (bucket_id = 'products' and public.is_admin());
create policy "photos admin delete" on storage.objects for delete to authenticated using (bucket_id = 'products' and public.is_admin());
