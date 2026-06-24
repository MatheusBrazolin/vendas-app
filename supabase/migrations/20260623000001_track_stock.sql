-- Add track_stock to products: when false, the RPC skips stock checks and
-- deduction — useful for services, custom-priced items, or avulso products.
-- Add item_description to sale_items: stores a per-line description entered
-- at the POS for generic (avulso) items.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS track_stock boolean NOT NULL DEFAULT true;

-- System product for custom-price items without a barcode.
-- ON CONFLICT ensures re-running the migration is safe and keeps the product active.
INSERT INTO public.products (code, name, description, sale_price, cost_price, stock_quantity, min_stock, track_stock, is_active)
VALUES (
  'AVULSO',
  'Item Avulso',
  'Produto genérico para itens sem código ou com preço variável.',
  0, 0, 0, 0, false, true
)
ON CONFLICT (code) DO UPDATE
  SET track_stock = false,
      is_active   = true;

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS item_description text;

-- Recreate create_sale_with_items with track_stock and item_description support.
--   • track_stock = false  → skip stock check and deduction for that product
--   • item_description     → stored in sale_items; read by receipts/reports
CREATE OR REPLACE FUNCTION public.create_sale_with_items(
  p_payment_method public.payment_method,
  p_notes          text,
  p_items          jsonb,
  p_client_uuid    uuid default null,
  p_customer_id    uuid default null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id    uuid;
  v_total      numeric(12,2) := 0;
  v_item       jsonb;
  v_product    record;
  v_qty        integer;
  v_unit_price numeric(12,2);
  v_subtotal   numeric(12,2);
  v_item_desc  text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'empty_cart';
  END IF;

  IF p_payment_method = 'fiado' AND p_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_required';
  END IF;

  -- Idempotência: se o client_uuid já existe, devolve o id existente
  IF p_client_uuid IS NOT NULL THEN
    SELECT id INTO v_sale_id
      FROM public.sales
     WHERE client_uuid = p_client_uuid;
    IF FOUND THEN
      RETURN v_sale_id;
    END IF;
  END IF;

  INSERT INTO public.sales (total_amount, payment_method, notes, seller_id, client_uuid, customer_id)
  VALUES (0, p_payment_method, p_notes, auth.uid(), p_client_uuid, p_customer_id)
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty       := (v_item->>'quantity')::integer;
    v_item_desc := v_item->>'item_description';

    SELECT id, sale_price, stock_quantity, name, track_stock
      INTO v_product
      FROM public.products
     WHERE id = (v_item->>'product_id')::uuid
       AND is_active = true
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'product_not_found:%', (v_item->>'product_id');
    END IF;

    -- Only enforce stock limits for tracked products
    IF v_product.track_stock AND v_product.stock_quantity < v_qty THEN
      RAISE EXCEPTION 'insufficient_stock:%', v_product.name;
    END IF;

    -- Use the override price when provided, otherwise fall back to catalogue price
    v_unit_price := COALESCE(
      NULLIF((v_item->>'unit_price')::numeric, 0),
      v_product.sale_price
    );
    v_subtotal := v_unit_price * v_qty;
    v_total    := v_total + v_subtotal;

    INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, subtotal, item_description)
    VALUES (v_sale_id, v_product.id, v_qty, v_unit_price, v_subtotal, v_item_desc);

    -- Only deduct stock for tracked products
    IF v_product.track_stock THEN
      UPDATE public.products
         SET stock_quantity = stock_quantity - v_qty
       WHERE id = v_product.id;
    END IF;
  END LOOP;

  UPDATE public.sales SET total_amount = v_total WHERE id = v_sale_id;

  RETURN v_sale_id;
END;
$$;
