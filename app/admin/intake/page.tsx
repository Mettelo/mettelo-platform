import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import styles from '@/components/AdminReview.module.css';

export const dynamic='force-dynamic';
type IntakeRow={id:string;form_type:string;status:string;created_at:string;payload:unknown};
function label(key:string){return key.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function entries(payload:unknown){if(!payload||typeof payload!=='object'||Array.isArray(payload))return[] as [string,string][];return Object.entries(payload as Record<string,unknown>).filter(([key,value])=>!['consent','csrf','token'].includes(key)&&value!==null&&value!==undefined&&String(value).trim()).map(([key,value])=>[label(key),Array.isArray(value)?value.join(', '):String(value)] as [string,string]);}

export default async function AdminIntakePage(){
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');
  const db=serviceDb();const {data}=db?await db.from('form_submissions').select('id,form_type,status,created_at,payload').order('created_at',{ascending:false}).limit(50):{data:[]};const rows=(data||[]) as IntakeRow[];
  return <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Admin · Intake</div><h1>General submissions.</h1></div><p>Contact, partnership and feedback submissions stay separate from governed project and Careers applications.</p></div><div className="applicationQueue">{rows.length?rows.map(item=>{const fields=entries(item.payload);return <article className={styles.card} key={item.id}><div className={styles.header}><div className={styles.heading}><div className={styles.statusLine}><span className="chip">{item.status.toUpperCase()}</span></div><h3>{label(item.form_type)}</h3><small>Submitted through the Mettelo intake form</small></div><small className={styles.date}>{new Date(item.created_at).toLocaleString('en-GB')}</small></div><div className={styles.submitted}>{fields.length?fields.map(([field,value])=><div className={styles.section} key={field}><span className={styles.label}>{field}</span>{/^https?:\/\//i.test(value)?<a className="linkArrow" href={value} target="_blank" rel="noopener noreferrer">Open link →</a>:<p className={styles.copy}>{value}</p>}</div>):<div className={styles.section}><span className={styles.label}>Submission</span><p className={styles.copy}>No readable form fields were stored for this submission.</p></div>}</div></article>}):<div className="emptyState"><h3>No submissions.</h3></div>}</div></div></section>;
}
