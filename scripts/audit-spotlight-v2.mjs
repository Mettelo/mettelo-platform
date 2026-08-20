import fs from 'node:fs';

const files={
  migration:fs.readFileSync('supabase/migrations/20260819210000_spotlight_automatic_recognition.sql','utf8'),
  monthly:fs.readFileSync('lib/monthly-spotlight.ts','utf8'),
  workflow:fs.readFileSync('lib/spotlight-workflow.ts','utf8'),
  consent:fs.readFileSync('app/api/spotlight-consent/route.ts','utf8'),
  admin:fs.readFileSync('app/api/admin/spotlights/route.ts','utf8'),
  projection:fs.readFileSync('lib/public-spotlight.ts','utf8'),
  memberPage:fs.readFileSync('app/member/spotlight/page.tsx','utf8'),
  memberPanel:fs.readFileSync('components/SpotlightConsentPanel.tsx','utf8'),
  publicPage:fs.readFileSync('app/spotlight/page.tsx','utf8'),
  publicDetail:fs.readFileSync('app/spotlight/[id]/page.tsx','utf8')
};

const checks=[
  ['migration records contribution provenance',files.migration.includes('create table if not exists public.spotlight_evidence')&&files.migration.includes('contribution_id uuid not null references public.contributions')],
  ['migration separates publication holds from recognition',files.migration.includes('publication_held boolean not null default false')&&files.migration.includes("status='published'")&&files.migration.includes("consent_status='granted'")],
  ['migration snapshots only consented public identity fields',files.migration.includes('public_display_name text')&&files.migration.includes('public_headline text')],
  ['public RLS blocks held and excluded recognition',files.migration.includes('coalesce(publication_held,false)=false')&&files.migration.includes('coalesce(is_excluded,false)=false')],
  ['monthly selection requires verified evidence',files.monthly.includes(".eq('verification_status','verified')")&&files.monthly.includes('candidate.metric.verified>0')],
  ['monthly selection does not require a public profile',!files.monthly.includes(".eq('is_public',true)")],
  ['monthly flow requests consent automatically',files.monthly.includes('requestSpotlightConsent(db,item.id)')],
  ['declined and withdrawn recognition are not reassigned',files.monthly.includes('Declined or withdrawn recognition remains the award')&&files.monthly.includes('const retained=(existing||[]).filter(item=>!item.is_excluded)')],
  ['Admin exclusion is the replacement trigger',files.admin.includes('replaceExcludedSpotlight')&&files.admin.includes("action==='exclude'")],
  ['Admin has exception actions',files.admin.includes("'hold'")&&files.admin.includes("'suppress_project'")&&files.admin.includes("'suppress_evidence'")],
  ['Admin no longer exposes routine consent or publish actions',!files.admin.includes("'request_consent'")&&!files.admin.includes("action==='publish'")],
  ['member grant automatically publishes',files.consent.includes('publishSpotlightIfReady(db,id,user.id)')],
  ['member withdrawal removes public representation',files.consent.includes("status:'archived'")&&files.consent.includes('public_display_name:null')],
  ['workflow uses stable notification dedupe',files.workflow.includes('dedupeKey:`spotlight:${item.id}:consent-request`')&&files.workflow.includes('dedupeKey:`spotlight:${item.id}:published`')],
  ['public projection requires safe Spotlight state',files.projection.includes(".eq('status','published')")&&files.projection.includes(".eq('consent_status','granted')")&&files.projection.includes(".eq('publication_held',false)")],
  ['public project remains independently public',files.projection.includes(".eq('visibility','public')")&&files.projection.includes("publicDb.from('projects')")],
  ['public Proof remains independently verified and public',files.projection.includes(".eq('verification_status','verified')")&&files.projection.includes(".eq('visibility','public')")&&files.projection.includes("publicDb.from('contributions')")],
  ['public projection never selects score or rank',!files.projection.includes('score_breakdown')&&!files.projection.includes('rank_position')],
  ['My Spotlight is recognition-first',files.memberPage.includes('Your evidence-backed recognition')&&files.memberPanel.includes('WHY THIS RECOGNITION')],
  ['member share controls require a genuinely public award',files.memberPanel.includes("item.status==='published'")&&files.memberPanel.includes("item.consentStatus==='granted'")&&files.memberPanel.includes('!item.publicationHeld')&&files.memberPanel.includes('<SocialShare')],
  ['member share uses the canonical public award route',files.memberPage.includes('`/spotlight/${item.id}`')||files.memberPanel.includes('/spotlight/${item.id}')],
  ['public list supports social sharing',files.publicPage.includes('<SocialShare')&&files.publicPage.includes('/spotlight/${item.id}')],
  ['public detail supports social sharing and withdrawal semantics',files.publicDetail.includes('<SocialShare')&&files.publicDetail.includes('If publication consent is withdrawn, this URL stops exposing the recognition.')],
  ['public pages do not render internal score or rank',!files.publicPage.includes('score_breakdown')&&!files.publicPage.includes('rank_position')&&!files.publicDetail.includes('score_breakdown')&&!files.publicDetail.includes('rank_position')]
];

let failed=false;
for(const [label,pass] of checks){if(!pass){console.error(`FAIL Spotlight v2: ${label}`);failed=true;}}
if(failed)process.exit(1);
console.log(`Spotlight v2 audit passed (${checks.length} truth, privacy, governance and sharing checks).`);
