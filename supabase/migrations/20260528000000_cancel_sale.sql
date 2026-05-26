-- ============================================================
-- RPC: cancelar venda (apenas admins)
-- Devolve cada item ao estoque e apaga a venda atomicamente.
-- sale_items e apagado via cascata pela FK.
-- ============================================================

create or replace function public.cancel_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_exists boolean;
begin
  -- Autorizacao: apenas admins podem cancelar vendas
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Confirma que a venda existe (mensagem amigavel se nao)
  select exists(select 1 from public.sales where id = p_sale_id) into v_exists;
  if not v_exists then
    raise exception 'sale_not_found' using errcode = 'P0001';
  end if;

  -- 1. Devolve cada item ao estoque do produto correspondente.
  --    FOR UPDATE para evitar race com PDV concorrente alterando estoque.
  for v_item in
    select si.product_id, si.quantity
      from public.sale_items si
      join public.products p on p.id = si.product_id
     where si.sale_id = p_sale_id
       for update of p
  loop
    update public.products
       set stock_quantity = stock_quantity + v_item.quantity
     where id = v_item.product_id;
  end loop;

  -- 2. Apaga a venda. sale_items cai em cascata via FK.
  delete from public.sales where id = p_sale_id;
end;
$$;

grant execute on function public.cancel_sale(uuid) to authenticated;
