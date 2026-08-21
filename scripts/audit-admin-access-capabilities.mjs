import fs from 'node:fs';

const checks=[
 ['lib/admin-capabilities.ts',['ADMIN_CAPABILITIES','ADMIN_CAPABILITY_META',"'admin.access.manage'",'Any malformed or unknown','!Array.isArray(configured)||!configured.every(isValidConfiguredCapability)',"configured.includes('*')"]],
 ['app/admin/access/page.tsx',["hasAdminCapability(user,'admin.access.manage')",'AdminAccessManager']],
 ['app/api/admin/access/route.ts',["hasAdminCapability(user,'admin.access.manage')",'25,50,100','legacy_full','invalid','update_capabilities','You cannot remove your own Admin access.','You cannot remove your own Admin access management capability.','At least one Admin must retain Admin access management capability.','admin.access.granted','admin.access.revoked','admin.capabilities.updated','appMetadata.role=null','appMetadata.admin_capabilities=null']],
 ['components/AdminAccessManager.tsx',['Admin access','Full Admin','Custom Admin','Legacy full Admin','Invalid configuration','Search accounts','All accounts','Admins','Members','25','50','100','Save permissions','Remove Admin','Confirm removal','Select group','Lockout protection','@media(max-width:480px)','font-size:16px','aria-live="polite"']],
 ['tests/admin-access-capabilities.spec.ts',['website.content.edit','website.content.publish','admin.access.granted','admin.capabilities.updated','admin.access.revoked','current_user_id','E2E member Admin access must be fully revoked between tests','390,768,1440']],
 ['docs/ADMIN-ACCESS-PERMISSIONS.md',['legacy','fails closed','Full Admin','Custom Admin','at least one Admin who can manage Admin access','password','Rollback']]
];
let failed=false;let passed=0;
for(const [file,needles] of checks){
 if(!fs.existsSync(file)){console.error(`FAIL missing ${file}`);failed=true;continue}
 const source=fs.readFileSync(file,'utf8');const missing=needles.filter(needle=>!source.includes(needle));
 if(missing.length){console.error(`FAIL ${file}: missing ${missing.join(', ')}`);failed=true}else{console.log(`PASS ${file}`);passed++}
}
if(failed)process.exit(1);
console.log(`Admin access capability audit passed: ${passed}/${checks.length} files.`);
