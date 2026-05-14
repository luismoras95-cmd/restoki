-- ============================================================
-- Restoki — 0007_team_invitations_and_location_scope.sql
-- Fase 7 chunk 3.1:
--   - memberships.location_id: scope opcional a una sucursal.
--     NULL  = acceso a toda la org (owner/admin/manager por defecto).
--     UUID  = acceso scoped solo a esa sucursal (típico para staff).
--   - tabla invitations: emails invitados por org, con role + location
--     opcional. Token aleatorio para validar al aceptar.
--   - helper user_can_access_location(loc): retorna true si el usuario
--     actual tiene acceso a esa location (porque su membership es de
--     toda la org, o porque su membership está scoped a esa location).
--   - helper accept_invitation(token): convierte invitación pendiente
--     en membership real para el usuario autenticado.
-- ============================================================

-- 1. Memberships: agregar location_id (nullable)
alter table memberships
  add column if not exists location_id uuid references locations on delete set null;

-- Constraint: location_id de la membership debe pertenecer a la misma org.
-- Lo enforce con un trigger en lugar de FK compuesta para no complicar.
create or replace function public.check_membership_location_org()
returns trigger
language plpgsql
as $$
begin
  if new.location_id is not null then
    if not exists (
      select 1 from locations
      where id = new.location_id
        and organization_id = new.organization_id
    ) then
      raise exception 'location_id % does not belong to organization_id %',
        new.location_id, new.organization_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists check_membership_location_org_trg on memberships;
create trigger check_membership_location_org_trg
  before insert or update on memberships
  for each row execute function public.check_membership_location_org();

-- 2. Helper: usuario tiene acceso a una location
--    True si:
--      - el usuario es miembro de la org dueña de la location
--      - Y (su membership es global O su membership es de esa location)
create or replace function public.user_can_access_location(p_location_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from memberships m
    join locations l on l.id = p_location_id
    where m.user_id = auth.uid()
      and m.organization_id = l.organization_id
      and (m.location_id is null or m.location_id = p_location_id)
  )
$$;

revoke all on function public.user_can_access_location(uuid) from public;
grant execute on function public.user_can_access_location(uuid) to authenticated;

-- 3. Invitations
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations on delete cascade,
  email text not null,
  role member_role not null default 'staff',
  location_id uuid references locations on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid not null references auth.users,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz default now()
);

-- Solo una invitación pendiente por (org, email).
-- Una vez aceptada o expirada, se puede crear otra.
create unique index if not exists invitations_org_email_pending
  on invitations(organization_id, lower(email))
  where accepted_at is null;

create index if not exists invitations_token on invitations(token)
  where accepted_at is null;

alter table invitations enable row level security;

-- RLS: owner/admin de la org ven/escriben invitaciones de su org.
-- Cualquier authenticated user puede leer su invitación vía token (server action).
create policy "owners/admins manage invitations" on invitations
  for all to authenticated
  using (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  )
  with check (
    organization_id in (
      select organization_id from memberships
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- 4. RPC accept_invitation: el invitado autenticado convierte la invitación
--    en una membership real. Idempotente — si ya es miembro, no falla.
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invitation invitations;
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_org_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select email into v_user_email from auth.users where id = v_user_id;
  if v_user_email is null then
    raise exception 'User not found';
  end if;

  select * into v_invitation
  from invitations
  where token = p_token
  limit 1;

  if v_invitation.id is null then
    raise exception 'Invitation not found';
  end if;

  if v_invitation.accepted_at is not null then
    raise exception 'Invitation already accepted';
  end if;

  if v_invitation.expires_at < now() then
    raise exception 'Invitation expired';
  end if;

  if lower(v_invitation.email) <> lower(v_user_email) then
    raise exception 'Invitation email does not match logged in user';
  end if;

  v_org_id := v_invitation.organization_id;

  -- Idempotente: si ya hay membership, actualiza role/location.
  -- Si no, crea.
  insert into memberships (user_id, organization_id, role, location_id)
  values (v_user_id, v_org_id, v_invitation.role, v_invitation.location_id)
  on conflict (user_id, organization_id)
  do update set
    role = excluded.role,
    location_id = excluded.location_id;

  update invitations
    set accepted_at = now()
    where id = v_invitation.id;

  return v_org_id;
end;
$$;

revoke all on function public.accept_invitation(text) from public;
grant execute on function public.accept_invitation(text) to authenticated;

-- 5. RPC peek_invitation: lee metadata de una invitación por token
--    (sin aceptarla). Útil para que el frontend muestre "Te invitaron a {org}"
--    antes de que el usuario se loguee.
create or replace function public.peek_invitation(p_token text)
returns table (
  email text,
  role member_role,
  organization_id uuid,
  organization_name text,
  location_name text,
  expires_at timestamptz,
  accepted_at timestamptz
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    i.email,
    i.role,
    i.organization_id,
    o.name as organization_name,
    l.name as location_name,
    i.expires_at,
    i.accepted_at
  from invitations i
  join organizations o on o.id = i.organization_id
  left join locations l on l.id = i.location_id
  where i.token = p_token
  limit 1
$$;

revoke all on function public.peek_invitation(text) from public;
grant execute on function public.peek_invitation(text) to anon, authenticated;

-- 6. RPC list_org_members: lista miembros con emails (requiere security
--    definer porque auth.users no es accesible vía RLS).
create or replace function public.list_org_members(p_org_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  email text,
  role member_role,
  location_id uuid,
  location_name text,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    m.id as membership_id,
    m.user_id,
    u.email::text,
    m.role,
    m.location_id,
    l.name as location_name,
    m.created_at
  from memberships m
  join auth.users u on u.id = m.user_id
  left join locations l on l.id = m.location_id
  where m.organization_id = p_org_id
    and p_org_id in (
      select organization_id from memberships where user_id = auth.uid()
    )
  order by
    case m.role
      when 'owner' then 0
      when 'admin' then 1
      when 'manager' then 2
      when 'staff' then 3
    end,
    u.email
$$;

revoke all on function public.list_org_members(uuid) from public;
grant execute on function public.list_org_members(uuid) to authenticated;
