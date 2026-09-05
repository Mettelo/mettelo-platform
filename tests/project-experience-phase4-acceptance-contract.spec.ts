import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

test.describe('Project Experience Phase 4 acceptance boundaries',()=>{
  test('public discovery hands interest to the member journey and does not own an application form',()=>{
    const catalogue=read('app/projects/page.tsx');
    const detail=read('app/projects/[id]/page.tsx');
    const hero=read('components/project-experience/ProjectPublicDetailV2.tsx');
    const body=read('components/project-experience/ProjectPublicDetailBodyV3.tsx');
    expect(catalogue).not.toContain("import SubmissionForm");
    expect(catalogue).not.toContain('formType="project_application"');
    expect(catalogue).not.toContain('Register my interest');
    expect(catalogue).not.toContain('#interest');
    expect(catalogue).toContain('const target=`/member/discover/${id}`');
    expect(catalogue).toContain('>Submit interest</a>');
    expect(detail).toContain('const memberProjectHref=`/member/discover/${project.id}`');
    expect(detail).toContain('const signinHref=`/signin?next=${encodeURIComponent(memberProjectHref)}`');
    expect(hero).toContain('>Submit interest</Link>');
    expect(hero).not.toContain('Continue to apply');
    expect(body).toContain('Detailed eligibility and role selection happen only after authentication.');
    expect(body).toContain('>Submit interest</Link>');
    expect(body).not.toContain('Apply for role');
  });

  test('catalogue cards expose the canonical comparison metadata required for discovery',()=>{
    const catalogue=read('app/projects/page.tsx');
    const loading=read('app/projects/loading.tsx');
    for(const marker of ['Project fit','p.difficulty_level','primary?.name','Participation','Commitment','Capabilities','Contribution areas','Tools &amp; methods'])expect(catalogue).toContain(marker);
    expect(catalogue).toContain('visibleCapabilities=item.capabilities.slice(0,3)');
    expect(catalogue).toContain('availability.copy');
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain('Loading public projects');
  });

  test('public detail exposes canonical decision context without claiming automatic Proof',()=>{
    const body=read('components/project-experience/ProjectPublicDetailBodyV3.tsx');
    for(const marker of ['Supporting objectives','Key questions','In scope','Out of scope','Public resources and source provenance','Project deliverables','Success standards','Timeline &amp; Proof potential','Potential evidence from this project','How you can contribute','Basic eligibility'])expect(body).toContain(marker);
    expect(body).toContain('completing a project does not automatically create verified Mettelo Proof');
    expect(body).toContain('<strong>Source/provider:</strong>');
    expect(body).not.toContain('In partnership with');
  });

  test('public detail uses canonical availability and distinguishes load failure from empty content',()=>{
    const detail=read('app/projects/[id]/page.tsx');
    const loader=read('lib/public-project-experience-data.ts');
    const hero=read('components/project-experience/ProjectPublicDetailV2.tsx');
    expect(detail).toContain('resolveProjectPublicAvailability');
    expect(detail).toContain('const canApply=availability.acceptingInterest');
    expect(loader).toContain('loadError:boolean');
    expect(loader).toContain("console.error('public project experience projection failed'");
    expect(hero).toContain('Some project details could not be loaded.');
    expect(hero).toContain('Refresh this page to retry the detailed project brief.');
  });

  test('project-specific SEO is visibility-gated and hidden projects are not indexable',()=>{
    const detail=read('app/projects/[id]/page.tsx');
    expect(detail).toContain(".eq('visibility','public')");
    expect(detail).toContain("robots:{index:false,follow:false}");
    expect(detail).toContain('alternates:{canonical}');
    expect(detail).toContain("openGraph:{title,description,url:canonical,type:'website'}");
    expect(detail).toContain("twitter:{card:'summary',title,description}");
  });

  test('safe return survives email or social signup, verification and onboarding',()=>{
    const auth=read('app/signin/AuthAccountClient.tsx');
    const callback=read('app/auth/callback/route.ts');
    const onboarding=read('app/onboarding/page.tsx');
    const flow=read('components/OnboardingFlow.tsx');
    const complete=read('app/onboarding/complete/page.tsx');
    expect(auth).toContain("value.startsWith('/')&&!value.startsWith('//')");
    expect(auth).toContain('function onboardingDestination()');
    expect(auth).toContain('const next=socialSignup?onboardingDestination():safeNext()');
    expect(auth).toContain('flow=signup&next=${encodeURIComponent(onboarding)}');
    expect(callback).toContain("value.startsWith('/')&&!value.startsWith('//')");
    expect(onboarding).toContain("item.startsWith('/')&&!item.startsWith('//')");
    expect(onboarding).toContain('returnTo={next}');
    expect(flow).toContain('returnTo:string');
    expect(flow).toContain('/onboarding/complete?next=${encodeURIComponent(returnTo)}');
    expect(complete).toContain("item.startsWith('/')&&!item.startsWith('//')");
    expect(complete).toContain("next.startsWith('/member/discover/')");
  });

  test('authenticated member continuation consumes the same canonical participation fields as public discovery',()=>{
    const member=read('app/member/discover/[id]/page.tsx');
    expect(member).toContain('participation_mode,min_team_size,target_team_size,max_team_size,team_size_threshold');
    expect(member).toContain('participationMode:project.participation_mode');
    expect(member).toContain('minTeamSize:project.min_team_size');
    expect(member).toContain('targetTeamSize:project.target_team_size');
    expect(member).toContain('maxTeamSize:project.max_team_size');
  });
});
