import {NextResponse} from 'next/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';

function authorised(request:Request){const secret=process.env.CRON_SECRET;return Boolean(secret&&request.headers.get('authorization')===`Bearer ${secret}`);}

export async function GET(request:Request){
 if(!authorised(request))return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=serviceDb();if(!db)return NextResponse.json({error:'Opportunity reminder service is not configured.'},{status:503});
 try{
  const now=new Date();const horizon=new Date(now.getTime()+72*60*60*1000);
  const {data,error}=await db.from('saved_opportunities').select('user_id,opportunity_id,opportunities(id,title,organisation,status,closes_at)').gte('opportunities.closes_at',now.toISOString()).lte('opportunities.closes_at',horizon.toISOString()).eq('opportunities.status','published');if(error)throw error;
  let notified=0;
  for(const saved of data||[]){const opportunity=Array.isArray(saved.opportunities)?saved.opportunities[0]:saved.opportunities;if(!opportunity?.closes_at)continue;const {data:recipient}=await db.auth.admin.getUserById(saved.user_id);const closes=new Date(opportunity.closes_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});await notifyUser(db,{userId:saved.user_id,email:recipient.user?.email||null,type:'saved_opportunity_closing',eventKey:'saved_opportunity_closing',title:'Saved opportunity closing soon',body:`${opportunity.title}${opportunity.organisation?` at ${opportunity.organisation}`:''} is currently scheduled to close on ${closes}. Check the official listing before applying.`,actionUrl:`/opportunities/${saved.opportunity_id}`,subject:`Closing soon — ${opportunity.title}`,dedupeKey:`saved-opportunity:${saved.opportunity_id}:72h`});notified++;}
  return NextResponse.json({ok:true,notified});
 }catch(error){console.error('saved opportunity reminder error',error);return NextResponse.json({error:'Saved opportunity reminders failed.'},{status:500});}
}
