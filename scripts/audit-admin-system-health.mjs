import fs from 'node:fs';

const checks=[
 ['lib/admin-system-health.ts',['admin_audit_log','email_outbox','state:\'unknown\'','events_24h','denied_24h','failures_24h','dead_letter','sent_24h','latest_event_at','latest_delivery_at']],
 ['app/api/admin/system/health/route.ts',["hasAdminCapability(user,'system.audit.read')",'can_manage_delivery','cache-control','no-store']],
 ['app/admin/system/health/page.tsx',["hasAdminCapability(user,'system.audit.read')",'AdminSystemHealth',"hasAdminCapability(user,'communications.manage')"]],
 ['components/AdminSystemHealth.tsx',['System health','Unknown is not healthy.','Admin audit activity','Transactional email delivery','DATA BOUNDARY','recipient email addresses','Refresh status','aria-live="polite"','@media(max-width:480px)','grid-template-columns:repeat(2,minmax(0,1fr))']],
 ['app/admin/system/page.tsx',["hasAdminCapability(user,'system.audit.read')","hasAdminCapability(user,'communications.manage')",'/admin/system/health','/admin/notifications/delivery','General background-job telemetry']],
 ['app/admin/notifications/delivery/page.tsx',["hasAdminCapability(user,'communications.manage')",'AdminNotificationOps']],
 ['app/api/admin/notifications/retry/route.ts',["hasAdminCapability(user,'communications.manage')",'communications.delivery.retry_requested','recordAdminAudit','Authentication required.']],
 ['tests/admin-system-health.spec.ts',['recipient_email','access_token','Unknown is not healthy.','390,768,1440','/api/admin/system/health']],
 ['docs/ADMIN-SYSTEM-HEALTH.md',['aggregate','Unknown','system.audit.read','communications.manage','recipient','Rollback']]
];
let failed=false;let passed=0;
for(const [file,needles] of checks){if(!fs.existsSync(file)){console.error(`FAIL missing ${file}`);failed=true;continue}const source=fs.readFileSync(file,'utf8');const missing=needles.filter(needle=>!source.includes(needle));if(missing.length){console.error(`FAIL ${file}: missing ${missing.join(', ')}`);failed=true}else{console.log(`PASS ${file}`);passed++}}
if(failed)process.exit(1);console.log(`Admin System health audit passed: ${passed}/${checks.length} files.`);
