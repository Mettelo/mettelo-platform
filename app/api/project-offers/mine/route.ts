import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';

export async function GET(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});

  const {data,error}=await auth
    .from('project_offers')
    .select('id,application_id,project_id,project_run_id,status,offered_at,expires_at,accepted_at,declined_at,expired_at,capacity_reserved_at,capacity_released_at,projects(title,weekly_commitment,participation_mode,expected_start,min_team_size,target_team_size,max_team_size)')
    .eq('user_id',user.id)
    .order('offered_at',{ascending:false});

  if(error){
    console.error('member project offers query failed',{user_id:user.id,code:error.code,message:error.message});
    return NextResponse.json({error:'We could not load your project offers right now.'},{status:500});
  }

  return NextResponse.json({offers:data||[]});
}
