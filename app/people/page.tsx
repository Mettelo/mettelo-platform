import type {Metadata} from 'next';
import Link from 'next/link';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import PaginatedCardGrid from '@/components/PaginatedCardGrid';

export const metadata:Metadata={title:'People',description:'Discover Data & AI professionals through their capability, interests and contribution on Mettelo.'};
export const revalidate=60;
type PublicProfile={id:string;full_name:string|null;headline:string|null;location:string|null;professional_area:string|null;skills:string[]|null;avatar_url:string|null};
type PublicProof={user_id:string};

export default async function PeoplePage(){
 const supabase=createPublicSupabaseClient();
 let people:PublicProfile[]=[];
 const proofCountByUser=new Map<string,number>();
 if(supabase){
  const {data}=await supabase.from('profiles').select('id,full_name,headline,location,professional_area,skills,avatar_url').eq('is_public',true).order('updated_at',{ascending:false}).limit(48);
  people=(data||[]) as PublicProfile[];
  const ids=people.map(person=>person.id);
  if(ids.length){
   const proof=await supabase.from('contributions').select('user_id').eq('verification_status','verified').eq('is_public',true).in('user_id',ids);
   for(const row of (proof.data||[]) as PublicProof[]) proofCountByUser.set(row.user_id,(proofCountByUser.get(row.user_id)||0)+1);
  }
 }
 return <div className="peoplePage"><section className="hero"><div className="shell heroGrid"><div><div className="eyebrow">People of Mettelo</div><h1>Discover people through capability, not popularity.</h1><p className="heroLead">Find Data & AI professionals by what they work on, the skills they are building and the contribution they choose to make visible.</p></div><aside className="heroPanel"><span className="chip">PUBLIC PROFILES</span><h3 style={{marginTop:18}}>Professional context that is useful.</h3><p>Profiles focus on role, capability, interests and work, not follower counts. Members control whether their profile is public.</p></aside></div></section><section className="section"><div className="shell"><div className="sectionHead"><div><div className="cardNumber">MEMBER DIRECTORY</div><h2>Professionals open to being discovered.</h2></div><p>Only profiles explicitly made public by their owners appear here.</p></div>{people.length?<PaginatedCardGrid label="people" className="peopleGrid">{people.map(person=>{const name=person.full_name?.trim()||'Mettelo member';const role=person.headline||person.professional_area||'Data & AI professional';const proofCount=proofCountByUser.get(person.id)||0;return <article className="personCard" key={person.id}><div className="personAvatar" style={person.avatar_url?{backgroundImage:`url(${person.avatar_url})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}>{person.avatar_url?'':name.charAt(0).toUpperCase()}</div><div><h3>{name}</h3><p>{role}{person.location?` · ${person.location}`:''}</p>{person.skills?.length?<div className="metaRow">{person.skills.slice(0,5).map(skill=><span className="metaPill" key={skill}>{skill}</span>)}</div>:null}{proofCount>0?<span className="proofSignal" aria-label={`${proofCount} verified public Proof ${proofCount===1?'contribution':'contributions'}`}>{proofCount} verified Proof {proofCount===1?'contribution':'contributions'}</span>:null}<div style={{marginTop:14}}><Link className="linkArrow" href={`/people/${person.id}`}>View profile →</Link></div></div></article>;})}</PaginatedCardGrid>:<div className="emptyState"><h3>No public member profiles yet.</h3><p>Members can complete their professional profile and choose public visibility from My Mettelo.</p><Link className="linkArrow" href="/member/profile">Complete your profile →</Link></div>}</div></section><section className="section softSection"><div className="shell"><div className="ctaBand"><div><div className="cardNumber">YOUR METTELO IDENTITY</div><h2>Turn capability into a profile people can understand.</h2><p>Add your professional image, headline, skills, goals and links, then decide whether you want to be discoverable.</p></div><Link className="button dark" href="/member/profile">Build your profile →</Link></div></div></section></div>;
}
