import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260831143000_capability_paths_foundation.sql'),'utf8');
const foundation=fs.readFileSync(path.join(root,'docs/CAPABILITY_PATHS_PHASE_1_FOUNDATION.md'),'utf8');
const dbAcceptance=fs.readFileSync(path.join(root,'tests/capability-paths-phase-1-db.spec.ts'),'utf8');

function expectContainsAll(source:string,values:string[]){for(const value of values)expect(source,`missing ${value}`).toContain(value)}

test.describe('Capability Paths Phase 1 foundation contract',()=>{
 test('keeps paths, domains, capabilities, tools, methods and Proof conceptually separate',()=>{
  expectContainsAll(foundation,[
   '**Project**','**Capability Path**','**Industry / Domain**','**Capability**','**Tool**','**Method**','**Proof**',
   '`domains` + `project_domains`','`tools` + `project_tools`','`methods` + `project_methods`'
  ]);
 });

 test('uses a many-to-many canonical project placement model',()=>{
  expectContainsAll(migration,[
   'create table if not exists public.capability_paths',
   'create table if not exists public.capability_path_stages',
   'create table if not exists public.capability_path_projects',
   'project_id uuid not null references public.projects(id) on delete cascade',
   'primary key(path_id,project_id)',
   'constraint capability_path_projects_path_position_key unique(path_id,position)'
  ]);
  expect(foundation).toContain('one project ID, one public URL, one application flow, one delivery workspace and one Proof history');
 });

 test('makes stage and prerequisite relationships path-safe',()=>{
  expectContainsAll(migration,[
   'constraint capability_path_projects_stage_fk foreign key(path_id,stage_id)',
   'references public.capability_path_stages(path_id,id)',
   'foreign key(path_id,prerequisite_project_id)',
   'references public.capability_path_projects(path_id,project_id)',
   'deferrable initially deferred',
   "prerequisite_mode text not null default 'recommended'",
   'capability_path_projects_no_self_prerequisite_check'
  ]);
 });

 test('normalises technical and professional capabilities without replacing tools or methods',()=>{
  expectContainsAll(migration,[
   'create table if not exists public.capabilities',
   "check (capability_type in ('technical','professional'))",
   'create table if not exists public.project_capabilities'
  ]);
  expect(foundation).toContain('Legacy `profiles.skills[]` remains backward-compatible');
 });

 test('keeps member completion server authoritative',()=>{
  expectContainsAll(migration,[
   'create table if not exists public.member_capability_paths',
   "status in ('following','paused','completed')",
   "and status='following'",
   "and status in ('following','paused') and completed_at is null"
  ]);
  expect(foundation).toContain('does **not** store project completion');
  expect(foundation).toContain('must never count as project completion');
 });

 test('protects draft, archived and non-public project placement data through RLS',()=>{
  expectContainsAll(migration,[
   'alter table public.capability_paths enable row level security',
   "for select to public using (status='published' or public.is_admin())",
   "p.id=capability_path_projects.project_id and p.visibility='public'",
   'for select to authenticated using (user_id=(select auth.uid()) or public.is_admin())'
  ]);
 });

 test('documents the complete workbook mapping before any import',()=>{
  expectContainsAll(foundation,[
   '| Career Path | `capability_paths` |',
   '| Project # | `capability_path_projects.position` |',
   '| Stage | `capability_path_stages` + `stage_id` |',
   '| Competency Focus | `capability_path_projects.competency_focus` |',
   '| Capability Built | `capability_path_projects.capability_built` |',
   '| Prerequisite | `prerequisite_project_id` |',
   '| Industry / Domain | `domains` + `project_domains` |',
   '| Technical Skills | `capabilities` + `project_capabilities` |',
   '| Professional Skills | `capabilities` + `project_capabilities` |',
   '| Tools | `tools` + `project_tools` |',
   '| Methods | `methods` + `project_methods` |'
  ]);
 });

 test('defines idempotent import, governance and rollback gates but performs no workbook import',()=>{
  expectContainsAll(foundation,['`reuse_existing`','`create_new`','`enrich_existing`','`ambiguous`','`reject`','**GREEN**','**AMBER**','**RED**','## Rollback and recovery contract']);
  expect(foundation).toContain('Phase 1 does not upload workbook documents or datasets.');
  expect(migration).not.toMatch(/insert\s+into\s+public\.capability_paths/i);
 });

 test('requires a real isolated-database acceptance test in addition to static source assertions',()=>{
  expectContainsAll(dbAcceptance,[
   "test.skip(!canRun,'Runs only against the disposable isolated Supabase release-gate database.')",
   'place canonical project in two paths',
   'duplicate path position must be rejected',
   'stage from another path must be rejected',
   'prerequisite from another path must be rejected',
   'project cannot be its own prerequisite',
   'expect(membershipAfter).toBe(membershipBefore)',
   'expect(proofAfter).toBe(proofBefore)'
  ]);
 });
});
