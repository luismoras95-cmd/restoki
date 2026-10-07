-- ============================================================
-- Restoki — 0016_storage_avatars_policies.sql
-- Auditoría de seguridad (oct 2026): versiona el bucket de avatares y sus
-- políticas RLS, que estaban creadas a mano en el dashboard de Supabase pero
-- NO en el código. La protección ya era correcta en producción (verificado:
-- INSERT/UPDATE/DELETE amarrados a la carpeta del propio usuario vía
-- storage.foldername(name)[1] = auth.uid()); esta migración solo la deja
-- reproducible para un rebuild futuro.
--
-- NO es necesario correrla ahora (las políticas ya existen y son correctas).
-- Es idempotente (drop ... if exists + create): si se corre, recrea las mismas
-- políticas sin cambiar el comportamiento.
--
-- Modelo: foto de perfil sube a avatars/<user_id>/archivo. Lectura pública
-- (las URLs públicas se usan en <img>); escritura solo en la carpeta propia.
-- ============================================================

-- Bucket público de avatares (para rebuild desde cero).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Lectura pública (cualquiera con la URL puede ver la foto).
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

-- Subir: solo en la carpeta cuyo primer segmento es el propio user_id.
drop policy if exists "avatars user insert" on storage.objects;
create policy "avatars user insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Actualizar: solo archivos de la carpeta propia.
drop policy if exists "avatars user update" on storage.objects;
create policy "avatars user update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Borrar: solo archivos de la carpeta propia.
drop policy if exists "avatars user delete" on storage.objects;
create policy "avatars user delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
