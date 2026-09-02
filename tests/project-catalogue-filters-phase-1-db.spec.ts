import {expect,test} from '@playwright/test';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';

const url=process.env.E2E_SUPABASE_URL?.trim();
const serviceKey=process.env.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim();
const anonKey=process.env.E2E_SUPABASE_ANON_KEY?.trim();
const memberEmail=process.env.E2E_MEMBER_EMAIL?.trim();
const memberPassword=process.env.E2E_MEMBER_PASSWORD?.trim();
const localHost=url?new URL(url).hostname:'';
const canRun=Boolean(url&&serviceKey&&anonKey&&['127.0.0.1','localhost'].includes(localHost));

const completeProjectId='00000000-0000-4000-8000-00000000f101';
const incompleteProjectId='00000000-0000-4000-8000-00000000f102';
const memberOnlyProjectId='00000000-0000-4000-8000-00000000f103';

async function expectNoError(error:{message:string}|null,label:string){
  expect(error,`${label}: ${error?.message||''}`).toBeNull();
}

async function canonicalIds(db:SupabaseClient){
  const [{data:role,error:roleError},{data:domain,error:domainError},{data:capabilities,error:capabilityError},{data:tool,error:toolError},{data:method,error:methodError}]=await Promise.all([
    db.from('project_role_catalogue').select('id,slug').eq('slug','data-analyst').eq('active',true).single(),
    db.from('domains').select('id,slug').eq('slug','cross-industry-open-data').eq('is_active',true).single(),
    db.from('capabilities').select('id,slug').in('slug',['data-analysis','data-quality','stakeholder-communication']).eq('is_active',true),
    db.from('tools').select('id,slug').eq('slug','python').eq('is_active',true).single(),
    db.from('methods').select('id,slug').eq('slug','data-quality').eq('is_active',true).single()
  ]);
  await expectNoError(roleError,'load canonical role');
  await expectNoError(domainError,'load canonical domain');
  await expectNoError(capabilityError,'load canonical capabilities');
  await expectNoError(toolError,'load canonical tool');
  await expectNoError(methodError,'load canonical method');
  expect(capabilities).toHaveLength(3);
  return {role:role!,domain:domain!,capabilities:capabilities!,tool:tool!,method:method!};
}

async function deleteFixture(db:SupabaseClient,projectId:string){
  await db.from('project_role_families').delete().eq('project_id',projectId);
  await db.from('project_capabilities').delete().eq('project_id',projectId);
  await db.from('project_domains').delete().eq('project_id',projectId);
  await db.from('project_tools').delete().eq('project_id',projectId);
  await db.from('project_methods').delete().eq('project_id',projectId);
  await db.from('project_roles').delete().eq('project_id',projectId);
  await db.from('projects').delete().eq('id',projectId);
}

async function insertCompleteFixture(db:SupabaseClient,projectId:string,visibility:'public'|'members'){
  const ids=await canonicalIds(db);
  // Mirror the production lifecycle invariant: create a private closed draft, add enough
  // role capacity and governed facets, then expose the project. Never create an
  // application-open project before its capacity exists, and member-only projects stay closed.
  const {error:projectError}=await db.from('projects').insert({
    id:projectId,
    slug:`e2e-catalogue-ready-${projectId.slice(-4)}`,
    title:'E2E Catalogue Ready Project',
    summary:'Disposable project proving canonical catalogue metadata and readiness.',
    problem_statement:'Prove a complete governed taxonomy fixture becomes catalogue ready.',
    status:'draft',
    visibility:'private',
    project_type:'open',
    applications_open:false,
    project_type_review_required:false,
    location:'Remote',
    location_type:'remote',
    catalogue_working_model_source:'explicit',
    duration_weeks:4,
    weekly_commitment:'3–5 hours / week',
    team_size_threshold:1
  });
  await expectNoError(projectError,'create complete project fixture');

  const {error:projectRoleError}=await db.from('project_roles').insert({project_id:projectId,title:'Data Analyst',discipline:'Data & AI',description:'Deterministic governed catalogue fixture role.',skills:['Data Analysis'],openings:1});
  await expectNoError(projectRoleError,'create complete project role capacity');
  const {error:familyError}=await db.from('project_role_families').insert({project_id:projectId,role_catalogue_id:ids.role.id,source:'e2e'});
  await expectNoError(familyError,'associate canonical role family');
  const {error:capabilityError}=await db.from('project_capabilities').insert(ids.capabilities.map(item=>({project_id:projectId,capability_id:item.id,importance:'core',evidence_expected:true})));
  await expectNoError(capabilityError,'associate canonical capabilities');
  const {error:domainError}=await db.from('project_domains').insert({project_id:projectId,domain_id:ids.domain.id,is_primary:true});
  await expectNoError(domainError,'associate canonical domain');
  const {error:toolError}=await db.from('project_tools').insert({project_id:projectId,tool_id:ids.tool.id});
  await expectNoError(toolError,'associate canonical tool');
  const {error:methodError}=await db.from('project_methods').insert({project_id:projectId,method_id:ids.method.id});
  await expectNoError(methodError,'associate canonical method');

  const {error:publishError}=await db.from('projects').update({status:'open',visibility,applications_open:visibility==='public'}).eq('id',projectId);
  await expectNoError(publishError,'finalize complete project fixture');
}

