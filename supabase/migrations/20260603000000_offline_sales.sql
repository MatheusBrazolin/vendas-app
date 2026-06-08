-- ============================================================
-- Vendas offline: idempotência por client_uuid
--
-- O PDV pode registrar vendas offline e enfileirá-las localmente
-- (IndexedDB). Ao reconectar, a fila é reenviada ao servidor. Para que um
-- reenvio (após falha parcial de rede) não duplique a venda, o cliente gera
-- um UUID por venda e o servidor o trata como chave de idempotência.
-- ============================================================

-- Coluna nullable: vendas online tradicionais não precisam preencher.
-- UNIQUE garante que o mesmo client_uuid nunca crie duas vendas.
alter table public.sales
  add column if not exists client_uuid uuid;

create unique index if not exists sales_client_uuid_key
  on public.sales(client_uuid)
  where client_uuid is not null;

-- Recria a RPC com o parâmetro p_client_uuid. A assinatura muda (4 args),
-- então removemos a versão antiga (3 args) antes de criar a nova.
drop function if exists public.create_sale_with_items(public.payment_method, text, jsonb);

create or replace function public.create_sale_with_items(
  p_payment_method public.payment_method,
  p_notes text,
  p_items jsonb,
  p_client_uuid uuid default null
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

  -- Idempotência: se essa venda (client_uuid) já foi gravada, devolve o id
  -- existente em vez de criar outra. Permite reenviar a fila com segurança.
  if p_client_uuid is not null then
    select id into v_sale_id
      from public.sales
     where client_uuid = p_client_uuid;
    if found then
      return v_sale_id;
    end if;
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;

  -- Cria a venda com total 0 (atualizado ao final)
  insert into public.sales (total_amount, payment_method, notes, seller_id, client_uuid)
  values (0, p_payment_method, p_notes, auth.uid(), p_client_uuid)
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

grant execute on function
  public.create_sale_with_items(public.payment_method, text, jsonb, uuid)
  to authenticated;
