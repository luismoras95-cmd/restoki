-- ============================================================
-- Restoki — 0003_inventory_movements.sql
-- Fase 3: función atómica para registrar movimientos de inventario
-- + cálculo de costo promedio ponderado (CPP).
--
-- Convención de signos:
--   purchase, transfer_in       → quantity > 0 (entradas)
--   sale, waste, transfer_out   → quantity < 0 (salidas)
--   adjustment                  → quantity ±  (delta firmado)
-- inventory_movements.quantity guarda el delta firmado.
-- sum(quantity) sobre todos los movements = stock actual.
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
    raise exception 'No hay usuario autenticado'
      using errcode = '28000';
  end if;

  if p_quantity is null or p_quantity = 0 then
    raise exception 'La cantidad no puede ser cero'
      using errcode = '22023';
  end if;

  if p_unit_cost is not null and p_unit_cost < 0 then
    raise exception 'El costo unitario no puede ser negativo'
      using errcode = '22023';
  end if;

  -- Validar location existe
  select organization_id into v_location_org
  from locations where id = p_location_id;
  if v_location_org is null then
    raise exception 'Sucursal no encontrada'
      using errcode = '22023';
  end if;

  -- Validar product existe y misma org
  select organization_id into v_product_org
  from products where id = p_product_id;
  if v_product_org is null then
    raise exception 'Producto no encontrado'
      using errcode = '22023';
  end if;

  if v_product_org <> v_location_org then
    raise exception 'Producto y sucursal pertenecen a organizaciones distintas'
      using errcode = '22023';
  end if;

  -- Validar membership del usuario
  if not exists (
    select 1 from memberships
    where user_id = v_user_id and organization_id = v_location_org
  ) then
    raise exception 'Sin permiso para esta organización'
      using errcode = '42501';
  end if;

  v_org_id := v_location_org;

  -- Validar coherencia signo ↔ tipo
  case p_type
    when 'purchase', 'transfer_in' then
      if p_quantity <= 0 then
        raise exception '% requiere cantidad positiva', p_type
          using errcode = '22023';
      end if;
    when 'sale', 'waste', 'transfer_out' then
      if p_quantity >= 0 then
        raise exception '% requiere cantidad negativa', p_type
          using errcode = '22023';
      end if;
    when 'adjustment' then
      -- acepta ambos signos
      null;
  end case;

  -- Asegurar que la fila de inventory existe (evita race en primer movimiento)
  insert into inventory (organization_id, location_id, product_id, quantity, average_cost)
  values (v_org_id, p_location_id, p_product_id, 0, 0)
  on conflict (location_id, product_id) do nothing;

  -- Lock pesimista sobre la fila
  select quantity, average_cost
    into v_current_qty, v_current_avg_cost
  from inventory
  where location_id = p_location_id and product_id = p_product_id
  for update;

  v_new_qty := v_current_qty + p_quantity;

  if v_new_qty < 0 then
    raise exception 'Stock insuficiente. Actual: %, intento: %',
      v_current_qty, p_quantity
      using errcode = '23514';
  end if;

  -- Costo promedio ponderado SOLO para entradas con costo conocido (>0)
  if p_quantity > 0 and p_unit_cost is not null and p_unit_cost > 0 and v_new_qty > 0 then
    v_new_avg_cost := (
      (v_current_qty * coalesce(v_current_avg_cost, 0)) +
      (p_quantity * p_unit_cost)
    ) / v_new_qty;
  elsif v_new_qty = 0 then
    -- Stock vuelve a cero: reset del costo promedio
    v_new_avg_cost := 0;
  else
    v_new_avg_cost := v_current_avg_cost;
  end if;

  -- Actualizar inventory
  update inventory
  set quantity = v_new_qty,
      average_cost = v_new_avg_cost,
      updated_at = now()
  where location_id = p_location_id and product_id = p_product_id;

  -- Registrar movement (quantity firmado, unit_cost solo si aplica)
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

revoke all on function public.apply_inventory_movement(
  uuid, uuid, movement_type, numeric, numeric, text, uuid
) from public;
grant execute on function public.apply_inventory_movement(
  uuid, uuid, movement_type, numeric, numeric, text, uuid
) to authenticated;
