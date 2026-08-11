import {NextResponse} from 'next/server';
import {serviceDb} from '@/lib/project-flow';
import {createMonthlySpotlightDrafts} from '@/lib/monthly-spotlight';

function authorised(request:Request){const secret=process.env.CRON_SECRET;return Boolean(secret&&request.headers.get('authorization')===`Bearer ${secret}`);}

export async function GET(request:Request){
  if(!authorised(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  const db=serviceDb();if(!db)return NextResponse.json({error:'Spotlight service is not configured.'},{status:503});
  try{return NextResponse.json({ok:true,...await createMonthlySpotlightDrafts(db)});}catch(error){console.error('monthly spotlight error',error);return NextResponse.json({error:'Monthly Spotlight calculation failed.'},{status:500});}
}
