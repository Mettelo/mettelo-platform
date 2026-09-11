import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const expect=(path,needles)=>{const source=read(path);const missing=needles.filter(needle=>!source.includes(needle));if(missing.length)throw new Error(path+' missing '+missing.join(', '));};
const forbid=(path,needles)=>{const source=read(path);const found=needles.filter(needle=>source.includes(needle));if(found.length)throw new Error(path+' contains forbidden '+found.join(', '));};

// Public catalogue and project detail remain the public discovery entry point.
expect('app/projects/page.tsx',['PublicProjectFilters','loadPublicProjectCatalogue']);
expect('app/projects/[id]/page.tsx',["href={`/signin?next=${encodeURIComponent(`/member/discover/${project.id}`)}`}",'Submit interest']);

// Member Discover is a first-class member destination and carries one project truth into project detail.
expect('lib/member-navigation.ts',["{label:'Discover',href:'/member/discover'","{label:'Saved',href:'/member/saved'"]);
expect('components/MemberAppShell.tsx',["href=\"/member/discover\"","isActive('/member/discover')",'hasProjectBreadcrumb']);
expect('app/member/discover/page.tsx',['loadMemberDiscoverProjects',".from('project_applications')",".from('project_members')",".from('saved_projects')",'calculateMemberReadiness','applicationReadiness.ready','resolveMemberProjectState','memberProjectCatalogueAction']);
expect('lib/member-discover-project-loader.ts',[".from('projects')",'project_roles(id,title,canonical_role_key,skills,openings)','PRIMARY_SELECT','CORE_FACET_SELECT','MINIMAL_SELECT']);
forbid('app/member/discover/page.tsx',['career_roles','career_applications','/careers/','PROFILE_APPLICATION_READY']);
expect('components/MemberDiscoverCatalogue.tsx',['Search projects, roles, skills, tools or industries','Career / Role','Experience Level','Solo / Team','More filters','Filters · {activeCount}','Skills you want to build','Industry','Tools &amp; technologies','Weekly commitment','Working model','Project source','Availability','Show {visible.length}','Discover is broad. Recommended is personalised.','position:fixed;inset:0 0 0 auto','showModal()','aria-haspopup="dialog"']);

// Member Project Detail separates viewer state, application openness and current placement capacity.
expect('app/member/discover/[id]/page.tsx',[".in('visibility',['public','members'])",'calculateMemberReadiness','applicationReadiness.ready','applicationReadiness.missing','project_members','loadMemberProjectTeamState','resolveMemberProjectState','capacityAvailable:teamState.capacityAvailable','capacityKnown:teamState.known']);
forbid('app/member/discover/[id]/page.tsx',['PROFILE_APPLICATION_READY']);
expect('lib/member-project-journey.ts',['Capacity describes placement, not whether an open project may collect interest.',"return{state:'open_eligible',reason:'ELIGIBLE',eligible:true}",'Applications open','Your place is confirmed','Project in progress']);
expect('components/project-experience/MemberProjectDetailV2.tsx',["label:'Submit Interest'",'Participation','Capacity','Applications','Minimum to start','Target team','Maximum team','Solo place currently allocated','You can still submit interest while applications remain open.','member-decision-title','decisionHeadingRef.current?.focus()','MemberProjectDetailBodyV3','contributionAreas','teamState']);
expect('components/project-experience/MemberProjectDetailBodyV3.tsx',['Possible contribution areas','What happens after you submit interest','Submit Interest','canApply&&<div className={styles.mobileAction}','href={`/member/discover/${projectId}/apply`}']);

// Submit Interest is the five-stage applicant-preference journey and stays on the canonical endpoint.
expect('app/member/discover/[id]/apply/page.tsx',['calculateMemberReadiness','applicationReadiness.ready','resolveMemberProjectState',"state!=='open_eligible'",'MemberProjectApplicationFlow',".from('project_roles')",".eq('project_id',id)",".eq('role_status','open')",'profileSkills']);
forbid('app/member/discover/[id]/apply/page.tsx',['PROFILE_APPLICATION_READY','requestedRole','initialRoleId','availableRoles[0]?.id']);
expect('lib/project-admission.ts',["if(mode==='solo')return['solo']","if(mode==='team')return['team','flexible']","return['solo','team','flexible']",'value===\'either\'?\'flexible\':value']);
expect('components/MemberProjectApplicationFlow.tsx',["const labels=['Participation','Role & contribution','Availability','Fit','Review']",'participationOptions(project.participationMode)','Primary role','Second-choice role','Relevant contribution areas','Published project commitment','Can you meet this commitment?','Collaboration availability','Why do you want to work on this project?','Relevant skills','What would you contribute?','Review title="Project"','Review title="Participation mode"','Review title="Role & contribution"','Review title="Availability"','Review title="Fit"','PROJECT_PARTICIPATION_TERMS_SUMMARY','PROJECT_PARTICIPATION_TERMS_FULL','PROJECT_PARTICIPATION_TERMS_VERSION','terms_accepted:true','terms_version:PROJECT_PARTICIPATION_TERMS_VERSION','working||!acceptedTerms','/api/project-applications',"application_kind:'interest'",'participation_preference:participation','secondary_project_role_id','leadership_interest:isSolo?false:leadership','localStorage','if(working)return','Submitting…','Submit Interest','Your responses are still here.','View interest','Back to project']);
forbid('components/MemberProjectApplicationFlow.tsx',['Relevant evidence URL',"fetch('/api/project-terms'",'terms_attachment_id','Open terms ↗','document is not currently published']);
expect('components/ProjectApplicationForm.tsx',['Continue this project application inside My Mettelo.',"/member/discover/${selected.id}/apply"]);
forbid('components/ProjectApplicationForm.tsx',["fetch('/api/project-applications'",'project_role_catalogue']);

// Signup/onboarding keeps project intent instead of dumping a new member at Home.
expect('middleware.ts',['normalizeProjectIntent','mettelo_return_to','request.nextUrl.search','/signin']);
expect('app/auth/continue-after-onboarding/route.ts',['mettelo_return_to','maxAge:0','NextResponse.redirect']);

console.log('Project interest flow audit passed.');
