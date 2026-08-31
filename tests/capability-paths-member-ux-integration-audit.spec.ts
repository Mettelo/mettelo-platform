import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const nav=fs.readFileSync('lib/member-navigation.ts','utf8');
const layout=fs.readFileSync('app/member/layout.tsx','utf8');
const context=fs.readFileSync('components/MemberPathContextSurface.tsx','utf8');
const summary=fs.readFileSync('components/MemberCapabilityPathSummary.tsx','utf8');
const pathsPage=fs.readFileSync('app/member/paths/page.tsx','utf8');
const discover=fs.readFileSync('app/member/discover/page.tsx','utf8');
const projectsStrip=fs.readFileSync('components/MemberProjectsCapabilityPathStrip.tsx','utf8');
const recommended=fs.readFileSync('app/member/recommended/layout.tsx','utf8');
const lab=fs.readFileSync('components/MetteloLabCapabilityPathContext.tsx','utf8');

function hasAll(source:string,values:string[]){for(const value of values)expect(source,`missing ${value}`).toContain(value)}

test.describe('Capability Paths member UX integration',()=>{
  test('Capability Paths has a dedicated member IA destination without displacing core mobile actions',()=>{
    hasAll(nav,["label:'Capability Paths',href:'/member/paths'","description:'Professional directions'"]);
    hasAll(nav,["label:'Home'","label:'Projects'","label:'Discover'","label:'Proof'","label:'More'"]);
    expect(nav).not.toContain("{label:'Capability Paths',href:'/member/paths',description:'Professional directions'},\n  {label:'Proof'");
  });

  test('Home and Profile receive lightweight professional-direction context, not full management panels',()=>{
    hasAll(layout,['MemberPathContextSurface']);
    hasAll(context,["pathname==='/member'||pathname==='/member/profile'","mode=overview","context={pathname==='/member'?'home':'profile'}"]);
    hasAll(summary,['YOUR DIRECTION','PROFESSIONAL DIRECTION','Manage Paths','Explore Capability Paths']);
    expect(context).not.toContain('MemberCapabilityPathsPanel');
  });

  test('dedicated member Paths page owns follow, pause, primary and roadmap management',()=>{
    hasAll(pathsPage,['MY METTELO · CAPABILITY PATHS','Build with direction','MemberCapabilityPathsPanel','Direction, not restriction','One project, many contexts','Progress from work']);
  });

  test('Discover remains a broad catalogue and uses Paths only as optional context/filtering',()=>{
    expect(discover).not.toContain('MemberCapabilityPathsPanel');
    hasAll(discover,['MemberCapabilityPathFilters','Manage Capability Paths','Explore Capability Paths','they never restrict what you can discover','Want a clearer route through the catalogue?']);
  });

  test('existing project execution surfaces keep compact contextual Path treatment',()=>{
    hasAll(projectsStrip,['PRIMARY CAPABILITY PATH','nextProject','View Path']);
    hasAll(recommended,['PRIMARY CAPABILITY PATH','Continue','nextAvailableProject']);
    hasAll(lab,['CAPABILITY PATH','Project']);
  });

  test('Path language preserves Proof and canonical-project separation',()=>{
    hasAll(pathsPage,['Verified Proof stays a distinct evidence signal']);
    hasAll(summary,['Capability Paths describe professional directions']);
    expect(pathsPage).not.toContain('course');
    expect(pathsPage).not.toContain('curriculum');
  });
});
