import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import AdminSectionTabs from '@/components/AdminSectionTabs';
import AdminCareerApplicationQueueV2,{type CareerApplicationAdminItemV2} from '@/components/AdminCareerApplicationQueueV2';

export const dynamic='force-dynamic';
type Question={id?:string;label?:string;required?:boolean}|string;
type Raw=Omit<CareerApplicationAdminItemV2,'cv_url'|'profile'|'communications'|'onboarding_items'>;
type Profile={id:string;full_name:string|null;headline:string|null;current_job_title:string|null;professional_area:string|null;skills:string[]|null;project_availability:string|null};
type Communication={id:string;related_id:string|null;template_key:string;subject:string;status:string;recipient_email:string;actor_user_id:string|null;created_at:string;sent_at:string|null};
type Onboarding={id:string;application_id:string;item_key:string;title:string;description:string|null;status:string;due_at:string|null;completed_at:string|null};

export default async function AdminCareerCandidatesPage({searchParams}:{searchParams:Promise<{role?:string;candidate?:string}>}){
 const params=await searchParams;const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');
 const db=serviceDb();const items:CareerApplicationAdminItemV2[]=[];
 if(db){
  const {data}=await db.from('career_applications').select('id,role_id,user_id,full_name,email,status,final_outcome,final_outcome_updated_at,offer_status,offer_sent_at,submitted_at,location,linkedin_url,portfolio_url,work_authorisation,motivation,relevant_experience,answers,admin_notes,interview_at,interview_timezone,interview_format,interview_url,interviewer,interview_instructions,offer_salary_rate,offer_start_date,offer_employment_type,offer_manager,offer_working_arrangement,offer_conditions,offer_acceptance_deadline,offer_personal_message,cv_path,career_roles(id,title,application_questions)').order('submitted_at',{ascending:false}).limit(1000);
  const raw=(data||[]) as unknown as (Raw&{cv_path:string|null;career_roles:{id:string;title:string;application_questions:Question[]}|null})[];const userIds=[...new Set(raw.map(x=>x.user_id).filter((x):x is string=>Boolean(x)))],ids=raw.map(x=>x.id);
  const [profilesResult,communicationsResult,onboardingResult]=await Promise.all([
   userIds.length?db.from('profiles').select('id,full_name,headline,current_job_title,professional_area,skills,project_availability').in('id',userIds):Promise.resolve({data:[]}),
   ids.length?db.from('communication_records').select('id,related_id,template_key,subject,status,recipient_email,actor_user_id,created_at,sent_at').eq('related_type','career_application').in('related_id',ids).order('created_at',{ascending:false}):Promise.resolve({data:[]}),
   ids.length?db.from('career_onboarding_items').select('id,application_id,item_key,title,description,status,due_at,completed_at').in('application_id',ids).order('created_at',{ascending:true}):Promise.resolve({data:[]})
  ]);
  const profiles=(profilesResult.data||[]) as Profile[],communications=(communicationsResult.data||[]) as Communication[],onboarding=(onboardingResult.data||[]) as Onboarding[];
  for(const row of raw){let cv_url:string|null=null;if(row.cv_path){const signed=await db.storage.from('career-cvs').createSignedUrl(row.cv_path,3600);cv_url=signed.data?.signedUrl||null;}items.push({...row,final_outcome:row.final_outcome||'pending',offer_status:row.offer_status||'not_prepared',cv_url,profile:row.user_id?profiles.find(p=>p.id===row.user_id)||null:null,communications:communications.filter(c=>c.related_id===row.id).slice(0,20),onboarding_items:onboarding.filter(o=>o.application_id===row.id)});}
 }
 const active=items.filter(x=>x.status!=='withdrawn'&&!['hired','rejected'].includes(x.final_outcome));const finalStage=items.filter(x=>['interview','offer','hired','rejected'].includes(x.status));
 return <section className="section softSection"><div className="shell"><AdminSectionTabs label="Career sections" tabs={[{label:'Roles',href:'/admin/careers/roles'},{label:'Candidates',href:'/admin/careers/applications'},{label:'Pipeline overview',href:'/admin/careers/pipeline'}]}/><div className="adminPageHeader"><div><div className="eyebrow">Admin / Recruiting / Careers / Candidates</div><h1>Recruitment workspace</h1><p>Find a candidate, review their evidence, then manage stage, interview, decision and communication in a clear sequence. Final-stage state changes never send email automatically.</p></div></div><div className="metricGrid" style={{marginBottom:18}}><div className="metric"><strong>{active.length}</strong><span>Active candidates</span></div><div className="metric"><strong>{items.filter(x=>x.status==='shortlisted').length}</strong><span>Shortlisted</span></div><div className="metric"><strong>{finalStage.length}</strong><span>Interview &amp; final decision</span></div><div className="metric"><strong>{items.filter(x=>x.final_outcome==='hired').length}</strong><span>Hired</span></div><div className="metric"><strong>{items.filter(x=>x.offer_status==='sent').length}</strong><span>Offers sent</span></div></div><AdminCareerApplicationQueueV2 initialItems={items} initialRoleFilter={params.role||''} initialCandidateId={params.candidate||''}/></div></section>;
}
