-- ============================================================
-- Restoki — 0008_enforce_location_scope.sql
-- Fase 7 chunk 3.2:
--   Enforcement real del location scope introducido en 0007.
--   1. helper user_locations(): set de location ids accesibles al user
--   2. RLS reemplazadas para inventory, inventory_movements,
--      purchase_orders, transfers — filtradas por location accesible
--   3. RPCs actualizadas con check user_can_access_location() para
--      bloquear escrituras a sucursales fuera del scope.
--
-- Compatibilidad: para usuarios con membership.location_id = NULL
-- (owner/admin/manager por defecto), user_locations() retorna TODAS
-- las locations de sus orgs — comportamiento idéntico al previo.
-- ============================================================

-- 1. Helper set-returning
create or replace function public.user_locations()
returns setof uuid
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select l.id
  from locations l
  join memberships m on m.organization_id = l.organization_id
  where m.user_id = auth.uid()
    and (m.location_id is null or m.location_id = l.id)
$$;

revoke all on function public.user_locations() from public;
grant execute on function public.user_locations() to authenticated;

-- 2. RLS — inventory (read scoped a locations accesibles)
drop policy if exists "tenant isolation read" on inventory;
create policy "location scope read" on inventory
  for select to authenticated
  using (location_id in (select user_locations()));

-- inventory_movements (read scoped a locations accesibles)
drop policy if exists "tenant isolation read" on inventory_movements;
create policy "location scope read" on inventory_movements
  for select to authenticated
  using (location_id in (select user_locations()));

-- purchase_orders (location scope para todas las operaciones)
drop policy if exists "tenant isolation" on purchase_orders;
create policy "location scope" on purchase_orders
  for all to authenticated
  using (location_id in (select user_locations()))
  with check (location_id in (select user_locations()));

-- transfers (staff con location_id ve transfers donde from O to es su sucursal)
drop policy if exists "tenant isolation" on transfers;
create policy "location scope" on transfers
  for all to authenticated
  using (
    from_location_id in (select user_locations())
    or to_location_id in (select user_locations())
  )
  with check (
    from_location_id in (select user_locations())
    and to_location_id in (select user_locations())
  );

-- Nota: purchase_order_items y transfer_items se filtran automáticamente
-- vía la policy "tenant isolation via parent" que ya existía. Cuando el
-- padre es invisible por location scope, los items también lo son.

-- 3. RPCs con enforcement de location access

