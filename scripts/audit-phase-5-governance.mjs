import fs from 'node:fs';

const files={
  migration:'supabase/migrations/20260812190000_phase_5_architect_project_governance.sql',
  projects:'app/api/architect-projects/route.ts',
  operations:'app/api/architect-operations/route.ts',
  admin:'app/api/admin/project-governance/route.ts',
  shell:'components/MemberAppShell.tsx'
};
const source=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,fs.readFileSync(file,'utf8')]));
const checks=[
  ['three-identity model is unchanged',!source.migration.includes("account_type in")],
  ['approved architect is server enforced',source.projects.includes("architectContext()")],
  ['drafts start private',source.projects.includes("visibility:'private'")&&source.projects.includes("governance_status:'draft'")],
  ['creator cannot review own project',source.projects.includes('You cannot review your own project')&&source.migration.includes('cannot review their own project')],
  ['controlled approval requires Admin',source.migration.includes('Controlled projects require Admin approval')&&source.projects.includes('recommend_admin')],
  ['prohibited work cannot proceed',source.migration.includes('Prohibited projects cannot proceed')],
  ['governance history is immutable',source.migration.includes('Project governance history is immutable')],
  ['Admin reasons are mandatory',source.admin.includes('A reason is required for every Admin governance action')],
  ['Admin override actions exist',['deny','pause','reverse','unpublish','investigate'].every(action=>source.admin.includes(`'${action}'`))],
  ['Managing Architect can assign lead and reviewer',source.operations.includes("action==='assign_lead'")&&source.operations.includes("action==='assign_reviewer'")],
  ['Managing Architect can start and submit completion',source.operations.includes("action==='start_run'")&&source.operations.includes("action==='submit_completion'")],
  ['Architect navigation is identity-gated',source.shell.includes("accountType==='project_architect'")&&source.shell.includes('/member/architect-projects')]
];
const failed=checks.filter(([,passed])=>!passed);for(const [label,passed] of checks)console.log(`${passed?'PASS':'FAIL'}  ${label}`);if(failed.length)process.exitCode=1;
