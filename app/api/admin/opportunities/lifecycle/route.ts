import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { runOpportunityLifecycle } from '@/lib/opportunities/lifecycle';

export async function POST(){
  try{
    const auth=await createServerSupabaseClient();
    const {data:{user}}=await auth.auth.getUser();
    if(!user||user.app_metadata?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403});
    return NextResponse.json(await runOpportunityLifecycle());
  }catch(error){
    console.error('opportunity lifecycle error',error);
    return NextResponse.json({error:error instanceof Error?error.message:'Opportunity lifecycle run failed.'},{status:500});
  }
}
