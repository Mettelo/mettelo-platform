import {readFile} from 'node:fs/promises';

const canonical=await readFile('lib/member-readiness.ts','utf8');
const domainTest=await readFile('tests/member-readiness-domain.spec.ts','utf8');
const consumers={
  home:await readFile('app/member/page.tsx','utf8'),
  discover:await readFile('app/member/discover/page.tsx','utf8'),
  detail:await readFile('app/member/discover/[id]/page.tsx','utf8'),
  apply:await readFile('app/member/discover/[id]/apply/page.tsx','utf8'),
  recommended:await readFile('app/member/recommended/page.tsx','utf8'),
  profile:await readFile('components/MemberProfileSection.tsx','utf8'),
  profileApi:await readFile('app/api/profile/route.ts','utf8'),
  people:await readFile('app/people/page.tsx','utf8'),
  publicProfile:await readFile('app/people/[id]/page.tsx','utf8')
};

const failures=[];
function requireText(source,text,label){if(!source.includes(text))failures.push(`${label}: missing ${JSON.stringify(text)}`)}
function forbidText(source,text,label){if(source.includes(text))failures.push(`${label}: forbidden legacy pattern ${JSON.stringify(text)}`)}

for(const name of ['profileCompletion','matchingReadiness','applicationReadiness','publicProfileReadiness','proofStatus'])requireText(canonical,name,'canonical readiness domain');
requireText(canonical,"requirement('skills'",'canonical readiness domain');
requireText(canonical,'verifiedProofCount>0','canonical readiness domain');
forbidText(canonical,"key:'proof'",'application/public readiness requirements');

requireText(domainTest,'application readiness never requires Verified Proof','domain regression');
requireText(domainTest,'Verified Proof cannot compensate for missing application basics','domain regression');
requireText(domainTest,'public-profile readiness is separate from application readiness','domain regression');

for(const [name,source] of Object.entries(consumers))requireText(source,'calculateMemberReadiness',name);
for(const [name,source] of Object.entries(consumers)){
  forbidText(source,'PROFILE_APPLICATION_READY',name);
  forbidText(source,'PROFILE_INTEREST_READY',name);
  forbidText(source,".gte('profile_readiness'",name);
  forbidText(source,'readiness>=85',name);
}
forbidText(consumers.home,'const profileChecks=[','member Home');
requireText(consumers.home,'memberReadiness.profileCompletion.percentage','member Home');
requireText(consumers.discover,'memberReadiness.applicationReadiness.ready','Discover');
requireText(consumers.detail,'memberReadiness.applicationReadiness.ready','Project Detail');
requireText(consumers.apply,'memberReadiness.applicationReadiness.ready','Apply');
requireText(consumers.recommended,'memberReadiness.matchingReadiness.ready','Recommended');
requireText(consumers.recommended,'memberReadiness.applicationReadiness.ready','Recommended');
requireText(consumers.profile,'readiness.publicProfileReadiness.ready','Profile');
requireText(consumers.profileApi,'member_readiness:memberReadiness','profile API');
requireText(consumers.people,'publicProfileReadiness.ready','People');
requireText(consumers.publicProfile,'publicProfileReadiness.ready','public profile');

if(failures.length){console.error('Member readiness architecture audit failed:\n- '+failures.join('\n- '));process.exit(1)}
console.log('Member readiness architecture audit passed.');
