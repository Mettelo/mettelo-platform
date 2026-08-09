'use client';

import { FormEvent, useState } from 'react';

type Profile={
  full_name:string|null;
  headline:string|null;
  bio:string|null;
  location:string|null;
  professional_area:string|null;
  primary_goal:string|null;
  linkedin_url:string|null;
  github_url:string|null;
  skills:string[];
  is_public:boolean;
};

export default function ProfileEditor({profile}:{profile:Profile}){
  const [status,setStatus]=useState<'idle'|'saving'|'success'|'error'>('idle');
  const [message,setMessage]=useState('');

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setStatus('saving');setMessage('');
    const form=new FormData(event.currentTarget);
    const payload={
      full_name:String(form.get('full_name')||''),headline:String(form.get('headline')||''),bio:String(form.get('bio')||''),location:String(form.get('location')||''),
      professional_area:String(form.get('professional_area')||''),primary_goal:String(form.get('primary_goal')||''),linkedin_url:String(form.get('linkedin_url')||''),github_url:String(form.get('github_url')||''),
      skills:String(form.get('skills')||'').split(',').map(v=>v.trim()).filter(Boolean),is_public:form.get('is_public')==='on'
    };
    try{
      const response=await fetch('/api/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||'Unable to save profile.');
      setStatus('success');setMessage('Profile saved.');
    }catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Unable to save profile.');}
  }

  return <form className="formCard" onSubmit={submit}>
    <div className="panelHead"><h3>Your professional profile</h3><span className="chip">MY METTELO</span></div>
    <label htmlFor="profile-name">Full name *</label><input id="profile-name" name="full_name" required defaultValue={profile.full_name||''}/>
    <label htmlFor="profile-headline">Professional headline</label><input id="profile-headline" name="headline" defaultValue={profile.headline||''} placeholder="Data Analyst · Analytics Engineer · AI Builder"/>
    <div className="fieldRow"><div><label htmlFor="profile-location">Location</label><input id="profile-location" name="location" defaultValue={profile.location||''} placeholder="City, Country"/></div><div><label htmlFor="profile-area">Professional area</label><select id="profile-area" name="professional_area" defaultValue={profile.professional_area||''}><option value="">Select one</option><option>Data Analysis / BI</option><option>Data Science / ML</option><option>Data Engineering</option><option>AI / Generative AI</option><option>Analytics Engineering</option><option>Research / Product / Design</option><option>Career transition / Student</option><option>Other</option></select></div></div>
    <label htmlFor="profile-goal">What are you working toward?</label><input id="profile-goal" name="primary_goal" defaultValue={profile.primary_goal||''} placeholder="The next capability, project or opportunity you want to move toward"/>
    <label htmlFor="profile-skills">Skills</label><input id="profile-skills" name="skills" defaultValue={(profile.skills||[]).join(', ')} placeholder="SQL, Python, Power BI, Looker, ML"/><small>Separate skills with commas.</small>
    <div className="fieldRow"><div><label htmlFor="profile-linkedin">LinkedIn</label><input id="profile-linkedin" name="linkedin_url" type="url" defaultValue={profile.linkedin_url||''} placeholder="https://linkedin.com/in/..."/></div><div><label htmlFor="profile-github">GitHub</label><input id="profile-github" name="github_url" type="url" defaultValue={profile.github_url||''} placeholder="https://github.com/..."/></div></div>
    <label htmlFor="profile-bio">Short bio</label><textarea id="profile-bio" name="bio" defaultValue={profile.bio||''} placeholder="What you work on, what you are good at and what you want to contribute."/>
    <label className="consent"><input name="is_public" type="checkbox" defaultChecked={profile.is_public}/><span>Allow Mettelo to show this professional profile publicly when the people directory is enabled. Private activity and account data are never included.</span></label>
    <button className="button dark" type="submit" disabled={status==='saving'} style={{width:'100%',marginTop:20}}>{status==='saving'?'Saving…':'Save profile →'}</button>
    <div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div>
  </form>;
}
