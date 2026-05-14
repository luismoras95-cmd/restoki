-- ============================================================
-- Restoki — 0012_billing_cycle_and_subscription_init.sql
-- Fase Comercialización (push 2):
--   - subscriptions.billing_cycle: 'monthly' | 'annual'
--   - subscriptions.plan: ahora restringido a 'solo' | 'cadena' | 'enterprise'
--     (text, no enum, para flexibilidad si agregamos planes después)
--   - Trigger: al crear una organización se crea su subscription row en
--     estado 'trialing' con trial_ends_at = now() + 14 days.
--   - Backfill: orgs existentes sin subscription reciben trial activo.
-- ============================================================

-- 1. Columna billing_cycle
alter table subscriptions
  add column if not exists billing_cycle text
    check (billing_cycle in ('monthly', 'annual'));

-- 2. Trigger para crear subscription automáticamente al crear org
create or replace function public.create_default_subscription()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into subscriptions (
    organization_id,
    status,
    plan,
    trial_ends_at
  )
  values (
    new.id,
    'trialing',
    null, -- el plan se asigna cuando el user elige uno
    now() + interval '14 days'
  )
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_subscription_on_org_insert on organizations;
create trigger create_subscription_on_org_insert
  after insert on organizations
  for each row execute function public.create_default_subscription();

-- 3. Backfill: orgs existentes sin subscription
insert into subscriptions (organization_id, status, trial_ends_at, plan)
select o.id, 'trialing', now() + interval '14 days', null
from organizations o
where not exists (
  select 1 from subscriptions s where s.organization_id = o.id
)
on conflict (organization_id) do nothing;

-- 4. Política RLS para leer subscription (lectura por miembros de la org)
-- La existente "tenant isolation read" ya cubre esto, pero la confirmamos.
-- (No-op si ya existe la política)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'subscriptions' and policyname = 'tenant isolation read'
  ) then
    create policy "tenant isolation read" on subscriptions
      for select to authenticated
      using (organization_id in (select user_organizations()));
  end if;
end$$;
