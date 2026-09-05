'use client';

import {useEffect,useState} from 'react';
import styles from './AdminProjectParticipationSummary.module.css';

type Item={id:string;title:string;governance_status:string;participation_mode:'solo'|'team'|'flexible';min_team_size:number;target_team_size:number;max_team_size:number;team_size_threshold:number};

export default function AdminProjectParticipationSummary(){
 const [items,setItems]=useState<Item[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;(async()=>{try{const response=await fetch('/api/admin/project-governance',{cache:'no-store'});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Unable to load project participation.');if(active)setItems(body.items||[])}catch(cause){if(active)setError(cause instanceof Error?cause.message:'Unable to load project participation.')}finally{if(active)setLoading(false)}})();return()=>{active=false}},[]);
 return <section className={styles.panel} aria-labelledby="admin-participation-heading"><div className={styles.head}><div><span>CANONICAL PARTICIPATION</span><h2 id="admin-participation-heading">Formation definitions in the governance queue</h2></div><strong>{items.length}</strong></div><p>Admin can verify Solo, Team or Flexible capacity before approval. Minimum capacity must stay aligned with the existing formation threshold.</p>{loading?<p>Loading participation definitions…</p>:error?<p role="alert" className={styles.error}>{error}</p>:items.length?<div className={styles.grid}>{items.slice(0,12).map(item=><article key={item.id} className={styles.card}><div><strong>{item.title}</strong><span>{item.governance_status.replaceAll('_',' ')}</span></div><dl><div><dt>Mode</dt><dd>{item.participation_mode}</dd></div><div><dt>Min</dt><dd>{item.min_team_size}</dd></div><div><dt>Target</dt><dd>{item.target_team_size}</dd></div><div><dt>Max</dt><dd>{item.max_team_size}</dd></div></dl>{item.team_size_threshold!==item.min_team_size&&<p className={styles.error}>Formation threshold is out of alignment.</p>}</article>)}</div>:<p>No Architect-created projects are currently in the governance queue.</p>}</section>;
}
