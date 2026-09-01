-- A rolled-back workbook fingerprint may be re-reviewed as a new batch.
-- Active duplicate protection remains on source_sha256 in the preceding migration.
alter table public.capability_path_import_batches
  drop constraint if exists capability_path_import_batches_batch_key_key;
create index if not exists capability_path_import_batches_batch_key_idx
  on public.capability_path_import_batches(batch_key,created_at desc);
