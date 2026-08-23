import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import MemberProofPortfolio,{type MemberProofItem} from '@/components/MemberProofPortfolio';
import MemberPageHeader from '@/components/MemberPageHeader';

export const dynamic='force-dynamic';

type ContributionRow={
  id:string;
  project_id:string|null;
  project_run_id:string|null;
  title:string;
  contribution_type:string;
  description:string|null;
  verification_status:string;
  created_at:string;
  updated_at:string|null;
  verified_at:string|null;
  evidence_url:string|null;
  review_notes:string|null;
  visibility:string;
  projects:{title:string}|null;
};
type MembershipRow={project_id:string;project_run_id:string|null};
type Credential={credential_id:string;status:string;issued_at:string};

const proofFields='id,project_id,project_run_id,title,contribution_type,description,verification_status,created_at,updated_at,verified_at,evidence_url,review_notes,visibility,projects(title)';
const pageStyles=`
  .proofPage{width:min(100%,1240px);margin:0;min-width:0;color:#111318}
  .proofButton{min-height:44px;padding:0 15px;border:1px solid #b8c0c9;border-radius:10px;background:#fff;color:#111318;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-size:13px;font-weight:800}
  .proofButtonDark{background:#111318;border-color:#111318;color:#fff}
  .proofButton:focus-visible{outline:3px solid #173f8f;outline-offset:3px}
  .proofLoadError{margin-top:20px;padding:20px;border:1px solid #d8dde3;border-radius:14px;background:#fff;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center}
  .proofLoadError h2{margin:0 0 6px;font-size:1.15rem}.proofLoadError p{margin:0;color:#59636f;line-height:1.55}.proofLoadActions{display:flex;gap:8px;flex-wrap:wrap}
  @media(max-width:700px){.proofLoadError{grid-template-columns:1fr}.proofLoadActions{justify-content:flex-start}}
  @media(max-width:480px){.proofButton{font-size:13px}.proofLoadActions .proofButton{flex:1 1 130px}}
`;

export default async function ProofPage(){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/signin?next=/member/proof');

  // Proof is sourced only from contribution evidence. Project, task and milestone
  // completion are intentionally not queried as substitutes for verification.
  const [verifiedResult,pendingResult,rejectedResult,verifiedCountResult,pendingCountResult,credentialResult]=await Promise.all([
    supabase.from('contributions').select(proofFields).eq('user_id',user.id).eq('verification_status','verified').order('verified_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(100),
    supabase.from('contributions').select(proofFields).eq('user_id',user.id).in('verification_status',['pending','needs_changes']).order('updated_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(50),
    supabase.from('contributions').select(proofFields).eq('user_id',user.id).eq('verification_status','rejected').order('updated_at',{ascending:false,nullsFirst:false}).limit(20),
    supabase.from('contributions').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('verification_status','verified'),
    supabase.from('contributions').select('id',{count:'exact',head:true}).eq('user_id',user.id).in('verification_status',['pending','needs_changes']),
    supabase.from('project_architect_credentials').select('credential_id,status,issued_at').eq('user_id',user.id).order('issued_at',{ascending:false}).limit(1).maybeSingle()
  ]);

  if(verifiedResult.error||verifiedCountResult.error){
    console.error('member verified Proof query failed',verifiedResult.error||verifiedCountResult.error);
    return <ProofError/>;
  }

  const verifiedRows=(verifiedResult.data||[]) as unknown as ContributionRow[];
  const pendingRows=pendingResult.error?[]:(pendingResult.data||[]) as unknown as ContributionRow[];
  const rejectedRows=rejectedResult.error?[]:(rejectedResult.data||[]) as unknown as ContributionRow[];
  const allRows=[...verifiedRows,...pendingRows,...rejectedRows];
  const projectIds=[...new Set(allRows.map(item=>item.project_id).filter((id):id is string=>Boolean(id)))];

  // Membership is enough to authorize the project handoff. The clean-schema
  // authenticated role is not granted SELECT on project_roles, so Proof must not
  // widen privileges just to decorate a portfolio card with a role title. When a
  // safely authorized role projection exists, project_role can be populated then.
  const {data:membershipData,error:membershipError}=projectIds.length
    ? await supabase.from('project_members').select('project_id,project_run_id').eq('user_id',user.id).in('project_id',projectIds).in('membership_status',['active','completed'])
    : {data:[] as MembershipRow[],error:null};
  if(membershipError)console.error('member Proof membership lookup failed',membershipError);
  const memberships=(membershipData||[]) as unknown as MembershipRow[];
  const byRun=new Map(memberships.filter(item=>item.project_run_id).map(item=>[item.project_run_id as string,item]));
  const byProject=new Map(memberships.map(item=>[item.project_id,item]));

  const toItem=(row:ContributionRow):MemberProofItem=>{
    const membership=(row.project_run_id?byRun.get(row.project_run_id):null)||((row.project_id&&byProject.get(row.project_id))||null);
    return {
      id:row.id,
      project_id:row.project_id,
      project_run_id:row.project_run_id,
      title:row.title,
      contribution_type:row.contribution_type,
      description:row.description,
      verification_status:row.verification_status,
      created_at:row.created_at,
      updated_at:row.updated_at,
      verified_at:row.verified_at,
      evidence_url:row.evidence_url,
      review_notes:row.verification_status==='needs_changes'?row.review_notes:null,
      visibility:row.visibility||'private',
      project_title:row.projects?.title||null,
      project_role:null,
      can_view_project:Boolean(membership&&row.project_id)
    };
  };

  const verifiedTotal=verifiedCountResult.count||0;
  const pendingTotal=pendingCountResult.error?pendingRows.length:(pendingCountResult.count||0);
  const projectsEvidenced=verifiedTotal<=verifiedRows.length
    ? new Set(verifiedRows.map(item=>item.project_id).filter(Boolean)).size
    : null;
  const credential=(credentialResult.data||null) as Credential|null;

  return <div className="proofPage">
    <ProofHero/>
    <MemberProofPortfolio
      verifiedItems={verifiedRows.map(toItem)}
      pendingItems={pendingRows.map(toItem)}
      rejectedItems={rejectedRows.map(toItem)}
      verifiedTotal={verifiedTotal}
      pendingTotal={pendingTotal}
      projectsEvidenced={projectsEvidenced}
      pendingLoadFailed={Boolean(pendingResult.error||pendingCountResult.error)}
      credential={credential}
    />
    <style>{pageStyles}</style>
  </div>;
}

function ProofHero(){return <MemberPageHeader eyebrow="MY WORK · CONTRIBUTION & EVIDENCE" title="Mettelo Proof" description="See contribution evidence from your Mettelo project work, including what has completed review and what still needs attention." actions={<><a className="proofButton proofButtonDark" href="/member/profile">View profile</a><a className="proofButton" href="/member/discover">Find another project</a></>}/>}

function ProofError(){return <div className="proofPage"><ProofHero/><section className="proofLoadError" role="alert"><div><h2>We couldn&apos;t load your Mettelo Proof</h2><p>Your contribution evidence has not been changed or lost. Try again, or continue to Projects while this view recovers.</p></div><div className="proofLoadActions"><a href="/member/proof" className="proofButton proofButtonDark">Try again</a><a href="/member/projects" className="proofButton">Open Projects</a></div></section><style>{pageStyles}</style></div>}
