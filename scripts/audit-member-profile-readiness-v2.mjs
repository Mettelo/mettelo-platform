import fs from 'node:fs';

const source=fs.readFileSync('components/MemberProfileSection.tsx','utf8');
const checks=[
  ['Professional identity leads the profile experience',source.indexOf('PROFESSIONAL IDENTITY')>=0&&source.indexOf('PROFESSIONAL IDENTITY')<source.indexOf('YOUR METTELO READINESS')],
  ['Canonical readiness is presented as separate states',['matchingReadiness','applicationReadiness','publicProfileReadiness','VERIFIED PROOF'].every(token=>source.includes(token))],
  ['Best next action is explicit',source.includes('BEST NEXT ACTION')&&source.includes('Complete this now')],
  ['Available actions are explicit',source.includes('AVAILABLE NOW')&&source.includes('/member/discover')],
  ['Missing requirements remain actionable',source.includes('WHAT REMAINS')&&source.includes('Fix in profile')&&source.includes('onClick={openEditor}')],
  ['Profile editing remains available',source.includes('Edit profile →')&&source.includes('<ProfileEditor')&&source.includes('Cancel edit')],
  ['Proof is explicitly independent from application readiness',source.includes('It never blocks your default application readiness.')],
  ['Public profile remains an explicit member choice',source.includes('you remain private until you choose to publish it')],
  ['Responsive phone contract exists',source.includes('@media(max-width:430px)')],
  ['No retired readiness score UI remains',!source.includes('PUBLIC AFTER 85%')&&!source.includes('readiness.score')]
];
let failed=false;
for(const [label,passed] of checks){console.log(`${passed?'PASS':'FAIL'} ${label}`);if(!passed)failed=true;}
if(failed)process.exit(1);
console.log(`Member Profile readiness Phase 2 audit passed (${checks.length}/${checks.length}).`);
