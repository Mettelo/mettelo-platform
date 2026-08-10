import { NextResponse } from 'next/server';
import { runOpportunityDiscovery } from '@/lib/opportunities/discovery';

function authorised(request:Request){const secret=process.env.CRON_SECRET;return Boolean(secret&&request.headers.get('authorization')===`Bearer ${secret}`);}

export async function GET(request:Request){
  if(!authorised(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  try{return NextResponse.json(await runOpportunityDiscovery());}
  catch(error){console.error('scheduled opportunity discovery error',error);return NextResponse.json({error:error instanceof Error?error.message:'Scheduled opportunity discovery failed.'},{status:500});}
}
