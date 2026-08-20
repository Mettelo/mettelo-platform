import {serviceDb} from '@/lib/project-flow';

export type HealthSourceState='available'|'unknown';
export type AuditHealth={state:HealthSourceState;events_24h:number|null;denied_24h:number|null;failures_24h:number|null;latest_event_at:string|null};
export type DeliveryHealth={state:HealthSourceState;queued:number|null;retrying:number|null;failed:number|null;dead_letter:number|null;sent_24h:number|null;latest_delivery_at:string|null};
export type AdminSystemHealth={generated_at:string;audit:AuditHealth;delivery:DeliveryHealth};

const unknownAudit:AuditHealth={state:'unknown',events_24h:null,denied_24h:null,failures_24h:null,latest_event_at:null};
const unknownDelivery:DeliveryHealth={state:'unknown',queued:null,retrying:null,failed:null,dead_letter:null,sent_24h:null,latest_delivery_at:null};

async function auditHealth(){
 const db=serviceDb();if(!db)return unknownAudit;
 const since=new Date(Date.now()-24*60*60*1000).toISOString();
 try{
  const [events,denied,failures,latest]=await Promise.all([
   db.from('admin_audit_log').select('id',{count:'exact',head:true}).gte('created_at',since),
   db.from('admin_audit_log').select('id',{count:'exact',head:true}).gte('created_at',since).eq('result','denied'),
   db.from('admin_audit_log').select('id',{count:'exact',head:true}).gte('created_at',since).eq('result','failure'),
   db.from('admin_audit_log').select('created_at').order('created_at',{ascending:false}).limit(1).maybeSingle()
  ]);
  if(events.error||denied.error||failures.error||latest.error)throw events.error||denied.error||failures.error||latest.error;
  return{state:'available' as const,events_24h:events.count||0,denied_24h:denied.count||0,failures_24h:failures.count||0,latest_event_at:latest.data?.created_at||null};
 }catch(error){console.error('system health audit summary unavailable',{message:error instanceof Error?error.message:'unknown'});return unknownAudit;}
}

async function deliveryHealth(){
 const db=serviceDb();if(!db)return unknownDelivery;
 const since=new Date(Date.now()-24*60*60*1000).toISOString();
 try{
  const [queued,retrying,sending,failed,deadLetter,sent,latest]=await Promise.all([
   db.from('email_outbox').select('id',{count:'exact',head:true}).eq('status','queued'),
   db.from('email_outbox').select('id',{count:'exact',head:true}).eq('status','retrying'),
   db.from('email_outbox').select('id',{count:'exact',head:true}).eq('status','sending'),
   db.from('email_outbox').select('id',{count:'exact',head:true}).eq('status','failed'),
   db.from('email_outbox').select('id',{count:'exact',head:true}).eq('status','dead_letter'),
   db.from('email_outbox').select('id',{count:'exact',head:true}).gte('sent_at',since).eq('status','sent'),
   db.from('email_outbox').select('created_at').order('created_at',{ascending:false}).limit(1).maybeSingle()
  ]);
  if(queued.error||retrying.error||sending.error||failed.error||deadLetter.error||sent.error||latest.error)throw queued.error||retrying.error||sending.error||failed.error||deadLetter.error||sent.error||latest.error;
  return{state:'available' as const,queued:queued.count||0,retrying:(retrying.count||0)+(sending.count||0),failed:failed.count||0,dead_letter:deadLetter.count||0,sent_24h:sent.count||0,latest_delivery_at:latest.data?.created_at||null};
 }catch(error){console.error('system health delivery summary unavailable',{message:error instanceof Error?error.message:'unknown'});return unknownDelivery;}
}

export async function getAdminSystemHealth():Promise<AdminSystemHealth>{
 const [audit,delivery]=await Promise.all([auditHealth(),deliveryHealth()]);
 return{generated_at:new Date().toISOString(),audit,delivery};
}
