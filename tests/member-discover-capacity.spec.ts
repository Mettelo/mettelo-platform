import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('Member Discover loads the complete eligible catalogue in deterministic batches',async()=>{
  const source=await readFile('lib/member-discover-project-loader.ts','utf8');

  expect(source).toContain('DISCOVER_BATCH_SIZE=200');
  expect(source).toContain('.range(from,to)');
  expect(source).toContain(".order('created_at',{ascending:false})");
  expect(source).toContain(".order('id',{ascending:false})");
  expect(source).toContain('while(true)');
  expect(source).toContain('rows.push(...batch)');
  expect(source).toContain('if(batch.length<DISCOVER_BATCH_SIZE)break');
  expect(source).toContain('from+=DISCOVER_BATCH_SIZE');
  expect(source).not.toContain('.limit(200)');
});


test('Member Discover isolates malformed capacity rows and reserves the system error for a true service failure',async()=>{
  const source=await readFile('app/member/discover/page.tsx','utf8');

  expect(source).toContain("console.warn('member Discover capacity batch failed; retrying projects independently'");
  expect(source).toContain("supabase.rpc('get_member_project_capacities',{p_project_ids:[projectId]})");
  expect(source).toContain('unresolvedCapacityIds.add(projectId)');
  expect(source).toContain('capacityServiceFailureIds.add(projectId)');
  expect(source).toContain('const capacitySystemError=projects.length>0&&capacityServiceFailureIds.size===projects.length');
  expect(source).toContain("if(!capacity)return[]");
  expect(source).toContain('projectsResult.error||capacitySystemError');
  expect(source).not.toContain('capacityLoadError=capacityLoadError||projects.some');
});
