import fs from 'node:fs/promises';
import path from 'node:path';

const projectRef=process.env.SUPABASE_PROJECT_REF||'aconptuqupsgznyrxhrh';
const token=process.env.SUPABASE_ACCESS_TOKEN;
if(!token){throw new Error('SUPABASE_ACCESS_TOKEN is required to sync hosted Auth templates.');}

const root=process.cwd();
const dir=path.join(root,'supabase','templates','auth');
const read=(name)=>fs.readFile(path.join(dir,name),'utf8');
const [confirmation,recovery,magicLink,invite,reauthentication,emailChange,passwordChanged,emailChanged,phoneChanged,mfaEnrolled,mfaUnenrolled,identityLinked,identityUnlinked]=await Promise.all([
  read('confirmation.html'),read('recovery.html'),read('magic_link.html'),read('invite.html'),read('reauthentication.html'),read('email_change.html'),read('password_changed_notification.html'),read('email_changed_notification.html'),read('phone_changed_notification.html'),read('mfa_factor_enrolled_notification.html'),read('mfa_factor_unenrolled_notification.html'),read('identity_linked_notification.html'),read('identity_unlinked_notification.html')
]);

const payload={
  mailer_subjects_confirmation:'Verify your email address | Mettelo',
  mailer_templates_confirmation_content:confirmation,
  mailer_subjects_recovery:'Reset your Mettelo password',
  mailer_templates_recovery_content:recovery,
  mailer_subjects_magic_link:'Your secure Mettelo sign-in link',
  mailer_templates_magic_link_content:magicLink,
  mailer_subjects_invite:"You're invited to Mettelo",
  mailer_templates_invite_content:invite,
  mailer_subjects_reauthentication:'{{ .Token }} is your Mettelo verification code',
  mailer_templates_reauthentication_content:reauthentication,
  mailer_subjects_email_change:'Confirm your new Mettelo email address',
  mailer_templates_email_change_content:emailChange,
  mailer_notifications_password_changed_enabled:true,
  mailer_subjects_password_changed_notification:'Your Mettelo password was changed',
  mailer_templates_password_changed_notification_content:passwordChanged,
  mailer_notifications_email_changed_enabled:true,
  mailer_subjects_email_changed_notification:'Your Mettelo email address was changed',
  mailer_templates_email_changed_notification_content:emailChanged,
  mailer_notifications_phone_changed_enabled:true,
  mailer_subjects_phone_changed_notification:'Your Mettelo phone number was changed',
  mailer_templates_phone_changed_notification_content:phoneChanged,
  mailer_notifications_mfa_factor_enrolled_enabled:true,
  mailer_subjects_mfa_factor_enrolled_notification:'A new verification method was added to your Mettelo account',
  mailer_templates_mfa_factor_enrolled_notification_content:mfaEnrolled,
  mailer_notifications_mfa_factor_unenrolled_enabled:true,
  mailer_subjects_mfa_factor_unenrolled_notification:'A verification method was removed from your Mettelo account',
  mailer_templates_mfa_factor_unenrolled_notification_content:mfaUnenrolled,
  mailer_notifications_identity_linked_enabled:true,
  mailer_subjects_identity_linked_notification:'A sign-in method was linked to your Mettelo account',
  mailer_templates_identity_linked_notification_content:identityLinked,
  mailer_notifications_identity_unlinked_enabled:true,
  mailer_subjects_identity_unlinked_notification:'A sign-in method was removed from your Mettelo account',
  mailer_templates_identity_unlinked_notification_content:identityUnlinked
};

const endpoint=`https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
const patch=await fetch(endpoint,{method:'PATCH',headers,body:JSON.stringify(payload)});
if(!patch.ok){throw new Error(`Supabase Auth template update failed (${patch.status}): ${await patch.text()}`);}

const get=await fetch(endpoint,{headers:{Authorization:`Bearer ${token}`}});
if(!get.ok){throw new Error(`Supabase Auth template verification read failed (${get.status}): ${await get.text()}`);}
const live=await get.json();
for(const [key,value] of Object.entries(payload)){
  if(live[key]!==value){throw new Error(`Hosted Supabase Auth config mismatch for ${key}.`);}
}
console.log(`Verified ${Object.keys(payload).length} hosted Supabase Auth email settings for ${projectRef}.`);
