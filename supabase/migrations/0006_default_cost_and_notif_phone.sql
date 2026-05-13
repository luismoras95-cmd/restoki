-- ============================================================
-- Restoki — 0006_default_cost_and_notif_phone.sql
-- Fase 7 chunk 1+2:
--   - products.default_cost: costo estimado/lista del producto.
--     Se usa para pre-llenar el costo en líneas de orden de compra,
--     pero el CPP real sigue calculándose con los costos REALES de
--     cada recepción.
--   - organizations.notification_phone: número de WhatsApp destino
--     para compartir reportes y (eventualmente) recibir notificaciones
--     automáticas. Formato libre (e.g. +52 662 123 4567).
-- ============================================================

alter table products
  add column if not exists default_cost numeric;

alter table organizations
  add column if not exists notification_phone text;
