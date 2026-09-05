import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';

function bool(value:unknown){return value===true;}

export async function GET(){
  try{
    const supabase=await createServerSupabaseClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});

    const [profileResult,privacyResult,catalogueResult,notificationResult]=await Promise.all([
      supabase.from('profiles').select('full_name,username,member_id,is_public').eq('id',user.id).maybeSingle(),
      supabase.from('member_privacy_preferences').select('allow_project_invitations,allow_member_messages').eq('user_id',user.id).maybeSingle(),
      supabase.from('notification_event_catalogue').select('event_key,product_area,description,default_channel,urgency,action_required').eq('active',true).order('product_area').order('event_key'),
      supabase.from('notification_preferences').select('event_key,in_app_enabled,email_enabled').eq('user_id',user.id)
    ]);
    if(profileResult.error||privacyResult.error||catalogueResult.error||notificationResult.error)return NextResponse.json({error:'Unable to load account preferences.'},{status:500});

    const overrides=new Map((notificationResult.data||[]).map(row=>[row.event_key,row]));
    const notifications=(catalogueResult.data||[]).map(event=>{
      const override=overrides.get(event.event_key);
      const defaultEmail=event.default_channel==='email_and_in_app';
      const defaultInApp=event.default_channel==='in_app'||event.default_channel==='email_and_in_app';
      return {...event,in_app_enabled:override?.in_app_enabled??defaultInApp,email_enabled:override?.email_enabled??defaultEmail};
    });

    return NextResponse.json({
      account:{email:user.email||'',full_name:profileResult.data?.full_name||'',username:profileResult.data?.username||null,member_id:profileResult.data?.member_id||null},
      privacy:{profile_discoverable:Boolean(profileResult.data?.is_public),allow_project_invitations:privacyResult.data?.allow_project_invitations??true,allow_member_messages:privacyResult.data?.allow_member_messages??true},
      notifications
    });
  }catch(error){console.error('account preferences load failed',error);return NextResponse.json({error:'Account preferences are unavailable.'},{status:503});}
}

export async function PATCH(request:Request){
  try{
    const supabase=await createServerSupabaseClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const body=await request.json();
    const section=String(body.section||'');

    if(section==='privacy'){
      const profileDiscoverable=bool(body.profile_discoverable);
      const allowProjectInvitations=bool(body.allow_project_invitations);
      const allowMemberMessages=bool(body.allow_member_messages);
      const [profileUpdate,privacyUpdate]=await Promise.all([
        supabase.from('profiles').update({is_public:profileDiscoverable,updated_at:new Date().toISOString()}).eq('id',user.id),
        supabase.from('member_privacy_preferences').upsert({user_id:user.id,allow_project_invitations:allowProjectInvitations,allow_member_messages:allowMemberMessages,updated_at:new Date().toISOString()},{onConflict:'user_id'})
      ]);
      if(profileUpdate.error||privacyUpdate.error)return NextResponse.json({error:'Unable to save privacy preferences.'},{status:500});
      return NextResponse.json({ok:true,message:'Privacy preferences saved.'});
    }

    if(section==='notifications'){
      const requested=Array.isArray(body.preferences)?body.preferences:[];
      const keys=[...new Set(requested.map((item:{event_key?:unknown})=>String(item?.event_key||'').trim()).filter(Boolean))].slice(0,100);
      if(!keys.length)return NextResponse.json({error:'Choose at least one notification preference to update.'},{status:400});
      const {data:events,error:eventError}=await supabase.from('notification_event_catalogue').select('event_key').eq('active',true).in('event_key',keys);
      if(eventError)return NextResponse.json({error:'Unable to validate notification preferences.'},{status:500});
      const allowed=new Set((events||[]).map(item=>item.event_key));
      if(allowed.size!==keys.length)return NextResponse.json({error:'One or more notification preferences are not available.'},{status:400});
      const rows=requested.filter((item:{event_key?:unknown})=>allowed.has(String(item.event_key||''))).map((item:{event_key?:unknown;in_app_enabled?:unknown;email_enabled?:unknown})=>({user_id:user.id,event_key:String(item.event_key),in_app_enabled:bool(item.in_app_enabled),email_enabled:bool(item.email_enabled),updated_at:new Date().toISOString()}));
      const {error}=await supabase.from('notification_preferences').upsert(rows,{onConflict:'user_id,event_key'});
      if(error)return NextResponse.json({error:'Unable to save notification preferences.'},{status:500});
      return NextResponse.json({ok:true,message:'Notification preferences saved.'});
    }

    if(section==='email'){
      const email=String(body.email||'').trim().toLowerCase();
      if(!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:'Enter a valid email address.'},{status:400});
      if(email===(user.email||'').toLowerCase())return NextResponse.json({ok:true,message:'This is already your account email.'});
      const {error}=await supabase.auth.updateUser({email});
      if(error){console.error('account email update failed',{code:error.code,message:error.message});return NextResponse.json({error:'We could not start the email change. Check the address and try again.'},{status:400});}
      return NextResponse.json({ok:true,message:'Check your email to confirm the address change. Your current account remains usable until the change is confirmed.'});
    }

    return NextResponse.json({error:'Choose a valid account preference section.'},{status:400});
  }catch(error){console.error('account preferences update failed',error);return NextResponse.json({error:'Invalid account preference request.'},{status:400});}
}
