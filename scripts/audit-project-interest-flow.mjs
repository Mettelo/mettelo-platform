import fs from 'node:fs';
const read=path=>fs.readFileSync(path,'utf8');
const expect=(path,needles)=>{const source=read(path);const missing=needles.filter(needle=>!source.includes(needle));if(missing.length)throw new Error(path+' missing '+missing.join(', '));};
const forbid=(path,needles)=>{const source=read(path);const found=needles.filter(needle=>source.includes(needle));if(found.length)throw new Error(path+' contains forbidden '+found.join(', '));};

// Canonical interest + application domain remains one endpoint.
expect('components/SubmissionForm.tsx',["'/api/project-applications'","application_kind:'interest'",'requested_role:data.role','contribution_statement:data.contribution']);
expect('app/api/project-applications/route.ts',["application_kind:isInterest?'interest':'application'",".not('status','in','(declined,withdrawn)')",'loadProjectRoleUsage(termsDb,projectId,project.project_type)','already participated in this canonical project','That project role has filled','terms_accepted_at','notifyAdmins','notifyUser']);
expect('app/api/admin/applications/route.ts',['loadProjectRoleUsage(db,application.project_id,project.project_type)','already has participation history for this canonical project',".from('project_members').insert",'No existing cohort history was overwritten.','Two approvals can race when no forming Open cohort exists']);
forbid('app/api/admin/applications/route.ts',[".from('project_members').upsert"]);
expect('lib/project-role-capacity.ts',[".eq('status','forming')",".eq('has_started',false)",".eq('project_run_id',run.id)",".in('membership_status',['waiting','active'])",".eq('project_id',projectId)"]);
expect('supabase/migrations/20260901193000_project_lifecycle_invariants.sql',['pg_advisory_xact_lock','Project cohort capacity exceeded','Project role capacity exceeded for this cohort','Application-open projects require enough role capacity for the full team','Partner Projects support one engagement run only','Projects with operational history cannot return to Draft']);
expect('supabase/migrations/20260901194000_imported_open_project_default_roles.sql',['after update of status on public.capability_path_import_batches',"'Project Contributor'",'greatest(coalesce(p.team_size_threshold,1),1)','origin.was_existing=false','not exists']);
expect('supabase/migrations/20260819193000_member_discover_application_integrity.sql',['project_applications_one_active_application_per_project_user',"application_kind='application'",'saved_projects','enable row level security','auth.uid()']);

// Authenticated Discover must stay in My Mettelo and use real project-domain data only.
expect('lib/member-navigation.ts',["{label:'Discover',href:'/member/discover'","{label:'Saved',href:'/member/saved'"]);
expect('components/MemberAppShell.tsx',["href=\"/member/discover\"","isActive('/member/discover')",'hasProjectBreadcrumb']);
expect('app/member/discover/page.tsx',[".from('projects')","project_roles(id,title,skills,openings)",".from('project_applications')",".from('project_members')",".from('saved_projects')",'calculateMemberReadiness','applicationReadiness.ready','resolveMemberProjectState','memberProjectCatalogueAction']);
forbid('app/member/discover/page.tsx',['career_roles','career_applications','/careers/','PROFILE_APPLICATION_READY']);
expect('components/MemberDiscoverCatalogue.tsx',['Search projects, skills or topics','All roles','All skills','Any commitment','Any location','Discover is broad. Recommended is personalised.','Recommended uses your profile and primary Capability Path where relevant.','View Recommended','mdFilterDialog','showModal()','aria-haspopup="dialog"']);

// Member Project Detail is the authenticated decision surface and consumes canonical application readiness.
expect('app/member/discover/[id]/page.tsx',[".in('visibility',['public','members'])",'calculateMemberReadiness','applicationReadiness.ready','applicationReadiness.missing','project_members','role capacity lookup','resolveMemberProjectState']);
forbid('app/member/discover/[id]/page.tsx',['PROFILE_APPLICATION_READY']);
expect('components/MemberProjectDetailClient.tsx',['MEMBER PROJECT DETAIL','YOUR DECISION','Ready to contribute?','08 · CHOOSE YOUR CONTRIBUTION','Open project roles','Choose the responsibility you can realistically own.','09 · WHAT HAPPENS NEXT','Your project journey','Track your application','Join Projects when confirmed','Deliver in Mettelo Lab','View public project page']);
forbid('components/MemberProjectDetailClient.tsx',['Careers role','Open Mettelo Lab']);

// The member form owns role/review/submit and uses the same canonical application readiness result.
expect('app/member/discover/[id]/apply/page.tsx',['calculateMemberReadiness','applicationReadiness.ready','resolveMemberProjectState',"state!=='open_eligible'",'MemberProjectApplicationFlow']);
forbid('app/member/discover/[id]/apply/page.tsx',['PROFILE_APPLICATION_READY']);
expect('components/MemberProjectApplicationFlow.tsx',["const labels=['Role & fit','Availability','How you could contribute','Review']",'Tell us how you could contribute','Relevant professional link','Professional link','terms_accepted:true','/api/project-applications','Application submitted','View application','Back to project','localStorage']);
forbid('components/MemberProjectApplicationFlow.tsx',['Relevant evidence URL']);
expect('components/ProjectApplicationForm.tsx',['Continue this project application inside My Mettelo.',"/member/discover/${selected.id}/apply"]);
forbid('components/ProjectApplicationForm.tsx',["fetch('/api/project-applications'",'project_role_catalogue']);

// Signup/onboarding keeps project intent instead of dumping a new member at Home.
expect('middleware.ts',['normalizeProjectIntent','mettelo_return_to','request.nextUrl.search','/signin']);
expect('app/auth/continue-after-onboarding/route.ts',['mettelo_return_to','maxAge:0','NextResponse.redirect']);
expect('app/onboarding/complete/page.tsx',['/auth/continue-after-onboarding?fallback=%2Fmember']);

// Saving a project is member-owned and does not create an application.
expect('app/api/projects/saved/route.ts',[".from('saved_projects')",".from('projects')",'user_id:user.id']);
forbid('app/api/projects/saved/route.ts',['project_applications','career_applications']);
expect('app/member/saved/page.tsx',['Saving a project never creates an application.','/member/discover/','/member/saved-opportunities']);

expect('app/admin/project-operations/applications/page.tsx',['const db=privilegedDb||auth',".from('project_applications')",'if(privilegedDb){const users']);
console.log('Project interest, member Discover and application convergence contract passed.');
