-- Restore the grant layer expected by the existing contributions RLS policies.
--
-- The historical product-core migration created row policies for:
--   * public reads of verified + public Proof;
--   * authenticated owners reading their own contributions;
--   * authenticated members submitting and resubmitting their own evidence;
--   * Admin review/management.
--
-- Hosted Supabase has historically carried table grants that were not fully
-- represented in repository migration history. A clean reconstructed stack
-- therefore returned 42501 before RLS could evaluate the intended predicates.
-- These grants expose only the operations already governed by those policies;
-- they do not weaken ownership, verification, or Admin boundaries.

grant usage on schema public to anon, authenticated;

grant select on table public.contributions to anon, authenticated;
grant insert, update on table public.contributions to authenticated;
