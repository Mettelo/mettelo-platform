import fs from 'node:fs';
import path from 'node:path';
import {expect,test} from '@playwright/test';
import {memberProjectStateCopy,memberProjectStateLabel,resolveMemberProjectState} from '../lib/member-project-journey';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test.describe('project publication and pilot presentation guard',()=>{
  test('pilot projects are not described as applications closed',()=>{
    const state=resolveMemberProjectState({
      project:{status:'pilot',project_type:'open',applications_open:true,application_deadline:'2026-12-31T02:22:00Z'},
      applicationReady:true,
      hasAvailableRole:false,
      roleAvailabilityKnown:true,
      now:new Date('2026-09-01T12:00:00Z').getTime()
    });
    expect(state).toBe('register_interest');
    expect(memberProjectStateLabel(state)).toBe('Registering interest');
    expect(memberProjectStateCopy(state)).toContain('pilot');
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
