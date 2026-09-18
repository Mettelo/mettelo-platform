'use client';

import {FormEvent,useCallback,useEffect,useMemo,useState} from 'react';
import styles from './ProjectSupportCaseSection.module.css';

type SupportCase={id:string;project_id:string;project_run_id:string;category:string;description:string;status:string;resolution:string|null;recovery_plan:string|null;created_at:string;updated_at:string};
type SupportUpdate={id:string;case_id:string;action:string;body:string|null;created_at:string};
type Props={projectId:string;projectRunId:string;runStatus:string;canCreateSupport:boolean};

const CATEGORIES=[
 ['technical_access','Technical / access'],['resource_data','Resource / data'],['project_scope','Project scope'],
 ['project_lead_support','Project Lead support'],['team_collaboration','Team collaboration'],['workload','Workload'],
 ['conduct','Conduct'],['accessibility_adjustment','Accessibility adjustment'],['other','Other']
] as const;

const STATUS_LABELS:Record<string,string>={
 open:'Open',under_review:'Under review',awaiting_member:'Awaiting your response',
 recovery_in_progress:'In progress',escalated:'Under review',resolved:'Resolved',closed:'Closed'
};
function humanise(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase())}
function statusLabel(value:string){return STATUS_LABELS[value]||humanise(value)}
function date(value:string){return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}
function summary(value:string){const clean=value.replace(/\s+/g,' ').trim();return clean.length>150?`${clean.slice(0,147)}…`:clean}
function submissionKey(){return typeof crypto!=='undefined'&&'randomUUID'in crypto?crypto.randomUUID():`support-${Date.now()}-${Math.random().toString(36).slice(2)}`}

