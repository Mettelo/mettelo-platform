import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const expect=(path,needles)=>{const source=read(path);const missing=needles.filter(needle=>!source.includes(needle));if(missing.length)throw new Error(path+' missing '+missing.join(', '));};
const forbid=(path,needles)=>{const source=read(path);const found=needles.filter(needle=>source.includes(needle));if(found.length)throw new Error(path+' contains forbidden '+found.join(', '));};

// Public catalogue and project detail remain the public discovery entry point.
expect('app/projects/page.tsx',['PublicProjectFilters','loadPublicProjectCatalogue','get_public_project_capacities']);
expect('app/projects/[id]/page.tsx',["const memberProjectHref=`/member/discover/${project.id}`",'get_public_project_capacities','safeRelativeNext','ctaHref={ctaHref}']);
expect('components/project-experience/ProjectPublicDetailV2.tsx',['href={ctaHref}>Submit interest</Link>',"authenticated?'Your eligibility and application state are checked in My Mettelo.':'Sign in or create an account to continue with this project.'"]);

// Member Discover is a first-class member destination and carries one canonical project truth into project detail.
expect('lib/member-navigation.ts',["{label:'Discover',href:'/member/discover'","{label:'Saved',href:'/member/saved'"]);
expect('components/MemberAppShell.tsx',["href=\"/member/discover\"","isActive('/member/discover')",'hasProjectBreadcrumb']);
expect('app/member/discover/page.tsx',['loadMemberDiscoverProjects',".from('project_applications')",".from('project_members')",".from('saved_projects')",'calculateMemberReadiness','applicationReadiness.ready','resolveMemberProjectState','memberProjectCatalogueAction']);
expect('lib/member-discover-project-loader.ts',[".from('projects')",'project_roles(id,title,canonical_role_key,skills,openings)','PRIMARY_SELECT','refusing stale fallback projection']);
forbid('lib/member-discover-project-loader.ts',['CORE_FACET_SELECT','MINIMAL_SELECT','retrying legacy']);
forbid('app/member/discover/page.tsx',['career_roles','career_applications','/careers/','PROFILE_APPLICATION_READY']);
expect('components/MemberDiscoverCatalogue.tsx',['Search projects, roles, skills, tools or industries','Career / Role','Experience Level','Solo / Team','More filters','Filters · {activeCount}','Skills you want to build','Industry','Tools &amp; technologies','Weekly commitment','Working model','Project source','Availability','Show {visible.length}','Discover is broad. Recommended is personalised.','position:fixed;inset:0 0 0 auto','showModal()','aria-haspopup="dialog"']);

// Member Project Detail separates viewer state, application openness and current placement capacity.
expect('app/member/discover/[id]/page.tsx',[".in('visibility',['public','members'])",'calculateMemberReadiness','applicationReadiness.ready','applicationReadiness.missing','project_members','loadMemberProjectTeamState','resolveMemberProjectState','capacityAvailable:teamState.capacityAvailable','capacityKnown:teamState.known']);
forbid('app/member/discover/[id]/page.tsx',['PROFILE_APPLICATION_READY']);
expect('lib/member-project-journey.ts',['Capacity describes placement, not whether an open project may collect interest.',"return{state:'open_eligible',reason:'ELIGIBLE',eligible:true}",'Applications open','Your place is confirmed','Project in progress']);
expect('components/project-experience/MemberProjectDetailV2.tsx',["label:'Submit Interest'",'Participation','Capacity','Applications','Minimum to start','Target team','Maximum team','Solo place currently allocated','You can still submit interest while applications remain open.','member-decision-title','decisionHeadingRef.current?.focus()','MemberProjectDetailBodyV3','contributionAreas','teamState']);
expect('components/project-experience/MemberProjectDetailBodyV3.tsx',['Possible contribution areas','What happens after you submit interest','Submit Interest','canApply&&<div className={styles.mobileAction}','href={`/member/discover/${projectId}/apply`}']);

// Submit Interest is a five-stage role-neutral preference journey. Formal allocation happens later.
expect('app/member/discover/[id]/apply/page.tsx',['calculateMemberReadiness','applicationReadiness.ready','resolveMemberProjectState',"state!=='open_eligible'",'MemberProjectInterestFlow','You do not choose a formal team role at this stage.']);
forbid('app/member/discover/[id]/apply/page.tsx',['PROFILE_APPLICATION_READY','requestedRole','initialRoleId','availableRoles[0]?.id',".from('project_roles')"]);
expect('lib/project-admission.ts',["if(mode==='solo')return['solo']","if(mode==='team')return['team','flexible']","return['solo','team','flexible']",'value===\'either\'?\'flexible\':value']);
expect('components/MemberProjectInterestFlow.tsx',["const steps=['Participation','Contribution','Availability','Fit','Review']",'participationOptions(project.participationMode)','No formal role is selected at this stage.','Contribution areas','Published commitment','Can you meet this commitment?','Collaboration availability','Why do you want to work on this project?','Relevant skills','What would you contribute?','PROJECT_PARTICIPATION_TERMS_SUMMARY','PROJECT_PARTICIPATION_TERMS_FULL','PROJECT_PARTICIPATION_TERMS_VERSION','terms_accepted:true','terms_version:PROJECT_PARTICIPATION_TERMS_VERSION','/api/project-applications',"application_kind:'interest'",'participation_preference:participation','project_role_id:null','secondary_project_role_id:null','leadership_interest:isSolo?false:leadership','localStorage','if(working)return','Submitting…','Submit Interest','Your responses are still here.','View interest','Back to project']);
forbid('components/MemberProjectInterestFlow.tsx',['Primary role','Second-choice role','Choose a primary role','Relevant evidence URL',"fetch('/api/project-terms'",'terms_attachment_id','Open terms ↗','document is not currently published']);
expect('components/ProjectApplicationForm.tsx',['Continue this project application inside My Mettelo.',"/member/discover/${selected.id}/apply"]);
forbid('components/ProjectApplicationForm.tsx',["fetch('/api/project-applications'",'project_role_catalogue']);

// Signup/onboarding keeps project intent instead of dumping a new member at Home.
expect('middleware.ts',['normalizeProjectIntent','mettelo_return_to','request.nextUrl.search','/signin']);
expect('app/auth/continue-after-onboarding/route.ts',['mettelo_return_to','maxAge:0','NextResponse.redirect']);

console.log('Project interest flow audit passed.');
