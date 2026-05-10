-- ============================================================
-- Restoki — Migración inicial (Fase 1)
-- Schema completo: 13 tablas, 5 enums, helper RLS, políticas RLS.
-- Fuente: cocinasaas-spec.md sección 5.
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
create type member_role as enum ('owner', 'admin', 'manager', 'staff');

create type movement_type as enum (
  'purchase', 'sale', 'adjustment',
  'transfer_out', 'transfer_in', 'waste'
);

create type po_status as enum ('draft', 'sent', 'received', 'cancelled');

create type transfer_status as enum ('draft', 'in_transit', 'received', 'cancelled');

create type subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete'
);

-- ============================================================
-- ORGANIZATIONS (tenants)
-- ============================================================
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rfc text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- MEMBERSHIPS (users ↔ organizations + role)
-- ============================================================
create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  organization_id uuid not null references organizations on delete cascade,
  role member_role not null default 'staff',
  created_at timestamptz default now(),
  unique (user_id, organization_id)
);
create index on memberships(user_id);
create index on memberships(organization_id);

-- ============================================================
-- HELPER: orgs del usuario actual (usado por todas las políticas RLS)
-- security definer + search_path acotado para evitar shadowing.
-- ============================================================
create or replace function public.user_organizations()
returns setof uuid
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select organization_id from memberships where user_id = auth.uid()
$$;

-- ============================================================
-- LOCATIONS (sucursales)
-- ============================================================
create table locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations on delete cascade,
  name text not null,
  address text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on locations(organization_id);

-- ============================================================
-- CATEGORIES
-- ============================================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations on delete cascade,
  name text not null,
  created_at timestamptz default now()
);
create index on categories(organization_id);

-- ============================================================
-- SUPPLIERS (proveedores)
-- ============================================================
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on suppliers(organization_id);

-- ============================================================
-- PRODUCTS (catálogo)
-- ============================================================
create table products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations on delete cascade,
  category_id uuid references categories on delete set null,
  sku text,
  name text not null,
  base_unit text not null,
  purchase_unit text,
  units_per_purchase numeric,
  default_supplier_id uuid references suppliers on delete set null,
  min_stock numeric default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on products(organization_id);
create unique index on products(organization_id, sku) where sku is not null;

-- ============================================================
-- INVENTORY (stock actual por sucursal)
-- ============================================================
create table inventory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations on delete cascade,
  location_id uuid not null references locations on delete cascade,
  product_id uuid not null references products on delete cascade,
  quantity numeric not null default 0,
  average_cost numeric default 0,
  updated_at timestamptz default now(),
  unique (location_id, product_id)
);
create index on inventory(organization_id);
create index on inventory(location_id);

-- ============================================================
-- INVENTORY MOVEMENTS (log de todo)
-- ============================================================
create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations on delete cascade,
  location_id uuid not null references locations on delete cascade,
  product_id uuid not null references products on delete cascade,
  type movement_type not null,
  quantity numeric not null,
  unit_cost numeric,
  reference_id uuid,
  notes text,
  user_id uuid references auth.users,
  created_at timestamptz default now()
);
create index on inventory_movements(organization_id);
create index on inventory_movements(location_id, created_at desc);
create index on inventory_movements(product_id, created_at desc);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations on delete cascade,
  location_id uuid not null references locations on delete cascade,
  supplier_id uuid references suppliers on delete set null,
  status po_status default 'draft',
  total numeric default 0,
  notes text,
  received_at timestamptz,
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on purchase_orders(organization_id);

create table purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders on delete cascade,
  product_id uuid not null references products on delete restrict,
  quantity numeric not null,
  unit_cost numeric not null,
  subtotal numeric generated always as (quantity * unit_cost) stored
);
create index on purchase_order_items(purchase_order_id);

-- ============================================================
-- TRANSFERS (entre sucursales)
-- ============================================================
create table transfers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations on delete cascade,
  from_location_id uuid not null references locations,
  to_location_id uuid not null references locations,
  status transfer_status default 'draft',
  notes text,
  shipped_at timestamptz,
  received_at timestamptz,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);
create index on transfers(organization_id);

create table transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references transfers on delete cascade,
  product_id uuid not null references products on delete restrict,
  quantity numeric not null
);
create index on transfer_items(transfer_id);