export default function ProjectSupportCaseSection({projectId,projectRunId,runStatus,canCreateSupport}:Props){
 const [cases,setCases]=useState<SupportCase[]>([]),[updates,setUpdates]=useState<SupportUpdate[]>([]);
 const [category,setCategory]=useState(''),[description,setDescription]=useState('');
 const [responseCaseId,setResponseCaseId]=useState<string|null>(null),[responseText,setResponseText]=useState('');
 const [loading,setLoading]=useState(true),[submitting,setSubmitting]=useState(false),[responding,setResponding]=useState(false);
 const [eligibility,setEligibility]=useState<boolean|null>(null);
 const [error,setError]=useState<string|null>(null),[successCaseId,setSuccessCaseId]=useState<string|null>(null);
 const [requestKey,setRequestKey]=useState(()=>submissionKey());

 const load=useCallback(async()=>{
  try{
   const query=new URLSearchParams({project_id:projectId,project_run_id:projectRunId});
   const response=await fetch(`/api/project-support-cases?${query.toString()}`,{cache:'no-store'});
   const payload=await response.json();
   if(!response.ok)throw new Error(payload.error||'Unable to load support cases.');
   setCases((payload.cases||[]).filter((item:SupportCase)=>item.project_id===projectId&&item.project_run_id===projectRunId));
   setUpdates(payload.updates||[]);
   setEligibility(Boolean(payload.eligibility?.can_create));
  }catch(loadError){setError(loadError instanceof Error?loadError.message:'Unable to load support cases.');}
  finally{setLoading(false);}
 },[projectId,projectRunId]);
 useEffect(()=>{void load()},[load]);

 const canSubmit=runStatus==='active'&&canCreateSupport&&eligibility!==false;
 const eligibilityMessage=useMemo(()=>{
  if(loading||eligibility===null)return null;
  if(canSubmit)return null;
  if(runStatus!=='active')return 'Support case creation is not available for this project state. You can still review cases you previously raised.';
  return 'You are no longer an active member of this project run. Return to My Mettelo to review your current project access.';
 },[canSubmit,eligibility,loading,runStatus]);

 async function submit(event:FormEvent){
  event.preventDefault();if(submitting)return;setError(null);setSuccessCaseId(null);
  if(!category){setError('Choose the area you need support with.');return}
  if(description.trim().length<20){setError('Add enough detail for the support team to understand what needs attention.');return}
  if(!canSubmit){setError('Your project membership changed before the request was sent. Refresh the page and try again.');return}
  setSubmitting(true);
  try{
   const response=await fetch('/api/project-support-cases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project_id:projectId,project_run_id:projectRunId,category,description,submission_key:requestKey})});
   const payload=await response.json();
   if(!response.ok)throw new Error(payload.error||"We couldn't submit your case. Please try again.");
   const created=payload.case as SupportCase;
   setCases(current=>[created,...current.filter(item=>item.id!==created.id)]);
   setCategory('');setDescription('');setSuccessCaseId(created.id);setRequestKey(submissionKey());
   await load();
  }catch(submitError){setError(submitError instanceof Error?submitError.message:"We couldn't submit your case. Please try again.");}
  finally{setSubmitting(false);}
 }

 async function sendResponse(event:FormEvent,caseId:string){
  event.preventDefault();setError(null);
  if(responseText.trim().length<2){setError('Add your response before sending it.');return}
  setResponding(true);
  try{
   const response=await fetch('/api/project-support-cases',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({case_id:caseId,response:responseText})});
   const payload=await response.json();
   if(!response.ok)throw new Error(payload.error||'Unable to send your secure response.');
   setResponseCaseId(null);setResponseText('');await load();
  }catch(responseError){setError(responseError instanceof Error?responseError.message:'Unable to send your secure response.');}
  finally{setResponding(false);}
 }

 function viewCase(caseId:string){
  const element=document.getElementById(`support-case-${caseId}`);
  const details=element?.querySelector('details');
  if(details)details.open=true;
  element?.scrollIntoView({behavior:'smooth',block:'start'});
  (element?.querySelector('summary') as HTMLElement|null)?.focus();
 }

 return <section className={styles.section} id="support" data-lab-support-section aria-labelledby="project-support-title">
  <div className={styles.formCard}>
   <div className={styles.heading}><span>PRIVATE SUPPORT</span><h3 id="project-support-title">Get help with your project</h3><p>Your case goes privately to the Mettelo support team. Project Leads and teammates do not automatically receive access.</p></div>
   <div className={styles.privacy} role="note"><strong>Keep credentials out of your message.</strong><p>Do not include passwords, access tokens or other credentials. Email notifications never include your case description or private Admin notes.</p></div>
   {error?<div className={styles.error} role="alert" id="support-form-error"><strong>Your message couldn’t be sent</strong><p>{error}</p></div>:null}
   {successCaseId?<div className={styles.successPanel} role="status" aria-live="polite"><span>SUPPORT CASE SUBMITTED</span><strong>Your case has been sent privately to the Mettelo support team.</strong><p>You can track updates here.</p><div className={styles.successActions}><button type="button" onClick={()=>viewCase(successCaseId)}>View case</button><button type="button" onClick={()=>setSuccessCaseId(null)}>Done</button></div></div>:null}
   {loading?<p className={styles.loading} role="status">Checking your project support access…</p>:eligibilityMessage?<div className={styles.closed} role="status"><strong>{runStatus==='active'?'You are no longer an active member of this project':'Support case creation is not available for this project state'}</strong><p>{eligibilityMessage}</p></div>:<form className={styles.form} onSubmit={submit} aria-describedby={error?'support-form-help support-form-error':'support-form-help'} noValidate>
    <div><label htmlFor="support-category">What do you need help with?</label><select id="support-category" value={category} onChange={event=>setCategory(event.target.value)} required aria-invalid={Boolean(error&&!category)}><option value="">Choose an area</option>{CATEGORIES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
    <div><label htmlFor="support-description">Tell the support team what is happening</label><textarea id="support-description" value={description} onChange={event=>setDescription(event.target.value)} minLength={20} maxLength={6000} rows={7} required aria-invalid={Boolean(error&&description.trim().length<20)}/><small id="support-form-help">Share enough information for the support team to understand what you need. Mettelo project support is not an emergency service.</small></div>
    <button type="submit" disabled={submitting} aria-disabled={submitting}>{submitting?'Submitting…':'Submit private support case'}</button>
   </form>}
  </div>

  <div className={styles.history} aria-live="polite"><div className={styles.historyHeading}><span>PRIVATE CASE HISTORY</span><h4>Your support cases</h4><p>Only you and explicitly authorised Mettelo support administrators can access these cases.</p></div>{loading?<p>Loading your private cases…</p>:cases.length?cases.map(item=><article key={item.id} id={`support-case-${item.id}`} className={styles.caseCard}><div className={styles.caseHeader}><div><span>{humanise(item.category)}</span><strong>{statusLabel(item.status)}</strong></div><small>{date(item.created_at)}</small></div><p className={styles.caseSummary}>{summary(item.description)}</p><div className={styles.caseMeta}><span>Created {date(item.created_at)}</span><span>Last updated {date(item.updated_at)}</span></div><details><summary>View case</summary><div className={styles.caseDetail}><div><strong>Your original message</strong><p className={styles.caseDescription}>{item.description}</p></div>{item.recovery_plan?<div className={styles.secureUpdate}><strong>Recovery plan</strong><p>{item.recovery_plan}</p></div>:null}{item.resolution?<div className={styles.secureUpdate}><strong>Resolution</strong><p>{item.resolution}</p></div>:null}{updates.filter(update=>update.case_id===item.id).length?<div className={styles.timeline}><strong>Secure updates</strong>{updates.filter(update=>update.case_id===item.id).map(update=><div key={update.id}><span>{humanise(update.action)} · {date(update.created_at)}</span>{update.body?<p>{update.body}</p>:null}</div>)}</div>:null}{item.status==='awaiting_member'?<div className={styles.secureUpdate}><strong>Support team needs more information</strong>{responseCaseId===item.id?<form onSubmit={event=>void sendResponse(event,item.id)}><label htmlFor={`support-response-${item.id}`}>Your secure response</label><textarea id={`support-response-${item.id}`} rows={4} maxLength={6000} value={responseText} onChange={event=>setResponseText(event.target.value)} required/><button type="submit" disabled={responding}>{responding?'Sending…':'Send secure response'}</button></form>:<button type="button" onClick={()=>{setResponseCaseId(item.id);setResponseText('')}}>Respond securely</button>}</div>:null}{item.status==='closed'?<p className={styles.closed}><strong>This case is closed and read-only.</strong></p>:null}</div></details></article>):<p>No support cases for this project run yet.</p>}</div>
 </section>;
}
