import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

async function requireAdmin(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user||user.app_metadata?.role!=='admin')return {error:NextResponse.json({error:'Admin access required.'},{status:403}),user:null,db:null};
  const db=serviceDb();
  if(!db)return {error:NextResponse.json({error:'Admin service is not configured.'},{status:503}),user:null,db:null};
  return {error:null,user,db};
}

export async function GET(){
  const gate=await requireAdmin();if(gate.error)return gate.error;
  const {data,error}=await gate.db!.auth.admin.listUsers({page:1,perPage:500});
  if(error)return NextResponse.json({error:'Unable to load accounts.'},{status:500});
  return NextResponse.json({users:data.users.map(user=>({id:user.id,email:user.email||'',name:String(user.user_metadata?.full_name||''),is_admin:user.app_metadata?.role==='admin',created_at:user.created_at}))});
}

export async function PATCH(request:Request){
  const gate=await requireAdmin();if(gate.error)return gate.error;
  const body=await request.json();const targetId=String(body.user_id||'');const action=String(body.action||'');
  if(!targetId||!['grant','revoke'].includes(action))return NextResponse.json({error:'Invalid admin access request.'},{status:400});
  if(action==='revoke'&&targetId===gate.user!.id)return NextResponse.json({error:'You cannot remove your own admin access.'},{status:409});
  const {data:target,error:readError}=await gate.db!.auth.admin.getUserById(targetId);if(readError||!target.user)return NextResponse.json({error:'Account not found.'},{status:404});
  const appMetadata={...(target.user.app_metadata||{})};if(action==='grant')appMetadata.role='admin';else delete appMetadata.role;
  const {error}=await gate.db!.auth.admin.updateUserById(targetId,{app_metadata:appMetadata});if(error)return NextResponse.json({error:'Unable to update admin access.'},{status:500});
  return NextResponse.json({ok:true,is_admin:action==='grant'});
}
