import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';

function clean(value:string|null,max=80){return String(value||'').trim().slice(0,max)}
function norm(value:unknown){return String(value||'').trim().toLocaleLowerCase('en-GB')}
type DiscoveryMember={current_job_title:string|null;preferred_roles:string[]|null;skills:string[]|null;professional_area:string|null;project_availability:string|null;weekly_capacity:string|null};

export async function GET(request:Request){
  try{
    const supabase=await createServerSupabaseClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401,headers:{'Cache-Control':'private, no-store'}});

    const url=new URL(request.url);
    const query=clean(url.searchParams.get('q'));
    const requestedLimit=Number(url.searchParams.get('limit')||12);
    const limit=Number.isFinite(requestedLimit)?Math.min(Math.max(Math.trunc(requestedLimit),1),20):12;
    if(query.length<2)return NextResponse.json({error:'Enter at least 2 characters to search for a member.'},{status:400,headers:{'Cache-Control':'private, no-store'}});

    const {data,error}=await supabase.rpc('phase18_search_discoverable_members',{p_query:query,p_limit:limit});
    if(error){
      const message=String(error.message||'');
      if(message.includes('DISCOVERY_RATE_LIMITED'))return NextResponse.json({error:'Too many member searches. Try again shortly.',code:'DISCOVERY_RATE_LIMITED'},{status:429,headers:{'Cache-Control':'private, no-store','Retry-After':'60'}});
      if(message.includes('DISCOVERY_QUERY_TOO_SHORT'))return NextResponse.json({error:'Enter at least 2 characters to search for a member.'},{status:400,headers:{'Cache-Control':'private, no-store'}});
      if(message.includes('AUTHENTICATION_REQUIRED'))return NextResponse.json({error:'Authentication required.'},{status:401,headers:{'Cache-Control':'private, no-store'}});
      console.error('member discovery RPC failed',{code:error.code,message:error.message});
      return NextResponse.json({error:'Member search is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'private, no-store'}});
    }

    const role=norm(url.searchParams.get('role')),capability=norm(url.searchParams.get('capability')),domain=norm(url.searchParams.get('domain')),availability=norm(url.searchParams.get('availability')),commitment=norm(url.searchParams.get('commitment'));
    const items=((data||[]) as DiscoveryMember[]).filter(member=>{
      const roles=[member.current_job_title,...(member.preferred_roles||[])].map(norm).join(' ');
      const skills=(member.skills||[]).map(norm).join(' ');
      return(!role||roles.includes(role))&&(!capability||skills.includes(capability))&&(!domain||norm(member.professional_area).includes(domain))&&(!availability||norm(member.project_availability).includes(availability))&&(!commitment||norm(member.weekly_capacity).includes(commitment));
    });

    return NextResponse.json({items},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    console.error('member discovery request failed',error instanceof Error?error.message:'member discovery failed');
    return NextResponse.json({error:'Member search is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'private, no-store'}});
  }
}
