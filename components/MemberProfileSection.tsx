'use client';

import {useMemo,useState} from 'react';
import ProfileEditor,{MemberProfile} from '@/components/ProfileEditor';

type TaxonomyItem={slug:string;name:string};

export default function MemberProfileSection({userId,profile,domains,tools,domainPreferences,toolPreferences}:{userId:string;profile:MemberProfile;domains:TaxonomyItem[];tools:TaxonomyItem[];domainPreferences:string[];toolPreferences:string[]}){
  const [savedProfile,setSavedProfile]=useState<MemberProfile>(profile);const [savedDomains,setSavedDomains]=useState(domainPreferences);const [savedTools,setSavedTools]=useState(toolPreferences);
  const isComplete=Boolean(savedProfile.full_name?.trim()&&(savedProfile.headline?.trim()||savedProfile.professional_area?.trim()||savedProfile.current_job_title?.trim()));
  const [editing,setEditing]=useState(!isComplete);
  const domainNames=savedDomains.map(slug=>domains.find(item=>item.slug===slug)?.name||slug);const toolNames=savedTools.map(slug=>tools.find(item=>item.slug===slug)?.name||slug);
  const availabilityLabels:{[key:string]:string}={available_now:'Available now',available_soon:'Available soon',limited:'Limited availability',not_available:'Not currently available'};
  const experienceLabels:{[key:string]:string}={entry:'Entry / early career',mid:'Mid-level',senior:'Senior',lead:'Lead / manager',executive:'Executive / head of function'};
  const completeness=useMemo(()=>{
    const checks=[
      Boolean(savedProfile.full_name?.trim()),
      Boolean(savedProfile.headline?.trim()||savedProfile.current_job_title?.trim()),
      Boolean(savedProfile.bio?.trim()),
      Boolean(savedProfile.location?.trim()),
      Boolean(savedProfile.experience_level),
      Boolean(savedProfile.skills?.length&&savedProfile.skills.length>=3),
      Boolean(savedProfile.preferred_roles?.length),
      Boolean(savedProfile.project_availability),
      Boolean(savedProfile.weekly_capacity?.trim()),
      Boolean(savedDomains.length||savedTools.length)
    ];
    return Math.round((checks.filter(Boolean).length/checks.length)*100);
  },[savedProfile,savedDomains,savedTools]);
  const recommendations=useMemo(()=>{
    const items:string[]=[];
    if(!savedProfile.skills?.length||savedProfile.skills.length<3)items.push('Add at least 3 core skills to improve project matching.');
    if(!savedProfile.project_availability)items.push('Add your availability before applying so teams know when you can contribute.');
    if(!savedProfile.weekly_capacity?.trim())items.push('Add weekly capacity so project commitments can be compared with your schedule.');
    if(!savedProfile.preferred_roles?.length)items.push('Add preferred project roles so Mettelo can recommend relevant openings.');
    if(!savedDomains.length&&!savedTools.length)items.push('Add project interests or tools to make discovery more relevant.');
    if(!savedProfile.bio?.trim())items.push('Add a short professional bio so reviewers understand the context behind your skills.');
    return items.slice(0,3);
  },[savedProfile,savedDomains,savedTools]);

  if(editing)return <div><div className="panelHead" style={{marginBottom:14}}><div><span className="cardNumber">EDIT PROFILE</span><h3 style={{margin:'7px 0 0'}}>Keep your Mettelo identity useful for matching and collaboration.</h3></div>{isComplete&&<button className="button ghost" type="button" onClick={()=>setEditing(false)}>Cancel edit</button>}</div><ProfileEditor profile={savedProfile} domains={domains} tools={tools} domainPreferences={savedDomains} toolPreferences={savedTools} onSaved={(next,nextDomains,nextTools)=>{setSavedProfile(next);setSavedDomains(nextDomains);setSavedTools(nextTools);setEditing(false);}}/></div>;

  return <>
    <section className="panel profileHealth" aria-labelledby="profile-health-heading">
      <div className="panelHead"><div><span className="cardNumber">PROFILE READINESS</span><h3 id="profile-health-heading" style={{margin:'7px 0 0'}}>Profile completeness {completeness}%</h3></div><span className={`chip ${completeness>=80?'green':''}`}>{completeness>=80?'READY TO APPLY':'IMPROVE MATCHING'}</span></div>
      <div className="profileCompletionTrack" aria-label={`Profile completeness ${completeness}%`}><span style={{width:`${completeness}%`}}/></div>
      {recommendations.length?<div className="profileRecommendations">{recommendations.map(item=><div key={item}><span>→</span><p>{item}</p></div>)}</div>:<p className="profileReadyCopy">Your profile contains the key information Mettelo uses for project matching and application readiness.</p>}
      <div className="actions" style={{marginTop:16}}><a className="button ghost" href="/projects">Discover matched projects →</a>{savedProfile.is_public&&<a className="button ghost" href={`/people/${userId}`}>Preview public profile →</a>}</div>
    </section>
    <section className="panel memberProfileSummary" aria-labelledby="member-profile-heading" style={{marginTop:18}}>
      <div className="panelHead"><div><span className="cardNumber">PROFESSIONAL IDENTITY</span><h3 id="member-profile-heading" style={{margin:'7px 0 0'}}>Your Mettelo profile</h3></div><button className="button dark" type="button" onClick={()=>setEditing(true)}>Edit profile →</button></div>
      <div className="memberProfileOverview"><div className="memberProfileAvatar" style={savedProfile.avatar_url?{backgroundImage:`url(${savedProfile.avatar_url})`}:undefined}>{savedProfile.avatar_url?'':(savedProfile.full_name?.[0]||'M').toUpperCase()}</div><div className="memberProfileIdentity"><h2>{savedProfile.full_name||'Mettelo member'}</h2><p>{savedProfile.headline||savedProfile.current_job_title||savedProfile.professional_area||'Add a professional headline'}</p>{savedProfile.current_job_title&&<small>{savedProfile.current_job_title}{savedProfile.organisation?` · ${savedProfile.organisation}`:''}</small>}<div className="metaRow">{savedProfile.location&&<span className="metaPill">{savedProfile.location}</span>}{savedProfile.experience_level&&<span className="metaPill">{experienceLabels[savedProfile.experience_level]||savedProfile.experience_level}</span>}<span className={`chip ${savedProfile.is_public?'green':''}`}>{savedProfile.is_public?'PUBLIC PROFILE':'PRIVATE PROFILE'}</span></div></div></div>
      {savedProfile.bio&&<p className="memberProfileBio">{savedProfile.bio}</p>}
      <div className="memberProfileDetails">
        <div><span className="cardNumber">PROJECT AVAILABILITY</span><p>{savedProfile.project_availability?availabilityLabels[savedProfile.project_availability]||savedProfile.project_availability:'Not specified'}{savedProfile.weekly_capacity?` · ${savedProfile.weekly_capacity}`:''}</p></div>
        <div><span className="cardNumber">PREFERRED ROLES</span><div className="metaRow">{savedProfile.preferred_roles?.length?savedProfile.preferred_roles.map(role=><span className="metaPill" key={role}>{role}</span>):<small>Add the project roles you want to be considered for.</small>}</div></div>
        <div><span className="cardNumber">SKILLS</span><div className="metaRow">{savedProfile.skills?.length?savedProfile.skills.slice(0,12).map(skill=><span className="metaPill" key={skill}>{skill}</span>):<small>Add the skills you want Mettelo to recognise.</small>}</div></div>
        <div><span className="cardNumber">PROJECT INTERESTS</span><div className="metaRow">{domainNames.length?domainNames.map(name=><span className="metaPill" key={name}>{name}</span>):<small>Add domains to improve project matching.</small>}</div></div>
        <div><span className="cardNumber">TOOLS</span><div className="metaRow">{toolNames.length?toolNames.slice(0,12).map(name=><span className="metaPill" key={name}>{name}</span>):<small>Add tools you use or want to develop.</small>}</div></div>
        <div><span className="cardNumber">WORKING TOWARD</span><p>{savedProfile.primary_goal||'Add the capability, project or opportunity you want to move toward.'}</p></div>
      </div>
      <div className="profilePreviewLinks">{savedProfile.linkedin_url&&<a href={savedProfile.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>}{savedProfile.github_url&&<a href={savedProfile.github_url} target="_blank" rel="noopener noreferrer">GitHub ↗</a>}{savedProfile.portfolio_url&&<a href={savedProfile.portfolio_url} target="_blank" rel="noopener noreferrer">Portfolio ↗</a>}</div>
      <style jsx>{`.profileHealth{padding:22px}.profileCompletionTrack{height:10px;overflow:hidden;border-radius:999px;background:#e7e8eb;margin-top:18px}.profileCompletionTrack span{display:block;height:100%;border-radius:inherit;background:#c6892a}.profileRecommendations{display:grid;gap:9px;margin-top:16px}.profileRecommendations>div{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;padding:10px 12px;border-radius:10px;background:#faf7f0}.profileRecommendations span{font-weight:800;color:#8b5a17}.profileRecommendations p,.profileReadyCopy{margin:0;color:#596371;line-height:1.55}.profileReadyCopy{margin-top:16px}.memberProfileOverview{display:flex;align-items:center;gap:18px;margin-top:22px}.memberProfileAvatar{width:76px;height:76px;flex:none;display:grid;place-items:center;border-radius:22px;background:#f1e7d1 center/cover no-repeat;font:700 1.6rem var(--font-space);color:#8b5a17}.memberProfileIdentity h2{margin:0 0 5px;font-size:1.55rem}.memberProfileIdentity p{margin:0;color:#333b46}.memberProfileIdentity small{display:block;margin-top:4px;color:#66707e}.memberProfileBio{max-width:800px;margin:20px 0 0;color:#596371;line-height:1.7}.memberProfileDetails{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:24px;padding-top:22px;border-top:1px solid rgba(16,19,29,.08)}.memberProfileDetails>div{min-width:0;padding:15px;border-radius:12px;background:#fafafa}.memberProfileDetails p{margin:8px 0 0;color:#596371}.memberProfileDetails small{display:block;margin-top:9px;color:#7a8390}.profilePreviewLinks{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}.profilePreviewLinks a{font-weight:750}@media(max-width:700px){.memberProfileDetails{grid-template-columns:1fr}.memberProfileOverview{align-items:flex-start}.memberProfileAvatar{width:62px;height:62px;border-radius:18px}.profileHealth .actions{display:grid}.profileHealth .button{width:100%}}`}</style>
    </section>
  </>;
}
