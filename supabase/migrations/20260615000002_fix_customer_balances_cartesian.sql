-- Fix customer_balances view: cartesian product bug.
--
-- The previous version joined customers → sales → debt_payments directly,
-- creating N×M rows (N=fiado sales, M=payments). This caused both aggregates
-- to be multiplied by the wrong factor, so:
--   - 1 sale + 2 payments → total_fiado doubled (debt appeared to grow)
--   - 2 sales + 1 payment → total_paid doubled (debt appeared too low)
--
-- Fix: pre-aggregate each table independently in subqueries, then join
-- the already-collapsed rows. Each customer maps to at most one row per
-- subquery, eliminating the cross-multiplication.

create or replace view public.customer_balances as
select
  c.id,
  c.full_name,
  c.phone,
  c.notes,
  c.created_at,
  c.updated_at,
  coalesce(s.total_fiado,  0)                          as total_fiado,
  coalesce(dp.total_paid,  0)                          as total_paid,
  coalesce(s.total_fiado,  0) - coalesce(dp.total_paid, 0) as current_debt,
  dp.last_payment_at,
  s.first_fiado_at
from public.customers c
left join (
  select
    customer_id,
    sum(total_amount)  as total_fiado,
    min(created_at)    as first_fiado_at
  from public.sales
  where payment_method = 'fiado'
  group by customer_id
) s  on s.customer_id  = c.id
left join (
  select
    customer_id,
    sum(amount)        as total_paid,
    max(created_at)    as last_payment_at
  from public.debt_payments
  group by customer_id
) dp on dp.customer_id = c.id;
