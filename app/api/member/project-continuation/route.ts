import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';

export const dynamic='force-dynamic';

export async function GET(){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});

  const [completedResult,proofResult,leadResult]=await Promise.all([
    supabase.from('project_members').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('membership_status','completed'),
    supabase.from('contributions').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('verification_status','verified'),
    supabase.from('project_members').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('membership_status','completed').eq('team_role','project_lead')
  ]);

  if(completedResult.error||proofResult.error||leadResult.error){
    return NextResponse.json({error:'Unable to load project continuation state.'},{status:500});
  }

  return NextResponse.json({
    completedProjects:completedResult.count||0,
    verifiedProof:proofResult.count||0,
    completedAsLead:leadResult.count||0
  },{headers:{'cache-control':'no-store'}});
}
