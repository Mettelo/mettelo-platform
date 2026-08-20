# Admin Website SEO

## Scope

Website → SEO governs the technical search and social metadata for Mettelo's site-wide defaults plus the managed Homepage, About and Contact routes. It extends the existing Next.js metadata, sitemap and robots infrastructure rather than creating a separate SEO system.

## Admin workflow

SEO uses the same governed Draft → Publish model as the Website content controls. `website.content.edit` can read and save drafts. `website.content.publish` is additionally required to publish. Drafts remain service-role-only; public readers see only published SEO configuration.

The Admin workspace provides global defaults and per-page controls for titles, descriptions, canonicals, indexing/follow directives and social previews. Global controls also cover Google/Bing verification metadata and Organization structured-data identity. Search-result and social previews are guidance only: publishing metadata does not guarantee a ranking or a particular search-engine rendering.

## Public behavior and fallbacks

The root layout consumes published global metadata and Organization JSON-LD. Homepage, About and Contact use route-level metadata wrappers so page-specific canonical/indexing settings cannot leak into unrelated routes. The existing page implementations remain separate content modules, preserving their layout, forms and live data behavior.

The sitemap reads published index state for Homepage, About and Contact and omits a managed page when `index` is false. Existing static public routes remain in the sitemap. `robots.ts` continues to disallow `/admin` and `/member` and continues to advertise the canonical sitemap URL.

If SEO persistence is unavailable or a published payload fails validation, code-owned defaults preserve the previous Mettelo metadata rather than returning empty metadata.

## Safety boundaries

Only the fixed scopes `global`, `home`, `about` and `contact` are accepted at both application and database layers. Root-relative Mettelo destinations or secure HTTPS URLs are permitted for canonical/image fields; unsafe or protocol-relative destinations are rejected by the shared safe-href contract. Relative canonicals for managed pages must resolve to the page's own canonical route. Search verification inputs are treated as public metadata tokens and reject unsupported characters; credentials, passwords and API secrets must never be entered there.

News & Insights keeps its existing article-level SEO model and is not duplicated by this phase.

## Release evidence

`npm run audit:admin` includes the deterministic Website SEO audit. Authenticated isolated-Supabase smoke coverage publishes temporary Homepage metadata, proves the real document metadata and sitemap change, verifies the Admin audit event, and restores the original published and draft state. The Admin SEO workspace is checked for responsive containment at 390, 768 and 1440 pixels.

## Rollback

Revert the application changes to return public metadata to code-owned defaults. The additive SEO tables can remain unused; destructive data rollback is not required.
