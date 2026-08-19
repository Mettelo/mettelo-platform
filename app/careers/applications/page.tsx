import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import CareerApplicationTracker,{type CareerApplicationItem} from '@/components/CareerApplicationTracker';

type CareerRow=Omit<CareerApplicationItem,'events'|'offer_documents'|'onboarding_items'>;
type CareerEvent={id:string;application_id:string;from_status:string|null;to_status:string;note:string|null;created_at:string};
type OfferDoc={id:string;application_id:string;file_name:string;size_bytes:number;created_at:string};
type Onboarding={id:string;application_id:string;item_key:string;title:string;description:string|null;status:string;due_at:string|null;completed_at:string|null};

export const dynamic='force-dynamic';

export default async function CareerApplicationsPage(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)redirect('/signin?next=/careers/applications');

  const {data:careerData,error}=await auth.from('career_applications')
    .select('id,status,submitted_at,updated_at,withdrawn_at,interview_at,interview_timezone,interview_format,interview_url,interviewer,interview_instructions,offer_salary_rate,offer_start_date,offer_employment_type,offer_manager,offer_working_arrangement,offer_conditions,offer_acceptance_deadline,offer_personal_message,career_roles(title)')
    .eq('user_id',user.id)
    .order('submitted_at',{ascending:false})
    .limit(100);

  const rows=(careerData||[]) as unknown as CareerRow[];
  const ids=rows.map(item=>item.id);
  const [{data:eventRows},{data:onboardingRows}]=await Promise.all([
    ids.length?auth.from('career_application_events').select('id,application_id,from_status,to_status,note,created_at').in('application_id',ids).order('created_at',{ascending:true}):Promise.resolve({data:[] as CareerEvent[]}),
    ids.length?auth.from('career_onboarding_items').select('id,application_id,item_key,title,description,status,due_at,completed_at').in('application_id',ids).order('created_at',{ascending:true}):Promise.resolve({data:[] as Onboarding[]})
  ]);

  let docs:OfferDoc[]=[];
  const service=serviceDb();
  if(service&&ids.length){
    const result=await service.from('career_offer_documents').select('id,application_id,file_name,size_bytes,created_at').in('application_id',ids).eq('active',true).order('created_at',{ascending:false});
    docs=(result.data||[]) as OfferDoc[];
  }

  const events=(eventRows||[]) as CareerEvent[];
  const onboarding=(onboardingRows||[]) as Onboarding[];
  const applications:CareerApplicationItem[]=rows.map(item=>({...item,
    events:events.filter(event=>event.application_id===item.id),
    offer_documents:docs.filter(doc=>doc.application_id===item.id).map(doc=>({id:doc.id,file_name:doc.file_name,size_bytes:doc.size_bytes,created_at:doc.created_at})),
    onboarding_items:onboarding.filter(row=>row.application_id===item.id).map(row=>({id:row.id,item_key:row.item_key,title:row.title,description:row.description,status:row.status,due_at:row.due_at,completed_at:row.completed_at}))
  }));

  return <section className="careerApplicationsPage" aria-labelledby="career-applications-title"><div className="careerApplicationsShell">
    <nav aria-label="Breadcrumb" className="careerBreadcrumb"><a href="/careers">Careers</a><span aria-hidden="true">/</span><strong>Your applications</strong></nav>
    <header className="careerHero"><div><span>METTELO CAREERS</span><h1 id="career-applications-title">Your career applications</h1><p>Recruitment applications, interview details, offers and onboarding live here in Careers. They are separate from your My Mettelo project applications.</p></div><a className="careerButton" href="/careers">View open roles</a></header>
    {error?<section className="careerError" role="alert"><h2>We could not load your career applications</h2><p>Refresh the page to try again. No application data has been changed.</p></section>:applications.length?<CareerApplicationTracker applications={applications}/>:<section className="careerEmpty"><h2>No career applications yet</h2><p>When you apply for a Mettelo role while signed in, you can follow your recruitment progress here.</p><a className="careerButton" href="/careers">View open roles</a></section>}
  </div><style>{`
    .careerApplicationsPage{display:block;min-height:70vh;padding:40px 24px 80px;background:#f5f5f2;color:#111318}.careerApplicationsShell{width:min(100%,1100px);margin:0 auto}.careerBreadcrumb{display:flex;gap:7px;margin-bottom:20px;color:#68727d;font-size:.78rem}.careerBreadcrumb a{color:inherit}.careerBreadcrumb strong{color:#111318}.careerHero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:end;margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #d8dde3}.careerHero span{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;font-weight:800;letter-spacing:.11em;color:#72551e}.careerHero h1{margin:8px 0 10px;font-size:clamp(2.2rem,5vw,3.4rem);letter-spacing:-.045em}.careerHero p{max-width:720px;margin:0;color:#59636f;line-height:1.65}.careerButton{min-height:44px;padding:0 15px;border:1px solid #111318;border-radius:10px;background:#111318;color:#fff;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-weight:800}.careerButton:focus-visible,.careerBreadcrumb a:focus-visible{outline:3px solid #173f8f;outline-offset:3px}.careerError,.careerEmpty{padding:20px;border:1px solid #d8dde3;border-radius:14px;background:#fff}.careerError h2,.careerEmpty h2{margin:0 0 6px;font-size:1.2rem}.careerError p,.careerEmpty p{margin:0 0 14px;color:#59636f}@media(max-width:760px){.careerApplicationsPage{padding:24px 14px 64px}.careerHero{grid-template-columns:1fr}.careerHero .careerButton,.careerEmpty .careerButton{width:100%}}
  `}</style></section>;
}
