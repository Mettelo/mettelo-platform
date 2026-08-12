import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import {serviceDb} from '@/lib/project-flow';

type PublicProfile={id:string;full_name:string|null;headline:string|null;bio:string|null;location:string|null;professional_area:string|null;primary_goal:string|null;linkedin_url:string|null;github_url:string|null;skills:string[]|null;avatar_url:string|null};

type PageProps={params:Promise<{id:string}>};

async function getProfile(id:string){
  const supabase=createPublicSupabaseClient();
  if(!supabase)return null;
  const {data}=await supabase.from('profiles').select('id,full_name,headline,bio,location,professional_area,primary_goal,linkedin_url,github_url,skills,avatar_url').eq('id',id).eq('is_public',true).maybeSingle();
  return (data||null) as PublicProfile|null;
}
async function getArchitectCredential(id:string){const db=serviceDb();if(!db)return null;const {data:identity}=await db.from('account_identities').select('account_type,show_project_architect_designation').eq('user_id',id).maybeSingle();if(identity?.account_type!=='project_architect'||!identity.show_project_architect_designation)return null;const {data}=await db.from('project_architect_credentials').select('credential_id,issued_at,status').eq('user_id',id).eq('status','active').order('issued_at',{ascending:false}).limit(1).maybeSingle();return data||null;}

export async function generateMetadata({params}:PageProps):Promise<Metadata>{
  const {id}=await params;
  const profile=await getProfile(id);
  if(!profile)return {title:'Member profile'};
  const name=profile.full_name?.trim()||'Mettelo member';
  return {title:name,description:profile.headline||profile.bio||`${name}'s public professional profile on Mettelo.`};
}

export default async function PublicProfilePage({params}:PageProps){
  const {id}=await params;
  const [profile,architect]=await Promise.all([getProfile(id),getArchitectCredential(id)]);
  if(!profile)notFound();
  const name=profile.full_name?.trim()||'Mettelo member';
  const headline=profile.headline||profile.professional_area||'Data & AI professional';

  return <>
    <section className="section softSection"><div className="shell publicProfileShell">
      <div className="publicProfileHero">
        <div className="publicProfileAvatar" style={profile.avatar_url?{backgroundImage:`url(${profile.avatar_url})`}:undefined}>{profile.avatar_url?'':name.charAt(0).toUpperCase()}</div>
        <div><div className="eyebrow">Mettelo professional profile</div><h1>{name}</h1><p className="lead">{headline}</p>{architect&&<p><Link className="chip green" href={`/credentials/${architect.credential_id}`}>Mettelo Data &amp; AI Project Architect · Verify →</Link></p>}{profile.location&&<p className="publicProfileLocation">{profile.location}</p>}<div className="actions">{profile.linkedin_url&&<a className="button ghost" href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>}{profile.github_url&&<a className="button ghost" href={profile.github_url} target="_blank" rel="noopener noreferrer">GitHub ↗</a>}</div></div>
      </div>
      <div className="publicProfileGrid">
        <main className="panel"><span className="cardNumber">ABOUT</span><h2 style={{fontSize:'clamp(1.8rem,3vw,2.8rem)',marginTop:10}}>Professional context</h2>{profile.bio?<p className="publicProfileBio">{profile.bio}</p>:<p className="publicProfileBio">This member has not added a public bio yet.</p>}{profile.skills?.length?<><h3 style={{marginTop:28}}>Skills & tools</h3><div className="metaRow">{profile.skills.map(skill=><span className="metaPill" key={skill}>{skill}</span>)}</div></>:null}</main>
        <aside className="panel publicProfileSide"><span className="cardNumber">CURRENT DIRECTION</span>{profile.professional_area&&<div className="publicProfileFact"><small>AREA</small><strong>{profile.professional_area}</strong></div>}{profile.primary_goal&&<div className="publicProfileFact"><small>WORKING TOWARD</small><strong>{profile.primary_goal}</strong></div>}<div className="publicProfileFact"><small>PROFILE</small><strong>Public by member choice</strong></div></aside>
      </div>
    </div></section>
    <section className="section"><div className="shell"><div className="ctaBand"><div><div className="cardNumber">METTELO PEOPLE</div><h2>Discover more people building in Data & AI.</h2><p>Explore professional profiles based on capability and interests.</p></div><Link className="button dark" href="/people">Back to People →</Link></div></div></section>
  </>;
}
