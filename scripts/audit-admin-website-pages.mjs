import fs from 'node:fs';

const governedRoutes={
 home:'app/page-content.tsx',about:'app/about/AboutPageContent.tsx',contact:'app/contact/ContactPageContent.tsx',
 organisations:'app/organisations/page.tsx',community:'app/community/page.tsx',projects:'app/projects/page.tsx',opportunities:'app/opportunities/page.tsx',showcase:'app/showcase/page.tsx',events:'app/events/page.tsx',people:'app/people/page.tsx',spotlight:'app/spotlight/page.tsx',blog:'app/blog/page.tsx',careers:'app/careers/page.tsx',faq:'app/faq/page.tsx',partnership:'app/partnership/page.tsx',feedback:'app/feedback/page.tsx',community_guidelines:'app/community-guidelines/page.tsx'
};
const checks=[
 ['components/AdminShell.tsx',['Pages','/admin/website/pages','adminBreadcrumb']],
 ['app/admin/website/page.tsx',['Website management','Pages','/admin/website/pages','Draft & publish','SEO','Media']],
 ['app/admin/website/pages/page.tsx',['AdminWebsitePagesEditor','website.content.edit','website_page_drafts','website_page_public','WEBSITE_CMS_PAGES','draftUpdatedAt','publishedAt']],
 ['components/AdminWebsitePagesEditor.tsx',['Page library','Search public pages','Preview draft','Save draft','Publish changes','Compare with published','Revision history','DRAFT PREVIEW · NOT LIVE','CONFIRM PUBLICATION','The live page has not changed','@media(max-width:520px)','font-size:16px']],
 ['lib/website-pages-cms.ts',['WebsiteCmsPageKey','WEBSITE_CMS_PAGES','organisations','community','projects','opportunities','showcase','events','people','spotlight','blog','careers','faq','partnership','feedback','community_guidelines','defaultWebsiteCmsPagePayload','validateWebsiteCmsPagePayload','getPublicWebsiteCmsPage','managerHref']],
 ['app/api/admin/website/pages/route.ts',['isWebsiteCmsPageKey','website.content.edit','website.content.publish','website.page.draft.updated','website.page.published','recordAdminAudit','website_page_drafts','publish_website_page_with_revision']],
 ['app/api/admin/website/pages/history/route.ts',['isWebsiteCmsPageKey','restore_draft','website.page.revision.restored_to_draft','website_page_revisions']],
 ['supabase/migrations/20260821223500_expand_website_page_registry.sql',['website_page_public','website_page_drafts','website_page_revisions','community_guidelines','opportunities','careers']],
 ['lib/website-chrome.ts',["href.startsWith('#')",'/^#[A-Za-z][A-Za-z0-9_-]*$/']],
 ['tests/admin-website-pages.spec.ts',['DRAFT PREVIEW · NOT LIVE','Publish Opportunities','restore_draft','public page stays unchanged','390','768','1440']]
];
let failed=false;let passed=0;
for(const [file,needles] of checks){
 if(!fs.existsSync(file)){console.error(`FAIL missing ${file}`);failed=true;continue}
 const source=fs.readFileSync(file,'utf8');const missing=needles.filter(needle=>!source.includes(needle));
 if(missing.length){console.error(`FAIL ${file}: missing ${missing.join(', ')}`);failed=true}else{console.log(`PASS ${file}`);passed++}
}
for(const [key,file] of Object.entries(governedRoutes)){
 if(!fs.existsSync(file)){console.error(`FAIL governed page ${key}: missing ${file}`);failed=true;continue}
 const source=fs.readFileSync(file,'utf8');
 const legacy=['home','about','contact'].includes(key);const expected=legacy?`getPublicWebsitePage('${key}')`:`getPublicWebsiteCmsPage('${key}')`;
 if(!source.includes(expected)){console.error(`FAIL governed page ${key}: public route does not consume ${expected}`);failed=true}else{console.log(`PASS public binding ${key}`);passed++}
}
const registry=fs.readFileSync('lib/website-pages-cms.ts','utf8');
for(const key of Object.keys(governedRoutes))if(!registry.includes(`key:'${key}'`)){console.error(`FAIL CMS registry missing ${key}`);failed=true;}
if(registry.includes("key:'privacy'")||registry.includes("key:'terms'")){console.error('FAIL legal Privacy/Terms must not be general-purpose CMS pages without legal review workflow');failed=true;}
if(failed)process.exit(1);
console.log(`Admin Website Pages CMS audit passed: ${passed} contract checks.`);
