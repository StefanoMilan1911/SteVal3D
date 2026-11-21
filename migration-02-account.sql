-- SteVal: aggiornamento per gli ACCOUNT CLIENTI (hai già eseguito supabase.sql e migration-01).
-- 1) Cambia l'email qui sotto (cerca TUA-EMAIL@esempio.com) con quella dell'utente admin che hai creato.
-- 2) Incolla tutto nel SQL Editor di Supabase e premi Run.
-- ⚠️ Fallo PRIMA di riattivare le registrazioni nelle impostazioni di Supabase.

-- ===== Chi è admin =====
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins for select to authenticated using (user_id = auth.uid());
grant select on public.admins to authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- Registra l'admin (CAMBIA L'EMAIL!). Se l'utente non esiste, TUTTO si ferma con un errore e non cambia nulla.
do $$
declare uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower('TUA-EMAIL@esempio.com');
  if uid is null then
    raise exception 'Utente non trovato: sostituisci TUA-EMAIL@esempio.com con l''email dell''admin creata in Authentication → Users';
  end if;
  insert into public.admins (user_id) values (uid) on conflict do nothing;
end $$;

-- ===== Ordini collegati all'account =====
alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_user_idx on public.orders(user_id);

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

-- ===== Nuove regole: solo gli admin gestiscono il negozio =====
drop policy if exists "products admin write" on public.products;
drop policy if exists "products admin insert" on public.products;
drop policy if exists "products admin update" on public.products;
drop policy if exists "products admin delete" on public.products;
create policy "products admin insert" on public.products for insert to authenticated with check (public.is_admin());
create policy "products admin update" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products admin delete" on public.products for delete to authenticated using (public.is_admin());

drop policy if exists "orders admin read" on public.orders;
drop policy if exists "orders read own or admin" on public.orders;
drop policy if exists "orders admin update" on public.orders;
create policy "orders read own or admin" on public.orders for select to authenticated using (public.is_admin() or user_id = auth.uid());
create policy "orders admin update" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "photos admin insert" on storage.objects;
drop policy if exists "photos admin update" on storage.objects;
drop policy if exists "photos admin delete" on storage.objects;
create policy "photos admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'products' and public.is_admin());
create policy "photos admin update" on storage.objects for update to authenticated using (bucket_id = 'products' and public.is_admin());
create policy "photos admin delete" on storage.objects for delete to authenticated using (bucket_id = 'products' and public.is_admin());
