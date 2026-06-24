-- ============ FIADO — crédito de loja ============

-- 1. Novo valor no enum de método de pagamento
alter type public.payment_method add value 'fiado';

-- 2. Tabela de clientes (pré-cadastro simples)
create table public.customers (
  id         uuid primary key default uuid_generate_v4(),
  full_name  text not null,
  phone      text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create index idx_customers_full_name on public.customers(lower(full_name));
create index idx_customers_phone     on public.customers(phone);

-- 3. Tabela de pagamentos de dívida (quitação parcial ou total)
create table public.debt_payments (
  id          uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  amount      numeric(12,2) not null check (amount > 0),
  notes       text,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at  timestamptz not null default now()
);

create index idx_debt_payments_customer on public.debt_payments(customer_id);
create index idx_debt_payments_created  on public.debt_payments(created_at desc);

-- 4. customer_id em sales (nullable — obrigatório apenas quando payment_method = 'fiado')
alter table public.sales
  add column customer_id uuid references public.customers(id) on delete set null;

create index idx_sales_customer on public.sales(customer_id);

-- 5. Atualiza a RPC de criação de venda para aceitar customer_id
create or replace function public.create_sale_with_items(
  p_payment_method public.payment_method,
  p_notes          text,
  p_items          jsonb,
  p_client_uuid    uuid default null,
  p_customer_id    uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id  uuid;
  v_total    numeric(12,2) := 0;
  v_item     jsonb;
  v_product  record;
  v_qty      integer;
  v_subtotal numeric(12,2);
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;

  if p_payment_method = 'fiado' and p_customer_id is null then
    raise exception 'customer_required';
  end if;

  -- Idempotência: se o client_uuid já existe, devolve o id existente
  if p_client_uuid is not null then
    select id into v_sale_id
      from public.sales
     where client_uuid = p_client_uuid;
    if found then
      return v_sale_id;
    end if;
  end if;

  insert into public.sales (total_amount, payment_method, notes, seller_id, client_uuid, customer_id)
  values (0, p_payment_method, p_notes, auth.uid(), p_client_uuid, p_customer_id)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::integer;

    select id, sale_price, stock_quantity, name
      into v_product
      from public.products
     where id = (v_item->>'product_id')::uuid
       and is_active = true
     for update;

    if not found then
      raise exception 'product_not_found:%', (v_item->>'product_id');
    end if;

    if v_product.stock_quantity < v_qty then
      raise exception 'insufficient_stock:%', v_product.name;
    end if;

    v_subtotal := v_product.sale_price * v_qty;
    v_total    := v_total + v_subtotal;

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, subtotal)
    values (v_sale_id, v_product.id, v_qty, v_product.sale_price, v_subtotal);

    update public.products
       set stock_quantity = stock_quantity - v_qty
     where id = v_product.id;
  end loop;

  update public.sales set total_amount = v_total where id = v_sale_id;

  return v_sale_id;
end;
$$;

-- 6. RPC: busca de clientes por nome ou telefone
create or replace function public.search_customers(p_query text)
returns setof public.customers
language sql
security definer
set search_path = public
as $$
  select * from public.customers
  where lower(full_name) like '%' || lower(p_query) || '%'
     or phone like '%' || p_query || '%'
  order by full_name
  limit 20;
$$;

-- 7. RPC: registrar pagamento de dívida
create or replace function public.record_debt_payment(
  p_customer_id uuid,
  p_amount      numeric,
  p_notes       text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  insert into public.debt_payments (customer_id, amount, notes, recorded_by)
  values (p_customer_id, p_amount, p_notes, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- 8. View: saldo devedor por cliente
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
    - coalesce(sum(dp.amount), 0) as current_debt
from public.customers c
left join public.sales s on s.customer_id = c.id
left join public.debt_payments dp on dp.customer_id = c.id
group by c.id, c.full_name, c.phone, c.notes, c.created_at, c.updated_at;

-- 9. RLS
alter table public.customers     enable row level security;
alter table public.debt_payments  enable row level security;

create policy "auth_read_customers" on public.customers
  for select using (auth.uid() is not null);
create policy "auth_write_customers" on public.customers
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "auth_read_debt_payments" on public.debt_payments
  for select using (auth.uid() is not null);
create policy "auth_insert_debt_payments" on public.debt_payments
  for insert with check (auth.uid() = recorded_by);
