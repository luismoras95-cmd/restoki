-- ============================================================
-- Restoki — 0005_product_barcode.sql
-- Fase 6: columna barcode en products + índice único parcial por org.
-- ============================================================

alter table products
  add column if not exists barcode text;

-- Un mismo código de barras solo puede estar asociado a un producto
-- por organización. Distintas orgs pueden tener el mismo barcode.
create unique index if not exists products_barcode_unique
  on products (organization_id, barcode)
  where barcode is not null;

-- Índice para lookup rápido por barcode dentro de org
create index if not exists products_barcode_lookup
  on products (organization_id, barcode)
  where barcode is not null and is_active = true;
