import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {projectCompletionReadiness,type CompletionReadiness} from '@/lib/project-completion-readiness';

export async function GET(request:Request){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});const url=new URL(request.url),projectId=url.searchParams.get('project_id')||'',runId=url.searchParams.get('project_run_id')||'';if(!projectId||!runId)return NextResponse.json({error:'Project and team are required.'},{status:400});const db=serviceDb();if(!db)return NextResponse.json({error:'Project service is not configured.'},{status:503});
 const [{data:project},{data:run},{data:member},{data:architect},{data:delegation},{data:submission},{data:latestRequest},{data:permissions},{data:history},{data:criteria},{data:assessments},readinessResult]=await Promise.all([
  db.from('projects').select('id,title,project_type,presentation_required,github_repo_required,final_proof_required,github_url').eq('id',projectId).maybeSingle(),
  db.from('project_runs').select('id,run_number,status,recruitment_open,completion_requested_at,completed_at,completion_state').eq('id',runId).eq('project_id',projectId).maybeSingle(),
  db.from('project_members').select('team_role,membership_status').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).maybeSingle(),
  db.from('project_architect_assignments').select('id').eq('project_id',projectId).eq('user_id',user.id).eq('assignment_status','active').limit(1).maybeSingle(),
  db.from('project_submission_permissions').select('id').eq('project_run_id',runId).eq('user_id',user.id).is('revoked_at',null).maybeSingle(),
  db.from('project_final_proof_submissions').select('id,submitted_by_user_id,summary,evidence_url,github_url,submitted_at').eq('project_run_id',runId).is('superseded_at',null).maybeSingle(),
  db.from('project_completion_requests').select('id,status,review_notes,reviewed_at,created_at').eq('project_run_id',runId).order('created_at',{ascending:false}).limit(1).maybeSingle(),
  db.from('project_submission_permissions').select('user_id,granted_by_user_id,granted_at').eq('project_run_id',runId).is('revoked_at',null),
  db.from('project_completion_requests').select('id,status,review_notes,reviewed_at,created_at,requested_by_user_id,reviewed_by_user_id').eq('project_run_id',runId).order('created_at',{ascending:false}).limit(20),
  db.from('project_success_criteria').select('id,title,description,measurement,is_required,sort_order').eq('project_id',projectId).order('sort_order',{ascending:true}),
  db.from('project_success_criterion_assessments').select('criterion_id,satisfied,assessment_notes,evidence_url,assessed_by_user_id,assessed_at,updated_at').eq('project_run_id',runId).eq('project_id',projectId),
  db.rpc('project_run_completion_readiness',{target_run:runId})
 ]);
 if(!project||!run)return NextResponse.json({error:'Project team not found.'},{status:404});const isAdmin=user.app_metadata?.role==='admin';if(!member&&!isAdmin&&!architect)return NextResponse.json({error:'Project membership is required.'},{status:403});const active=member&&['active','completed'].includes(member.membership_status);const canGrant=Boolean(isAdmin||architect||(active&&member.team_role==='project_lead'));const canSubmit=Boolean(isAdmin||architect||(active&&['project_lead','project_architect'].includes(member.team_role))||delegation);const canReview=Boolean(project.project_type==='partner'&&(isAdmin||architect));const readiness=projectCompletionReadiness((readinessResult.data||null) as CompletionReadiness|null);const assessmentMap=new Map((assessments||[]).map(item=>[String(item.criterion_id),item]));const successCriteria=(criteria||[]).map(item=>({...item,assessment:assessmentMap.get(String(item.id))||null}));
 return NextResponse.json({project,run,can_grant:canGrant,can_assess_criteria:canGrant,can_submit:canSubmit,can_review:canReview,delegated:Boolean(delegation),submission:submission||null,completion_request:latestRequest||null,permissions:permissions||[],history:history||[],success_criteria:successCriteria,readiness},{headers:{'Cache-Control':'private, no-store'}});
}
