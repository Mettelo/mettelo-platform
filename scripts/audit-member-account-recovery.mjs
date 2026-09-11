import fs from 'node:fs';

const account=fs.readFileSync('components/MemberAccountSettings.tsx','utf8');
const identityRoute=fs.readFileSync('app/api/member-identity/route.ts','utf8');
const profileRoute=fs.readFileSync('app/api/profile/route.ts','utf8');
const projectPage=fs.readFileSync('app/projects/[id]/page.tsx','utf8');
const recovery=fs.readFileSync('supabase/migrations/20260911084500_production_schema_account_project_recovery.sql','utf8');

const required=[
  [account,"const method=claimingUsername?'POST':'PATCH'",'unclaimed usernames must POST to the claim endpoint'],
  [account,"type Section='identity'|'security'|'privacy'|'notifications'",'account actions must have section-scoped state'],
  [identityRoute,"supabase.rpc('claim_member_username'",'identity claim RPC must remain canonical'],
  [identityRoute,"supabase.rpc('change_member_username'",'identity change RPC must remain canonical'],
  [profileRoute,"supabase.rpc('save_member_profile'",'profile save must remain atomic'],
  [projectPage,'participation_mode,min_team_size,target_team_size,max_team_size','public project detail must retain participation fields'],
  [recovery,'create or replace function public.claim_member_username','recovery must restore username claiming'],
  [recovery,'create or replace function public.save_member_profile','recovery must restore profile saving'],
  [recovery,'create table if not exists public.member_privacy_preferences','recovery must restore privacy preferences'],
  [recovery,'add column if not exists participation_mode text','recovery must restore project detail participation schema'],
  [recovery,'enable row level security','recovery must preserve RLS'],
];

const failures=required.filter(([source,needle])=>!source.includes(needle));
if(failures.length){
  for(const [,needle,reason] of failures)console.error(`FAIL: ${reason}: ${needle}`);
  process.exit(1);
}
console.log('Member account production recovery contracts verified.');
