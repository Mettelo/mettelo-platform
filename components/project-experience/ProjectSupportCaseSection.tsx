'use client';

import {FormEvent,useCallback,useEffect,useState} from 'react';
import styles from './ProjectSupportCaseSection.module.css';

type SupportCase={id:string;category:string;description:string;status:string;resolution:string|null;recovery_plan:string|null;created_at:string;updated_at:string};
type SupportUpdate={id:string;case_id:string;action:string;body:string|null;created_at:string};
type Props={projectId:string;projectRunId:string;runStatus:string};

const CATEGORIES=[
 ['technical_access','Technical / access'],['resource_data','Resource / data'],['project_scope','Project scope'],
 ['project_lead_support','Project Lead support'],['team_collaboration','Team collaboration'],['workload','Workload'],
 ['conduct','Conduct'],['accessibility_adjustment','Accessibility adjustment'],['other','Other']
] as const;

function humanise(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase())}
function date(value:string){return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}

export default function ProjectSupportCaseSection({projectId,projectRunId,runStatus}:Props){
 const [cases,setCases]=useState<SupportCase[]>([]),[updates,setUpdates]=useState<SupportUpdate[]>([]);
 const [category,setCategory]=useState(''),[description,setDescription]=useState('');
 const [responseCaseId,setResponseCaseId]=useState<string|null>(null),[responseText,setResponseText]=useState('');
 const [loading,setLoading]=useState(true),[submitting,setSubmitting]=useState(false),[responding,setResponding]=useState(false);
 const [error,setError]=useState<string|null>(null),[success,setSuccess]=useState<string|null>(null);
 const active=runStatus==='active';
 const load=useCallback(async()=>{
  try{
   const response=await fetch('/api/project-support-cases',{cache:'no-store'});
   const payload=await response.json();
   if(!response.ok)throw new Error(payload.error||'Unable to load support cases.');
   setCases((payload.cases||[]).filter((item:SupportCase&{project_id?:string;project_run_id?:string})=>item.project_id===projectId&&item.project_run_id===projectRunId));
   setUpdates(payload.updates||[]);
  }catch(loadError){setError(loadError instanceof Error?loadError.message:'Unable to load support cases.');}
  finally{setLoading(false);}
 },[projectId,projectRunId]);
 useEffect(()=>{void load()},[load]);

 async function submit(event:FormEvent){
  event.preventDefault();setError(null);setSuccess(null);
  if(!category){setError('Choose the area you need support with.');return}
  if(description.trim().length<20){setError('Add enough detail for the support team to understand what needs attention.');return}
  setSubmitting(true);
  try{
   const response=await fetch('/api/project-support-cases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project_id:projectId,project_run_id:projectRunId,category,description})});
   const payload=await response.json();
   if(!response.ok)throw new Error(payload.error||'Unable to submit your support case.');
   setCategory('');setDescription('');setSuccess(`Support case created. Reference ${String(payload.case?.id||'').slice(0,8).toUpperCase()}. An authorized Mettelo administrator will review it securely.`);
   await load();
  }catch(submitError){setError(submitError instanceof Error?submitError.message:'Unable to submit your support case.');}
  finally{setSubmitting(false);}
 }

 async function sendResponse(event:FormEvent,caseId:string){
  event.preventDefault();setError(null);setSuccess(null);
  if(responseText.trim().length<2){setError('Add your response before sending it.');return}
  setResponding(true);
  try{
   const response=await fetch('/api/project-support-cases',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({case_id:caseId,response:responseText})});
   const payload=await response.json();
   if(!response.ok)throw new Error(payload.error||'Unable to send your secure response.');
   setResponseCaseId(null);setResponseText('');setSuccess('Your secure response has been sent to the authorized support team.');
   await load();
  }catch(responseError){setError(responseError instanceof Error?responseError.message:'Unable to send your secure response.');}
  finally{setResponding(false);}
 }

 return <section className={styles.section} id="support" data-lab-support-section aria-labelledby="project-support-title">
  <div className={styles.heading}><span>PRIVATE SUPPORT</span><h3 id="project-support-title">Get help with your project</h3><p>Raise a private case when something is blocking your participation, delivery or safety. Your Project Lead and teammates do not automatically receive access to what you write here.</p></div>
  <div className={styles.privacy} role="note"><strong>Keep sensitive details in Mettelo.</strong><p>Email notifications only say that a secure case update is available; your case description and private Admin notes are not copied into email.</p></div>
  {active?<form className={styles.form} onSubmit={submit} aria-describedby="support-form-help">
   <div><label htmlFor="support-category">What do you need help with?</label><select id="support-category" value={category} onChange={event=>setCategory(event.target.value)} required><option value="">Choose an area</option>{CATEGORIES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
   <div><label htmlFor="support-description">Tell the support team what is happening</label><textarea id="support-description" value={description} onChange={event=>setDescription(event.target.value)} minLength={20} maxLength={6000} rows={6} required/><small id="support-form-help">Share enough information for the support team to understand what you need. Do not include passwords, access tokens or other credentials. Mettelo project support is not an emergency service.</small></div>
   {error?<p className={styles.error} role="alert">{error}</p>:null}{success?<p className={styles.success} role="status">{success}</p>:null}
   <button type="submit" disabled={submitting}>{submitting?'Submitting…':'Submit private support case'}</button>
  </form>:<div className={styles.closed}><strong>New support cases are not available for this run.</strong><p>You can still review cases you previously raised below.</p></div>}
  <div className={styles.history} aria-live="polite"><h4>Your support cases</h4>{loading?<p>Loading your private cases…</p>:cases.length?cases.map(item=><article key={item.id} className={styles.caseCard}><div className={styles.caseHeader}><div><span>Case {item.id.slice(0,8).toUpperCase()} · {humanise(item.category)}</span><strong>{humanise(item.status)}</strong></div><small>Opened {date(item.created_at)}</small></div><p className={styles.caseDescription}>{item.description}</p>{item.recovery_plan?<div className={styles.secureUpdate}><strong>Recovery plan</strong><p>{item.recovery_plan}</p></div>:null}{item.resolution?<div className={styles.secureUpdate}><strong>Resolution</strong><p>{item.resolution}</p></div>:null}{updates.filter(update=>update.case_id===item.id).length?<div className={styles.timeline}><strong>Secure updates</strong>{updates.filter(update=>update.case_id===item.id).map(update=><div key={update.id}><span>{humanise(update.action)} · {date(update.created_at)}</span>{update.body?<p>{update.body}</p>:null}</div>)}</div>:null}{item.status==='awaiting_member'?<div className={styles.secureUpdate}><strong>Support team needs more information</strong>{responseCaseId===item.id?<form onSubmit={event=>void sendResponse(event,item.id)}><label htmlFor={`support-response-${item.id}`}>Your secure response</label><textarea id={`support-response-${item.id}`} rows={4} maxLength={6000} value={responseText} onChange={event=>setResponseText(event.target.value)} required/><button type="submit" disabled={responding}>{responding?'Sending…':'Send secure response'}</button></form>:<button type="button" onClick={()=>{setResponseCaseId(item.id);setResponseText('')}}>Respond securely</button>}</div>:null}{item.status==='closed'?<p className={styles.closed}><strong>This case is closed and read-only.</strong></p>:null}</article>):<p>No support cases for this project run yet.</p>}</div>
 </section>
}
