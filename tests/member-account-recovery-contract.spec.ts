import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const account=fs.readFileSync('components/MemberAccountSettings.tsx','utf8');
const recovery=fs.readFileSync('supabase/migrations/20260911084500_production_schema_account_project_recovery.sql','utf8');

test.describe('member account production recovery contract',()=>{
  test('first username claim uses POST while later changes use PATCH',()=>{
    expect(account).toContain("const claimingUsername=!account.username");
    expect(account).toContain("const method=claimingUsername?'POST':'PATCH'");
    expect(account).toContain("fetch('/api/member-identity',{method");
  });

  test('account actions have independent status state',()=>{
    expect(account).toContain("type Section='identity'|'security'|'privacy'|'notifications'");
    expect(account).toContain("setSectionFeedback('identity'");
    expect(account).toContain("save('privacy'");
    expect(account).toContain("save('notifications'");
  });

  test('recovery retains identity, profile, privacy and project contracts',()=>{
    for(const required of [
      'create or replace function public.claim_member_username',
      'create or replace function public.change_member_username',
      'create or replace function public.save_member_profile',
      'create table if not exists public.member_privacy_preferences',
      'create or replace function public.phase18_save_member_privacy_preferences',
      'add column if not exists participation_mode text',
      'alter table public.member_privacy_preferences enable row level security',
    ])expect(recovery).toContain(required);
  });
});
