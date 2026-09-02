import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

test('Admin can discover editable canonical drafts without bypassing the shared editor contract',()=>{
 const endpoint=read('app/api/admin/project-experience-drafts/route.ts');
 const shortcuts=read('components/ArchitectDraftEditShortcuts.tsx');
 const page=read('app/member/architect-projects/page.tsx');
 expect(endpoint).toContain("if(!ctx.isAdmin)");
 expect(endpoint).toContain(".in('governance_status',['draft','changes_requested'])");
 expect(endpoint).not.toContain("governance_status','approved'");
 expect(shortcuts).toContain("'/api/admin/project-experience-drafts'");
 expect(shortcuts).toContain('Review / edit canonical draft');
 expect(shortcuts).toContain('/member/architect-projects/${project.id}/edit');
 expect(page).toContain('<ArchitectDraftEditShortcuts isAdmin={isAdmin}/>');
});
