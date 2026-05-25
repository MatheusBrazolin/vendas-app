-- Barcode cache table: stores results of external barcode-database lookups
-- so the same code is never queried twice against Cosmos/OpenFoodFacts/UPCitemdb.

create table if not exists public.barcode_cache (
  code text primary key,
  source text not null check (source in ('cosmos', 'openfoodfacts', 'upcitemdb', 'not_found')),
  name text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists barcode_cache_source_idx on public.barcode_cache (source);
create index if not exists barcode_cache_created_at_idx on public.barcode_cache (created_at desc);

alter table public.barcode_cache enable row level security;

-- Anyone may read the cache (it speeds up product lookup)
drop policy if exists "barcode_cache_select_all" on public.barcode_cache;
create policy "barcode_cache_select_all"
  on public.barcode_cache
  for select
  using (true);

-- Only authenticated users may insert/update cache entries
drop policy if exists "barcode_cache_insert_authenticated" on public.barcode_cache;
create policy "barcode_cache_insert_authenticated"
  on public.barcode_cache
  for insert
  to authenticated
  with check (true);

drop policy if exists "barcode_cache_update_authenticated" on public.barcode_cache;
create policy "barcode_cache_update_authenticated"
  on public.barcode_cache
  for update
  to authenticated
  using (true)
  with check (true);

-- Auto-update updated_at on row updates
create or replace function public.touch_barcode_cache_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists barcode_cache_set_updated_at on public.barcode_cache;
create trigger barcode_cache_set_updated_at
  before update on public.barcode_cache
  for each row execute function public.touch_barcode_cache_updated_at();
