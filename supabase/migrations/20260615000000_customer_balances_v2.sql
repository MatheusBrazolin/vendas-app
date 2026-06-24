-- Adiciona first_fiado_at e last_payment_at à view customer_balances.
--
-- first_fiado_at: data da primeira compra fiada do cliente.
--   Usado para calcular "dias sem pagar" quando o cliente ainda nunca pagou,
--   evitando o texto genérico "Nunca pagou" para compradores recentes.
--
-- last_payment_at: data do último pagamento registrado.
--   Já existia em produção; incluída aqui para manter a migration em sincronia
--   com o schema real.

create or replace view public.customer_balances as
select
  c.id,
  c.full_name,
  c.phone,
  c.notes,
  c.created_at,
  c.updated_at,
  coalesce(sum(s.total_amount) filter (where s.payment_method = 'fiado'), 0) as total_fiado,
  coalesce(sum(dp.amount), 0) as total_paid,
  coalesce(sum(s.total_amount) filter (where s.payment_method = 'fiado'), 0)
    - coalesce(sum(dp.amount), 0) as current_debt,
  max(dp.created_at) as last_payment_at,
  min(s.created_at) filter (where s.payment_method = 'fiado') as first_fiado_at
from public.customers c
left join public.sales s on s.customer_id = c.id
left join public.debt_payments dp on dp.customer_id = c.id
group by c.id, c.full_name, c.phone, c.notes, c.created_at, c.updated_at;
