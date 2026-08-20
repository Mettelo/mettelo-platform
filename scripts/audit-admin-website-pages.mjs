import fs from 'node:fs';

const checks=[
 ['components/AdminShell.tsx',['Pages','/admin/website/pages','adminBreadcrumb']],
 ['app/admin/website/page.tsx',['Website management','Pages','/admin/website/pages','Draft & publish','SEO','Media']],
 ['app/admin/website/pages/page.tsx',['AdminWebsitePagesEditor','website.content.edit','website_page_drafts','website_page_public','home','about','contact']],
 ['components/AdminWebsitePagesEditor.tsx',['Public pages','Choose a public page','Save draft','Publish page','Reset draft','Open public page','CONTENT SUMMARY','aria-live="polite"','@media(max-width:480px)','font-size:16px']],
 ['lib/website-pages.ts',['WebsitePageKey','HOME_FIELDS','ABOUT_FIELDS','CONTACT_FIELDS','defaultWebsitePagePayload','validateWebsitePagePayload','getPublicWebsitePage','isSafePublicHref','website_page_public','noStore()']],
 ['app/api/admin/website/pages/route.ts',['website.content.edit','website.content.publish','website.page.draft.updated','website.page.published','recordAdminAudit','website_page_drafts','website_page_public']],
 ['supabase/migrations/20260820150000_website_page_content.sql',['website_page_public','website_page_drafts','public website pages readable','revoke all on public.website_page_drafts','grant select on public.website_page_public to anon, authenticated','grant select, insert, update on public.website_page_public to service_role']],
 ['app/page.tsx',["buildPageMetadata('home')",'./page-content']],
 ['app/page-content.tsx',["getPublicWebsitePage('home')",'HomeLiveContent','HomeHeroShowcase','getHeroMetrics','heroCommunityProof']],
 ['app/about/page.tsx',["buildPageMetadata('about')",'./AboutPageContent']],
 ['app/about/AboutPageContent.tsx',["getPublicWebsitePage('about')",'pillars','founderMedia','/api/founder-image']],
 ['app/contact/page.tsx',["buildPageMetadata('contact')",'./ContactPageContent']],
 ['app/contact/ContactPageContent.tsx',["getPublicWebsitePage('contact')",'SubmissionForm','formType="contact"','name="name"','name="email"','name="topic"','name="message"','name="consent"']],
 ['tests/admin-website-pages.spec.ts',['dangerous.values.hero_primary_href','website.page.published','originalDraft','originalPublished','Publish page','#contact-name','#contact-email','#contact-topic','#contact-message','#contact-consent','390,768,1440']]
];
let failed=false;let passed=0;
for(const [file,needles] of checks){if(!fs.existsSync(file)){console.error(`FAIL missing ${file}`);failed=true;continue}const source=fs.readFileSync(file,'utf8');const missing=needles.filter(needle=>!source.includes(needle));if(missing.length){console.error(`FAIL ${file}: missing ${missing.join(', ')}`);failed=true}else{console.log(`PASS ${file}`);passed++}}
if(failed)process.exit(1);console.log(`Admin Website Pages audit passed: ${passed}/${checks.length} files.`);
