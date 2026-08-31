import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Preserve the full established Phase 2 audit while updating only the availability
// contract that Phase 3 deliberately centralised in lib/project-public-availability.ts.
const sourcePath='scripts/audit-phase-2-member-projects.mjs';
const source=fs.readFileSync(sourcePath,'utf8');
const legacy="['app/projects/page.tsx',['roleCount','deadlinePassed','Roles are still being prepared','View project →']],";
const governed="['app/projects/page.tsx',['roleCount','resolveProjectPublicAvailability','View project →']],\n  ['lib/project-public-availability.ts',['deadlinePassed','Roles are still being prepared','capacity_known','occupied_role_count','roles_filled']],";
if(!source.includes(legacy))throw new Error('Phase 2 availability audit contract changed unexpectedly; review before updating this compatibility audit.');
const transformed=source.replace(legacy,governed);
const tempPath=path.resolve(`.tmp-phase2-member-projects-${process.pid}.mjs`);
try{
  fs.writeFileSync(tempPath,transformed,'utf8');
  await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}`);
}finally{
  fs.rmSync(tempPath,{force:true});
}
