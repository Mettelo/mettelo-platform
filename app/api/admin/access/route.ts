import {NextResponse} from 'next/server';
import type {User as SupabaseUser} from '@supabase/supabase-js';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {ADMIN_CAPABILITIES,hasAdminCapability,isKnownAdminCapability,type AdminCapability} from '@/lib/admin-capabilities';
import {recordAdminAudit} from '@/lib/admin-audit';

type ServiceDb=NonNullable<ReturnType<typeof serviceDb>>;
type AccessMode='member'|'legacy_full'|'full'|'custom'|'invalid';
type IdentityRow={id:string;username:string|null;member_id:string};

async function requireAccessManager(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
 if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401}),user:null,db:null};
 if(!hasAdminCapability(user,'admin.access.manage'))return{error:NextResponse.json({error:'Admin access management capability required.'},{status:403}),user:null,db:null};
 const db=serviceDb();if(!db)return{error:NextResponse.json({error:'Admin service is not configured.'},{status:503}),user:null,db:null};
 return{error:null,user,db};
}
function capabilityState(user:Pick<SupabaseUser,'app_metadata'>){
 const metadata=user.app_metadata||{};if(metadata.role!=='admin')return{mode:'member' as AccessMode,capabilities:[] as string[],valid:true};
 const configured=metadata.admin_capabilities;if(configured===undefined||configured===null)return{mode:'legacy_full' as AccessMode,capabilities:['*'],valid:true};
 if(!Array.isArray(configured)||!configured.every(value=>value==='*'||isKnownAdminCapability(value)))return{mode:'invalid' as AccessMode,capabilities:[] as string[],valid:false};
 if(configured.includes('*'))return{mode:'full' as AccessMode,capabilities:['*'],valid:true};
 return{mode:'custom' as AccessMode,capabilities:[...new Set(configured as AdminCapability[])],valid:true};
}
function safeAccount(user:SupabaseUser,identity?:IdentityRow){
 const state=capabilityState(user);return{id:user.id,email:user.email||'',name:String(user.user_metadata?.full_name||''),username:identity?.username||'',member_id:identity?.member_id||'',is_admin:user.app_metadata?.role==='admin',access_mode:state.mode,capabilities:state.capabilities,configuration_valid:state.valid,can_manage_access:hasAdminCapability(user,'admin.access.manage'),created_at:user.created_at};
}
function cleanSearch(value:unknown){return String(value??'').trim().slice(0,120).toLowerCase().replace(/^@/,'')}
async function listAllUsers(db:ServiceDb){
 const users:SupabaseUser[]=[];for(let page=1;page<=20;page++){const {data,error}=await db.auth.admin.listUsers({page,perPage:1000});if(error)throw error;users.push(...data.users);if(data.users.length<1000)return users}
 throw new Error('Account directory exceeds the bounded Admin access listing limit.');
}
async function identityMap(db:ServiceDb,users:SupabaseUser[]){
 const map=new Map<string,IdentityRow>();
 for(let start=0;start<users.length;start+=500){const ids=users.slice(start,start+500).map(user=>user.id);if(!ids.length)continue;const {data,error}=await db.from('profiles').select('id,username,member_id').in('id',ids);if(error)throw error;for(const row of (data||[]) as IdentityRow[])map.set(row.id,row)}
 return map;
}
function requestedCapabilities(mode:unknown,value:unknown){
 if(mode==='full')return{ok:true as const,capabilities:['*'] as string[]};
 if(mode!=='custom'||!Array.isArray(value))return{ok:false as const,error:'Choose Full Admin or a valid custom capability set.'};
 const unique=[...new Set(value)];if(unique.length===0||!unique.every(isKnownAdminCapability))return{ok:false as const,error:'Custom Admin access requires at least one known capability.'};
 return{ok:true as const,capabilities:unique as AdminCapability[]};
}
function stateForMetadata(appMetadata:Record<string,unknown>){return{app_metadata:appMetadata}}

