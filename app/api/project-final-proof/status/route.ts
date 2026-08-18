import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

export async function GET(request:Request){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});const url=new URL(request.url),projectId=url.searchParams.get('project_id')||'',runId=url.searchParams.get('project_run_id')||'';if(!projectId||!runId)return NextResponse.json({error:'Project and team are required.'},{status:400});const db=serviceDb();if(!db)return NextResponse.json({error:'Project service is not configured.'},{status:503});
 const [{data:project},{data:run},{data:member},{data:architect},{data:delegation},{data:submission},{data:pending},{data:permissions}]=await Promise.all([
  db.from('projects').select('id,title,project_type,presentation_required,github_repo_required,final_proof_required,github_url').eq('id',projectId).maybeSingle(),
  db.from('project_runs').select('id,run_number,status').eq('id',runId).eq('project_id',projectId).maybeSingle(),
  db.from('project_members').select('team_role,membership_status').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).maybeSingle(),
  db.from('project_architect_assignments').select('id').eq('project_id',projectId).eq('user_id',user.id).eq('assignment_status','active').limit(1).maybeSingle(),
  db.from('project_submission_permissions').select('id').eq('project_run_id',runId).eq('user_id',user.id).is('revoked_at',null).maybeSingle(),
  db.from('project_final_proof_submissions').select('id,submitted_by_user_id,summary,evidence_url,github_url,submitted_at').eq('project_run_id',runId).is('superseded_at',null).maybeSingle(),
  db.from('project_completion_requests').select('id,status,review_notes,reviewed_at').eq('project_run_id',runId).order('created_at',{ascending:false}).limit(1).maybeSingle(),
  db.from('project_submission_permissions').select('user_id,granted_by_user_id,granted_at').eq('project_run_id',runId).is('revoked_at',null)
 ]);
 if(!project||!run)return NextResponse.json({error:'Project team not found.'},{status:404});const isAdmin=user.app_metadata?.role==='admin';if(!member&&!isAdmin&&!architect)return NextResponse.json({error:'Project membership is required.'},{status:403});const active=member&&['active','completed'].includes(member.membership_status);const canGrant=Boolean(isAdmin||architect||(active&&member.team_role==='project_lead'));const canSubmit=Boolean(isAdmin||architect||(active&&['project_lead','project_architect'].includes(member.team_role))||delegation);return NextResponse.json({project,run,can_grant:canGrant,can_submit:canSubmit,delegated:Boolean(delegation),submission:submission||null,completion_request:pending||null,permissions:permissions||[]});
}
