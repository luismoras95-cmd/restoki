-- ============================================================
-- Restoki — 0010_dishes_and_recipes.sql
-- Fase 8: recetas y costeo de platillos.
--
-- Modelo:
--   - dishes: platillos vendidos por el restaurante (independientes de
--     products, aunque los ingredientes SÍ son products).
--   - dish_ingredients: receta = lista de (product_id, quantity) por dish.
--   - dish_cost_at_location(dish_id, location_id): costo en vivo, basado
--     en el average_cost actual del inventario en esa sucursal. Si el
--     producto aún no tiene movimientos en esa sucursal, fallback a
--     products.default_cost.
--   - list_dishes_with_costs(org_id, location_id): lista lista para UI
--     con costo, margen, conteo de ingredientes y categoría.
-- ============================================================

create table if not exists dishes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations on delete cascade,
  name text not null,
  description text,
  category_id uuid references categories on delete set null,
  sale_price numeric check (sale_price is null or sale_price >= 0),
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists dishes_organization_id on dishes(organization_id);
create index if not exists dishes_category_id on dishes(category_id);
create unique index if not exists dishes_org_name_active
  on dishes(organization_id, lower(name))
  where is_active = true;

create table if not exists dish_ingredients (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references dishes on delete cascade,
  product_id uuid not null references products on delete restrict,
  quantity numeric not null check (quantity > 0),
  notes text,
  created_at timestamptz default now(),
  unique (dish_id, product_id)
);
create index if not exists dish_ingredients_dish on dish_ingredients(dish_id);
create index if not exists dish_ingredients_product on dish_ingredients(product_id);

alter table dishes enable row level security;
alter table dish_ingredients enable row level security;

-- RLS: tenant isolation por org (recetas son org-level, no scoped por
-- location — el costo se calcula a demanda dado el location_id).
create policy "tenant isolation" on dishes
  for all to authenticated
  using (organization_id in (select user_organizations()))
  with check (organization_id in (select user_organizations()));

create policy "tenant isolation via parent" on dish_ingredients
  for all to authenticated
  using (
    dish_id in (
      select id from dishes
      where organization_id in (select user_organizations())
    )
  )
  with check (
    dish_id in (
      select id from dishes
      where organization_id in (select user_organizations())
    )
  );

-- Trigger: actualizar dishes.updated_at cuando cambian ingredientes
create or replace function public.touch_dish_updated_at()
returns trigger
language plpgsql
as $$
declare
  v_dish_id uuid := coalesce(new.dish_id, old.dish_id);
begin
  update dishes set updated_at = now() where id = v_dish_id;
  return new;
end;
$$;

drop trigger if exists touch_dish_on_ingredient_change on dish_ingredients;
create trigger touch_dish_on_ingredient_change
  after insert or update or delete on dish_ingredients
  for each row execute function public.touch_dish_updated_at();

-- ============================================================
-- dish_cost_at_location(dish_id, location_id) → numeric
-- Calcula el costo total del plato sumando qty × CPP (o default_cost
-- como fallback) para cada ingrediente, en la sucursal indicada.
-- ============================================================
create or replace function public.dish_cost_at_location(
  p_dish_id uuid,
  p_location_id uuid
)
returns numeric
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce(sum(
    di.quantity * coalesce(inv.average_cost, p.default_cost, 0)
  ), 0)::numeric
  from dish_ingredients di
  join products p on p.id = di.product_id
  left join inventory inv
    on inv.product_id = p.id
    and inv.location_id = p_location_id
  join dishes d on d.id = di.dish_id
  where di.dish_id = p_dish_id
    and d.organization_id in (
      select organization_id from memberships where user_id = auth.uid()
    )
$$;

revoke all on function public.dish_cost_at_location(uuid, uuid) from public;
grant execute on function public.dish_cost_at_location(uuid, uuid) to authenticated;

-- ============================================================
-- list_dishes_with_costs(org_id, location_id) → table
-- Para la vista de lista en /recetas. Incluye costo, margen y conteo
-- de ingredientes para una sucursal específica.
-- ============================================================
create or replace function public.list_dishes_with_costs(
  p_org_id uuid,
  p_location_id uuid
)
returns table (
  id uuid,
  name text,
  description text,
  category_id uuid,
  category_name text,
  sale_price numeric,
  is_active boolean,
  ingredient_count int,
  cost numeric,
  margin_amount numeric,
  margin_pct numeric,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with dish_costs as (
    select
      d.id,
      d.name,
      d.description,
      d.category_id,
      d.sale_price,
      d.is_active,
      d.updated_at,
      coalesce(sum(
        di.quantity * coalesce(inv.average_cost, p.default_cost, 0)
      ), 0)::numeric as cost,
      count(di.id) filter (where di.id is not null)::int as ingredient_count
    from dishes d
    left join dish_ingredients di on di.dish_id = d.id
    left join products p on p.id = di.product_id
    left join inventory inv
      on inv.product_id = p.id
      and inv.location_id = p_location_id
    where d.organization_id = p_org_id
      and p_org_id in (
        select organization_id from memberships where user_id = auth.uid()
      )
    group by d.id
  )
  select
    dc.id,
    dc.name,
    dc.description,
    dc.category_id,
    c.name as category_name,
    dc.sale_price,
    dc.is_active,
    dc.ingredient_count,
    dc.cost,
    case
      when dc.sale_price is not null
      then (dc.sale_price - dc.cost)
      else null
    end as margin_amount,
    case
      when dc.sale_price is not null and dc.sale_price > 0
      then ((dc.sale_price - dc.cost) / dc.sale_price * 100)
      else null
    end as margin_pct,
    dc.updated_at
  from dish_costs dc
  left join categories c on c.id = dc.category_id
  order by dc.name
$$;

revoke all on function public.list_dishes_with_costs(uuid, uuid) from public;
grant execute on function public.list_dishes_with_costs(uuid, uuid) to authenticated;

-- ============================================================
-- list_dish_ingredients_with_costs(dish_id, location_id) → table
-- Para la vista de detalle de un plato. Lista cada ingrediente con
-- su costo unitario actual y el subtotal en esa sucursal.
-- ============================================================
create or replace function public.list_dish_ingredients_with_costs(
  p_dish_id uuid,
  p_location_id uuid
)
returns table (
  ingredient_id uuid,
  product_id uuid,
  product_name text,
  base_unit text,
  quantity numeric,
  unit_cost numeric,
  subtotal numeric,
  cost_source text  -- 'inventory' | 'default' | 'none'
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    di.id as ingredient_id,
    p.id as product_id,
    p.name as product_name,
    p.base_unit,
    di.quantity,
    coalesce(inv.average_cost, p.default_cost, 0)::numeric as unit_cost,
    (di.quantity * coalesce(inv.average_cost, p.default_cost, 0))::numeric as subtotal,
    case
      when inv.average_cost is not null then 'inventory'
      when p.default_cost is not null then 'default'
      else 'none'
    end as cost_source
  from dish_ingredients di
  join products p on p.id = di.product_id
  left join inventory inv
    on inv.product_id = p.id
    and inv.location_id = p_location_id
  join dishes d on d.id = di.dish_id
  where di.dish_id = p_dish_id
    and d.organization_id in (
      select organization_id from memberships where user_id = auth.uid()
    )
  order by p.name
$$;

revoke all on function public.list_dish_ingredients_with_costs(uuid, uuid) from public;
grant execute on function public.list_dish_ingredients_with_costs(uuid, uuid) to authenticated;
