import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

const statuses=new Set(['draft','open','recruiting','pilot']);
const projectTypes=new Set(['open','partner']);
const visibilities=new Set(['public','private']);
const locationTypes=new Set(['remote','hybrid','in_person']);
const difficulties=new Set(['entry','intermediate','advanced']);
function text(value:unknown){return String(value??'').trim()}
function slugify(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120)}
async function admin(){const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();return user?.app_metadata?.role==='admin'?user:null}

export async function POST(request:Request){
  const user=await admin();if(!user)return NextResponse.json({error:'Admin access required.'},{status:403});
  const db=serviceDb();if(!db)return NextResponse.json({error:'Project service unavailable.'},{status:503});
  try{
    const body=await request.json() as Record<string,unknown>;
    const title=text(body.title),summary=text(body.summary),project_type=text(body.project_type||'open'),status=text(body.status||'draft'),visibility=text(body.visibility||'public'),partner_name=text(body.partner_name),location_type=text(body.location_type||'remote'),difficulty_level=text(body.difficulty_level||'intermediate');
    const roles=text(body.roles).split('\n').map(v=>v.trim()).filter(Boolean).slice(0,20);
    if(!title||summary.length<30)return NextResponse.json({error:'Add a project title and a summary of at least 30 characters.'},{status:400});
    if(!projectTypes.has(project_type)||!statuses.has(status)||!visibilities.has(visibility)||!locationTypes.has(location_type)||!difficulties.has(difficulty_level))return NextResponse.json({error:'One or more project settings are invalid.'},{status:400});
    if(project_type==='partner'&&!partner_name)return NextResponse.json({error:'Partner name is required for a Partner Project.'},{status:400});
    if(status!=='pilot'&&roles.length===0)return NextResponse.json({error:'Add at least one project role before opening applications.'},{status:400});
    const durationRaw=text(body.duration_weeks),teamRaw=text(body.team_size_threshold),deadline=text(body.application_deadline);
    const duration=durationRaw?Number(durationRaw):null,teamSize=teamRaw?Number(teamRaw):5;
    if(duration!==null&&(!Number.isInteger(duration)||duration<1||duration>52))return NextResponse.json({error:'Duration must be between 1 and 52 weeks.'},{status:400});
    if(!Number.isInteger(teamSize)||teamSize<1||teamSize>30)return NextResponse.json({error:'Team size must be between 1 and 30.'},{status:400});
    const baseSlug=slugify(title);if(!baseSlug)return NextResponse.json({error:'Project title cannot be converted to a valid slug.'},{status:400});
    let slug=baseSlug;const {data:existing}=await db.from('projects').select('id').eq('slug',slug).maybeSingle();if(existing)slug=`${baseSlug}-${Date.now().toString().slice(-6)}`;
    const {data:project,error}=await db.from('projects').insert({slug,title,summary,project_type,partner_name:project_type==='partner'?partner_name:null,status,visibility,location:text(body.location)||null,location_type,difficulty_level,duration_weeks:duration,weekly_commitment:text(body.weekly_commitment)||null,application_deadline:deadline?new Date(deadline).toISOString():null,team_size_threshold:teamSize}).select('id,title,slug,status,project_type').single();
    if(error)return NextResponse.json({error:'Unable to create project.'},{status:400});
    if(roles.length){const {error:roleError}=await db.from('project_roles').insert(roles.map(title=>({project_id:project.id,title,openings:1})));if(roleError){await db.from('projects').delete().eq('id',project.id);return NextResponse.json({error:'Project roles could not be created, so the project was not saved.'},{status:400});}}
    return NextResponse.json({project});
  }catch(error){console.error('admin project create error',error);return NextResponse.json({error:'Invalid project request.'},{status:400})}
}
