# Admin Access & Permissions release checklist

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run audit:admin`
- [ ] Isolated Supabase authenticated smoke includes `tests/admin-access-capabilities.spec.ts`
- [ ] Full regression layers required by change scope pass on the exact PR head
- [ ] Release gate passes on the exact PR head
- [ ] Deployment gate passes on the exact PR head
- [ ] Confirm no account is left with an invalid capability configuration
- [ ] Confirm at least one trusted Admin retains `admin.access.manage`
- [ ] Confirm no production identity metadata is manually edited as part of deployment

Merge approval does not itself perform a production deployment or mutate production Admin accounts.
