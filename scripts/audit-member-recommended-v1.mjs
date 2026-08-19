import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const page=read('app/member/recommended/page.tsx');
const rules=read('lib/member-recommendations.ts');
const shell=read('components/MemberAppShell.tsx');
const nav=read('lib/member-navigation.ts');
const css=read('app/member/recommended/recommended.module.css');
const domainTest=read('tests/member-recommended-domain.spec.ts');
const visualTest=read('tests/member-recommended-v1-visual.spec.ts');
const migration=read('supabase/migrations/20260819203000_restore_spotlight_consent_baseline.sql');
const failures=[];

function requireNeedle(source,needle,label){if(!source.includes(needle))failures.push(`${label}: missing ${needle}`)}
function forbidNeedle(source,needle,label){if(source.includes(needle))failures.push(`${label}: forbidden ${needle}`)}

for(const needle of [
  'PERSONALISED · RELEVANCE',
  'Recommended for you',
  'Projects, events and member opportunities that may be useful to you right now',
  "Your recommendations use what you&apos;ve shared with Mettelo",
  'Why this is recommended',
  'Most relevant right now',
  'Projects for you',
  'Browse Discover',
  '/member/discover',
  '/member/applications',
  '/member/projects',
  '/events/${event.slug}',
  '/spotlight/${item.id}',
  "from('saved_projects')",
  "from('events')",
  "from('spotlights')",
  ".eq('consent_status','granted')",
  'projectRecommendationReason',
  'textRecommendationReason',
  'sortRecommendations'
])requireNeedle(page,needle,'Recommended page');

for(const needle of [
  "RecommendationKind='project'|'event'|'spotlight'",
  'projectRecommendationEligible',
  'eventRecommendationEligible',
  'spotlightRecommendationEligible',
  'isRecruitmentOpportunity',
  'recommendationRank',
  'sortRecommendations',
  "return !['closed','cancelled'].includes(state)",
  "source.startsWith('discovery_')",
  "source.includes('ats')"
])requireNeedle(rules,needle,'Recommendation rules');

for(const needle of [
  "const moreActive=mobileMoreNav.some(item=>isActive(item.href))",
  "aria-current={moreActive?'page':undefined}",
  "aria-current={isActive(item.href)?'page':undefined}"
])requireNeedle(shell,needle,'Member shell');

requireNeedle(nav,"{label:'Recommended',href:'/member/recommended',description:'Relevant to you'}",'Member navigation');

for(const needle of ['@media(max-width:1024px)','@media(max-width:480px)','@media(prefers-reduced-motion:reduce)','outline:3px solid #173f8f','min-height:44px'])requireNeedle(css,needle,'Recommended responsive CSS');

for(const needle of ['375,390,414,768,1024,1440','200%','noOverflow','Save is independent','/member/discover/','/events/','/spotlight/']){
  if(!visualTest.includes(needle)&&!domainTest.includes(needle))failures.push(`Recommended tests: missing ${needle}`);
}
for(const needle of ['mislabeled','isRecruitmentOpportunity','projectRecommendationEligible','eventRecommendationEligible','spotlightRecommendationEligible'])requireNeedle(domainTest,needle,'Recommended domain tests');

for(const needle of [
  "add column if not exists consent_status text not null default 'not_requested'",
  "consent_status='granted'",
  "coalesce(is_excluded,false)=false"
])requireNeedle(migration,needle,'Spotlight consent baseline');

for(const forbidden of [
  "from('career_",
  "from(\"career_",
  "from('career_applications')",
  "from('career_roles')",
  "from('career_vacancies')",
  "from('opportunities')",
  'match points',
  '% match',
  'Likely to be selected',
  'selection likelihood',
  '/projects#apply'
])forbidNeedle(page,forbidden,'Recommended page');

if(failures.length){
  console.error('My Mettelo Recommended audit failed:');
  failures.forEach(item=>console.error(`- ${item}`));
  process.exit(1);
}
console.log('My Mettelo Recommended audit passed: personalized, explainable, lifecycle-aware, Careers-separated and responsive.');
