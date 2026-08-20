import {serviceDb} from '@/lib/project-flow';
import type {AdminCapability} from '@/lib/admin-capabilities';

type JsonValue=null|boolean|number|string|JsonValue[]|{[key:string]:JsonValue};

const SENSITIVE_KEY=/pass(word)?|secret|token|authorization|cookie|api[_-]?key|service[_-]?role|private[_-]?key/i;
const MAX_DEPTH=5;
const MAX_ARRAY=50;
const MAX_STRING=4000;

export type AdminAuditInput={
  actorUserId:string;
  actorEmail?:string|null;
  capability?:AdminCapability|null;
  action:string;
  resourceType:string;
  resourceId?:string|null;
  result?:'success'|'failure'|'denied';
  reason?:string|null;
  beforeState?:unknown;
  afterState?:unknown;
  metadata?:unknown;
};

function cleanString(value:string,max=MAX_STRING){return value.trim().slice(0,max)}

export function sanitizeAuditValue(value:unknown,depth=0):JsonValue{
  if(depth>MAX_DEPTH)return '[truncated]';
  if(value===null||value===undefined)return null;
  if(typeof value==='boolean'||typeof value==='number')return value;
  if(typeof value==='string')return value.slice(0,MAX_STRING);
  if(Array.isArray(value))return value.slice(0,MAX_ARRAY).map(item=>sanitizeAuditValue(item,depth+1));
  if(typeof value==='object'){
    const result:{[key:string]:JsonValue}={};
    for(const [key,item] of Object.entries(value as Record<string,unknown>)){
      const safeKey=cleanString(key,120);
      if(!safeKey)continue;
      result[safeKey]=SENSITIVE_KEY.test(safeKey)?'[redacted]':sanitizeAuditValue(item,depth+1);
    }
    return result;
  }
  return String(value).slice(0,MAX_STRING);
}

export async function recordAdminAudit(input:AdminAuditInput){
  const db=serviceDb();
  if(!db)return {ok:false as const,error:'Admin data service is not configured.'};
  const action=cleanString(input.action,120);const resourceType=cleanString(input.resourceType,120);
  if(!input.actorUserId||!action||!resourceType)return {ok:false as const,error:'Audit actor, action and resource type are required.'};
  const {error}=await db.from('admin_audit_log').insert({
    actor_user_id:input.actorUserId,
    actor_email:input.actorEmail?cleanString(input.actorEmail,320):null,
    capability:input.capability||null,
    action,
    resource_type:resourceType,
    resource_id:input.resourceId?cleanString(input.resourceId,180):null,
    result:input.result||'success',
    reason:input.reason?cleanString(input.reason,1000):null,
    before_state:sanitizeAuditValue(input.beforeState),
    after_state:sanitizeAuditValue(input.afterState),
    metadata:sanitizeAuditValue(input.metadata)
  });
  if(error){console.error('admin audit insert failed',{action,resourceType,error:error.message});return {ok:false as const,error:'Unable to record Admin audit event.'};}
  return {ok:true as const};
}