export async function GET(request:Request){
 const gate=await requireAccessManager();if(gate.error)return gate.error;
 try{
  const params=new URL(request.url).searchParams;const page=Math.max(1,Number.parseInt(params.get('page')||'1',10)||1);const requested=Number.parseInt(params.get('page_size')||'25',10);const pageSize=[25,50,100].includes(requested)?requested:25;const access=params.get('access')||'all';const sort=params.get('sort')==='oldest'?'oldest':'newest';const q=cleanSearch(params.get('q'));
  if(!['all','admin','member'].includes(access))return NextResponse.json({error:'Invalid access filter.'},{status:400});
  const users=await listAllUsers(gate.db!);const identities=await identityMap(gate.db!,users);let accounts=users.map(user=>safeAccount(user,identities.get(user.id)));
  if(q)accounts=accounts.filter(item=>item.email.toLowerCase().includes(q)||item.name.toLowerCase().includes(q)||item.username.toLowerCase().includes(q)||item.member_id.toLowerCase().includes(q));if(access==='admin')accounts=accounts.filter(item=>item.is_admin);if(access==='member')accounts=accounts.filter(item=>!item.is_admin);
  accounts.sort((a,b)=>sort==='oldest'?a.created_at.localeCompare(b.created_at):b.created_at.localeCompare(a.created_at));const total=accounts.length;const pages=Math.max(1,Math.ceil(total/pageSize));const safePage=Math.min(page,pages);const start=(safePage-1)*pageSize;
  return NextResponse.json({users:accounts.slice(start,start+pageSize),page:safePage,page_size:pageSize,total,pages,current_user_id:gate.user!.id,capability_registry:ADMIN_CAPABILITIES});
 }catch(error){console.error('admin access listing failed',error);return NextResponse.json({error:'Unable to load accounts.'},{status:500});}
}

export async function PATCH(request:Request){
 const gate=await requireAccessManager();if(gate.error)return gate.error;
 try{
  const body=await request.json();const targetId=String(body.user_id||'').trim();const action=String(body.action||'');if(!targetId||!['grant','revoke','update_capabilities'].includes(action))return NextResponse.json({error:'Invalid Admin access request.'},{status:400});
  const {data:target,error:readError}=await gate.db!.auth.admin.getUserById(targetId);if(readError||!target.user)return NextResponse.json({error:'Account not found.'},{status:404});const beforeUser=target.user;const {data:identity}=await gate.db!.from('profiles').select('id,username,member_id').eq('id',targetId).maybeSingle();const before=safeAccount(beforeUser,(identity||undefined) as IdentityRow|undefined);
  if(action==='revoke'&&targetId===gate.user!.id)return NextResponse.json({error:'You cannot remove your own Admin access.'},{status:409});
  if(action==='update_capabilities'&&beforeUser.app_metadata?.role!=='admin')return NextResponse.json({error:'Grant Admin access before editing capabilities.'},{status:409});

  const appMetadata={...(beforeUser.app_metadata||{})};let afterCapabilities:string[]=[];
  if(action==='revoke'){
   appMetadata.role=null;
   appMetadata.admin_capabilities=null;
  }else{const requested=requestedCapabilities(body.mode,body.capabilities);if(!requested.ok)return NextResponse.json({error:requested.error},{status:400});appMetadata.role='admin';appMetadata.admin_capabilities=requested.capabilities;afterCapabilities=requested.capabilities;}

  const willManage=hasAdminCapability(stateForMetadata(appMetadata),'admin.access.manage');
  if(targetId===gate.user!.id&&!willManage)return NextResponse.json({error:'You cannot remove your own Admin access management capability.'},{status:409});
  if(before.can_manage_access&&!willManage){const all=await listAllUsers(gate.db!);const otherManagers=all.filter(user=>user.id!==targetId&&hasAdminCapability(user,'admin.access.manage'));if(otherManagers.length===0)return NextResponse.json({error:'At least one Admin must retain Admin access management capability.'},{status:409});}

  const {data:updated,error}=await gate.db!.auth.admin.updateUserById(targetId,{app_metadata:appMetadata});if(error||!updated.user)throw error||new Error('Admin account update returned no user.');const after=safeAccount(updated.user,(identity||undefined) as IdentityRow|undefined);
  const auditAction=action==='grant'?'admin.access.granted':action==='revoke'?'admin.access.revoked':'admin.capabilities.updated';
  const audit=await recordAdminAudit({actorUserId:gate.user!.id,actorEmail:gate.user!.email,capability:'admin.access.manage',action:auditAction,resourceType:'admin.account',resourceId:targetId,beforeState:{is_admin:before.is_admin,access_mode:before.access_mode,capabilities:before.capabilities},afterState:{is_admin:after.is_admin,access_mode:after.access_mode,capabilities:after.capabilities},metadata:{target_email:after.email||before.email,target_username:after.username||undefined,target_member_id:after.member_id||undefined,requested_capabilities:afterCapabilities}});
  return NextResponse.json({ok:true,user:after,audit_recorded:audit.ok});
 }catch(error){console.error('admin access update failed',error);return NextResponse.json({error:'Unable to update Admin access.'},{status:500});}
}
