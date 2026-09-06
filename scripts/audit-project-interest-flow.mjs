import fs from 'node:fs';
const read=path=>fs.readFileSync(path,'utf8');
const expect=(path,needles)=>{const source=read(path);const missing=needles.filter(needle=>!source.includes(needle));if(missing.length)throw new Error(path+' missing '+missing.join(', '));};
const forbid=(path,needles)=>{const source=read(path);const found=needles.filter(needle=>source.includes(needle));if(found.length)throw new Error(path+' contains forbidden '+found.join(', '));};

// Canonical interest + application domain remains one endpoint and one versioned inline terms contract.
expect('components/SubmissionForm.tsx',["'/api/project-applications'","application_kind:'interest'",'requested_role:data.role','contribution_statement:data.contribution','PROJECT_PARTICIPATION_TERMS_SUMMARY','PROJECT_PARTICIPATION_TERMS_FULL','Read full participation terms','I have read, understood and agree to the Mettelo Project Participation Terms.','terms_accepted:true','terms_version:PROJECT_PARTICIPATION_TERMS_VERSION','projectInterest&&!acceptedTerms',"projectInterest?'Submit interest':submitLabel"]);
expect('lib/project-participation-terms.ts',['PROJECT_PARTICIPATION_TERMS_VERSION','PROJECT_PARTICIPATION_TERMS_SUMMARY','PROJECT_PARTICIPATION_TERMS_FULL','participation alone does not automatically create verified Mettelo Proof']);
expect('lib/project-application-validation.ts',['normalizeProfessionalLink','https://','http:','https:','Professional link is too long']);
expect('app/api/project-applications/route.ts',["application_kind:isInterest?'interest':'application'",".not('status','in','(declined,withdrawn)')",'loadProjectRoleUsage(termsDb,projectId,project.project_type)','You are already participating in, confirmed for, or have completed this project.','ALREADY_PARTICIPATING','That project role has filled or is no longer available. Please choose another role.','terms_accepted_at','termsVersion!==PROJECT_PARTICIPATION_TERMS_VERSION','terms_version:PROJECT_PARTICIPATION_TERMS_VERSION','terms_attachment_id:null','normalizeProfessionalLink','Promise.allSettled','project_application_submit_failed','request_id','DUPLICATE_APPLICATION','PROJECT_CLOSED','ROLE_UNAVAILABLE','AUTH_REQUIRED','INVALID_PROFESSIONAL_LINK','notifyAdmins','notifyUser','loadMemberProjectTeamState','calculateMemberReadiness','CAPACITY_FULL','PROFILE_INCOMPLETE']);
forbid('app/api/project-applications/route.ts',['termsAttachmentId','communication_template_attachments',"template_key','project_application_terms","await Promise.all([notifyUser"]);
expect('supabase/migrations/20260904220500_project_application_submission_contract.sql',['add column if not exists leadership_interest boolean','add column if not exists terms_version text','project_applications_terms_acceptance_pair_check']);
expect('supabase/migrations/20260903215500_project_interest_inline_terms.sql',['add column if not exists terms_version text','Version identifier of inline Mettelo Project Participation Terms']);
expect('app/api/admin/applications/route.ts',['loadProjectRoleUsage(db,application.project_id,project.project_type)','already has participation history for this canonical project',".from('project_members')",'.insert({','No existing cohort history was overwritten.','if(createError){const {data:concurrentRun}=await db','if(!concurrentRun)throw createError','run=concurrentRun','const {data:startedRun,error:startError}=await db',".eq('status','forming')",".eq('has_started',false)","if(startedRun){"]);
forbid('app/api/admin/applications/route.ts',[".from('project_members').upsert"]);
expect('lib/project-role-capacity.ts',[".eq('status','forming')",".eq('has_started',false)",".eq('project_run_id',run.id)",".in('membership_status',['waiting','active'])",".eq('project_id',projectId)"]);
expect('supabase/migrations/20260901193000_project_lifecycle_invariants.sql',['pg_advisory_xact_lock','Project cohort capacity exceeded','Project role capacity exceeded for this cohort','Application-open projects require complete decision content and team size','Application-open projects require enough role capacity for the full team','Partner Projects support one engagement run only','Projects with operational history cannot return to Draft']);
expect('supabase/migrations/20260901194000_imported_open_project_default_roles.sql',['after update of status on public.capability_path_import_batches',"'Project Contributor'",'greatest(coalesce(p.team_size_threshold,1),1)','origin.was_existing=false','not exists']);
expect('supabase/migrations/20260819193000_member_discover_application_integrity.sql',['project_applications_one_active_application_per_project_user',"application_kind='application'",'saved_projects','enable row level security','auth.uid()']);
expect('supabase/migrations/20260905170000_project_experience_phase_5_interest_uniqueness.sql',['drop index if exists public.project_applications_one_interest_per_project_user','project_applications_one_active_interest_per_project_user',"application_kind='interest'","status not in ('declined','withdrawn')"]);

// Team formation is readiness-driven, opt-in for automatic leadership, and single-winner under concurrency.
expect('lib/project-team-readiness.ts',['const volunteers=candidates.filter(candidate=>candidate.leadershipInterest)','recommendation=volunteers[0]||null',".eq('team_role','contributor')",".select('id')",'if(assigned){',"const {data:currentLeads,error:leadError}=await db.from('project_members')","leads=(currentLeads||[]) as MemberRow[]","if(leads.length===0)blockers.push('project_lead')","if(leads.length>1)blockers.push('multiple_project_leads')"]);
expect('supabase/migrations/20260902122350_project_team_single_lead_invariant.sql',['create unique index if not exists project_members_one_current_lead_per_run','on public.project_members(project_run_id)',"team_role='project_lead'","membership_status in ('waiting','active')"]);

