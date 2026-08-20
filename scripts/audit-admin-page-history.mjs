import fs from 'node:fs';

const checks=[
 ['supabase/migrations/20260820160000_website_page_revision_history.sql',['website_page_revisions','unique(page_key,revision_number)','revoke all on public.website_page_revisions from anon, authenticated','grant select on public.website_page_revisions to service_role','publish_website_page_with_revision','pg_advisory_xact_lock','restored_publish','restored_from_revision_id','baseline','revoke all on function public.publish_website_page_with_revision','grant execute on function public.publish_website_page_with_revision']],
 ['app/api/admin/website/pages/route.ts',['restored_from_revision_id','publish_website_page_with_revision','revision_id','revision_number','website.page.published','Atomic Website page publish returned no revision']],
 ['app/api/admin/website/pages/history/route.ts',['page_size','100','website_page_revisions','restore_draft','website.page.revision.restored_to_draft','restored_from_revision_id','Website content capability required.']],
 ['app/admin/website/pages/history/page.tsx',['AdminWebsitePageHistory','website.content.edit','WEBSITE_PAGE_FIELDS','WEBSITE_PAGE_LABELS']],
 ['components/AdminWebsitePageHistory.tsx',['Revision history','Restore as draft','Confirm restore','The live page will remain unchanged','25','50','100','pageHistoryTableWrap','aria-live="polite"','@media(max-width:480px)','font-size:16px']],
 ['components/AdminWebsitePagesEditor.tsx',['Revision history →','appends an immutable revision','body.revision?.number']],
 ['tests/admin-website-page-history.spec.ts',['restore_draft','restored_publish','public page remains','Revision history','390,768,1440']]
];
let failed=false;let passed=0;
for(const [file,needles] of checks){
 if(!fs.existsSync(file)){console.error(`FAIL missing ${file}`);failed=true;continue}
 const source=fs.readFileSync(file,'utf8');const missing=needles.filter(needle=>!source.includes(needle));
 if(missing.length){console.error(`FAIL ${file}: missing ${missing.join(', ')}`);failed=true}else{console.log(`PASS ${file}`);passed++}
}
if(failed)process.exit(1);
console.log(`Admin Website page history audit passed: ${passed}/${checks.length} files.`);