test('Phase 1 marks a complete canonical project ready and reports an incomplete project precisely',async()=>{
  test.skip(!canRun,'Runs only against the disposable isolated Supabase release-gate database.');
  const db=createClient(url!,serviceKey!,{auth:{persistSession:false,autoRefreshToken:false}});
  await deleteFixture(db,completeProjectId);
  await deleteFixture(db,incompleteProjectId);
  try{
    await insertCompleteFixture(db,completeProjectId,'public');
    const {error:incompleteError}=await db.from('projects').insert({
      id:incompleteProjectId,
      slug:'e2e-catalogue-incomplete-f102',
      title:'E2E Catalogue Incomplete Project',
      summary:'Disposable project proving incomplete catalogue metadata is never described as ready.',
      problem_statement:'Prove readiness reports missing canonical metadata rather than inventing it.',
      status:'draft',
      visibility:'private',
      project_type:'open',
      applications_open:false,
      project_type_review_required:false,
      duration_weeks:4,
      weekly_commitment:'3–5 hours / week'
    });
    await expectNoError(incompleteError,'create incomplete project fixture');

    const [{data:ready,error:readyError},{data:notReady,error:notReadyError}]=await Promise.all([
      db.from('project_catalogue_readiness').select('catalogue_ready,role_family_count,capability_count,domain_count,tool_count,method_count,missing_requirements').eq('project_id',completeProjectId).single(),
      db.from('project_catalogue_readiness').select('catalogue_ready,missing_requirements').eq('project_id',incompleteProjectId).single()
    ]);
    await expectNoError(readyError,'read complete project readiness');
    await expectNoError(notReadyError,'read incomplete project readiness');
    expect(ready?.catalogue_ready).toBe(true);
    expect(ready?.role_family_count).toBeGreaterThanOrEqual(1);
    expect(ready?.capability_count).toBeGreaterThanOrEqual(3);
    expect(ready?.domain_count).toBeGreaterThanOrEqual(1);
    expect(ready?.tool_count).toBeGreaterThanOrEqual(1);
    expect(ready?.method_count).toBeGreaterThanOrEqual(1);
    expect(ready?.missing_requirements).toEqual([]);

    expect(notReady?.catalogue_ready).toBe(false);
    expect(notReady?.missing_requirements).toEqual(expect.arrayContaining(['roles','domain','capabilities','working_model']));
  }finally{
    await deleteFixture(db,completeProjectId);
    await deleteFixture(db,incompleteProjectId);
  }
});

test('Phase 1 canonical vocabulary is normalized and extensible without frontend constants',async()=>{
  test.skip(!canRun,'Runs only against the disposable isolated Supabase release-gate database.');
  const db=createClient(url!,serviceKey!,{auth:{persistSession:false,autoRefreshToken:false}});

  const [{data:capabilities,error:capabilityError},{data:aliases,error:aliasError},{data:roles,error:roleError}]=await Promise.all([
    db.from('capabilities').select('id,slug,name').eq('is_active',true),
    db.from('capability_aliases').select('alias,capability_id'),
    db.from('project_role_catalogue').select('id,slug,title').eq('active',true)
  ]);
  await expectNoError(capabilityError,'read active capabilities');
  await expectNoError(aliasError,'read capability aliases');
  await expectNoError(roleError,'read canonical role families');

  const capabilitySlugs=(capabilities||[]).map(item=>item.slug.toLowerCase());
  const capabilityNames=(capabilities||[]).map(item=>item.name.trim().toLowerCase());
  const roleSlugs=(roles||[]).map(item=>item.slug.toLowerCase());
  expect(new Set(capabilitySlugs).size).toBe(capabilitySlugs.length);
  expect(new Set(capabilityNames).size).toBe(capabilityNames.length);
  expect(new Set(roleSlugs).size).toBe(roleSlugs.length);
  expect(capabilityNames).not.toContain('sql/python');
  expect(capabilityNames).not.toContain('power bi/tableau');
  expect((aliases||[]).every(item=>item.alias===item.alias.trim().toLowerCase())).toBe(true);

  await deleteFixture(db,completeProjectId);
  try{
    await insertCompleteFixture(db,completeProjectId,'public');
    const {data:linked,error:linkedError}=await db.from('project_capabilities').select('capability_id,capabilities!inner(slug,name,is_active)').eq('project_id',completeProjectId);
    await expectNoError(linkedError,'read newly associated canonical capability facets');
    expect(linked).toHaveLength(3);
    expect((linked||[]).map(item=>(item.capabilities as unknown as {slug:string}).slug).sort()).toEqual(['data-analysis','data-quality','stakeholder-communication']);
  }finally{
    await deleteFixture(db,completeProjectId);
  }
});

