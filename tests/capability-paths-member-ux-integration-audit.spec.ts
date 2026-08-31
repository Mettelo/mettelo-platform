import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const nav=fs.readFileSync('lib/member-navigation.ts','utf8');
const layout=fs.readFileSync('app/member/layout.tsx','utf8');
const context=fs.readFileSync('components/MemberPathContextSurface.tsx','utf8');
const summary=fs.readFileSync('components/MemberCapabilityPathSummary.tsx','utf8');
const pathsPage=fs.readFileSync('app/member/paths/page.tsx','utf8');
const panel=fs.readFileSync('components/MemberCapabilityPathsPanel.tsx','utf8');
const discover=fs.readFileSync('app/member/discover/page.tsx','utf8');
const catalogue=fs.readFileSync('components/MemberDiscoverCatalogue.tsx','utf8');
const projectsStrip=fs.readFileSync('components/MemberProjectsCapabilityPathStrip.tsx','utf8');
const recommended=fs.readFileSync('app/member/recommended/layout.tsx','utf8');
const projects=fs.readFileSync('app/member/projects/page.tsx','utf8');
const proof=fs.readFileSync('app/member/proof/page.tsx','utf8');
const lab=fs.readFileSync('components/MetteloLabCapabilityPathContext.tsx','utf8');

function hasAll(source:string,values:string[]){for(const value of values)expect(source,`missing ${value}`).toContain(value)}

test.describe('Capability Paths member UX integration',()=>{
  test('member IA separates work, direction/discovery and community without crowding mobile nav',()=>{
    hasAll(nav,["label:'My Work'","label:'Direction & Discovery'","label:'Opportunities & Community'","label:'Capability Paths',href:'/member/paths'"]);
    hasAll(nav,["label:'Home'","label:'Projects'","label:'Discover'","label:'Proof'","label:'More'"]);
    const persistent=nav.slice(nav.indexOf('mobilePersistentNav'),nav.indexOf('mobileMoreNav'));expect(persistent).not.toContain("label:'Capability Paths'");
  });
  test('Home and Profile receive lightweight professional-direction context, not full management panels',()=>{
    hasAll(layout,['MemberPathContextSurface']);hasAll(context,["pathname==='/member'||pathname==='/member/profile'","mode=overview","if(!visible||!loaded)return null"]);hasAll(summary,['YOUR DIRECTION','PROFESSIONAL DIRECTION','Manage Paths','Explore Capability Paths','min-height:44px']);expect(context).not.toContain('MemberCapabilityPathsPanel');
  });
  test('dedicated member Paths page owns management and team-lifecycle explanation',()=>{
    hasAll(pathsPage,['DIRECTION & DISCOVERY · CAPABILITY PATHS','Build with direction','MemberCapabilityPathsPanel','Multiple directions','Team projects stay team projects','One project, many contexts','Proof stays evidence-led']);hasAll(panel,['PRIMARY DIRECTION','OTHER DIRECTIONS','NEXT RECOMMENDED','View full roadmap','Manage','Make primary','Pause Path','Resume Path','Unfollow Path']);
  });
  test('Discover remains broad and uses Path context as structured metadata',()=>{
    expect(discover).not.toContain('MemberCapabilityPathsPanel');hasAll(discover,['MemberCapabilityPathFilters','summary:project.summary','pathContext:primaryContext','they never restrict what you can discover']);hasAll(catalogue,['mdPathContext','Capability Path context','Discover is broad. Recommended is personalised.']);expect(discover).not.toContain('pathSummary?');
  });
  test('Recommended gives sequence first while paused Paths stop guiding actions',()=>{hasAll(recommended,['RECOMMENDED FOR YOUR DIRECTION','NEXT IN PRIMARY PATH','nearest currently available project','Manage Paths',"followStatus==='paused'"])});
  test('Projects and Lab keep compact Path context while team formation remains canonical',()=>{hasAll(projectsStrip,['PRIMARY DIRECTION','View Path','min-height:44px']);hasAll(projects,['PREPARING TO START','Team forming','team_size_threshold','places filled','Mettelo Lab will only open when the project is ready']);hasAll(lab,['CAPABILITY PATH','Project'])});
  test('Proof remains evidence-first and is not converted into Path progress UI',()=>{hasAll(proof,["eq('verification_status','verified')",'Proof is sourced only from contribution evidence']);expect(proof).not.toContain('MemberCapabilityPathsPanel');expect(proof).not.toContain('completionRatio')});
  test('Path surfaces include accessible state, focus, touch and reduced motion treatment',()=>{hasAll(panel,['role="progressbar"','aria-valuemin','aria-valuemax','aria-valuenow','min-height:44px','focus-visible','prefers-reduced-motion']);hasAll(catalogue,['Capability Path context','min-height:44px','focus-visible','prefers-reduced-motion'])});
  test('Path language avoids course framing and preserves evidence separation',()=>{expect(pathsPage.toLowerCase()).not.toContain('curriculum');expect(pathsPage.toLowerCase()).not.toContain('course');hasAll(pathsPage,['Verified Proof','Project completion can move Path progress']);hasAll(summary,['profile describes your professional context'])});
});
