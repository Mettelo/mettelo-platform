'use client';

import {useState} from 'react';
import ProfileEditor from '@/components/ProfileEditor';

type TaxonomyItem={slug:string;name:string};
type Profile={full_name:string|null;headline:string|null;bio:string|null;location:string|null;professional_area:string|null;primary_goal:string|null;linkedin_url:string|null;github_url:string|null;avatar_url?:string|null;skills:string[];is_public:boolean};

export default function MemberProfileSection({profile,domains,tools,domainPreferences,toolPreferences}:{profile:Profile;domains:TaxonomyItem[];tools:TaxonomyItem[];domainPreferences:string[];toolPreferences:string[]}){
  const isComplete=Boolean(profile.full_name?.trim()&&(profile.headline?.trim()||profile.professional_area?.trim()));
  const [editing,setEditing]=useState(!isComplete);
  const domainNames=domainPreferences.map(slug=>domains.find(item=>item.slug===slug)?.name||slug);
  const toolNames=toolPreferences.map(slug=>tools.find(item=>item.slug===slug)?.name||slug);

  if(editing)return <div>
    <div className="panelHead" style={{marginBottom:14}}><div><span className="cardNumber">EDIT PROFILE</span><h3 style={{margin:'7px 0 0'}}>Keep your Mettelo identity useful for matching and collaboration.</h3></div>{isComplete&&<button className="button ghost" type="button" onClick={()=>setEditing(false)}>Cancel edit</button>}</div>
    <ProfileEditor profile={profile} domains={domains} tools={tools} domainPreferences={domainPreferences} toolPreferences={toolPreferences}/>
  </div>;

  return <section className="panel memberProfileSummary" aria-labelledby="member-profile-heading">
    <div className="panelHead"><div><span className="cardNumber">PROFESSIONAL IDENTITY</span><h3 id="member-profile-heading" style={{margin:'7px 0 0'}}>Your Mettelo profile</h3></div><button className="button dark" type="button" onClick={()=>setEditing(true)}>Edit profile →</button></div>
    <div className="memberProfileOverview">
      <div className="memberProfileAvatar" style={profile.avatar_url?{backgroundImage:`url(${profile.avatar_url})`}:undefined}>{profile.avatar_url?'':(profile.full_name?.[0]||'M').toUpperCase()}</div>
      <div className="memberProfileIdentity"><h2>{profile.full_name||'Mettelo member'}</h2><p>{profile.headline||profile.professional_area||'Add a professional headline'}</p><div className="metaRow">{profile.location&&<span className="metaPill">{profile.location}</span>}{profile.professional_area&&<span className="metaPill">{profile.professional_area}</span>}<span className={`chip ${profile.is_public?'green':''}`}>{profile.is_public?'PUBLIC PROFILE':'PRIVATE PROFILE'}</span></div></div>
    </div>
    {profile.bio&&<p className="memberProfileBio">{profile.bio}</p>}
    <div className="memberProfileDetails">
      <div><span className="cardNumber">SKILLS</span><div className="metaRow">{profile.skills?.length?profile.skills.slice(0,10).map(skill=><span className="metaPill" key={skill}>{skill}</span>):<small>Add the skills you want Mettelo to recognise.</small>}</div></div>
      <div><span className="cardNumber">PROJECT INTERESTS</span><div className="metaRow">{domainNames.length?domainNames.map(name=><span className="metaPill" key={name}>{name}</span>):<small>Add domains to improve project matching.</small>}</div></div>
      <div><span className="cardNumber">TOOLS</span><div className="metaRow">{toolNames.length?toolNames.slice(0,10).map(name=><span className="metaPill" key={name}>{name}</span>):<small>Add tools you use or want to develop.</small>}</div></div>
      <div><span className="cardNumber">WORKING TOWARD</span><p>{profile.primary_goal||'Add the capability, project or opportunity you want to move toward.'}</p></div>
    </div>
    <div className="profilePreviewLinks">{profile.linkedin_url&&<a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>}{profile.github_url&&<a href={profile.github_url} target="_blank" rel="noopener noreferrer">GitHub ↗</a>}</div>
    <style jsx>{`
      .memberProfileOverview{display:flex;align-items:center;gap:18px;margin-top:22px}.memberProfileAvatar{width:76px;height:76px;flex:none;display:grid;place-items:center;border-radius:22px;background:#f1e7d1 center/cover no-repeat;font:700 1.6rem var(--font-space);color:#8b5a17}.memberProfileIdentity h2{margin:0 0 5px;font-size:1.55rem}.memberProfileIdentity p{margin:0;color:#66707e}.memberProfileBio{max-width:800px;margin:20px 0 0;color:#596371;line-height:1.7}.memberProfileDetails{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:24px;padding-top:22px;border-top:1px solid rgba(16,19,29,.08)}.memberProfileDetails>div{min-width:0}.memberProfileDetails p{margin:8px 0 0;color:#596371}.memberProfileDetails small{display:block;margin-top:9px;color:#7a8390}.profilePreviewLinks{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}.profilePreviewLinks a{font-weight:750}@media(max-width:700px){.memberProfileDetails{grid-template-columns:1fr}.memberProfileOverview{align-items:flex-start}.memberProfileAvatar{width:62px;height:62px;border-radius:18px}}
    `}</style>
  </section>;
}
