'use client';

import Link from 'next/link';
import {useState} from 'react';
import styles from './MemberHomeCollaborationOpportunities.module.css';

type Item={id:string;projectId:string;title:string;summary:string|null;role:string;commitment:string|null;openPlaces:number;reason:string};
type Props={initialItems:Item[]};

export default function MemberHomeCollaborationRecommendationCards({initialItems}:Props){
 const [items,setItems]=useState(initialItems);const [message,setMessage]=useState('');const [working,setWorking]=useState('');
 async function dismiss(id:string){if(working)return;setWorking(id);setMessage('');try{const response=await fetch('/api/collaboration-recommendations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({collaboration_need_id:id})});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Unable to dismiss this recommendation.');setItems(current=>current.filter(item=>item.id!==id));setMessage(body.message||'Recommendation dismissed.')}catch(error){setMessage(error instanceof Error?error.message:'Unable to dismiss this recommendation.')}finally{setWorking('')}}
 async function disable(){if(working)return;setWorking('all');setMessage('');try{const response=await fetch('/api/collaboration-recommendations',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({enabled:false})});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Unable to hide recommendations.');setItems([]);setMessage(body.message||'Collaboration recommendations hidden.')}catch(error){setMessage(error instanceof Error?error.message:'Unable to hide recommendations.')}finally{setWorking('')}}
 return <><div className={styles.grid}>{items.map(item=><article className={styles.card} key={item.id}><small>{item.role}</small><h3>{item.title}</h3>{item.summary&&<p>{item.summary}</p>}<p className={styles.reason}><strong>Why this recommendation:</strong> {item.reason}</p><div className={styles.meta}><span>{item.openPlaces} place{item.openPlaces===1?'':'s'} open</span>{item.commitment&&<span>{item.commitment}</span>}</div><div className={styles.cardActions}><Link href={`/member/discover/${item.projectId}?collaboration_need=${encodeURIComponent(item.id)}`}>View collaborator need →</Link><button type="button" onClick={()=>dismiss(item.id)} disabled={Boolean(working)} aria-label={`Dismiss ${item.title} recommendation`}>{working===item.id?'Dismissing…':'Dismiss'}</button></div></article>)}</div>{items.length>0&&<div className={styles.preferenceRow}><span>Recommendations are optional and do not affect eligibility, applications or project access.</span><button type="button" onClick={disable} disabled={Boolean(working)}>{working==='all'?'Saving…':'Hide collaboration recommendations'}</button></div>}<div className={styles.status} role="status" aria-live="polite" aria-atomic="true">{message}</div></>;
}
