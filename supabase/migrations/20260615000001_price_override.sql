-- Allow per-item price override in create_sale_with_items.
-- If the JSON item contains "unit_price", that value is used instead of the
-- product's catalogue price. Useful for promotions or corrections at the POS.
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
  v_sale_id   uuid;
  v_total     numeric(12,2) := 0;
  v_item      jsonb;
  v_product   record;
  v_qty       integer;
  v_unit_price numeric(12,2);
  v_subtotal  numeric(12,2);
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

    -- Use the override price when provided, otherwise fall back to catalogue price
    v_unit_price := coalesce(
      nullif((v_item->>'unit_price')::numeric, 0),
      v_product.sale_price
    );
    v_subtotal := v_unit_price * v_qty;
    v_total    := v_total + v_subtotal;

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, subtotal)
    values (v_sale_id, v_product.id, v_qty, v_unit_price, v_subtotal);

    update public.products
       set stock_quantity = stock_quantity - v_qty
     where id = v_product.id;
  end loop;

  update public.sales set total_amount = v_total where id = v_sale_id;

  return v_sale_id;
end;
$$;
