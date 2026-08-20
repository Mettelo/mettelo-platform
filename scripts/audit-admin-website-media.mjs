import fs from 'node:fs';

const checks=[
 ['supabase/migrations/20260820180000_website_media_library.sql',["'website-media'",'8388608',"'image/jpeg','image/png','image/webp','image/avif'",'website_media_assets','website_media_alt_text_check','active','archived','enable row level security','revoke all on public.website_media_assets from anon, authenticated','revoke delete, truncate, references, trigger on public.website_media_assets from service_role']],
 ['app/api/admin/website/media/route.ts',['website.content.edit','MAX_FILE_SIZE','MIME_EXTENSIONS','page_size','25,50,100','website.media.uploaded','website.media.archived','website.media.restored','website.media.updated','storage.from(BUCKET).remove','Alt text is required unless the image is explicitly decorative.']],
 ['app/admin/website/media/page.tsx',['AdminWebsiteMediaLibrary','website.content.edit']],
 ['components/AdminWebsiteMediaLibrary.tsx',['Media Library','JPEG · PNG · WebP · AVIF · max 8 MB','Decorative image','Search title','25','50','100','Copy public URL','Archive image','Restore image','Existing public URLs are not deleted','@media(max-width:480px)','font-size:16px']],
 ['app/admin/website/page.tsx',["title:'Media'","href:'/admin/website/media'",'Upload & manage']],
 ['tests/admin-website-media.spec.ts',['image/png','text/html','website.media.uploaded','website.media.archived','390,768,1440','Copy public URL']]
];
let failed=false;let passed=0;
for(const [file,needles] of checks){
 if(!fs.existsSync(file)){console.error(`FAIL missing ${file}`);failed=true;continue}
 const source=fs.readFileSync(file,'utf8');const missing=needles.filter(needle=>!source.includes(needle));
 if(missing.length){console.error(`FAIL ${file}: missing ${missing.join(', ')}`);failed=true}else{console.log(`PASS ${file}`);passed++}
}
if(failed)process.exit(1);
console.log(`Admin Website Media audit passed: ${passed}/${checks.length} files.`);
