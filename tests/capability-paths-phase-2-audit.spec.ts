import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const api=fs.readFileSync('app/api/admin/capability-paths/route.ts','utf8');
const manager=fs.readFileSync('components/AdminCapabilityPathsManager.tsx','utf8');
const preview=fs.readFileSync('components/CapabilityPathPreview.tsx','utf8');
const projectPage=fs.readFileSync('app/admin/project-operations/projects/[id]/page.tsx','utf8');
const migration=fs.readFileSync('supabase/migrations/20260831154500_capability_paths_admin_governance.sql','utf8');
const adminHome=fs.readFileSync('app/admin/page.tsx','utf8');
function hasAll(source:string,values:string[]){for(const value of values)expect(source,`missing ${value}`).toContain(value)}

test.describe('Capability Paths Phase 2 Admin contract',()=>{
 test('Capability Paths are discoverable and governed through Admin rather than GitHub',()=>{expect(adminHome).toContain("['Capability Paths'");expect(adminHome).toContain("'/admin/capability-paths'");hasAll(manager,['Create Capability Path','Create as Draft','Save details','Save stages & placements','Preview','Publish','Archive','Restore to Draft','Move to Draft to edit'])});
 test('Admin reuses canonical projects and owns path-specific placement meaning',()=>{hasAll(manager,['Add existing project','Competency focus','Capability built','Prerequisite','Path-specific outcome','Placement type']);expect(manager).toContain('This canonical project is already in the Path.');expect(api).toContain("db.from('projects').select('id,slug,title,status,visibility,project_type')");expect(api).toContain('The same project cannot appear twice in one path.')});
 test('structure replacement is atomic and never mutates canonical project records',()=>{hasAll(migration,['admin_replace_capability_path_structure','delete from public.capability_path_projects','delete from public.capability_path_stages','grant execute on function public.admin_replace_capability_path_structure']);expect(migration).not.toMatch(/delete from public\.projects|update public\.projects/i);expect(api).toContain("db.rpc('admin_replace_capability_path_structure'")});
 test('published Paths are read-only until explicitly returned to Draft',()=>{hasAll(api,["action==='edit-draft'",'Published and archived Paths are read-only','Only a published Path can be moved back to Draft for editing.']);expect(api).not.toContain("action==='delete'");expect(manager).toContain('Published Path is protected')});
 test('lifecycle history is preserved rather than erased on restore',()=>{hasAll(migration,['capability_path_lifecycle_events','restored_at','restored_by','Append-only Capability Path lifecycle history']);hasAll(api,["lifecycleEvent(db,id,'archived'","lifecycleEvent(db,id,'restored'","lifecycleEvent(db,id,'published'","archived_at:current.archived_at"]);expect(api).not.toContain('archived_at:null')});
 test('stage rename and prerequisite progression integrity are protected',()=>{hasAll(api,['oldSlugById','renamedSlugs','A prerequisite must appear earlier in the Path']);hasAll(manager,['renameStageSlug','prerequisiteIndex<index'])});
 test('project authoring exposes Path context and canonical capabilities',()=>{hasAll(projectPage,['AdminProjectCapabilityPaths','AdminProjectCapabilities','Manage Capability Paths']);hasAll(api,["mode==='project-capabilities'","action==='set-project-capabilities'","admin_replace_project_capabilities"]);hasAll(migration,['admin_replace_project_capabilities','One or more capabilities are invalid or inactive'])});
 test('preview, keyboard reordering and unsaved-work protection are present',()=>{expect(manager).toContain('import CapabilityPathPreview');expect(preview).toContain('CAPABILITY PATH PREVIEW');hasAll(manager,['Move ${stage.name} up','Move ${stage.name} down','Move project ${index+1} up','Move project ${index+1} down','Unsaved changes','beforeunload','Discard them and open another Path?'])});
 test('Path listing is server paginated and project discovery remains query based',()=>{hasAll(api,["page_size","{count:'exact'}",".range(from,from+pageSize-1)","mode==='projects'",".limit(30)"]);expect(manager).toContain('PAGE_SIZE=25');expect(migration).toContain('No workbook data is imported');expect(migration).not.toMatch(/insert\s+into\s+public\.capability_paths/i)});
});
