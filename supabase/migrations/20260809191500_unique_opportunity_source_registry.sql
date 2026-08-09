create unique index if not exists opportunity_ingestion_sources_provider_key_uq
on public.opportunity_ingestion_sources(provider, source_key);
