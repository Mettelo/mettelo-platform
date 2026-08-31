import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Preserve the full established Phase 2 audit while updating only contracts that
// later approved phases deliberately centralised or renamed. The transformed audit
// must still prove every member capability remains reachable.
const sourcePath='scripts/audit-phase-2-member-projects.mjs';
const source=fs.readFileSync(sourcePath,'utf8');
const legacyAvailability="['app/projects/page.tsx',['roleCount','deadlinePassed','Roles are still being prepared','View project →']],";
const governedAvailability="['app/projects/page.tsx',['roleCount','resolveProjectPublicAvailability','View project →']],\n  ['lib/project-public-availability.ts',['deadlinePassed','Roles are still being prepared','capacity_known','occupied_role_count','roles_filled']],";
if(!source.includes(legacyAvailability))throw new Error('Phase 2 availability audit contract changed unexpectedly; review before updating this compatibility audit.');

const legacyNavigation="['lib/member-navigation.ts',[\"label:'My Work'\",\"label:'Home'\",\"label:'Projects'\",\"label:'Applications'\",\"label:'Proof'\",\"label:'Profile'\",\"label:'Explore'\",\"label:'Discover'\",\"label:'Recommended'\",\"label:'Opportunities'\",\"label:'Saved'\",\"label:'Events'\",\"label:'Reputation'\",\"label:'Spotlight'\",'mobilePersistentNav','mobileMoreNav',\"href:'/member/discover'\"]],";
const governedNavigation="['lib/member-navigation.ts',[\"label:'My Work'\",\"label:'Home'\",\"label:'Projects'\",\"label:'Applications'\",\"label:'Proof'\",\"label:'Profile'\",\"label:'Direction & Discovery'\",\"label:'Capability Paths'\",\"label:'Discover'\",\"label:'Recommended'\",\"label:'Saved'\",\"label:'Opportunities & Community'\",\"label:'Opportunities'\",\"label:'Events'\",\"label:'Spotlight'\",'mobilePersistentNav','mobileMoreNav',\"href:'/member/discover'\",\"href:'/member/paths'\"]],";
if(!source.includes(legacyNavigation))throw new Error('Phase 2 member navigation audit contract changed unexpectedly; review before updating this compatibility audit.');

const transformed=source
  .replace(legacyAvailability,governedAvailability)
  .replace(legacyNavigation,governedNavigation);
const tempPath=path.resolve(`.tmp-phase2-member-projects-${process.pid}.mjs`);
try{
  fs.writeFileSync(tempPath,transformed,'utf8');
  await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}`);
}finally{
  fs.rmSync(tempPath,{force:true});
}
