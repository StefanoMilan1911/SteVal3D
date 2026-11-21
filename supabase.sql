-- SteVal: incolla TUTTO questo nel SQL Editor di Supabase e premi "Run".

-- ========== TABELLE ==========
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 4000),
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
  status text not null default 'new' check (status in ('new','confirmed','printing','shipped','done','cancelled')),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (email ~* '^\S+@\S+\.\S+$' and char_length(email) <= 120),
  phone text not null default '' check (char_length(phone) <= 30),
  note text not null default '' check (char_length(note) <= 1000),
  items jsonb not null,
  total numeric(10,2) not null default 0
);

-- Il prezzo/totale di un ordine viene ricalcolato dal server (il cliente non può truccarlo)
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
  new.items := lines; new.total := round(t, 2); new.status := 'new';
  return new;
end $$;

drop trigger if exists orders_compute on public.orders;
create trigger orders_compute before insert on public.orders
for each row execute function public.compute_order();

-- ========== SICUREZZA (RLS) ==========
alter table public.products enable row level security;
alter table public.orders enable row level security;

drop policy if exists "products public read" on public.products;
drop policy if exists "products admin write" on public.products;
drop policy if exists "orders public insert" on public.orders;
drop policy if exists "orders admin read" on public.orders;
drop policy if exists "orders admin update" on public.orders;

create policy "products public read" on public.products for select to anon, authenticated using (true);
create policy "products admin write" on public.products for all to authenticated using (true) with check (true);
create policy "orders public insert" on public.orders for insert to anon, authenticated with check (true);
create policy "orders admin read" on public.orders for select to authenticated using (true);
create policy "orders admin update" on public.orders for update to authenticated using (true) with check (true);

grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant insert on public.orders to anon;
grant select, insert, update on public.orders to authenticated;

-- ========== FOTO (Storage) ==========
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists "photos admin insert" on storage.objects;
drop policy if exists "photos admin update" on storage.objects;
drop policy if exists "photos admin delete" on storage.objects;
create policy "photos admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'products');
create policy "photos admin update" on storage.objects for update to authenticated using (bucket_id = 'products');
create policy "photos admin delete" on storage.objects for delete to authenticated using (bucket_id = 'products');
