import {createPublicSupabaseClient} from '@/lib/supabase/public';
import {serviceDb} from '@/lib/project-flow';
import {PROFILE_APPLICATION_READY} from '@/lib/profile-readiness';

export type PublicSpotlightAward={
  id:string;
  userId:string|null;
  title:string;
  category:string;
  summary:string|null;
  awardMonth:string|null;
  publishedAt:string|null;
  displayName:string;
  headline:string|null;
  profileHref:string|null;
  project:{id:string;title:string}|null;
  evidence:{id:string;title:string;verifiedAt:string|null}|null;
};

type SpotlightRow={
  id:string;
  user_id:string|null;
  title:string;
  category:string;
  summary:string|null;
  award_month:string|null;
  published_at:string|null;
  public_display_name:string|null;
  public_headline:string|null;
  primary_project_id:string|null;
  suppress_public_project:boolean;
  suppress_public_evidence:boolean;
};

export async function listPublicSpotlights(limit=72){return projectPublicSpotlights(null,limit);}
export async function getPublicSpotlight(id:string){const rows=await projectPublicSpotlights(id,1);return rows[0]||null;}

async function projectPublicSpotlights(id:string|null,limit:number){
  const publicDb=createPublicSupabaseClient();
  if(!publicDb)throw new Error('Public Spotlight service is unavailable.');
  let query=publicDb.from('spotlights')
    .select('id,user_id,title,category,summary,award_month,published_at,public_display_name,public_headline,primary_project_id,suppress_public_project,suppress_public_evidence')
    .eq('status','published')
    .eq('consent_status','granted')
    .eq('is_excluded',false)
    .eq('publication_held',false)
    .order('award_month',{ascending:false})
    .order('published_at',{ascending:false})
    .limit(limit);
  if(id)query=query.eq('id',id);
  const {data,error}=await query;
  if(error)throw error;
  if(!data?.length)return [] as PublicSpotlightAward[];
  const rows=data as SpotlightRow[];

  const userIds=[...new Set(rows.map(row=>row.user_id).filter(Boolean) as string[])];
  const projectIds=[...new Set(rows.filter(row=>!row.suppress_public_project).map(row=>row.primary_project_id).filter(Boolean) as string[])];
  const profileIds=new Set<string>();
  const projectMap=new Map<string,{id:string;title:string}>();

  if(userIds.length){
    const {data:profiles,error:profileError}=await publicDb.from('profiles').select('id').in('id',userIds).eq('is_public',true).gte('profile_readiness',PROFILE_APPLICATION_READY);
    if(profileError)throw profileError;
    for(const profile of profiles||[])profileIds.add(profile.id);
  }
  if(projectIds.length){
    // The public client deliberately relies on the canonical projects RLS policy in
    // addition to the explicit visibility check, so private/member-only projects
    // cannot leak through Spotlight even though the award itself is public.
    const {data:projects,error:projectError}=await publicDb.from('projects').select('id,title').in('id',projectIds).eq('visibility','public');
    if(projectError)throw projectError;
    for(const project of projects||[])projectMap.set(project.id,{id:project.id,title:project.title});
  }

  const evidenceMap=new Map<string,{id:string;title:string;verifiedAt:string|null}>();
  const service=serviceDb();
  if(service){
    const candidateRows=rows.filter(row=>!row.suppress_public_evidence);
    const spotlightIds=candidateRows.map(row=>row.id);
    if(spotlightIds.length){
      const {data:links,error:linkError}=await service.from('spotlight_evidence').select('spotlight_id,contribution_id,is_primary').in('spotlight_id',spotlightIds).eq('is_primary',true);
      if(linkError)throw linkError;
      const contributionIds=[...new Set((links||[]).map(link=>link.contribution_id))];
      if(contributionIds.length){
        // Public Proof still has its own independent verification + visibility gate.
        const {data:proof,error:proofError}=await publicDb.from('contributions').select('id,title,verified_at').in('id',contributionIds).eq('verification_status','verified').eq('visibility','public');
        if(proofError)throw proofError;
        const proofMap=new Map((proof||[]).map(item=>[item.id,{id:item.id,title:item.title,verifiedAt:item.verified_at}]));
        for(const link of links||[]){const item=proofMap.get(link.contribution_id);if(item)evidenceMap.set(link.spotlight_id,item);}
      }
    }
  }

  return rows.map(row=>({
    id:row.id,
    userId:row.user_id,
    title:row.title,
    category:row.category,
    summary:row.summary,
    awardMonth:row.award_month,
    publishedAt:row.published_at,
    displayName:row.public_display_name?.trim()||'Mettelo member',
    headline:row.public_headline?.trim()||null,
    profileHref:row.user_id&&profileIds.has(row.user_id)?`/people/${row.user_id}`:null,
    project:!row.suppress_public_project&&row.primary_project_id?projectMap.get(row.primary_project_id)||null:null,
    evidence:row.suppress_public_evidence?null:evidenceMap.get(row.id)||null
  }));
}
