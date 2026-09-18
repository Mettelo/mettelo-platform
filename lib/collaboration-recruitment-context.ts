import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';

function secret(){
 const value=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()||process.env.NEXTAUTH_SECRET?.trim()||process.env.AUTH_SECRET?.trim();
 if(!value)throw new Error('COLLABORATION_CONTEXT_SECRET_UNAVAILABLE');
 return value;
}

function sign(payload:string){return createHmac('sha256',secret()).update(payload).digest('base64url')}

export function createCollaborationRecruitmentContext(projectId:string,projectRunId:string){
 const payload=Buffer.from(JSON.stringify({project_id:projectId,project_run_id:projectRunId,v:1}),'utf8').toString('base64url');
 return `${payload}.${sign(payload)}`;
}

export function verifyCollaborationRecruitmentContext(token:string){
 const [payload,signature,...rest]=String(token||'').split('.');
 if(!payload||!signature||rest.length)return null;
 const expected=sign(payload);
 const left=Buffer.from(signature);const right=Buffer.from(expected);
 if(left.length!==right.length||!timingSafeEqual(left,right))return null;
 try{
  const decoded=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')) as {project_id?:unknown;project_run_id?:unknown;v?:unknown};
  const projectId=String(decoded.project_id||'').trim(),projectRunId=String(decoded.project_run_id||'').trim();
  if(decoded.v!==1||!projectId||!projectRunId)return null;
  return{projectId,projectRunId};
 }catch{return null}
}
