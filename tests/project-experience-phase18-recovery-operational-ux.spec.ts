import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(file:string){return fs.readFileSync(path.join(root,file),'utf8')}

test.describe('Phase 18 recovery — operational collaboration UX',()=>{
 test('Mettelo Lab Team visibly mounts Grow the Team',()=>{const lab=read('components/MetteloLabPanel.tsx');expect(lab).toContain("import ProjectGrowTeamSection from '@/components/ProjectGrowTeamSection'");expect(lab).toContain('<ProjectGrowTeamSection');expect(lab.indexOf('<ProjectGrowTeamSection')).toBeGreaterThan(lab.indexOf('id="team"'));});
 test('Grow the Team exposes all three canonical member routes without creating membership',()=>{const section=read('components/ProjectGrowTeamSection.tsx');const actions=read('components/ProjectGrowTeamActions.tsx');for(const text of ['GROW THE TEAM','Find people on Mettelo','Post collaborator needed','Share to find collaborators','/api/collaboration-needs','/member/find-collaborators','/collaborate/'])expect(section+actions).toContain(text);for(const forbidden of ["from('project_members').insert","from('project_runs').insert","from('project_applications').insert"])expect(section+actions).not.toContain(forbidden);});
 test('Team recruitment state is server authoritative and Phase 19 final review freezes actions',()=>{const section=read('components/ProjectGrowTeamSection.tsx');for(const text of ['phase9_project_run_capacity','recruitment_open','late_joining_enabled','late_joining_cutoff_at','collaboration_marketplace_enabled','member_invites_enabled','project_sharing_enabled',"run.status==='review'","stateLabel='FINAL REVIEW'",'TEAM FULL','JOINING CLOSED','RECRUITMENT CLOSED'])expect(section).toContain(text);});
 test('Member Home never hides Find a Team merely because recommendations are empty',()=>{const home=read('components/MemberHomeCollaborationOpportunities.tsx');expect(home).toContain('BrowseCollaborationFallback');expect(home).toContain('Browse collaboration opportunities');expect(home).toContain('/member/find-a-team');expect(home).not.toContain('if(!items.length)return null');expect(home).not.toContain('if(!db)return null');});
 test('operational controls meet minimum keyboard and mobile contracts',()=>{const actions=read('components/ProjectGrowTeamActions.tsx');expect(actions).toContain('min-height:44px');expect(actions).toContain(':focus-visible');expect(actions).toContain('@media(max-width:640px)');expect(actions).toContain('aria-live="polite"');expect(actions).toContain('aria-label="Grow the team routes"');});
});
