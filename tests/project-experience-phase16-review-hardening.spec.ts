import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test.describe('Project Experience Phase 16 senior-review hardening',()=>{
 test('server-rendered handover recovery requires the projects.manage Admin capability',()=>{const section=read('components/project-experience/ProjectTeamRecoverySection.tsx');expect(section).toContain("hasAdminCapability(user,'projects.manage')");expect(section).toContain('user?.id===currentUserId');expect(section).not.toContain("user.app_metadata?.role==='admin'")});
 test('structured completed-work handover cannot violate the legacy compatibility field bound',()=>{const migration=read('supabase/migrations/20260907193500_project_experience_phase_16_review_hardening.sql');expect(migration).toContain('project_members_handover_note_check');expect(migration).toContain('between 1 and 4000');expect(migration).toContain('Structured handover authority remains project_member_handovers')});
 test('replacement-request idempotency resets after a vacancy is recovered',()=>{const migration=read('supabase/migrations/20260907193500_project_experience_phase_16_review_hardening.sql');for(const text of ['phase16_clear_replacement_request_when_recovered','new.replacement_requested_at:=null','new.replacement_requested_by:=null','before update of replacement_needed'])expect(migration).toContain(text)});
 test('optional handover availability cannot be the only practical handover content in the member UI',()=>{const controls=read('components/project-experience/ProjectMemberDepartureControls.tsx');const start=controls.indexOf('const hasOperationalContext');const end=controls.indexOf('export default function');const helper=controls.slice(start,end);expect(helper).toContain('open_responsibilities');expect(helper).not.toContain('handover_availability');expect(controls).toContain('Limited handover availability (optional)')});
});
