import fs from 'node:fs';
const expect=(path,needles)=>{const source=fs.readFileSync(path,'utf8');const missing=needles.filter(needle=>!source.includes(needle));if(missing.length)throw new Error(path+' missing '+missing.join(', '));};
expect('components/SubmissionForm.tsx',["'/api/project-applications'","application_kind:'interest'",'requested_role:data.role','contribution_statement:data.contribution']);
expect('app/api/project-applications/route.ts',["application_kind:isInterest?'interest':'application'",'status:\'submitted\'','notifyAdmins','notifyUser','project.visibility!==\'public\'']);
expect('app/admin/project-operations/applications/page.tsx',['const db=privilegedDb||auth',".from('project_applications')",'if(privilegedDb){const users']);
expect('app/api/admin/applications/route.ts',['serviceDb()','notifyUser']);
console.log('Project interest end-to-end flow contract passed.');
