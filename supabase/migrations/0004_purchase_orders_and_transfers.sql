-- ============================================================
-- Restoki — 0004_purchase_orders_and_transfers.sql
-- Fase 4: funciones SECURITY DEFINER para operaciones atómicas
-- sobre purchase_orders y transfers. Reutilizan apply_inventory_movement
-- de la migración 0003 para mantener una sola fuente de verdad para
-- el cálculo de stock + CPP.
-- ============================================================

-- transfer_items.unit_cost: cost congelado al momento de envío,
-- para que el receive del destino lo aplique al CPP.
alter table transfer_items
  add column if not exists unit_cost numeric;

-- ============================================================
-- receive_purchase_order(po_id)
-- draft|sent → received: itera líneas y aplica purchase movements.
-- ============================================================
create or replace function public.receive_purchase_order(p_po_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_po record;
  v_item record;
  v_total numeric := 0;
begin
  if v_user_id is null then
    raise exception 'No hay usuario autenticado' using errcode = '28000';
  end if;

  select * into v_po from purchase_orders where id = p_po_id for update;
  if v_po is null then
    raise exception 'Orden de compra no encontrada' using errcode = '22023';
  end if;

  if not exists (
    select 1 from memberships
    where user_id = v_user_id and organization_id = v_po.organization_id
  ) then
    raise exception 'Sin permiso para esta organización' using errcode = '42501';
  end if;

  if v_po.status = 'received' then
    raise exception 'La orden ya fue recibida' using errcode = '22023';
  end if;

  if v_po.status = 'cancelled' then
    raise exception 'No se puede recibir una orden cancelada' using errcode = '22023';
  end if;

  if not exists (
    select 1 from purchase_order_items where purchase_order_id = p_po_id
  ) then
    raise exception 'La orden no tiene líneas que recibir' using errcode = '22023';
  end if;

  for v_item in
    select id, product_id, quantity, unit_cost
    from purchase_order_items
    where purchase_order_id = p_po_id
  loop
    perform apply_inventory_movement(
      v_po.location_id,
      v_item.product_id,
      'purchase'::movement_type,
      v_item.quantity,
      v_item.unit_cost,
      'PO ' || left(p_po_id::text, 8),
      p_po_id
    );
    v_total := v_total + (v_item.quantity * v_item.unit_cost);
  end loop;

  update purchase_orders
  set status = 'received',
      received_at = now(),
      total = v_total,
      updated_at = now()
  where id = p_po_id;
end;
$$;

revoke all on function public.receive_purchase_order(uuid) from public;
grant execute on function public.receive_purchase_order(uuid) to authenticated;

-- ============================================================
-- cancel_purchase_order(po_id) — draft|sent → cancelled
-- ============================================================
create or replace function public.cancel_purchase_order(p_po_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_po record;
begin
  if v_user_id is null then
    raise exception 'No hay usuario autenticado' using errcode = '28000';
  end if;

  select * into v_po from purchase_orders where id = p_po_id for update;
  if v_po is null then
    raise exception 'Orden de compra no encontrada' using errcode = '22023';
  end if;

  if not exists (
    select 1 from memberships
    where user_id = v_user_id and organization_id = v_po.organization_id
  ) then
    raise exception 'Sin permiso para esta organización' using errcode = '42501';
  end if;

  if v_po.status = 'received' then
    raise exception 'No se puede cancelar una orden ya recibida' using errcode = '22023';
  end if;

  if v_po.status = 'cancelled' then
    return;
  end if;

  update purchase_orders
  set status = 'cancelled', updated_at = now()
  where id = p_po_id;
end;
$$;

revoke all on function public.cancel_purchase_order(uuid) from public;
grant execute on function public.cancel_purchase_order(uuid) to authenticated;

-- ============================================================
-- ship_transfer(transfer_id)
-- draft → in_transit: lee avg_cost actual del origen y lo congela
-- en transfer_items.unit_cost. Descuenta stock con transfer_out.
-- ============================================================
create or replace function public.ship_transfer(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_transfer record;
  v_item record;
  v_current_cost numeric;
begin
  if v_user_id is null then
    raise exception 'No hay usuario autenticado' using errcode = '28000';
  end if;

  select * into v_transfer from transfers where id = p_transfer_id for update;
  if v_transfer is null then
    raise exception 'Transferencia no encontrada' using errcode = '22023';
  end if;

  if not exists (
    select 1 from memberships
    where user_id = v_user_id and organization_id = v_transfer.organization_id
  ) then
    raise exception 'Sin permiso para esta organización' using errcode = '42501';
  end if;

  if v_transfer.status <> 'draft' then
    raise exception 'Solo borradores pueden enviarse' using errcode = '22023';
  end if;

  if v_transfer.from_location_id = v_transfer.to_location_id then
    raise exception 'Origen y destino no pueden ser la misma sucursal' using errcode = '22023';
  end if;

  if not exists (
    select 1 from transfer_items where transfer_id = p_transfer_id
  ) then
    raise exception 'La transferencia no tiene líneas que enviar' using errcode = '22023';
  end if;

  for v_item in
    select id, product_id, quantity
    from transfer_items
    where transfer_id = p_transfer_id
  loop
    select coalesce(average_cost, 0) into v_current_cost
    from inventory
    where location_id = v_transfer.from_location_id
      and product_id = v_item.product_id;

    if v_current_cost is null then
      v_current_cost := 0;
    end if;

    update transfer_items
    set unit_cost = v_current_cost
    where id = v_item.id;

    perform apply_inventory_movement(
      v_transfer.from_location_id,
      v_item.product_id,
      'transfer_out'::movement_type,
      -v_item.quantity,
      v_current_cost,
      'Transfer ' || left(p_transfer_id::text, 8),
      p_transfer_id
    );
  end loop;

  update transfers
  set status = 'in_transit', shipped_at = now()
  where id = p_transfer_id;
end;
$$;

revoke all on function public.ship_transfer(uuid) from public;
grant execute on function public.ship_transfer(uuid) to authenticated;

-- ============================================================
-- receive_transfer(transfer_id)
-- in_transit → received: aplica transfer_in en destino con el
-- unit_cost congelado en el envío.
-- ============================================================
create or replace function public.receive_transfer(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_transfer record;
  v_item record;
begin
  if v_user_id is null then
    raise exception 'No hay usuario autenticado' using errcode = '28000';
  end if;

  select * into v_transfer from transfers where id = p_transfer_id for update;
  if v_transfer is null then
    raise exception 'Transferencia no encontrada' using errcode = '22023';
  end if;

  if not exists (
    select 1 from memberships
    where user_id = v_user_id and organization_id = v_transfer.organization_id
  ) then
    raise exception 'Sin permiso para esta organización' using errcode = '42501';
  end if;

  if v_transfer.status <> 'in_transit' then
    raise exception 'Solo transferencias en tránsito pueden recibirse' using errcode = '22023';
  end if;

  for v_item in
    select product_id, quantity, unit_cost
    from transfer_items
    where transfer_id = p_transfer_id
  loop
    perform apply_inventory_movement(
      v_transfer.to_location_id,
      v_item.product_id,
      'transfer_in'::movement_type,
      v_item.quantity,
      coalesce(v_item.unit_cost, 0),
      'Transfer ' || left(p_transfer_id::text, 8),
      p_transfer_id
    );
  end loop;

  update transfers
  set status = 'received', received_at = now()
  where id = p_transfer_id;
end;
$$;

revoke all on function public.receive_transfer(uuid) from public;
grant execute on function public.receive_transfer(uuid) to authenticated;

-- ============================================================
-- cancel_transfer(transfer_id) — solo draft puede cancelarse limpio.
-- in_transit requiere reverso manual de stock (no V1).
-- ============================================================
create or replace function public.cancel_transfer(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_transfer record;
begin
  if v_user_id is null then
    raise exception 'No hay usuario autenticado' using errcode = '28000';
  end if;

  select * into v_transfer from transfers where id = p_transfer_id for update;
  if v_transfer is null then
    raise exception 'Transferencia no encontrada' using errcode = '22023';
  end if;

  if not exists (
    select 1 from memberships
    where user_id = v_user_id and organization_id = v_transfer.organization_id
  ) then
    raise exception 'Sin permiso para esta organización' using errcode = '42501';
  end if;

  if v_transfer.status = 'received' then
    raise exception 'No se puede cancelar una transferencia recibida' using errcode = '22023';
  end if;

  if v_transfer.status = 'in_transit' then
    raise exception 'Para cancelar una transferencia en tránsito, contacta soporte (reverso manual)' using errcode = '22023';
  end if;

  if v_transfer.status = 'cancelled' then
    return;
  end if;

  update transfers set status = 'cancelled' where id = p_transfer_id;
end;
$$;

revoke all on function public.cancel_transfer(uuid) from public;
grant execute on function public.cancel_transfer(uuid) to authenticated;
