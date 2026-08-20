import fs from 'node:fs';

const checks=[
 ['app/admin/settings/page.tsx',["hasAdminCapability(user,'platform.settings.manage')","redirect('/admin')",'platform_settings','project_role_catalogue']],
 ['app/api/admin/settings/route.ts',["hasAdminCapability(user,'platform.settings.manage')",'platform.setting.updated','Enter a secure https:// URL.']],
 ['app/api/admin/project-role-catalogue/route.ts',["hasAdminCapability(user,'platform.settings.manage')",'platform.project_role.created','platform.project_role.updated','recordAdminAudit','Authentication required.','Platform settings capability required.']],
 ['components/AdminPlatformSettings.tsx',["setting.value_type==='url'?'url':'text'",'Changes apply immediately','Audit recording is temporarily unavailable.','@media(max-width:480px)','font-size:16px']],
 ['lib/platform-auth-status.ts',['PlatformConfigurationState','/auth/v1/settings','AbortSignal.timeout(5000)',"supabase_client:url&&anonKey?'configured':'missing'",'email_signup','google','github',"auth_service:'enabled'",'catch{return base}']],
 ['app/api/admin/platform/auth-status/route.ts',["hasAdminCapability(user,'platform.settings.manage')",'getPlatformAuthStatus','return NextResponse.json({status})']],
 ['app/admin/platform/auth/page.tsx',["hasAdminCapability(user,'platform.settings.manage')",'AdminPlatformAuthStatus','getPlatformAuthStatus']],
 ['components/AdminPlatformAuthStatus.tsx',['Authentication & SSO status','Read-only deployment status','never exposes API keys','Configured','Missing','Enabled','Disabled','Unknown','Feature flags are not managed here.','No governed runtime feature-flag consumers','@media(max-width:480px)']],
 ['app/admin/platform/page.tsx',["hasAdminCapability(user,'platform.settings.manage')","hasAdminCapability(user,'admin.access.manage')","hasAdminCapability(user,'system.audit.read')",'Authentication & SSO status',"href:'/admin/platform/auth'",'Requires runtime consumer']],
 ['components/AdminShell.tsx',['Auth & SSO status','/admin/platform/auth']],
 ['tests/admin-platform-configuration.spec.ts',['/api/admin/platform/auth-status','SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_SUPABASE_ANON_KEY','Unknown','390,768,1440','https://','401']],
 ['docs/ADMIN-PLATFORM-CONFIGURATION.md',['platform.settings.manage','read-only','Unknown','Feature flags','secrets','Rollback']]
];
let failed=false;let passed=0;
for(const [file,needles] of checks){
 if(!fs.existsSync(file)){console.error(`FAIL missing ${file}`);failed=true;continue}
 const source=fs.readFileSync(file,'utf8');const missing=needles.filter(needle=>!source.includes(needle));
 if(missing.length){console.error(`FAIL ${file}: missing ${missing.join(', ')}`);failed=true}else{console.log(`PASS ${file}`);passed++}
}
if(failed)process.exit(1);
console.log(`Admin Platform configuration audit passed: ${passed}/${checks.length} files.`);
