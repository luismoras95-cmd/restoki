-- ============================================================
-- Restoki — 0015_enforce_editor_role_in_rpcs.sql
-- Auditoría de seguridad (oct 2026, previa a onboarding cliente cafetero).
--
-- PROBLEMA: las RPCs de escritura (recibir/cancelar compras, enviar/recibir/
-- cancelar transferencias, aplicar ventas, aplicar movimiento de inventario)
-- solo verificaban MEMBRESÍA + acceso a la sucursal, NUNCA el ROL. El
-- requisito de "gerente/admin/dueño" vivía solo en el código TypeScript
-- (EDITOR_ROLES). Como la llave anon de Supabase es pública, un empleado con
-- rol 'staff' podía llamar estas funciones directamente (supabase.rpc(...)) y
-- saltarse ese candado → escalación de privilegios DENTRO de la empresa.
-- (No era fuga entre empresas: RLS y el scope por sucursal seguían vigentes.)
--
-- SOLUCIÓN: helper user_is_org_editor() + un check de rol al inicio de cada
-- RPC, justo después del check de sucursal existente. Las funciones se
-- recrean IDÉNTICAS salvo por ese bloque añadido. Roles que pueden escribir:
-- owner, admin, manager (igual que EDITOR_ROLES en el código).
--
-- Idempotente: todo es create or replace. No cambia el comportamiento para
-- owner/admin/manager; solo bloquea a 'staff' a nivel base de datos.
-- ============================================================

-- ------------------------------------------------------------
-- Helper: ¿el usuario actual es editor (owner/admin/manager) en esta org?
-- ------------------------------------------------------------
create or replace function public.user_is_org_editor(p_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from memberships
    where user_id = auth.uid()
      and organization_id = p_org_id
      and role in ('owner', 'admin', 'manager')
  )
$$;

revoke all on function public.user_is_org_editor(uuid) from public, anon;
grant execute on function public.user_is_org_editor(uuid) to authenticated;

-- ============================================================
-- apply_inventory_movement — candado de rol (cubre también los ajustes
-- manuales / mermas directas desde inventario y escáner).
-- ============================================================
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

  -- Nuevo (0015): enforce rol editor
  if not public.user_is_org_editor(v_location_org) then
    raise exception 'Se requiere rol de gerente, administrador o dueño'
      using errcode = '42501';
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

-- ============================================================
-- receive_purchase_order — candado de rol
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

  if not public.user_can_access_location(v_po.location_id) then
    raise exception 'Sin permiso para esta sucursal' using errcode = '42501';
  end if;

  -- Nuevo (0015): enforce rol editor
  if not public.user_is_org_editor(v_po.organization_id) then
    raise exception 'Se requiere rol de gerente, administrador o dueño'
      using errcode = '42501';
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

-- ============================================================
-- cancel_purchase_order — candado de rol
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

  if not public.user_can_access_location(v_po.location_id) then
    raise exception 'Sin permiso para esta sucursal' using errcode = '42501';
  end if;

  -- Nuevo (0015): enforce rol editor
  if not public.user_is_org_editor(v_po.organization_id) then
    raise exception 'Se requiere rol de gerente, administrador o dueño'
      using errcode = '42501';
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

-- ============================================================
-- ship_transfer — candado de rol
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

  if not public.user_can_access_location(v_transfer.from_location_id) then
    raise exception 'Sin permiso para enviar desde esta sucursal' using errcode = '42501';
  end if;

  -- Nuevo (0015): enforce rol editor
  if not public.user_is_org_editor(v_transfer.organization_id) then
    raise exception 'Se requiere rol de gerente, administrador o dueño'
      using errcode = '42501';
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

-- ============================================================
-- receive_transfer — candado de rol
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

  if not public.user_can_access_location(v_transfer.to_location_id) then
    raise exception 'Sin permiso para recibir en esta sucursal' using errcode = '42501';
  end if;

  -- Nuevo (0015): enforce rol editor
  if not public.user_is_org_editor(v_transfer.organization_id) then
    raise exception 'Se requiere rol de gerente, administrador o dueño'
      using errcode = '42501';
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

-- ============================================================
-- cancel_transfer — candado de rol
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

  -- Nuevo (0015): enforce rol editor
  if not public.user_is_org_editor(v_transfer.organization_id) then
    raise exception 'Se requiere rol de gerente, administrador o dueño'
      using errcode = '42501';
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

