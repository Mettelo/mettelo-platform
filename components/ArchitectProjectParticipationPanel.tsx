'use client';

import {FormEvent,useEffect,useMemo,useState} from 'react';
import styles from './ArchitectProjectParticipationPanel.module.css';

type Mode='solo'|'team'|'flexible';
type Participation={participation_mode:Mode;min_team_size:number;target_team_size:number;max_team_size:number;team_size_threshold:number};
type Props={projectId:string};

const defaults:Participation={participation_mode:'team',min_team_size:2,target_team_size:5,max_team_size:5,team_size_threshold:2};

export default function ArchitectProjectParticipationPanel({projectId}:Props){
  const [value,setValue]=useState<Participation>(defaults);
  const [editable,setEditable]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');

  useEffect(()=>{let active=true;(async()=>{try{const response=await fetch(`/api/architect-projects/${projectId}/participation`,{cache:'no-store'});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Unable to load participation.');if(active){setValue(body.item);setEditable(Boolean(body.editable))}}catch(cause){if(active)setError(cause instanceof Error?cause.message:'Unable to load participation.')}finally{if(active)setLoading(false)}})();return()=>{active=false}},[projectId]);

  const capacityHelp=useMemo(()=>value.participation_mode==='solo'
    ?'Solo projects always use 1 / 1 / 1 and can satisfy the participation threshold with one member.'
    :value.participation_mode==='flexible'
      ?'Flexible projects can begin with one participant, then grow toward the target without exceeding the maximum. The target does not block start.'
      :'Team projects become participation-ready at the minimum. The target is the preferred planning size, and the maximum is the hard capacity limit.',[value.participation_mode]);

  function setMode(mode:Mode){
    if(mode==='solo'){setValue({participation_mode:'solo',min_team_size:1,target_team_size:1,max_team_size:1,team_size_threshold:1});return}
    if(mode==='flexible'){setValue(current=>({...current,participation_mode:'flexible',min_team_size:1,target_team_size:Math.max(1,current.target_team_size),max_team_size:Math.max(current.max_team_size,current.target_team_size,1),team_size_threshold:1}));return}
    setValue(current=>{const min=Math.max(2,current.min_team_size);const target=Math.max(min,current.target_team_size);return{...current,participation_mode:'team',min_team_size:min,target_team_size:target,max_team_size:Math.max(target,current.max_team_size),team_size_threshold:min}})
  }

  function setCapacity(key:'min_team_size'|'target_team_size'|'max_team_size',raw:string){
    const next=Math.max(1,Math.min(50,Number(raw)||1));
    setValue(current=>({...current,[key]:next,team_size_threshold:key==='min_team_size'?next:current.team_size_threshold}));
  }

  async function save(event:FormEvent){
    event.preventDefault();setBusy(true);setError('');setMessage('');
    try{const response=await fetch(`/api/architect-projects/${projectId}/participation`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(value)});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Unable to update participation.');setValue(body.item);setMessage('Participation model saved to the canonical project definition.')}catch(cause){setError(cause instanceof Error?cause.message:'Unable to update participation.')}finally{setBusy(false)}
  }

  return <section className={styles.panel} aria-labelledby="project-participation-heading">
    <div className={styles.heading}><div><span>PROJECT PARTICIPATION</span><h2 id="project-participation-heading">Define how this project can form.</h2></div><strong>{value.participation_mode.toUpperCase()}</strong></div>
    <p className={styles.intro}>Choose the canonical participation model and capacity. The minimum is the start threshold, the target is the preferred planning size, and the maximum is the hard capacity limit.</p>
    {loading?<p className={styles.status}>Loading participation…</p>:<form onSubmit={save}>
      <fieldset disabled={!editable||busy} className={styles.fieldset}><legend>Participation mode</legend><div className={styles.modes}>
        {(['solo','team','flexible'] as Mode[]).map(mode=><label key={mode} className={styles.mode}><input type="radio" name="participation-mode" value={mode} checked={value.participation_mode===mode} onChange={()=>setMode(mode)}/><span><strong>{mode[0].toUpperCase()+mode.slice(1)}</strong><small>{mode==='solo'?'One participant throughout.':mode==='team'?'Starts when the minimum viable team is ready.':'Can start with one participant and grow while capacity allows.'}</small></span></label>)}
      </div></fieldset>
      <div className={styles.capacity}>
        <label>Minimum to start<input aria-describedby="participation-capacity-help" type="number" min="1" max="50" value={value.min_team_size} disabled={!editable||busy||value.participation_mode==='solo'} onChange={event=>setCapacity('min_team_size',event.target.value)}/></label>
        <label>Target size<input aria-describedby="participation-capacity-help" type="number" min="1" max="50" value={value.target_team_size} disabled={!editable||busy||value.participation_mode==='solo'} onChange={event=>setCapacity('target_team_size',event.target.value)}/></label>
        <label>Maximum capacity<input aria-describedby="participation-capacity-help" type="number" min="1" max="50" value={value.max_team_size} disabled={!editable||busy||value.participation_mode==='solo'} onChange={event=>setCapacity('max_team_size',event.target.value)}/></label>
      </div>
      <p id="participation-capacity-help" className={styles.help}>{capacityHelp}</p>
      {!editable&&<p className={styles.status}>Participation is read-only once the proposal leaves Draft or Changes Requested.</p>}
      {error&&<p className={`${styles.status} ${styles.error}`} role="alert">{error}</p>}
      {message&&<p className={styles.status} role="status" aria-live="polite">{message}</p>}
      {editable&&<button className={styles.save} type="submit" disabled={busy}>{busy?'Saving…':'Save participation'}</button>}
    </form>}
  </section>;
}
