-- ============================================================
-- Restoki — 0002_org_onboarding.sql
-- Fase 2: dirección en organizations + helper atómico de
-- creación de org + cierre del bootstrap de memberships.
-- ============================================================

-- ============================================================
-- 1. organizations.address
-- ============================================================
alter table organizations
  add column if not exists address text;

-- ============================================================
-- 2. Función atómica: crea organization + membership owner
-- en una sola transacción, con permisos de SECURITY DEFINER
-- para sortear RLS de la primera fila.
-- ============================================================
create or replace function public.create_organization_with_owner(
  p_name text,
  p_rfc text default null,
  p_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
begin
  if v_user_id is null then
    raise exception 'No hay usuario autenticado'
      using errcode = '28000';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'El nombre de la organización es obligatorio'
      using errcode = '22023';
  end if;

  insert into organizations (name, rfc, address)
  values (trim(p_name), nullif(trim(p_rfc), ''), nullif(trim(p_address), ''))
  returning id into v_org_id;

  insert into memberships (user_id, organization_id, role)
  values (v_user_id, v_org_id, 'owner');

  return v_org_id;
end;
$$;

revoke all on function public.create_organization_with_owner(text, text, text) from public;
grant execute on function public.create_organization_with_owner(text, text, text) to authenticated;

-- ============================================================
-- 3. Cerrar el bootstrap de memberships.
-- Antes: cualquier authenticated podía insertar SU propia
-- membership en CUALQUIER org existente.
-- Ahora: solo se crean memberships vía la función de arriba
-- (security definer) o vía server actions con service_role.
-- ============================================================
drop policy if exists "bootstrap own membership" on memberships;

-- ============================================================
-- 4. Cerrar el insert público de organizations.
-- Mismo razonamiento: las orgs solo se crean por la función.
-- ============================================================
drop policy if exists "insert org during onboarding" on organizations;
