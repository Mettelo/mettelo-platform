import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const projects=fs.readFileSync('app/projects/page.tsx','utf8');
const publicFilters=fs.readFileSync('components/PublicProjectFilters.tsx','utf8');
const index=fs.readFileSync('app/projects/paths/page.tsx','utf8');
const detail=fs.readFileSync('app/projects/paths/[slug]/page.tsx','utf8');
const data=fs.readFileSync('lib/capability-paths-public.ts','utf8');
const projectFit=fs.readFileSync('components/PublicProjectCapabilityPaths.tsx','utf8');
const projectLayout=fs.readFileSync('app/projects/[id]/layout.tsx','utf8');
const styles=fs.readFileSync('app/projects/capability-paths-public.css','utf8');

function hasAll(source:string,values:string[]){for(const value of values)expect(source,`missing ${value}`).toContain(value)}

test.describe('Capability Paths Phase 3 public contract',()=>{
 test('public Paths are additive to the existing Projects system',()=>{
  hasAll(projects,['PublicCapabilityPathsSection','PublicProjectFilters','getPublishedCapabilityPaths','getPublishedPathProjectPositions','pathOptions','selectedPath','item.pathSlugs.includes(selectedPath)','project_domains','project_tools']);
  hasAll(publicFilters,['name="path"','All Capability Paths','Capability Path']);
  expect(projects).toContain('paths={pathOptions}');
  expect(projects).toContain("if(selectedPath!=='all')query.set('path',selectedPath)");
 });

 test('only published Paths and public projects are exposed through the public data layer',()=>{
  expect(data).toContain(".eq('status','published')");
  expect(data).toContain(".eq('visibility','public')");
  expect(data).not.toContain('serviceDb');
  expect(detail).toContain('notFound()');
 });

 test('Path pages are data-driven and preserve canonical project URLs',()=>{
  hasAll(index,['getPublishedCapabilityPaths','/projects/paths/${path.slug}']);
  hasAll(detail,['getPublishedCapabilityPath','path.stages.map','stageProjects','competency_focus','capability_built']);
  expect(detail).toContain('href={`/projects/${project.id}?path=${encodeURIComponent(path.slug)}`}');
  expect(detail).not.toContain('/projects/paths/${path.slug}/projects/');
 });

 test('canonical project detail exposes multi-Path fit without duplicating project content',()=>{
  expect(projectLayout).toContain('PublicProjectCapabilityPaths');
  hasAll(projectFit,['Where this project fits.','item.path.name','item.capability_built','/projects/paths/${item.path.slug}']);
  expect(projectFit).toContain('one canonical Mettelo project');
 });

 test('public copy frames Paths as professional direction rather than courses or certification',()=>{
  hasAll(index,['recommended professional progression','do not lock you into a curriculum']);
  hasAll(detail,['A Path gives direction, not restriction.','recommended progression']);
  expect(`${index}\n${detail}`).not.toMatch(/certified|accredited|guaranteed job/i);
 });

 test('roadmap has deliberate responsive reflow rather than a forced horizontal timeline',()=>{
  hasAll(styles,['@media(max-width:1000px)','@media(max-width:680px)','.capabilityPathStage{grid-template-columns:1fr}', '.capabilityPathProject{grid-template-columns:40px minmax(0,1fr)']);
  expect(styles).not.toContain('white-space:nowrap');
 });
});
