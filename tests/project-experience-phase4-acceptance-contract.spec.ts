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

  test('public detail exposes canonical decision context without claiming automatic Proof',()=>{
    const body=read('components/project-experience/ProjectPublicDetailBodyV3.tsx');
    for(const marker of ['Supporting objectives','Key questions','In scope','Out of scope','Public resources and source provenance','Project deliverables','Success standards','Timeline & Proof potential','Potential evidence from this project','How you can contribute','Basic eligibility'])expect(body).toContain(marker);
    expect(body).toContain('completing a project does not automatically create verified Mettelo Proof');
    expect(body).toContain('<strong>Source/provider:</strong>');
    expect(body).not.toContain('In partnership with');
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
});
