import { NextResponse } from 'next/server';
import { runOpportunityLifecycle } from '@/lib/opportunities/lifecycle';

function authorised(request:Request){const secret=process.env.CRON_SECRET;return Boolean(secret&&request.headers.get('authorization')===`Bearer ${secret}`);}

export async function GET(request:Request){
  if(!authorised(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  try{return NextResponse.json(await runOpportunityLifecycle());}
  catch(error){console.error('scheduled opportunity lifecycle error',error);return NextResponse.json({error:error instanceof Error?error.message:'Scheduled opportunity lifecycle failed.'},{status:500});}
}
