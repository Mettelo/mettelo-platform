import {createClient} from '@supabase/supabase-js';
import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}
function env(){const url=process.env.E2E_SUPABASE_URL||'';const anon=process.env.E2E_SUPABASE_ANON_KEY||'';const service=process.env.E2E_SUPABASE_SERVICE_ROLE_KEY||'';if(!url||!anon||!service)throw new Error('Missing isolated Supabase E2E credentials.');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Phase 4 security tests refuse non-local Supabase.');return{url,anon,service};}
const protectedProjectionFields=['external_url','storage_path','content_pointer','provider_url','licence_url','access_notes','review_agreement_accepted','preview_data','sample_rows','download_enabled','query_enabled','governance_status','governance_verified_at','retention_policy','application_requirements'];

test('public project detail uses the governed anon projection, not serviceDb helpers',()=>{
  const page=read('app/projects/[id]/page.tsx');
  const publicLoader=read('lib/public-project-experience-data.ts');
  const migration=read('supabase/migrations/20260905143000_project_experience_phase_4_public_detail_projection.sql');
  expect(page).toContain('getPublicProjectExperienceData');
  expect(page).not.toContain('getProjectDetailContent');
  expect(page).not.toContain('getProjectExperiencePlanning');
  expect(page).not.toContain('getProjectExperienceRoleDetails');
  expect(publicLoader).toContain("createPublicSupabaseClient");
  expect(publicLoader).toContain("rpc('get_public_project_experience_detail'");
  expect(publicLoader).not.toContain('serviceDb');
  expect(migration).toContain('security definer');
  expect(migration).toContain("p.visibility = 'public'");
  expect(migration).toContain("s.sensitivity='public'");
  expect(migration).toContain("s.publish_policy='permitted'");
  expect(migration).toContain("s.governance_status='green'");
  expect(migration).toContain('revoke all on function public.get_public_project_experience_detail(uuid) from public');
  expect(migration).toContain('grant execute on function public.get_public_project_experience_detail(uuid) to anon, authenticated');
  for(const protectedName of protectedProjectionFields)expect(migration).not.toContain(`'${protectedName}'`);
});

test('anon rich projection is visible only while the project is public and omits protected resource and governance fields',async()=>{
  const {url,anon,service}=env();
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const publicDb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:project,error}=await admin.from('projects').select('id,visibility,status').eq('visibility','public').in('status',['pilot','recruiting','open','forming','active','review','completed']).limit(1).maybeSingle();
  if(error)throw error;
  test.skip(!project,'Fixture has no public project available for Phase 4 security verification.');
  const visible=await publicDb.rpc('get_public_project_experience_detail',{p_project_id:project!.id});
  expect(visible.error).toBeNull();
  expect(visible.data).not.toBeNull();
  const serialized=JSON.stringify(visible.data);
  for(const protectedName of protectedProjectionFields)expect(serialized).not.toContain(`\"${protectedName}\"`);

  const originalVisibility=project!.visibility;
  const hidden=await admin.from('projects').update({visibility:'private'}).eq('id',project!.id).select('id').single();
  if(hidden.error)throw hidden.error;
  try{
    const blocked=await publicDb.rpc('get_public_project_experience_detail',{p_project_id:project!.id});
    expect(blocked.error).toBeNull();
    expect(blocked.data).toBeNull();
  }finally{
    const restored=await admin.from('projects').update({visibility:originalVisibility}).eq('id',project!.id);
    if(restored.error)throw restored.error;
  }
});
