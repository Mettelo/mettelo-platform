import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { runOpportunityPipeline } from '@/lib/opportunities/pipeline';

export async function POST(){
  try{
    const auth=await createServerSupabaseClient();
    const {data:{user}}=await auth.auth.getUser();
    if(!user||user.app_metadata?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403});
    return NextResponse.json(await runOpportunityPipeline());
  }catch(error){
    console.error('opportunity discovery error',error);
    return NextResponse.json({error:error instanceof Error?error.message:'Opportunity discovery failed.'},{status:500});
  }
}
