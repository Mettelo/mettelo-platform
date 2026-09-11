export type ProjectAdmissionMode='auto'|'review_required';
export type ProjectParticipationMode='solo'|'team'|'flexible';
export type ParticipationPreference='solo'|'team'|'either';
export type AdmissionDecision='auto_qualified'|'review_required'|'ineligible';

export const DEFAULT_PROJECT_ADMISSION_MODE:ProjectAdmissionMode='review_required';
export const DEFAULT_AUTO_START_DELAY_MINUTES=360;

export function canonicalAdmissionMode(value:unknown):ProjectAdmissionMode{
  return value==='auto'?'auto':'review_required';
}

/**
 * Canonical effective admission policy.
 * Partner Projects are always REVIEW_REQUIRED regardless of stale/browser supplied
 * configuration. Ordinary Mettelo Open Projects may use either configured mode.
 */
export function effectiveProjectAdmissionMode(projectType:unknown,configured:unknown):ProjectAdmissionMode{
  if(String(projectType||'').toLowerCase()==='partner')return'review_required';
  return canonicalAdmissionMode(configured);
}

export function canConfigureAutoAdmission(projectType:unknown){
  return String(projectType||'').toLowerCase()!=='partner';
}

export function canonicalParticipationMode(value:unknown):ProjectParticipationMode{
  return value==='solo'||value==='flexible'?value:'team';
}

export function resolveParticipationPreference(mode:ProjectParticipationMode,value:unknown):{ok:true;preference:ParticipationPreference}|{ok:false;error:string}{
  if(mode==='solo')return{ok:true,preference:'solo'};
  if(mode==='team')return{ok:true,preference:'team'};
  if(value==='solo'||value==='team'||value==='either')return{ok:true,preference:value};
  return{ok:false,error:'Choose whether you prefer to participate Solo, with a Team, or Either for this flexible project.'};
}

export function requiredMembersToScheduleStart(input:{participationMode:ProjectParticipationMode;preference:ParticipationPreference;minimum:number|null|undefined}){
  if(input.participationMode==='solo')return 1;
  if(input.participationMode==='flexible'&&(input.preference==='solo'||input.preference==='either'))return 1;
  return Math.max(1,Number(input.minimum||1));
}

export function safeAutoStartDelayMinutes(value:unknown){
  const parsed=Number(value);
  if(!Number.isFinite(parsed))return DEFAULT_AUTO_START_DELAY_MINUTES;
  return Math.max(0,Math.min(10080,Math.trunc(parsed)));
}
