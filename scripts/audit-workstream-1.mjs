import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const identity=read('lib/member-identity.ts');
const identityRoute=read('app/api/member-identity/route.ts');
const authCallback=read('app/auth/callback/route.ts');
const profileRoute=read('app/api/profile/route.ts');
const accountRoute=read('app/api/account-preferences/route.ts');
const accountUi=read('components/MemberAccountSettings.tsx');
const discoveryRoute=read('app/api/member-discovery/route.ts');
const notifications=read('lib/notifications.ts');
const recovery=read('supabase/migrations/20260911084500_production_schema_account_project_recovery.sql');
const phase18Prefs=read('supabase/migrations/20260908106500_project_experience_phase_18c_preference_hardening.sql');

const checks=[
  [identity,"value.trim().toLowerCase()",'username normalization remains canonical'],
  [identity,"/^[a-z][a-z0-9_]*$/",'username charset remains ASCII-safe'],
  [identity,"RESERVED_USERNAMES",'reserved username protection remains enabled'],
  [identityRoute,"supabase.rpc('claim_member_username'",'username claims use the canonical database operation'],
  [identityRoute,"supabase.rpc('change_member_username'",'username changes use the canonical database operation'],
  [recovery,'profiles_member_id_unique','Member ID remains database-unique'],
  [recovery,'profiles_username_ci_unique','username remains case-insensitively unique'],
  [recovery,'member_id is immutable','Member ID remains immutable'],
  [recovery,"interval '30 days'",'username changes retain the cooldown'],
  [recovery,'member_username_history','username history remains retained for anti-impersonation'],
  [recovery,"return query select false,'UNAVAILABLE'",'username conflicts stay non-enumerating'],
  [authCallback,"value.startsWith('/')&&!value.startsWith('//')",'auth continuation remains same-origin relative'],
  [authCallback,'mettelo_identity_required:true','OAuth signup requires explicit member identity completion'],
  [profileRoute,"supabase.rpc('save_member_profile'",'profile writes remain atomic'],
  [profileRoute,'p_expected_updated_at:expectedUpdatedAt','profile writes retain stale-session protection'],
  [profileRoute,"code:'PROFILE_STALE'",'stale browser conflicts remain explicit'],
  [profileRoute,"calculateMemberReadiness",'profile API reuses the canonical readiness engine'],
  [accountUi,"type Section='identity'|'security'|'privacy'|'notifications'",'Account IA remains separated'],
  [accountUi,'disabled={item.required}','required notification controls remain non-disableable in UI'],
  [accountRoute,'isRequiredCommunication','required communications are enforced server-side'],
  [accountRoute,'Required account or security communications cannot be disabled.','required communications fail closed'],
  [accountRoute,"supabase.rpc('phase18_save_member_privacy_preferences'",'privacy saves use the canonical atomic operation'],
  [phase18Prefs,'auth.uid()','privacy operations remain bound to the authenticated user'],
  [discoveryRoute,"supabase.rpc('phase18_search_discoverable_members'",'member discovery remains server-governed'],
  [discoveryRoute,"'Cache-Control':'private, no-store'",'member discovery responses remain private and non-cacheable'],
  [discoveryRoute,"code:'DISCOVERY_RATE_LIMITED'",'member discovery keeps explicit rate control'],
  [notifications,"notification_preferences",'notification dispatch consults member preferences']
];

const failures=[];
for(const [source,needle,reason] of checks){if(!source.includes(needle))failures.push(`${reason}: ${needle}`)}

const clientRoots=['app','components','lib'].flatMap(root=>{
  const out=[];
  const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const path=`${dir}/${entry.name}`;if(entry.isDirectory())walk(path);else if(/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name))out.push(path)}};
  walk(root);return out;
});
const serviceRoleLeaks=clientRoots.filter(path=>read(path).includes('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'));
if(serviceRoleLeaks.length)failures.push(`service-role secret exposed through a NEXT_PUBLIC variable: ${serviceRoleLeaks.join(', ')}`);

if(failures.length){for(const failure of failures)console.error(`FAIL: ${failure}`);process.exit(1)}
console.log(`Workstream 1 static release contract verified (${checks.length} architecture/security assertions).`);
