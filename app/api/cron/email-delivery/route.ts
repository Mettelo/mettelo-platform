import {NextResponse} from 'next/server';
import {processEmailQueue,serviceDb} from '@/lib/project-flow';

function authorised(request:Request){const secret=process.env.CRON_SECRET;return Boolean(secret&&request.headers.get('authorization')===`Bearer ${secret}`);}

export async function GET(request:Request){
  if(!authorised(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  const db=serviceDb();if(!db)return NextResponse.json({error:'Email delivery service is not configured.'},{status:503});
  try{const results=await processEmailQueue(db,40);return NextResponse.json({ok:true,processed:results.length,results});}
  catch(error){console.error('email delivery worker failed',error);return NextResponse.json({error:'Email delivery worker failed.'},{status:500});}
}
