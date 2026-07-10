-- ============================================================
-- 0014_sales_reports.sql
-- Reportes de VENTAS por platillo (carga semanal desde el POS vía CSV)
-- + descuento automático de insumos según recetas + AUDITORÍA.
--
-- Flujo:
--   1. La app crea un sales_report (status 'pending') con sus items
--      (platillo × cantidad vendida).
--   2. Llama a apply_sales_report(report_id): agrega el consumo teórico
--      por insumo (cantidad vendida × receta), descuenta del inventario
--      de la sucursal PERMITIENDO stock negativo (el negativo es la señal
--      de "faltante / posible fuga"), registra movimientos tipo 'sale'
--      y guarda la auditoría (jsonb) en el reporte.
--
-- Nota: apply_inventory_movement NO se usa aquí a propósito — esa función
-- bloquea stock negativo (correcto para capturas manuales). Para ventas,
-- el negativo es información: vendiste más de lo que el sistema tenía.
-- ============================================================

-- ------------------------------------------------------------
-- Tablas
-- ------------------------------------------------------------
create table if not exists sales_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations on delete cascade,
  location_id uuid not null references locations on delete cascade,
  label text not null,
  period_start date,
  period_end date,
  status text not null default 'pending' check (status in ('pending', 'applied')),
  total_dishes_sold numeric not null default 0,
  audit jsonb,
  user_id uuid,
  created_at timestamptz default now(),
  applied_at timestamptz
);
create index if not exists sales_reports_org on sales_reports(organization_id);
create index if not exists sales_reports_location on sales_reports(location_id);

create table if not exists sales_report_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references sales_reports on delete cascade,
  dish_id uuid not null references dishes on delete restrict,
  dish_name text not null,
  quantity numeric not null check (quantity > 0),
  created_at timestamptz default now()
);
create index if not exists sales_report_items_report on sales_report_items(report_id);

-- ------------------------------------------------------------
-- RLS (mismo patrón location-scope que purchase_orders)
-- ------------------------------------------------------------
alter table sales_reports enable row level security;
alter table sales_report_items enable row level security;

create policy "location scope" on sales_reports
  for all to authenticated
  using (location_id in (select user_locations()))
  with check (location_id in (select user_locations()));

create policy "tenant isolation via parent" on sales_report_items
  for all to authenticated
  using (
    report_id in (
      select id from sales_reports
      where location_id in (select user_locations())
    )
  )
  with check (
    report_id in (
      select id from sales_reports
      where location_id in (select user_locations())
    )
  );

-- ------------------------------------------------------------
-- apply_sales_report(report_id) → jsonb (auditoría)
-- ------------------------------------------------------------
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

revoke all on function public.apply_sales_report(uuid) from public, anon;
grant execute on function public.apply_sales_report(uuid) to authenticated;
