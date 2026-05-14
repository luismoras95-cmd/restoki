-- ============================================================
-- Restoki — 0011_user_location_ids_array.sql
-- Hotfix: user_locations() está declarada como `returns setof uuid`
-- y Supabase JS la devuelve envuelta como [{user_locations: "uuid"}]
-- en lugar de ["uuid"] cuando se llama vía .rpc(). Eso hace que el
-- Set quede con objetos en lugar de strings y el filtro de location
-- en páginas como /recetas, /escaner, /inventario falle silenciosamente.
--
-- Solución: nueva función user_location_ids() que retorna uuid[] (un
-- array tipado, no un setof) para uso desde TS. Conservamos
-- user_locations() intacta para que las RLS policies en migration 0008
-- sigan funcionando.
-- ============================================================

create or replace function public.user_location_ids()
returns uuid[]
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(l.id), '{}'::uuid[])
  from locations l
  join memberships m on m.organization_id = l.organization_id
  where m.user_id = auth.uid()
    and (m.location_id is null or m.location_id = l.id)
$$;

revoke all on function public.user_location_ids() from public;
grant execute on function public.user_location_ids() to authenticated;