-- ============================================================
-- apply_sales_report — candado de rol
-- ============================================================
create or replace function public.apply_sales_report(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_report sales_reports%rowtype;
  v_row record;
  v_before numeric;
  v_after numeric;
  v_avg numeric;
  v_audit jsonb := '[]'::jsonb;
  v_total_sold numeric := 0;
  v_deficit_count int := 0;
begin
  if v_user_id is null then
    raise exception 'No hay usuario autenticado' using errcode = '28000';
  end if;

  select * into v_report from sales_reports where id = p_report_id for update;
  if v_report.id is null then
    raise exception 'Reporte no encontrado' using errcode = '22023';
  end if;
  if v_report.status = 'applied' then
    raise exception 'Este reporte ya fue aplicado' using errcode = '22023';
  end if;
  if not public.user_can_access_location(v_report.location_id) then
    raise exception 'Sin permiso para esta sucursal' using errcode = '42501';
  end if;

  -- Nuevo (0015): enforce rol editor
  if not public.user_is_org_editor(v_report.organization_id) then
    raise exception 'Se requiere rol de gerente, administrador o dueño'
      using errcode = '42501';
  end if;

  select coalesce(sum(quantity), 0) into v_total_sold
  from sales_report_items where report_id = p_report_id;
  if v_total_sold <= 0 then
    raise exception 'El reporte no tiene platillos' using errcode = '22023';
  end if;

  -- Consumo teórico agregado por insumo:
  --   sum(cantidad vendida del platillo × cantidad del insumo en la receta)
  for v_row in
    select
      di.product_id,
      p.name as product_name,
      p.base_unit,
      sum(sri.quantity * di.quantity) as consumed
    from sales_report_items sri
    join dish_ingredients di on di.dish_id = sri.dish_id
    join products p on p.id = di.product_id
    where sri.report_id = p_report_id
    group by di.product_id, p.name, p.base_unit
    order by p.name
  loop
    -- Asegura fila de inventario y la bloquea
    insert into inventory (organization_id, location_id, product_id, quantity, average_cost)
    values (v_report.organization_id, v_report.location_id, v_row.product_id, 0, 0)
    on conflict (location_id, product_id) do nothing;

    select quantity, average_cost into v_before, v_avg
    from inventory
    where location_id = v_report.location_id and product_id = v_row.product_id
    for update;

    v_after := v_before - v_row.consumed;

    -- Descuenta PERMITIENDO negativo (señal de faltante). El CPP no cambia
    -- en salidas.
    update inventory
    set quantity = v_after, updated_at = now()
    where location_id = v_report.location_id and product_id = v_row.product_id;

    insert into inventory_movements (
      organization_id, location_id, product_id,
      type, quantity, unit_cost, reference_id, notes, user_id
    ) values (
      v_report.organization_id, v_report.location_id, v_row.product_id,
      'sale', -v_row.consumed, nullif(v_avg, 0), p_report_id,
      'Ventas: ' || v_report.label, v_user_id
    );

    if v_after < 0 then
      v_deficit_count := v_deficit_count + 1;
    end if;

    v_audit := v_audit || jsonb_build_object(
      'product_id', v_row.product_id,
      'name', v_row.product_name,
      'unit', v_row.base_unit,
      'before', v_before,
      'consumed', v_row.consumed,
      'after', v_after,
      'deficit', (v_after < 0)
    );
  end loop;

  update sales_reports
  set status = 'applied',
      audit = v_audit,
      total_dishes_sold = v_total_sold,
      user_id = v_user_id,
      applied_at = now()
  where id = p_report_id;

  return jsonb_build_object(
    'items', v_audit,
    'deficit_count', v_deficit_count,
    'total_dishes_sold', v_total_sold
  );
end;
$$;

-- ------------------------------------------------------------
-- Grants (mantiene el endurecimiento de 0013: solo authenticated).
-- create or replace conserva los privilegios, se re-aplican por claridad.
-- ------------------------------------------------------------
revoke all on function public.apply_inventory_movement(uuid, uuid, movement_type, numeric, numeric, text, uuid) from public, anon;
grant execute on function public.apply_inventory_movement(uuid, uuid, movement_type, numeric, numeric, text, uuid) to authenticated;
revoke all on function public.receive_purchase_order(uuid) from public, anon;
grant execute on function public.receive_purchase_order(uuid) to authenticated;
revoke all on function public.cancel_purchase_order(uuid) from public, anon;
grant execute on function public.cancel_purchase_order(uuid) to authenticated;
revoke all on function public.ship_transfer(uuid) from public, anon;
grant execute on function public.ship_transfer(uuid) to authenticated;
revoke all on function public.receive_transfer(uuid) from public, anon;
grant execute on function public.receive_transfer(uuid) to authenticated;
revoke all on function public.cancel_transfer(uuid) from public, anon;
grant execute on function public.cancel_transfer(uuid) to authenticated;
revoke all on function public.apply_sales_report(uuid) from public, anon;
grant execute on function public.apply_sales_report(uuid) to authenticated;
