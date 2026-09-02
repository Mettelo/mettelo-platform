import fs from 'node:fs';
import path from 'node:path';
import {expect,test} from '@playwright/test';
import {memberProjectStateCopy,memberProjectStateLabel,resolveMemberProjectState} from '../lib/member-project-journey';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test.describe('project publication and pilot presentation guard',()=>{
  test('a Pilot with intake paused is presented as registering interest, not permanently closed',()=>{
    const state=resolveMemberProjectState({
      project:{status:'pilot',project_type:'open',applications_open:false,application_deadline:null,visibility:'public'},
      applicationReady:true,
      hasAvailableRole:false,
      roleAvailabilityKnown:true
    });
    expect(state).toBe('register_interest');
    expect(memberProjectStateLabel(state)).toBe('Registering interest');
    expect(memberProjectStateCopy(state)).toContain('pilot');
  });

  test('a publication-ready Open Pilot can accept real applications',()=>{
    const state=resolveMemberProjectState({
      project:{status:'pilot',project_type:'open',applications_open:true,application_deadline:null,visibility:'public'},
      applicationReady:true,
      hasAvailableRole:true,
      roleAvailabilityKnown:true
    });
    expect(state).toBe('open_eligible');
    expect(memberProjectStateLabel(state)).toBe('Open for applications');
  });

  test('public malformed summaries are quarantined and future publication is gated',()=>{
    const sql=read('supabase/migrations/20260901171500_guard_public_project_content_quality.sql');
    expect(sql).toContain("set visibility='private', applications_open=false");
    expect(sql).toContain("visibility in ('public','members')");
    expect(sql).toContain('projects_public_summary_publishable_check');
    expect(sql).toContain("visibility not in ('public','members')");
    expect(sql).toContain('char_length(trim(coalesce(value');
    expect(sql).toContain('>= 6');
  });
});
