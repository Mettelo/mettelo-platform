import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import MemberAccountSettings from '@/components/MemberAccountSettings';

export const dynamic='force-dynamic';

export default async function MemberAccountPage(){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/signin?next=%2Fmember%2Faccount');

  const [profileResult,privacyResult,catalogueResult,notificationResult]=await Promise.all([
    supabase.from('profiles').select('full_name,username,member_id,is_public').eq('id',user.id).maybeSingle(),
    supabase.from('member_privacy_preferences').select('allow_project_invitations,allow_member_messages').eq('user_id',user.id).maybeSingle(),
    supabase.from('notification_event_catalogue').select('event_key,product_area,description,default_channel,urgency,action_required').eq('active',true).order('product_area').order('event_key'),
    supabase.from('notification_preferences').select('event_key,in_app_enabled,email_enabled').eq('user_id',user.id)
  ]);

  const overrides=new Map((notificationResult.data||[]).map(row=>[row.event_key,row]));
  const notifications=(catalogueResult.data||[]).map(event=>({
    ...event,
    in_app_enabled:overrides.get(event.event_key)?.in_app_enabled??(event.default_channel==='in_app'||event.default_channel==='email_and_in_app'),
    email_enabled:overrides.get(event.event_key)?.email_enabled??event.default_channel==='email_and_in_app'
  }));

  return <MemberAccountSettings
    account={{email:user.email||'',full_name:profileResult.data?.full_name||'',username:profileResult.data?.username||null,member_id:profileResult.data?.member_id||null}}
    privacy={{profile_discoverable:Boolean(profileResult.data?.is_public),allow_project_invitations:privacyResult.data?.allow_project_invitations??true,allow_member_messages:privacyResult.data?.allow_member_messages??true}}
    notifications={notifications}
  />;
}