test('Phase 1 RLS hides member-only facets from anonymous users and exposes them to signed-in members',async()=>{
  test.skip(!canRun,'Runs only against the disposable isolated Supabase release-gate database.');
  test.skip(!memberEmail||!memberPassword,'Member E2E credentials are required for authenticated member-visibility coverage.');
  const service=createClient(url!,serviceKey!,{auth:{persistSession:false,autoRefreshToken:false}});
  const anon=createClient(url!,anonKey!,{auth:{persistSession:false,autoRefreshToken:false}});
  const member=createClient(url!,anonKey!,{auth:{persistSession:false,autoRefreshToken:false}});
  await deleteFixture(service,memberOnlyProjectId);
  try{
    await insertCompleteFixture(service,memberOnlyProjectId,'members');
    const [{data:anonFamilies,error:anonFamilyError},{data:anonCapabilities,error:anonCapabilityError},{data:anonReadiness,error:anonReadinessError}]=await Promise.all([
      anon.from('project_role_families').select('project_id').eq('project_id',memberOnlyProjectId),
      anon.from('project_capabilities').select('project_id').eq('project_id',memberOnlyProjectId),
      anon.from('project_catalogue_readiness').select('project_id').eq('project_id',memberOnlyProjectId)
    ]);
    await expectNoError(anonFamilyError,'anonymous role-family visibility check');
    await expectNoError(anonCapabilityError,'anonymous capability visibility check');
    await expectNoError(anonReadinessError,'anonymous readiness visibility check');
    expect(anonFamilies).toEqual([]);
    expect(anonCapabilities).toEqual([]);
    expect(anonReadiness).toEqual([]);

    const {error:signInError}=await member.auth.signInWithPassword({email:memberEmail!,password:memberPassword!});
    await expectNoError(signInError,'sign in ordinary member for member-visible project facet check');
    const [{data:memberFamilies,error:memberFamilyError},{data:memberCapabilities,error:memberCapabilityError},{data:memberReadiness,error:memberReadinessError}]=await Promise.all([
      member.from('project_role_families').select('project_id').eq('project_id',memberOnlyProjectId),
      member.from('project_capabilities').select('project_id').eq('project_id',memberOnlyProjectId),
      member.from('project_catalogue_readiness').select('project_id,catalogue_ready').eq('project_id',memberOnlyProjectId)
    ]);
    await expectNoError(memberFamilyError,'signed-in member role-family visibility check');
    await expectNoError(memberCapabilityError,'signed-in member capability visibility check');
    await expectNoError(memberReadinessError,'signed-in member readiness visibility check');
    expect(memberFamilies).toHaveLength(1);
    expect(memberCapabilities).toHaveLength(3);
    expect(memberReadiness).toEqual([{project_id:memberOnlyProjectId,catalogue_ready:true}]);
  }finally{
    await deleteFixture(service,memberOnlyProjectId);
  }
});

test('Every discoverable isolated project satisfies Phase 1 catalogue readiness',async()=>{
  test.skip(!canRun,'Runs only against the disposable isolated Supabase release-gate database.');
  const db=createClient(url!,serviceKey!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.from('project_catalogue_readiness')
    .select('project_id,slug,title,catalogue_ready,missing_requirements')
    .in('visibility',['public','members'])
    .in('status',['pilot','recruiting','open','forming','active','review','completed']);
  await expectNoError(error,'read discoverable catalogue readiness');
  expect(data?.length,'isolated release gate must contain at least one discoverable project fixture').toBeGreaterThan(0);
  const failures=(data||[]).filter(item=>!item.catalogue_ready);
  expect(failures,`catalogue-incomplete discoverable projects: ${JSON.stringify(failures)}`).toEqual([]);
});
