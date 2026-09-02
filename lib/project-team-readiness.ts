import {serviceDb} from '@/lib/project-flow';

type Db=NonNullable<ReturnType<typeof serviceDb>>;

type MemberRow={id:string;user_id:string;project_role_id:string|null;team_role:string;membership_status:string;joined_at:string|null};
type Candidate={userId:string;leadershipInterest:boolean;completedProjects:number;activeLeadProjects:number;submittedAt:string;score:number};

export type ProjectTeamReadiness={
  filled:number;
  threshold:number;
  full:boolean;
  responsibilityCoverageReady:boolean;
  labReady:boolean;
  leadReady:boolean;
  leadUserId:string|null;
  leadAssignedNow:boolean;
  ready:boolean;
  blockers:string[];
  recommendation:Candidate|null;
};

function iso(value:unknown){const text=String(value||'');return text||'9999-12-31T23:59:59.999Z'}

export async function assessProjectTeamReadiness({db,projectId,runId,requiredTeamSize,assignLead=false}:{db:Db;projectId:string;runId:string;requiredTeamSize:number;assignLead?:boolean}):Promise<ProjectTeamReadiness>{
  const threshold=Math.max(1,Number(requiredTeamSize||1));
  const {data:memberData,error:memberError}=await db
    .from('project_members')
    .select('id,user_id,project_role_id,team_role,membership_status,joined_at')
    .eq('project_run_id',runId)
    .in('membership_status',['waiting','active']);
  if(memberError)throw memberError;
  const members=(memberData||[]) as MemberRow[];
  const filled=members.length;
  const full=filled>=threshold;
  const responsibilityCoverageReady=full&&members.every(member=>Boolean(member.project_role_id));

  const {data:projectReadiness,error:readinessError}=await db
    .from('project_experience_readiness')
    .select('lab_ready')
    .eq('project_id',projectId)
    .maybeSingle();
  const labReady=!readinessError&&projectReadiness?.lab_ready===true;

  let leads=members.filter(member=>member.team_role==='project_lead');
  let leadAssignedNow=false;
  let recommendation:Candidate|null=null;

  if(assignLead&&full&&responsibilityCoverageReady&&labReady&&leads.length===0&&members.length){
    const userIds=members.map(member=>member.user_id);
    const [{data:applications},{data:history}]=await Promise.all([
      db.from('project_applications').select('user_id,leadership_interest,submitted_at').eq('project_run_id',runId).in('user_id',userIds),
      db.from('project_members').select('user_id,project_run_id,team_role,membership_status').in('user_id',userIds)
    ]);
    const appMap=new Map((applications||[]).map(row=>[row.user_id,row]));
    const candidates:Candidate[]=members.map(member=>{
      const application=appMap.get(member.user_id);
      const completedProjects=(history||[]).filter(row=>row.user_id===member.user_id&&row.project_run_id!==runId&&row.membership_status==='completed').length;
      const activeLeadProjects=(history||[]).filter(row=>row.user_id===member.user_id&&row.project_run_id!==runId&&row.membership_status==='active'&&row.team_role==='project_lead').length;
      const leadershipInterest=application?.leadership_interest===true;
      const score=(leadershipInterest?60:0)+Math.min(completedProjects*10,30)-Math.min(activeLeadProjects*25,50);
      return{userId:member.user_id,leadershipInterest,completedProjects,activeLeadProjects,submittedAt:iso(application?.submitted_at||member.joined_at),score};
    });
    const volunteers=candidates.filter(candidate=>candidate.leadershipInterest);
    const pool=volunteers.length?volunteers:candidates;
    pool.sort((a,b)=>b.score-a.score||b.completedProjects-a.completedProjects||a.activeLeadProjects-b.activeLeadProjects||a.submittedAt.localeCompare(b.submittedAt)||a.userId.localeCompare(b.userId));
    recommendation=pool[0]||null;
    if(recommendation){
      const selected=members.find(member=>member.user_id===recommendation?.userId);
      if(selected){
        const {error}=await db.from('project_members').update({team_role:'project_lead'}).eq('id',selected.id).eq('team_role','contributor');
        if(error)throw error;
        leadAssignedNow=true;
        await db.from('project_activity_log').insert({
          project_id:projectId,
          project_run_id:runId,
          event_type:'project_lead_auto_assigned',
          actor_type:'system',
          from_status:'forming',
          to_status:'forming',
          metadata:{
            user_id:recommendation.userId,
            leadership_interest:recommendation.leadershipInterest,
            completed_projects:recommendation.completedProjects,
            active_lead_projects:recommendation.activeLeadProjects,
            leadership_readiness_score:recommendation.score,
            volunteers_available:volunteers.length,
            candidate_count:candidates.length,
            selection_policy:'interest_then_mettelo_delivery_history_then_current_lead_load_then_submission_order'
          }
        });
        leads=[{...selected,team_role:'project_lead'}];
      }
    }
  }

  const leadReady=leads.length===1;
  const blockers:string[]=[];
  if(!full)blockers.push('team_size');
  if(full&&!responsibilityCoverageReady)blockers.push('responsibility_coverage');
  if(!labReady)blockers.push(readinessError?'project_readiness_unavailable':'project_readiness');
  if(leads.length===0)blockers.push('project_lead');
  if(leads.length>1)blockers.push('multiple_project_leads');
  const leadUserId=leadReady?leads[0].user_id:null;
  return{filled,threshold,full,responsibilityCoverageReady,labReady,leadReady,leadUserId,leadAssignedNow,ready:blockers.length===0,blockers,recommendation};
}
