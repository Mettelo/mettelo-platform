import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const nav=fs.readFileSync('lib/member-navigation.ts','utf8');
const projectsLayout=fs.readFileSync('app/member/projects/layout.tsx','utf8');
const projectsPage=fs.readFileSync('app/member/projects/page.tsx','utf8');
const directionStrip=fs.readFileSync('components/MemberProjectsCapabilityPathStrip.tsx','utf8');
const discoverPagination=fs.readFileSync('components/MemberDiscoverPagination.tsx','utf8');

function hasAll(source:string,values:string[]){for(const value of values)expect(source,`missing ${value}`).toContain(value)}

test.describe('My Projects and Discover UX contract',()=>{
  test('member project portfolio is clearly distinguished from project discovery',()=>{
    hasAll(nav,["label:'My Projects',href:'/member/projects',description:'Ongoing and completed project work'","label:'Discover',href:'/member/discover'"]);
    hasAll(projectsPage,['id="projects-title">My Projects','Manage the projects you’ve joined.','Continue active work','track projects preparing to start','revisit completed work','Proof you built',"value==='current'?'Ongoing'"]);
  });

  test('Primary Direction belongs to the My Projects content hierarchy and shares its width',()=>{
    expect(projectsLayout).not.toContain('MemberProjectsCapabilityPathStrip');
    hasAll(projectsPage,['MemberProjectsCapabilityPathStrip','<MemberProjectsCapabilityPathStrip/>']);
    expect(projectsPage.indexOf('<MemberProjectsCapabilityPathStrip/>')).toBeGreaterThan(projectsPage.indexOf('</header>'));
    expect(projectsPage.indexOf('<MemberProjectsCapabilityPathStrip/>')).toBeLessThan(projectsPage.indexOf('aria-label="Project portfolio summary"'));
    hasAll(directionStrip,['.mppStrip{width:100%;margin:18px 0 0','box-sizing:border-box','@media(max-width:680px)']);
    expect(directionStrip).not.toContain('width:min(calc(100% - 32px),1240px)');
  });

  test('Discover paginates nine projects with numbered desktop controls and compact mobile controls',()=>{
    hasAll(discoverPagination,['const PAGE_SIZE=9','function pageItems','aria-label="Discover project pages"','aria-label="Choose project page"','aria-label={`Page ${item}`}','aria-current={item===page?\'page\':undefined}','Showing {start}–{end} of {count}','.mdPageNumbers{display:none}']);
    expect(discoverPagination).not.toContain('const PAGE_SIZE=12');
  });
});
