import {serviceDb} from '@/lib/project-flow';

type Db=NonNullable<ReturnType<typeof serviceDb>>;

type MemberRow={id:string;user_id:string;team_role:string;membership_status:string;joined_at:string|null};
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

export async function assessProjectTeamReadiness({db,projectId,runId,requiredTeamSize,assignLead=false,requireResponsibilityCoverage=true,requireLead=true}:{db:Db;projectId:string;runId:string;requiredTeamSize:number;assignLead?:boolean;requireResponsibilityCoverage?:boolean;requireLead?:boolean}):Promise<ProjectTeamReadiness>{
  const threshold=Math.max(1,Number(requiredTeamSize||1));
  const {data:memberData,error:memberError}=await db
    .from('project_members')
    .select('id,user_id,team_role,membership_status,joined_at')
    .eq('project_run_id',runId)
    .in('membership_status',['waiting','active']);
  if(memberError)throw memberError;
  const members=(memberData||[]) as MemberRow[];
  const filled=members.length;
  const full=filled>=threshold;

  // Phase 10 delivery ownership is normalized in project_member_responsibilities.
  // project_members.project_role_id is a compatibility/application-role field and
  // must not be treated as delivery responsibility coverage.
  let responsibilityCoverageReady=!requireResponsibilityCoverage;
  if(requireResponsibilityCoverage){
    const memberIds=members.map(member=>member.id);
    const assignedMembers=new Set<string>();
    if(memberIds.length){
      const {data:assignments,error:assignmentError}=await db
        .from('project_member_responsibilities')
        .select('project_member_id,assignment_status')
        .eq('project_run_id',runId)
        .eq('assignment_status','active')
        .in('project_member_id',memberIds);
      if(assignmentError)throw assignmentError;
      for(const assignment of assignments||[])assignedMembers.add(String(assignment.project_member_id));
    }
    responsibilityCoverageReady=full&&members.every(member=>assignedMembers.has(member.id));
  }

  const {data:projectReadiness,error:readinessError}=await db
    .from('project_experience_readiness')
    .select('lab_ready')
    .eq('project_id',projectId)
    .maybeSingle();
  const labReady=!readinessError&&projectReadiness?.lab_ready===true;

  const leads=members.filter(member=>member.team_role==='project_lead');
  const leadAssignedNow=false;
  let recommendation:Candidate|null=null;

  // `assignLead` is retained as a compatibility input for callers that request
  // lead preparation. Phase 10 now interprets it as recommendation only:
  // leadership interest is evidence for a candidate, never authority to mutate
  // canonical Project Lead state. Confirmation uses phase10_confirm_project_lead.
  if(requireLead&&assignLead&&full&&responsibilityCoverageReady&&leads.length===0&&members.length){
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
    volunteers.sort((a,b)=>b.score-a.score||b.completedProjects-a.completedProjects||a.activeLeadProjects-b.activeLeadProjects||a.submittedAt.localeCompare(b.submittedAt)||a.userId.localeCompare(b.userId));
    recommendation=volunteers[0]||null;
  }

  const leadReady=!requireLead||leads.length===1;
  const blockers:string[]=[];
  if(!full)blockers.push('team_size');
  if(full&&!responsibilityCoverageReady)blockers.push('responsibility_coverage');
  if(!labReady)blockers.push(readinessError?'project_readiness_unavailable':'project_readiness');
  if(requireLead){
    if(leads.length===0)blockers.push('project_lead');
    if(leads.length>1)blockers.push('multiple_project_leads');
  }
  const leadUserId=leads.length===1?leads[0].user_id:null;
  return{filled,threshold,full,responsibilityCoverageReady,labReady,leadReady,leadUserId,leadAssignedNow,ready:blockers.length===0,blockers,recommendation};
}
