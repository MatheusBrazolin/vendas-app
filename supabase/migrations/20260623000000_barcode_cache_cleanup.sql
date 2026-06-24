-- Barcode cache TTL cleanup
--
-- Adds last_accessed_at to track when a cached entry was last queried
-- (separate from updated_at which only changes on writes/upserts).
-- A cleanup function removes stale entries on a schedule.

alter table public.barcode_cache
  add column if not exists last_accessed_at timestamptz not null default now();

create index if not exists barcode_cache_last_accessed_idx
  on public.barcode_cache (last_accessed_at);

/**
 * Deletes stale barcode cache entries:
 *   - 'not_found' entries not accessed in 30 days
 *     (the product may have been added to an external DB in the meantime)
 *   - Any other entry not accessed in 90 days
 *
 * Returns the number of deleted rows. Called from the daily cron.
 */
create or replace function public.cleanup_barcode_cache()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.barcode_cache
  where
    (source = 'not_found' and last_accessed_at < now() - interval '30 days')
    or (last_accessed_at < now() - interval '90 days');

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
