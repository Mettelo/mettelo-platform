import type {SupabaseClient} from '@supabase/supabase-js';

export type CommunicationTemplate={id:string;template_key:string;journey:string;name:string;description:string|null;send_mode:'automatic'|'admin_review'|'manual';subject_template:string;body_template:string;cta_label:string|null;cta_url_template:string|null;variables:string[];active:boolean;version:number;updated_at:string};

const aliases:Record<string,string>={career_application_submitted:'career_submitted'};
export function templateKey(key:string){return aliases[key]||key;}

export function renderCommunication(value:string,vars:Record<string,unknown>){return value.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g,(_,key)=>{const raw=vars[key];return raw===null||raw===undefined?'':String(raw)}).replace(/\s{2,}/g,' ').trim();}

export async function getCommunicationTemplate(db:SupabaseClient,key:string){const resolved=templateKey(key);const {data}=await db.from('communication_templates').select('id,template_key,journey,name,description,send_mode,subject_template,body_template,cta_label,cta_url_template,variables,active,version,updated_at').eq('template_key',resolved).eq('active',true).maybeSingle();return (data||null) as CommunicationTemplate|null;}

export async function resolveCommunication(db:SupabaseClient,key:string,vars:Record<string,unknown>,fallback:{subject:string;body:string}){try{const template=await getCommunicationTemplate(db,key);if(!template)return {...fallback,template:null};return{subject:renderCommunication(template.subject_template,vars),body:renderCommunication(template.body_template,vars),template};}catch{return {...fallback,template:null};}}