-- apply_inventory_movement: agregar check_location
create or replace function public.apply_inventory_movement(
  p_location_id uuid,
  p_product_id uuid,
  p_type movement_type,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_notes text default null,
  p_reference_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_movement_id uuid;
  v_current_qty numeric;
  v_current_avg_cost numeric;
  v_new_qty numeric;
  v_new_avg_cost numeric;
  v_location_org uuid;
  v_product_org uuid;
begin
  if v_user_id is null then
    raise exception 'No hay usuario autenticado' using errcode = '28000';
  end if;

  if p_quantity is null or p_quantity = 0 then
    raise exception 'La cantidad no puede ser cero' using errcode = '22023';
  end if;

  if p_unit_cost is not null and p_unit_cost < 0 then
    raise exception 'El costo unitario no puede ser negativo' using errcode = '22023';
  end if;

  select organization_id into v_location_org from locations where id = p_location_id;
  if v_location_org is null then
    raise exception 'Sucursal no encontrada' using errcode = '22023';
  end if;

  select organization_id into v_product_org from products where id = p_product_id;
  if v_product_org is null then
    raise exception 'Producto no encontrado' using errcode = '22023';
  end if;

  if v_product_org <> v_location_org then
    raise exception 'Producto y sucursal pertenecen a organizaciones distintas'
      using errcode = '22023';
  end if;

  -- Nuevo: enforce location scope
  if not public.user_can_access_location(p_location_id) then
    raise exception 'Sin permiso para esta sucursal' using errcode = '42501';
  end if;

  v_org_id := v_location_org;

  case p_type
    when 'purchase', 'transfer_in' then
      if p_quantity <= 0 then
        raise exception '% requiere cantidad positiva', p_type using errcode = '22023';
      end if;
    when 'sale', 'waste', 'transfer_out' then
      if p_quantity >= 0 then
        raise exception '% requiere cantidad negativa', p_type using errcode = '22023';
      end if;
    when 'adjustment' then
      null;
  end case;

  insert into inventory (organization_id, location_id, product_id, quantity, average_cost)
  values (v_org_id, p_location_id, p_product_id, 0, 0)
  on conflict (location_id, product_id) do nothing;

  select quantity, average_cost into v_current_qty, v_current_avg_cost
  from inventory
  where location_id = p_location_id and product_id = p_product_id
  for update;

  v_new_qty := v_current_qty + p_quantity;

  if v_new_qty < 0 then
    raise exception 'Stock insuficiente. Actual: %, intento: %',
      v_current_qty, p_quantity using errcode = '23514';
  end if;

  if p_quantity > 0 and p_unit_cost is not null and p_unit_cost > 0 and v_new_qty > 0 then
    v_new_avg_cost := (
      (v_current_qty * coalesce(v_current_avg_cost, 0)) +
      (p_quantity * p_unit_cost)
    ) / v_new_qty;
  elsif v_new_qty = 0 then
    v_new_avg_cost := 0;
  else
    v_new_avg_cost := v_current_avg_cost;
  end if;

  update inventory
  set quantity = v_new_qty,
      average_cost = v_new_avg_cost,
      updated_at = now()
  where location_id = p_location_id and product_id = p_product_id;

  insert into inventory_movements (
    organization_id, location_id, product_id,
    type, quantity, unit_cost,
    reference_id, notes, user_id
  )
  values (
    v_org_id, p_location_id, p_product_id,
    p_type, p_quantity, p_unit_cost,
    p_reference_id, p_notes, v_user_id
  )
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;

-- receive_purchase_order: enforce destination location
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

  if not public.user_can_access_location(v_po.location_id) then
    raise exception 'Sin permiso para esta sucursal' using errcode = '42501';
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

-- cancel_purchase_order: enforce destination location
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

  if not public.user_can_access_location(v_po.location_id) then
    raise exception 'Sin permiso para esta sucursal' using errcode = '42501';
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

-- ship_transfer: enforce origen
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

  if not public.user_can_access_location(v_transfer.from_location_id) then
    raise exception 'Sin permiso para enviar desde esta sucursal' using errcode = '42501';
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

-- receive_transfer: enforce destino
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

  if not public.user_can_access_location(v_transfer.to_location_id) then
    raise exception 'Sin permiso para recibir en esta sucursal' using errcode = '42501';
  end if;

  if v_transfer.status <> 'in_transit' then
    raise exception 'Solo transferencias en tránsito pueden recibirse' using errcode = '22023';
  end if;

  for v_item in
    select id, product_id, quantity, unit_cost
    from transfer_items
    where transfer_id = p_transfer_id
  loop
    perform apply_inventory_movement(
      v_transfer.to_location_id,
      v_item.product_id,
      'transfer_in'::movement_type,
      v_item.quantity,
      v_item.unit_cost,
      'Transfer ' || left(p_transfer_id::text, 8),
      p_transfer_id
    );
  end loop;

  update transfers
  set status = 'received', received_at = now()
  where id = p_transfer_id;
end;
$$;

-- cancel_transfer: enforce origen (donde regresa el stock si estaba shipped)
create or replace function public.cancel_transfer(p_transfer_id uuid)
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

  if not public.user_can_access_location(v_transfer.from_location_id) then
    raise exception 'Sin permiso para cancelar esta transferencia' using errcode = '42501';
  end if;

  if v_transfer.status = 'received' then
    raise exception 'No se puede cancelar una transferencia ya recibida' using errcode = '22023';
  end if;

  if v_transfer.status = 'cancelled' then
    return;
  end if;

  -- Si estaba en tránsito, regresar el stock al origen
  if v_transfer.status = 'in_transit' then
    for v_item in
      select id, product_id, quantity, unit_cost
      from transfer_items
      where transfer_id = p_transfer_id
    loop
      perform apply_inventory_movement(
        v_transfer.from_location_id,
        v_item.product_id,
        'transfer_in'::movement_type,
        v_item.quantity,
        v_item.unit_cost,
        'Transfer cancel ' || left(p_transfer_id::text, 8),
        p_transfer_id
      );
    end loop;
  end if;

  update transfers
  set status = 'cancelled'
  where id = p_transfer_id;
end;
$$;
