-- ============================================================
-- 0013_harden_function_grants.sql
-- Endurecimiento de seguridad (jun 2026) — cierra los warnings del
-- Security Advisor de Supabase sin romper la app.
--
-- Qué hace, para CADA función SECURITY DEFINER del esquema public:
--   1. Le fija un search_path estable (public, pg_temp) si no lo tiene.
--      → cierra el warning "Function Search Path Mutable".
--   2. Le QUITA el permiso de ejecución a usuarios anónimos (rol `anon`)
--      y al pseudo-rol `public`.
--   3. Le CONCEDE el permiso solo a `authenticated` (usuarios con sesión),
--      salvo las funciones de trigger (que se disparan solas y no se
--      llaman directo).
--
-- Excepciones controladas:
--   • peek_invitation  → se mantiene ejecutable por `anon` porque la vista
--     previa de una invitación ocurre ANTES de iniciar sesión
--     (src/app/auth/accept-invite/page.tsx).
--   • create_default_subscription, check_membership_location_org,
--     touch_dish_updated_at → son funciones de TRIGGER: se les quita a
--     anon/public y NO se conceden a nadie (el trigger las ejecuta solo).
--
-- Es IDEMPOTENTE: se puede correr varias veces sin efectos secundarios.
-- Solo toca funciones del esquema `public` (no las internas de Supabase).
-- ============================================================

do $$
declare
  r record;
  has_path boolean;
begin
  for r in
    select p.oid::regprocedure as sig,
           p.proname           as name,
           p.proconfig         as cfg
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true          -- solo SECURITY DEFINER
  loop
    -- 1) search_path estable si no lo tiene
    has_path := exists (
      select 1
      from unnest(coalesce(r.cfg, '{}'::text[])) c
      where c like 'search_path=%'
    );
    if not has_path then
      execute format('alter function %s set search_path = public, pg_temp', r.sig);
    end if;

    -- 2) cerrar la puerta a anónimos y al pseudo-rol public
    execute format('revoke execute on function %s from anon, public', r.sig);

    -- 3) conceder a usuarios autenticados (salvo funciones de trigger)
    if r.name not in (
      'create_default_subscription',
      'check_membership_location_org',
      'touch_dish_updated_at'
    ) then
      execute format('grant execute on function %s to authenticated', r.sig);
    end if;

    -- 4) excepción: peek_invitation también para anon (preview pre-login)
    if r.name = 'peek_invitation' then
      execute format('grant execute on function %s to anon', r.sig);
    end if;
  end loop;
end$$;

-- ------------------------------------------------------------
-- Fix extra: estas 2 funciones de trigger NO son SECURITY DEFINER,
-- así que el bucle de arriba (que filtra prosecdef = true) no las tocó.
-- Les fijamos el search_path explícitamente para cerrar el warning
-- "Function Search Path Mutable".
-- ------------------------------------------------------------
alter function public.check_membership_location_org() set search_path = public, pg_temp;
alter function public.touch_dish_updated_at() set search_path = public, pg_temp;
