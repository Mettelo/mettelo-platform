import fs from 'node:fs';

const checks=[
 ['supabase/migrations/20260820170000_website_seo_management.sql',["scope text primary key check (scope in ('global','home','about','contact'))",'website_seo_public','website_seo_drafts','enable row level security','revoke all on public.website_seo_drafts from anon, authenticated','grant select on public.website_seo_public to anon, authenticated','grant select, insert, update on public.website_seo_public to service_role']],
 ['lib/website-seo.ts',['DEFAULT_GLOBAL_SEO','DEFAULT_PAGE_SEO',"title_template.includes('%s')",'isSafePublicHref','buildGlobalMetadata','buildPageMetadata','buildOrganisationJsonLd','index:pageSeo.index','follow:pageSeo.follow']],
 ['app/api/admin/website/seo/route.ts',['website.content.edit','website.content.publish','website.seo.draft.updated','website.seo.published','website_seo_drafts','website_seo_public']],
 ['app/admin/website/seo/page.tsx',['AdminWebsiteSeoEditor','website.content.edit']],
 ['components/AdminWebsiteSeoEditor.tsx',['Search & social SEO','do not guarantee a particular Google ranking','Google verification token','Bing verification token','Canonical URL','Allow search indexing','Allow search engines to follow links','Save draft','Publish SEO','SEARCH PREVIEW','SOCIAL PREVIEW','@media(max-width:480px)','font-size:16px']],
 ['app/page.tsx',["buildPageMetadata('home')"]],
 ['app/about/page.tsx',["buildPageMetadata('about')"]],
 ['app/contact/page.tsx',["buildPageMetadata('contact')"]],
 ['app/sitemap.ts',['getPublicPageSeo','filter(item=>item.index)','/community-guidelines']],
 ['app/robots.ts',["disallow:['/admin','/member']",'https://mettelo.com/sitemap.xml']],
 ['app/layout.tsx',['buildGlobalMetadata','buildOrganisationJsonLd','application/ld+json',"replace(/</g,'\\\\u003c')"]],
 ['app/admin/website/page.tsx',["title:'SEO'","href:'/admin/website/seo'",'Draft & publish']],
 ['tests/admin-website-seo.spec.ts',['javascript:alert(1)','website.seo.published','sitemap.xml','noindex','390,768,1440']]
];
let failed=false;let passed=0;
for(const [file,needles] of checks){
 if(!fs.existsSync(file)){console.error(`FAIL missing ${file}`);failed=true;continue}
 const source=fs.readFileSync(file,'utf8');const missing=needles.filter(needle=>!source.includes(needle));
 if(missing.length){console.error(`FAIL ${file}: missing ${missing.join(', ')}`);failed=true}else{console.log(`PASS ${file}`);passed++}
}
if(failed)process.exit(1);
console.log(`Admin Website SEO audit passed: ${passed}/${checks.length} files.`);
