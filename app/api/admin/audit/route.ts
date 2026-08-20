import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';

export const dynamic='force-dynamic';

const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESULTS=['success','failure','denied'] as const;

function clean(value:string|null,max=180){return String(value||'').trim().slice(0,max)}
function positiveInt(value:string|null,fallback:number,max:number){const parsed=Number(value);return Number.isInteger(parsed)&&parsed>0?Math.min(parsed,max):fallback}

export async function GET(request:Request){
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  if(!hasAdminCapability(user,'system.audit.read'))return NextResponse.json({error:'Admin audit access required.'},{status:403});
  const db=serviceDb();if(!db)return NextResponse.json({error:'Admin data service is not configured.'},{status:503});

  const url=new URL(request.url);
  const page=positiveInt(url.searchParams.get('page'),1,10000);
  const pageSize=positiveInt(url.searchParams.get('page_size')||url.searchParams.get('limit'),50,100);
  const actor=clean(url.searchParams.get('actor'),320);
  const action=clean(url.searchParams.get('action'),120);
  const resourceType=clean(url.searchParams.get('resource_type'),120);
  const result=clean(url.searchParams.get('result'),20);
  if(result&&!RESULTS.includes(result as (typeof RESULTS)[number]))return NextResponse.json({error:'Invalid audit result filter.'},{status:400});

  let query=db.from('admin_audit_log').select('id,actor_user_id,actor_email,capability,action,resource_type,resource_id,result,reason,before_state,after_state,metadata,created_at',{count:'exact'}).order('created_at',{ascending:false});
  if(actor)query=UUID_PATTERN.test(actor)?query.eq('actor_user_id',actor):query.eq('actor_email',actor.toLowerCase());
  if(action)query=query.eq('action',action);
  if(resourceType)query=query.eq('resource_type',resourceType);
  if(result)query=query.eq('result',result);

  const from=(page-1)*pageSize;const to=from+pageSize-1;
  const {data,error,count}=await query.range(from,to);
  if(error){console.error('admin audit read failed',{message:error.message});return NextResponse.json({error:'Unable to load Admin audit history.'},{status:500});}
  const total=count||0;const pages=Math.max(1,Math.ceil(total/pageSize));
  return NextResponse.json({items:data||[],page,page_size:pageSize,total,pages});
}