// Authenticated Discover stays in My Mettelo and shares the governed catalogue filter model.
expect('lib/member-navigation.ts',["{label:'Discover',href:'/member/discover'","{label:'Saved',href:'/member/saved'"]);
expect('components/MemberAppShell.tsx',["href=\"/member/discover\"","isActive('/member/discover')",'hasProjectBreadcrumb']);
expect('app/member/discover/page.tsx',['loadMemberDiscoverProjects',".from('project_applications')",".from('project_members')",".from('saved_projects')",'calculateMemberReadiness','applicationReadiness.ready','resolveMemberProjectState','memberProjectCatalogueAction']);
expect('lib/member-discover-project-loader.ts',[".from('projects')",'project_roles(id,title,canonical_role_key,skills,openings)','PRIMARY_SELECT','CORE_FACET_SELECT','MINIMAL_SELECT']);
forbid('app/member/discover/page.tsx',['career_roles','career_applications','/careers/','PROFILE_APPLICATION_READY']);
expect('components/MemberDiscoverCatalogue.tsx',['Search projects, roles, skills, tools or industries','Career / Role','Experience Level','Solo / Team','More filters','Filters · {activeCount}','Skills you want to build','Industry','Tools &amp; technologies','Weekly commitment','Working model','Project source','Availability','Show {visible.length}','Discover is broad. Recommended is personalised.','position:fixed;inset:0 0 0 auto','showModal()','aria-haspopup="dialog"']);

// Member Project Detail is the authenticated Phase 5 decision surface and consumes canonical application readiness.
expect('app/member/discover/[id]/page.tsx',[".in('visibility',['public','members'])",'calculateMemberReadiness','applicationReadiness.ready','applicationReadiness.missing','project_members','loadMemberProjectTeamState','resolveMemberProjectState','capacityAvailable:teamState.capacityAvailable','capacityKnown:teamState.known']);
forbid('app/member/discover/[id]/page.tsx',['PROFILE_APPLICATION_READY']);
expect('components/project-experience/MemberProjectDetailV2.tsx',["label:'Submit Interest'",'member-decision-title','decisionHeadingRef.current?.focus()','MemberProjectDetailBodyV3','contributionAreas','teamState']);
expect('components/project-experience/MemberProjectDetailBodyV3.tsx',['Possible contribution areas','You are not choosing or applying for a formal role at this stage.','What happens after you submit interest','Submit Interest','canApply&&<div className={styles.mobileAction}','href={`/member/discover/${projectId}/apply`}']);
forbid('components/project-experience/MemberProjectDetailBodyV3.tsx',['Choose your contribution area','Choose this role','selectedRoleId','roleSelectButton','/apply?role=']);

// The Phase 6 handoff form is role-neutral and uses the same canonical inline terms as Submit Interest.
expect('app/member/discover/[id]/apply/page.tsx',['calculateMemberReadiness','applicationReadiness.ready','loadMemberProjectTeamState','resolveMemberProjectState',"state!=='open_eligible'",'MemberProjectApplicationFlow','You are not choosing a formal project role at this stage.']);
forbid('app/member/discover/[id]/apply/page.tsx',['PROFILE_APPLICATION_READY','requestedRole','initialRoleId','availableRoles[0]?.id']);
expect('components/MemberProjectApplicationFlow.tsx',["const labels=['Availability','How you could contribute','Review']",'You are not choosing a formal project role at this stage.','Tell us how you could contribute','Relevant professional link','Professional link','PROJECT_PARTICIPATION_TERMS_SUMMARY','PROJECT_PARTICIPATION_TERMS_FULL','PROJECT_PARTICIPATION_TERMS_VERSION','Before you submit','Read full participation terms','I have read, understood and agree to the Mettelo Project Participation Terms.','terms_accepted:true','terms_version:PROJECT_PARTICIPATION_TERMS_VERSION','working||!acceptedTerms','/api/project-applications',"application_kind:'interest'",'Interest submitted.','View interest','Back to project','localStorage','if(working)return','Submitting…','Submit Interest']);
forbid('components/MemberProjectApplicationFlow.tsx',['Relevant evidence URL',"fetch('/api/project-terms'",'terms_attachment_id','Open terms ↗','document is not currently published','Role & fit','Choose the project role','project_role_id:selected']);
expect('components/ProjectApplicationForm.tsx',['Continue this project application inside My Mettelo.',"/member/discover/${selected.id}/apply"]);
forbid('components/ProjectApplicationForm.tsx',["fetch('/api/project-applications'",'project_role_catalogue']);

// Signup/onboarding keeps project intent instead of dumping a new member at Home.
expect('middleware.ts',['normalizeProjectIntent','mettelo_return_to','request.nextUrl.search','/signin']);
expect('app/auth/continue-after-onboarding/route.ts',['mettelo_return_to','maxAge:0','NextResponse.redirect']);
expect('app/onboarding/complete/page.tsx',['safeNext','/auth/continue-after-onboarding?fallback=','encodeURIComponent(next)','href={continueHref}']);

// Saving a project is member-owned and does not create an application.
expect('app/api/projects/saved/route.ts',[".from('saved_projects')",".from('projects')",'user_id:user.id']);
forbid('app/api/projects/saved/route.ts',['project_applications','career_applications']);
expect('app/member/saved/page.tsx',['Saving a project never creates an application.','/member/discover/','/member/saved-opportunities']);
expect('app/admin/project-operations/applications/page.tsx',['const db=privilegedDb||auth',".from('project_applications')",'if(privilegedDb){const users']);
console.log('Project interest, member Discover and Phase 5 role-neutral handoff contract passed.');
