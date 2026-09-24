import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const startService=fs.readFileSync('lib/project-start-service.ts','utf8');
const adminFlow=fs.readFileSync('app/api/admin/project-flow/route.ts','utf8');

test.describe('project kickoff notification contract',()=>{
  test('all canonical start paths use one idempotent member kickoff notifier',()=>{
    expect(startService).toContain('export async function notifyProjectKickoffMembers');
    expect(startService).toContain("dedupeKey:`phase11:${runId}:kickoff:${member.user_id}`");
    expect(startService).toContain("type:'project_kickoff'");
    expect(startService).toContain('await notifyProjectKickoffMembers({db,projectId,runId,projectTitle:project.title,runNumber,participationMode})');
  });

  test('Admin force start emits the same kickoff event after activation',()=>{
    expect(adminFlow).toContain("import {notifyProjectKickoffMembers,startProjectRun} from '@/lib/project-start-service'");
    expect(adminFlow).toContain("db.rpc('admin_force_start_project_run'");
    expect(adminFlow).toContain('if(result.started&&!result.already_started)');
    expect(adminFlow).toContain('await notifyProjectKickoffMembers({');
  });
});
