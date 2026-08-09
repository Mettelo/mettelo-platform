import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const QA_PROJECT_SLUG='qa-collaboration-pilot';
const QA_ACCOUNTS=[
  {key:'lead',email:'qa+lead@mettelo.com',name:'QA Project Lead',teamRole:'project_lead'},
  {key:'analyst',email:'qa+analyst@mettelo.com',name:'QA Data Analyst',teamRole:'contributor'},
  {key:'engineer',email:'qa+engineer@mettelo.com',name:'QA Data Engineer',teamRole:'contributor'}
] as const;

async function adminDb(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user) return {error:NextResponse.json({error:'Authentication required.'},{status:401})};
  if(user.app_metadata?.role!=='admin') return {error:NextResponse.json({error:'Admin access required.'},{status:403})};
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) return {error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};
  return {user,db:createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})};
}

async function getProject(db:ReturnType<typeof createClient>){
  const {data,error}=await db.from('projects').select('id,title,status').eq('slug',QA_PROJECT_SLUG).maybeSingle();
  if(error) throw error;
  return data;
}

async function listAllUsers(db:ReturnType<typeof createClient>){
  const users=[];
  let page=1;
  while(true){
    const {data,error}=await db.auth.admin.listUsers({page,perPage:200});
    if(error) throw error;
    users.push(...data.users);
    if(data.users.length<200) break;
    page+=1;
  }
  return users;
}

export async function GET(){
  try{
    const ctx=await adminDb();
    if('error' in ctx) return ctx.error;
    const project=await getProject(ctx.db);
    if(!project) return NextResponse.json({error:'QA collaboration project is missing.'},{status:404});
    const users=await listAllUsers(ctx.db);
    const {data:members}=await ctx.db.from('project_members').select('user_id,team_role').eq('project_id',project.id);
    const memberMap=new Map((members||[]).map(row=>[row.user_id,row.team_role]));
    return NextResponse.json({project,users:users.map(user=>({id:user.id,email:user.email||'',name:String(user.user_metadata?.full_name||user.email||'Mettelo user'),role:user.app_metadata?.role||null,project_role:memberMap.get(user.id)||null}))});
  }catch(error){console.error('qa team get error',error);return NextResponse.json({error:'Unable to load QA team setup.'},{status:500});}
}

export async function POST(request:Request){
  try{
    const ctx=await adminDb();
    if('error' in ctx) return ctx.error;
    const body=await request.json();
    const action=String(body.action||'');
    const project=await getProject(ctx.db);
    if(!project) return NextResponse.json({error:'QA collaboration project is missing.'},{status:404});

    if(action==='create_qa_users'){
      const existing=await listAllUsers(ctx.db);
      const byEmail=new Map(existing.map(user=>[(user.email||'').toLowerCase(),user]));
      const credentials:{key:string;email:string;password:string|null;user_id:string}[]=[];
      for(const account of QA_ACCOUNTS){
        let user=byEmail.get(account.email.toLowerCase());
        let password:string|null=null;
        if(!user){
          password=`Qa-${randomBytes(18).toString('base64url')}!9`;
          const {data,error}=await ctx.db.auth.admin.createUser({email:account.email,password,email_confirm:true,user_metadata:{full_name:account.name,qa_account:true}});
          if(error) throw error;
          user=data.user;
        }
        if(!user) throw new Error(`Unable to create ${account.email}`);
        credentials.push({key:account.key,email:account.email,password,user_id:user.id});
      }
      return NextResponse.json({ok:true,credentials,message:'QA users are ready. Passwords are returned only for accounts created in this request.'});
    }

    if(action==='assign_team'){
      const leadId=String(body.lead_user_id||'');
      const analystId=String(body.analyst_user_id||'');
      const engineerId=String(body.engineer_user_id||'');
      const ids=[leadId,analystId,engineerId];
      if(ids.some(id=>!id)||new Set(ids).size!==3) return NextResponse.json({error:'Choose three different users for Lead, Analyst and Engineer.'},{status:400});
      const allUsers=await listAllUsers(ctx.db);
      const validIds=new Set(allUsers.map(user=>user.id));
      if(ids.some(id=>!validIds.has(id))) return NextResponse.json({error:'One or more selected users no longer exist.'},{status:400});
      const {error:memberError}=await ctx.db.from('project_members').upsert([
        {project_id:project.id,user_id:leadId,team_role:'project_lead'},
        {project_id:project.id,user_id:analystId,team_role:'contributor'},
        {project_id:project.id,user_id:engineerId,team_role:'contributor'}
      ],{onConflict:'project_id,user_id'});
      if(memberError) throw memberError;
      const {error:projectError}=await ctx.db.from('projects').update({lead_user_id:leadId,status:'active',updated_at:new Date().toISOString()}).eq('id',project.id);
      if(projectError) throw projectError;
      const assignments=[
        ['Confirm collaboration stack',leadId],
        ['Resolve contribution review feedback',leadId],
        ['Deliver final Mettelo demo',leadId],
        ['Produce analytical validation',analystId],
        ['Build QA dashboard',analystId],
        ['Build QA dataset pipeline',engineerId]
      ] as const;
      for(const [title,userId] of assignments){
        const {error}=await ctx.db.from('project_tasks').update({assignee_user_id:userId,updated_at:new Date().toISOString()}).eq('project_id',project.id).eq('title',title);
        if(error) throw error;
      }
      return NextResponse.json({ok:true,project_id:project.id,message:'QA team assigned and six tasks allocated.'});
    }

    return NextResponse.json({error:'Unknown QA setup action.'},{status:400});
  }catch(error){console.error('qa team setup error',error);return NextResponse.json({error:'Unable to complete QA team setup.'},{status:500});}
}
