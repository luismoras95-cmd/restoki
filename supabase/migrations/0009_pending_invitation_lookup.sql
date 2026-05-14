-- ============================================================
-- Restoki — 0009_pending_invitation_lookup.sql
-- Fix flujo de invitación: si el usuario invitado se loguea sin pasar
-- por el magic link de invitación (porque pidió uno nuevo en /login,
-- o porque su cliente de email se comió el query param), necesitamos
-- detectar que tiene una invitación pendiente y auto-redirigirlo a
-- aceptarla en lugar de mandarlo a /onboarding a crear otra org.
--
-- Este RPC busca, vía security definer, la invitación pendiente más
-- reciente cuyo email coincida con el del usuario autenticado.
-- ============================================================

create or replace function public.get_my_pending_invitation()
returns table (
  id uuid,
  token text,
  organization_id uuid,
  organization_name text,
  role member_role,
  location_id uuid,
  location_name text,
  expires_at timestamptz
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    i.id,
    i.token,
    i.organization_id,
    o.name as organization_name,
    i.role,
    i.location_id,
    l.name as location_name,
    i.expires_at
  from invitations i
  join organizations o on o.id = i.organization_id
  left join locations l on l.id = i.location_id
  join auth.users u on u.id = auth.uid()
  where lower(i.email) = lower(u.email)
    and i.accepted_at is null
    and i.expires_at > now()
  order by i.created_at desc
  limit 1
$$;

revoke all on function public.get_my_pending_invitation() from public;
grant execute on function public.get_my_pending_invitation() to authenticated;
