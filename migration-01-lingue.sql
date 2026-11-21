-- SteVal: SE hai GIÀ eseguito supabase.sql, esegui SOLO questo file (SQL Editor → Run).
-- Aggiunge titolo e descrizione in inglese ai prodotti. I prodotti esistenti non cambiano.
alter table public.products add column if not exists title_en text not null default '' check (char_length(title_en) <= 120);
alter table public.products add column if not exists description_en text not null default '' check (char_length(description_en) <= 4000);