-- ============================================================
-- SUBSCRIPTIONS (Stripe)
-- ============================================================
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status subscription_status default 'trialing',
  plan text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY — enable en las 13 tablas
-- ============================================================
alter table organizations         enable row level security;
alter table memberships           enable row level security;
alter table locations             enable row level security;
alter table categories            enable row level security;
alter table suppliers             enable row level security;
alter table products              enable row level security;
alter table inventory             enable row level security;
alter table inventory_movements   enable row level security;
alter table purchase_orders       enable row level security;
alter table purchase_order_items  enable row level security;
alter table transfers             enable row level security;
alter table transfer_items        enable row level security;
alter table subscriptions         enable row level security;

-- ============================================================
-- POLICIES
-- Patrón: el usuario solo ve/modifica filas de orgs donde es miembro.
-- inventory, inventory_movements, subscriptions: solo lectura desde
-- cliente. Las escrituras pasan por server actions con service_role
-- (ver nota crítica de seguridad en sección 5 del spec).
-- ============================================================

-- organizations -----------------------------------------------
create policy "select own orgs" on organizations
  for select to authenticated
  using (id in (select user_organizations()));

create policy "insert org during onboarding" on organizations
  for insert to authenticated
  with check (true);

create policy "update own orgs" on organizations
  for update to authenticated
  using (id in (select user_organizations()))
  with check (id in (select user_organizations()));

-- memberships -------------------------------------------------
create policy "select own memberships" on memberships
  for select to authenticated
  using (organization_id in (select user_organizations()));

-- Bootstrap: el usuario crea su propia membership al onboarding.
-- Roles/cambios posteriores se gestionan vía server actions con service_role.
create policy "bootstrap own membership" on memberships
  for insert to authenticated
  with check (user_id = auth.uid());

-- locations ---------------------------------------------------
create policy "tenant isolation" on locations
  for all to authenticated
  using (organization_id in (select user_organizations()))
  with check (organization_id in (select user_organizations()));

-- categories --------------------------------------------------
create policy "tenant isolation" on categories
  for all to authenticated
  using (organization_id in (select user_organizations()))
  with check (organization_id in (select user_organizations()));

-- suppliers ---------------------------------------------------
create policy "tenant isolation" on suppliers
  for all to authenticated
  using (organization_id in (select user_organizations()))
  with check (organization_id in (select user_organizations()));

-- products ----------------------------------------------------
create policy "tenant isolation" on products
  for all to authenticated
  using (organization_id in (select user_organizations()))
  with check (organization_id in (select user_organizations()));

-- inventory (solo lectura cliente) ----------------------------
create policy "tenant isolation read" on inventory
  for select to authenticated
  using (organization_id in (select user_organizations()));

-- inventory_movements (solo lectura cliente) ------------------
create policy "tenant isolation read" on inventory_movements
  for select to authenticated
  using (organization_id in (select user_organizations()));

-- purchase_orders ---------------------------------------------
create policy "tenant isolation" on purchase_orders
  for all to authenticated
  using (organization_id in (select user_organizations()))
  with check (organization_id in (select user_organizations()));

-- purchase_order_items (vía padre) ----------------------------
create policy "tenant isolation via parent" on purchase_order_items
  for all to authenticated
  using (
    purchase_order_id in (
      select id from purchase_orders
      where organization_id in (select user_organizations())
    )
  )
  with check (
    purchase_order_id in (
      select id from purchase_orders
      where organization_id in (select user_organizations())
    )
  );

-- transfers ---------------------------------------------------
create policy "tenant isolation" on transfers
  for all to authenticated
  using (organization_id in (select user_organizations()))
  with check (organization_id in (select user_organizations()));

-- transfer_items (vía padre) ----------------------------------
create policy "tenant isolation via parent" on transfer_items
  for all to authenticated
  using (
    transfer_id in (
      select id from transfers
      where organization_id in (select user_organizations())
    )
  )
  with check (
    transfer_id in (
      select id from transfers
      where organization_id in (select user_organizations())
    )
  );

-- subscriptions (solo lectura cliente; webhook escribe con service_role) --
create policy "tenant isolation read" on subscriptions
  for select to authenticated
  using (organization_id in (select user_organizations()));
