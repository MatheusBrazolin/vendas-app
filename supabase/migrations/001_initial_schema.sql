-- Extensions
create extension if not exists "uuid-ossp";

-- ============ CATEGORIES ============
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- ============ PRODUCTS ============
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  description text,
  sale_price numeric(12,2) not null check (sale_price >= 0),
  cost_price numeric(12,2) not null check (cost_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  min_stock integer not null default 0 check (min_stock >= 0),
  category_id uuid references public.categories(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_code on public.products(code);
create index idx_products_category on public.products(category_id);
create index idx_products_low_stock on public.products(stock_quantity)
  where stock_quantity <= min_stock;
create index idx_products_active on public.products(is_active);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ============ SALES ============
create type public.payment_method as enum ('cash','credit','debit','pix');

create table public.sales (
  id uuid primary key default uuid_generate_v4(),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  payment_method public.payment_method not null,
  notes text,
  seller_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index idx_sales_seller on public.sales(seller_id);
create index idx_sales_created_at on public.sales(created_at desc);

-- ============ SALE ITEMS ============
create table public.sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0)
);

create index idx_sale_items_sale on public.sale_items(sale_id);
create index idx_sale_items_product on public.sale_items(product_id);

-- ============ RPC: Criacao atomica de venda ============
create or replace function public.create_sale_with_items(
  p_payment_method public.payment_method,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_total   numeric(12,2) := 0;
  v_item    jsonb;
  v_product record;
  v_qty     integer;
  v_subtotal numeric(12,2);
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;

  -- Cria a venda com total 0 (atualizado ao final)
  insert into public.sales (total_amount, payment_method, notes, seller_id)
  values (0, p_payment_method, p_notes, auth.uid())
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::integer;

    select id, sale_price, stock_quantity, name
      into v_product
      from public.products
     where id = (v_item->>'product_id')::uuid
       and is_active = true
     for update; -- lock para evitar race condition

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

-- ============ RLS ============
alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.sales      enable row level security;
alter table public.sale_items enable row level security;

-- Categories: qualquer autenticado pode ler e escrever
create policy "auth_read_categories" on public.categories
  for select using (auth.uid() is not null);
create policy "auth_write_categories" on public.categories
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Products: qualquer autenticado pode ler e escrever
create policy "auth_read_products" on public.products
  for select using (auth.uid() is not null);
create policy "auth_write_products" on public.products
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Sales: qualquer autenticado le, apenas dono insere
create policy "auth_read_sales" on public.sales
  for select using (auth.uid() is not null);
create policy "owner_insert_sales" on public.sales
  for insert with check (auth.uid() = seller_id);

-- Sale items: qualquer autenticado le, insere se venda e do usuario
create policy "auth_read_sale_items" on public.sale_items
  for select using (auth.uid() is not null);
create policy "owner_insert_sale_items" on public.sale_items
  for insert with check (
    exists (
      select 1 from public.sales s
      where s.id = sale_id and s.seller_id = auth.uid()
    )
  );

-- Seed: categorias iniciais
insert into public.categories (name) values
  ('Geral'),
  ('Alimentos'),
  ('Bebidas'),
  ('Limpeza'),
  ('Higiene'),
  ('Eletrônicos'),
  ('Vestuário'),
  ('Outros');
