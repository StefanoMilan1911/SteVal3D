-- SteVal: VARIANTI dei prodotti (colore, misura, ...). Eseguilo UNA volta nel SQL Editor di Supabase.
-- Non cancella nulla: i prodotti esistenti restano senza varianti.

alter table public.products
  add column if not exists variants jsonb not null default '[]'::jsonb
  check (jsonb_typeof(variants) = 'array');

-- Il totale dell'ordine tiene conto delle varianti scelte, calcolato dal database (non dal browser).
create or replace function public.compute_order() returns trigger
language plpgsql set search_path = public as $$
declare
  it jsonb; g jsonb; o jsonb; p record;
  lines jsonb := '[]'::jsonb; sel jsonb; chosen text; ok boolean;
  t numeric := 0; unit numeric; q int;
begin
  if jsonb_typeof(new.items) <> 'array' then raise exception 'invalid items'; end if;
  for it in select * from jsonb_array_elements(new.items) loop
    select * into p from public.products where id = (it->>'id')::uuid;
    if found then
      q := least(greatest(coalesce((it->>'qty')::int, 1), 1), 99);
      unit := p.price; sel := '{}'::jsonb;
      -- every option group of the product must have a valid choice; extra price comes from the DB, not the browser
      for g in select * from jsonb_array_elements(coalesce(p.variants, '[]'::jsonb)) loop
        chosen := it->'opts'->>(g->>'name'); ok := false;
        for o in select * from jsonb_array_elements(g->'options') loop
          if o->>'label' = chosen then
            unit := unit + coalesce((o->>'price_delta')::numeric, 0);
            sel := sel || jsonb_build_object(g->>'name', o->>'label');
            ok := true; exit;
          end if;
        end loop;
        if not ok then raise exception 'invalid option for %', g->>'name'; end if;
      end loop;
      lines := lines || jsonb_build_object('id', p.id, 'title', p.title, 'price', round(unit, 2), 'qty', q, 'opts', sel);
      t := t + round(unit, 2) * q;
    end if;
  end loop;
  if jsonb_array_length(lines) = 0 then raise exception 'no valid items'; end if;
  new.items := lines; new.total := round(t, 2); new.status := 'new'; new.user_id := auth.uid();
  return new;
end $$;
