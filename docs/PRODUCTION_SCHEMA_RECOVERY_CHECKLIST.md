# Production schema recovery verification

Before merge:

- [ ] lint passes
- [ ] TypeScript passes
- [ ] build passes
- [ ] account recovery contract passes
- [ ] public browser regression passes
- [ ] authenticated QA shards pass
- [ ] persistence gate passes
- [ ] Release gate passes

Hosted database checks already completed during incident response:

- production recovery migration applied successfully;
- all existing projects have non-null participation mode and capacity fields after backfill;
- migration is additive and preserves existing project records and member profiles.
