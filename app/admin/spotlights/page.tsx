import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import AdminSpotlightReview from '@/components/AdminSpotlightReview';

export const dynamic='force-dynamic';
type Row={id:string;user_id:string;title:string;category:string;summary:string|null;award_month:string|null;score:number|null;score_breakdown:Record<string,number>|null;status:string;is_excluded:boolean;exclusion_reason:string|null;consent_status:string;publication_held:boolean;hold_reason:string|null;suppress_public_project:boolean;suppress_public_evidence:boolean;primary_project_id:string|null;profiles:{full_name:string|null;headline:string|null}|{full_name:string|null;headline:string|null}[]|null};

export default async function AdminSpotlightsPage(){
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');
  const db=serviceDb();
  let items:{id:string;name:string;headline:string|null;title:string;category:string;summary:string|null;award_month:string|null;score:number|null;score_breakdown:Record<string,number>|null;status:string;is_excluded:boolean;exclusion_reason:string|null;consent_status:string;publication_held:boolean;hold_reason:string|null;suppress_public_project:boolean;suppress_public_evidence:boolean;project_title:string|null;evidence_titles:string[]}[]=[];
  let loadError=false;
  if(db){
    const {data,error}=await db.from('spotlights').select('id,user_id,title,category,summary,award_month,score,score_breakdown,status,is_excluded,exclusion_reason,consent_status,publication_held,hold_reason,suppress_public_project,suppress_public_evidence,primary_project_id,profiles(full_name,headline)').order('award_month',{ascending:false}).order('created_at',{ascending:false}).limit(60);
    if(error)loadError=true;
    else{
      const rows=(data||[]) as unknown as Row[];const ids=rows.map(row=>row.id);const projectIds=[...new Set(rows.map(row=>row.primary_project_id).filter(Boolean) as string[])];
      const [evidenceResult,projectsResult]=await Promise.all([
        ids.length?db.from('spotlight_evidence').select('spotlight_id,source_label,is_primary').in('spotlight_id',ids).order('is_primary',{ascending:false}):Promise.resolve({data:[],error:null}),
        projectIds.length?db.from('projects').select('id,title').in('id',projectIds):Promise.resolve({data:[],error:null})
      ]);
      if(evidenceResult.error||projectsResult.error)loadError=true;
      const projectMap=new Map((projectsResult.data||[]).map(project=>[project.id,project.title]));
      items=rows.map(row=>{const profile=Array.isArray(row.profiles)?row.profiles[0]:row.profiles;return {id:row.id,name:profile?.full_name||'Mettelo member',headline:profile?.headline||null,title:row.title,category:row.category,summary:row.summary,award_month:row.award_month,score:row.score,score_breakdown:row.score_breakdown,status:row.status,is_excluded:row.is_excluded,exclusion_reason:row.exclusion_reason,consent_status:row.consent_status,publication_held:row.publication_held,hold_reason:row.hold_reason,suppress_public_project:row.suppress_public_project,suppress_public_evidence:row.suppress_public_evidence,project_title:row.primary_project_id?projectMap.get(row.primary_project_id)||null:null,evidence_titles:(evidenceResult.data||[]).filter(link=>link.spotlight_id===row.id).map(link=>link.source_label)};});
    }
  }else loadError=true;
  return <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">ADMIN · SPOTLIGHT GOVERNANCE</div><h1>Safeguard exceptions, not routine winners.</h1></div><p>System selection and consent requests are automatic. Members alone control personal publication. Admin can inspect provenance, exclude a false-positive draft, hold publication, or suppress unsafe public context.</p></div>{loadError?<div className="panel emptyState" role="status"><h2>Spotlight governance data is unavailable.</h2><p>No exception action is available until the source data can be loaded safely.</p></div>:<AdminSpotlightReview initialItems={items}/>}</div></section>;
}
