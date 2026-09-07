'use client';

import {FormEvent,useCallback,useEffect,useState} from 'react';
import styles from './ProjectWeeklyPulse.module.css';

type Pulse={id:string;period_start:string;progress:string;workload:string;team_state:string;support_need:string;note:string|null;submitted_at:string;updated_at:string};
type Health={active_members:number;submissions:number;on_track:number;some_risk:number;blocked:number;manageable:number;heavy:number;unsustainable:number;working_well:number;some_friction:number;significant_concern:number;support_no:number;support_maybe:number;support_yes:number};
type Payload={period_start:string;item:Pulse|null;health:Health|null;can_submit:boolean;can_view_health:boolean};
type Props={projectId:string;projectRunId:string};

const defaults={progress:'on_track',workload:'manageable',team_state:'working_well',support_need:'no',note:''};
const labels={on_track:'On track',some_risk:'Some risk',blocked:'Blocked',manageable:'Manageable',heavy:'Heavy',unsustainable:'Unsustainable',working_well:'Working well',some_friction:'Some friction',significant_concern:'Significant concern',no:'No',maybe:'Maybe',yes:'Yes'} as const;

export default function ProjectWeeklyPulse({projectId,projectRunId}:Props){
 const [data,setData]=useState<Payload|null>(null),[form,setForm]=useState(defaults),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 const load=useCallback(async()=>{setLoading(true);try{const response=await fetch(`/api/project-pulse?project_id=${encodeURIComponent(projectId)}&project_run_id=${encodeURIComponent(projectRunId)}`,{cache:'no-store'});const payload=await response.json();if(!response.ok)throw new Error(payload.error||'Unable to load pulse.');setData(payload);if(payload.item)setForm({progress:payload.item.progress,workload:payload.item.workload,team_state:payload.item.team_state,support_need:payload.item.support_need,note:payload.item.note||''});}catch(error){setMessage(error instanceof Error?error.message:'Unable to load pulse.')}finally{setLoading(false)}},[projectId,projectRunId]);
 useEffect(()=>{void load()},[load]);
 async function submit(event:FormEvent){event.preventDefault();setSaving(true);setMessage('');try{const response=await fetch('/api/project-pulse',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project_id:projectId,project_run_id:projectRunId,...form})});const payload=await response.json();if(!response.ok)throw new Error(payload.error||'Unable to save pulse.');setMessage('Your weekly pulse is saved. You can update it again this week if anything changes.');await load()}catch(error){setMessage(error instanceof Error?error.message:'Unable to save pulse.')}finally{setSaving(false)}}
 if(loading)return <section className={styles.panel} aria-busy="true"><p>Loading this week’s project pulse…</p></section>;
 return <section className={styles.panel} aria-labelledby="weekly-pulse-title">
  <div className={styles.heading}><div><span>WEEKLY PROJECT PULSE</span><h3 id="weekly-pulse-title">How is the project feeling this week?</h3><p>Your individual response is private. Project Leads and Admins see only operational team counts, not your note or a personal score.</p></div>{data?.period_start&&<small>Week of {new Date(`${data.period_start}T00:00:00Z`).toLocaleDateString('en-GB',{dateStyle:'medium',timeZone:'UTC'})}</small>}</div>
  {data?.can_submit?<form className={styles.form} onSubmit={submit}>
   <PulseField legend="Progress" name="progress" value={form.progress} values={['on_track','some_risk','blocked']} onChange={value=>setForm(current=>({...current,progress:value}))}/>
   <PulseField legend="Workload" name="workload" value={form.workload} values={['manageable','heavy','unsustainable']} onChange={value=>setForm(current=>({...current,workload:value}))}/>
   <PulseField legend="Team state" name="team_state" value={form.team_state} values={['working_well','some_friction','significant_concern']} onChange={value=>setForm(current=>({...current,team_state:value}))}/>
   <PulseField legend="Do you need support?" name="support_need" value={form.support_need} values={['no','maybe','yes']} onChange={value=>setForm(current=>({...current,support_need:value}))}/>
   <label className={styles.note}><span>Optional private note</span><textarea value={form.note} maxLength={2000} rows={4} onChange={event=>setForm(current=>({...current,note:event.target.value}))} placeholder="Add context that may help you reflect on this week."/></label>
   <div className={styles.actions}><button type="submit" disabled={saving}>{saving?'Saving…':data.item?'Update this week’s pulse':'Submit this week’s pulse'}</button><small>One pulse per week. Updating replaces your current-week response.</small></div>
  </form>:<div className={styles.closed}><strong>Pulse submission is closed for this run.</strong><p>Weekly check-ins are available only to active members while the project run is active.</p></div>}
  {message&&<p className={styles.message} role="status">{message}</p>}
  {data?.can_view_health&&data.health?<HealthSummary health={data.health}/>:null}
 </section>
}

function PulseField({legend,name,value,values,onChange}:{legend:string;name:string;value:string;values:string[];onChange:(value:string)=>void}){return <fieldset className={styles.fieldset}><legend>{legend}</legend><div className={styles.options}>{values.map(option=><label key={option} className={styles.option}><input type="radio" name={name} value={option} checked={value===option} onChange={()=>onChange(option)}/><span>{labels[option as keyof typeof labels]}</span></label>)}</div></fieldset>}
function HealthSummary({health}:{health:Health}){const missing=Math.max(0,Number(health.active_members)-Number(health.submissions));return <section className={styles.health} aria-labelledby="team-health-title"><div><span>TEAM HEALTH · OPERATIONAL VIEW</span><h4 id="team-health-title">Explainable weekly signals</h4><p>No individual score is calculated. Use these counts to decide whether the team needs a conversation or support.</p></div><div className={styles.healthGrid}><Metric label="Submitted" value={`${health.submissions}/${health.active_members}`}/><Metric label="Missing" value={String(missing)}/><Metric label="Blocked" value={String(health.blocked)}/><Metric label="Heavy / unsustainable" value={String(Number(health.heavy)+Number(health.unsustainable))}/><Metric label="Team friction / concern" value={String(Number(health.some_friction)+Number(health.significant_concern))}/><Metric label="Support maybe / yes" value={String(Number(health.support_maybe)+Number(health.support_yes))}/></div></section>}
function Metric({label,value}:{label:string;value:string}){return <div className={styles.metric}><span>{label}</span><strong>{value}</strong></div>}
