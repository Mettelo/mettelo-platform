export type ProjectAdmissionMode='auto'|'review_required';
export type ProjectParticipationMode='solo'|'team'|'flexible';
export type ParticipationPreference='solo'|'team'|'flexible';
export type AdmissionDecision='auto_qualified'|'review_required'|'ineligible';

export const DEFAULT_PROJECT_ADMISSION_MODE:ProjectAdmissionMode='review_required';
export const DEFAULT_AUTO_START_DELAY_MINUTES=360;

export function canonicalAdmissionMode(value:unknown):ProjectAdmissionMode{return value==='auto'?'auto':'review_required'}
export function effectiveProjectAdmissionMode(projectType:unknown,configured:unknown):ProjectAdmissionMode{if(String(projectType||'').toLowerCase()==='partner')return'review_required';return canonicalAdmissionMode(configured)}
export function canConfigureAutoAdmission(projectType:unknown){return String(projectType||'').toLowerCase()!=='partner'}
export function canonicalParticipationMode(value:unknown):ProjectParticipationMode{return value==='solo'||value==='flexible'?value:'team'}

export function participationOptions(mode:ProjectParticipationMode):ParticipationPreference[]{
 if(mode==='solo')return['solo'];
 if(mode==='team')return['team','flexible'];
 return['solo','team','flexible'];
}

export function resolveParticipationPreference(mode:ProjectParticipationMode,value:unknown):{ok:true;preference:ParticipationPreference}|{ok:false;error:string}{
 const normalized=value==='either'?'flexible':value;
 const options=participationOptions(mode);
 if(typeof normalized==='string'&&options.includes(normalized as ParticipationPreference))return{ok:true,preference:normalized as ParticipationPreference};
 return{ok:false,error:`Choose a participation option supported by this ${mode} project.`};
}

export function requiredMembersToScheduleStart(input:{participationMode:ProjectParticipationMode;preference:ParticipationPreference;minimum:number|null|undefined}){
 if(input.participationMode==='solo'||input.preference==='solo')return 1;
 return Math.max(1,Number(input.minimum||1));
}

export function safeAutoStartDelayMinutes(value:unknown){const parsed=Number(value);if(!Number.isFinite(parsed))return DEFAULT_AUTO_START_DELAY_MINUTES;return Math.max(0,Math.min(10080,Math.trunc(parsed)))}
