'use client';

import {ChangeEvent,FormEvent,useEffect,useState} from 'react';
import {createClient} from '@/lib/supabase/client';

type TaxonomyItem={slug:string;name:string};
type Profile={
  full_name:string|null;
  headline:string|null;
  bio:string|null;
  location:string|null;
  professional_area:string|null;
  primary_goal:string|null;
  linkedin_url:string|null;
  github_url:string|null;
  avatar_url?:string|null;
  skills:string[];
  is_public:boolean;
};

type EditablePreview={
  full_name:string;
  headline:string;
  bio:string;
  location:string;
  professional_area:string;
  primary_goal:string;
  linkedin_url:string;
  github_url:string;
  avatar_url:string|null;
  skills:string[];
  is_public:boolean;
};

export default function ProfileEditor({userId,profile,domains,tools,domainPreferences,toolPreferences}:{userId?:string;profile:Profile;domains:TaxonomyItem[];tools:TaxonomyItem[];domainPreferences:string[];toolPreferences:string[]}){
  const [resolvedUserId,setResolvedUserId]=useState(userId||'');
  const [status,setStatus]=useState<'idle'|'saving'|'success'|'error'>('idle');
  const [message,setMessage]=useState('');
  const [imageFile,setImageFile]=useState<File|null>(null);
  const [localImageUrl,setLocalImageUrl]=useState<string|null>(null);
  const [removeAvatar,setRemoveAvatar]=useState(false);
  const [preview,setPreview]=useState<EditablePreview>({
    full_name:profile.full_name||'',headline:profile.headline||'',bio:profile.bio||'',location:profile.location||'',professional_area:profile.professional_area||'',primary_goal:profile.primary_goal||'',
    linkedin_url:profile.linkedin_url||'',github_url:profile.github_url||'',avatar_url:profile.avatar_url||null,skills:profile.skills||[],is_public:Boolean(profile.is_public)
  });

  useEffect(()=>{
    if(resolvedUserId)return;
    const supabase=createClient();
    supabase.auth.getUser().then(({data})=>{if(data.user)setResolvedUserId(data.user.id);});
  },[resolvedUserId]);

  function chooseImage(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0]||null;
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
      setStatus('error');setMessage('Choose a JPG, PNG or WebP image.');event.target.value='';return;
    }
    if(file.size>5*1024*1024){
      setStatus('error');setMessage('Profile images must be 5 MB or smaller.');event.target.value='';return;
    }
    if(localImageUrl)URL.revokeObjectURL(localImageUrl);
    setImageFile(file);setLocalImageUrl(URL.createObjectURL(file));setRemoveAvatar(false);setStatus('idle');setMessage('');
  }

  function removeImage(){
    if(localImageUrl)URL.revokeObjectURL(localImageUrl);
    setLocalImageUrl(null);setImageFile(null);setRemoveAvatar(true);setPreview(current=>({...current,avatar_url:null}));
  }

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setStatus('saving');setMessage('');
    const form=new FormData(event.currentTarget);
    const basePayload={
      full_name:String(form.get('full_name')||''),headline:String(form.get('headline')||''),bio:String(form.get('bio')||''),location:String(form.get('location')||''),
      professional_area:String(form.get('professional_area')||''),primary_goal:String(form.get('primary_goal')||''),linkedin_url:String(form.get('linkedin_url')||''),github_url:String(form.get('github_url')||''),
      skills:String(form.get('skills')||'').split(',').map(v=>v.trim()).filter(Boolean),is_public:form.get('is_public')==='on',
      domain_preferences:form.getAll('domain_preferences').map(String),tool_preferences:form.getAll('tool_preferences').map(String)
    };
    try{
      const supabase=createClient();
      let ownerId=resolvedUserId;
      if(!ownerId){
        const {data:{user}}=await supabase.auth.getUser();
        ownerId=user?.id||'';
        if(ownerId)setResolvedUserId(ownerId);
      }
      if(!ownerId)throw new Error('Your session could not be confirmed. Sign in again and retry.');
      let avatarUrl=removeAvatar?null:preview.avatar_url;
      if(removeAvatar){
        await supabase.storage.from('profile-images').remove([`${ownerId}/avatar`]);
      }
      if(imageFile){
        const {error:uploadError}=await supabase.storage.from('profile-images').upload(`${ownerId}/avatar`,imageFile,{upsert:true,contentType:imageFile.type,cacheControl:'3600'});
        if(uploadError)throw new Error(`Unable to upload profile image: ${uploadError.message}`);
        const {data:publicData}=supabase.storage.from('profile-images').getPublicUrl(`${ownerId}/avatar`);
        avatarUrl=`${publicData.publicUrl}?v=${Date.now()}`;
      }
      const payload={...basePayload,avatar_url:avatarUrl};
      const response=await fetch('/api/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Unable to save profile.');
      setPreview({...basePayload,avatar_url:avatarUrl});
      setImageFile(null);setRemoveAvatar(false);
      if(localImageUrl){URL.revokeObjectURL(localImageUrl);setLocalImageUrl(null);}
      setStatus('success');setMessage(basePayload.is_public?'Profile saved. Your public professional profile is ready to preview.':'Profile saved. Your preview is private until you enable public visibility.');
    }catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Unable to save profile.');}
  }

  const visibleAvatar=localImageUrl||(removeAvatar?null:preview.avatar_url);
  const displayName=preview.full_name||'Your name';

  return <div className="profileEditorLayout">
    <form className="formCard profileEditorForm" onSubmit={submit}>
      <div className="panelHead"><div><span className="cardNumber">PROFESSIONAL IDENTITY</span><h3 style={{marginTop:7}}>Your professional profile</h3></div><span className="chip">MY METTELO</span></div>
      <div className="profilePhotoField">
        <div className="profilePhotoPreview" aria-label="Professional profile image preview" style={visibleAvatar?{backgroundImage:`url(${visibleAvatar})`}:undefined}>{visibleAvatar?'':displayName.slice(0,1).toUpperCase()}</div>
        <div><strong>Professional photo</strong><p>Use a clear head-and-shoulders image. JPG, PNG or WebP, up to 5 MB.</p><div className="profilePhotoActions"><label className="button ghost profilePhotoButton" htmlFor="profile-photo">{visibleAvatar?'Change photo':'Add photo'}</label><input className="profilePhotoInput" id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage}/>{visibleAvatar&&<button className="profileRemovePhoto" type="button" onClick={removeImage}>Remove</button>}</div></div>
      </div>
      <label htmlFor="profile-name">Full name *</label><input id="profile-name" name="full_name" required defaultValue={profile.full_name||''}/>
      <label htmlFor="profile-headline">Professional headline</label><input id="profile-headline" name="headline" defaultValue={profile.headline||''} placeholder="Data Analyst · Analytics Engineer · AI Builder"/>
      <div className="fieldRow"><div><label htmlFor="profile-location">Location</label><input id="profile-location" name="location" defaultValue={profile.location||''} placeholder="City, Country"/></div><div><label htmlFor="profile-area">Professional area</label><select id="profile-area" name="professional_area" defaultValue={profile.professional_area||''}><option value="">Select one</option><option>Data Analysis / BI</option><option>Data Science / ML</option><option>Data Engineering</option><option>AI / Generative AI</option><option>Analytics Engineering</option><option>Research / Product / Design</option><option>Career transition / Student</option><option>Other</option></select></div></div>
      <label htmlFor="profile-goal">What are you working toward?</label><input id="profile-goal" name="primary_goal" defaultValue={profile.primary_goal||''} placeholder="The next capability, project or opportunity you want to move toward"/>
      <label htmlFor="profile-skills">Skills</label><input id="profile-skills" name="skills" defaultValue={(profile.skills||[]).join(', ')} placeholder="SQL, Python, Power BI, Looker, ML"/><small>Separate skills with commas.</small>
      <div className="preferencePanel"><div><span className="cardNumber">PROJECT MATCHING</span><h3>What do you want to work on?</h3><p>Choose the domains and tools that matter to you. Mettelo uses these choices to surface more relevant Labs projects.</p></div><div className="fieldRow"><div><label htmlFor="profile-domains">Domains of interest</label><select id="profile-domains" name="domain_preferences" multiple size={7} defaultValue={domainPreferences}>{domains.map(item=><option key={item.slug} value={item.slug}>{item.name}</option>)}</select><small>Use Ctrl/Cmd to select more than one.</small></div><div><label htmlFor="profile-tools">Tools / technologies</label><select id="profile-tools" name="tool_preferences" multiple size={7} defaultValue={toolPreferences}>{tools.map(item=><option key={item.slug} value={item.slug}>{item.name}</option>)}</select><small>Pick tools you use or want to develop.</small></div></div></div>
      <div className="fieldRow"><div><label htmlFor="profile-linkedin">LinkedIn</label><input id="profile-linkedin" name="linkedin_url" type="url" defaultValue={profile.linkedin_url||''} placeholder="https://linkedin.com/in/..."/></div><div><label htmlFor="profile-github">GitHub</label><input id="profile-github" name="github_url" type="url" defaultValue={profile.github_url||''} placeholder="https://github.com/..."/></div></div>
      <label htmlFor="profile-bio">Short bio</label><textarea id="profile-bio" name="bio" defaultValue={profile.bio||''} placeholder="What you work on, what you are good at and what you want to contribute."/>
      <label className="consent"><input name="is_public" type="checkbox" defaultChecked={profile.is_public}/><span>Show this professional profile in Mettelo People. Private activity, email and account data are never included.</span></label>
      <button className="button dark" type="submit" disabled={status==='saving'} style={{width:'100%',marginTop:20}}>{status==='saving'?'Saving profile…':'Save profile →'}</button>
      <div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div>
    </form>

    <aside className="profilePreviewCard" aria-label="Professional profile preview">
      <div className="profilePreviewTop"><span className="cardNumber">PROFILE PREVIEW</span><span className={`chip ${preview.is_public?'green':''}`}>{preview.is_public?'PUBLIC':'PRIVATE PREVIEW'}</span></div>
      <div className="profilePreviewAvatar" style={visibleAvatar?{backgroundImage:`url(${visibleAvatar})`}:undefined}>{visibleAvatar?'':displayName.slice(0,1).toUpperCase()}</div>
      <h3>{displayName}</h3>
      <p className="profilePreviewHeadline">{preview.headline||preview.professional_area||'Add a professional headline'}</p>
      {preview.location&&<p className="profilePreviewLocation">{preview.location}</p>}
      {preview.bio&&<p className="profilePreviewBio">{preview.bio}</p>}
      {preview.skills.length>0&&<div className="metaRow">{preview.skills.slice(0,8).map(skill=><span className="metaPill" key={skill}>{skill}</span>)}</div>}
      {preview.primary_goal&&<div className="profileGoal"><small>WORKING TOWARD</small><strong>{preview.primary_goal}</strong></div>}
      <div className="profilePreviewLinks">{preview.linkedin_url&&<a href={preview.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>}{preview.github_url&&<a href={preview.github_url} target="_blank" rel="noopener noreferrer">GitHub ↗</a>}</div>
      {preview.is_public&&resolvedUserId?<a className="button ghost" href={`/people/${resolvedUserId}`} target="_blank" rel="noopener noreferrer">View public profile →</a>:<p className="profilePreviewNote">Enable public visibility and save to make this profile discoverable in Mettelo People.</p>}
    </aside>
  </div>;
}
