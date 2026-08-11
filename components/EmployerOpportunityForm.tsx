'use client';

import {useState} from 'react';

export default function EmployerOpportunityForm(){
  const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setStatus('');
    const form=event.currentTarget;const payload=Object.fromEntries(new FormData(form).entries());
    try{const response=await fetch('/api/opportunity-submissions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Unable to submit this opportunity.');form.reset();setStatus('Opportunity submitted for Mettelo review. We have also sent a confirmation to the contact email.');}
    catch(error){setStatus(error instanceof Error?error.message:'Unable to submit this opportunity.');}
    finally{setBusy(false);}
  }
  return <form className="formCard" onSubmit={submit}>
    <div className="formGrid">
      <label>Organisation name<input name="organisation_name" required maxLength={160}/></label>
      <label>Organisation website<input name="organisation_website" type="url" required placeholder="https://example.org"/></label>
      <label>Contact name<input name="contact_name" required maxLength={120}/></label>
      <label>Work email<input name="contact_email" type="email" required autoComplete="email"/></label>
      <label>Opportunity title<input name="job_title" required maxLength={180} placeholder="Senior Data Analyst"/></label>
      <label>Opportunity type<select name="opportunity_type" required defaultValue="job"><option value="job">Job</option><option value="internship">Internship</option><option value="graduate">Graduate programme</option><option value="apprenticeship">Apprenticeship</option><option value="fellowship">Fellowship</option><option value="volunteer">Volunteer Data / AI role</option></select></label>
      <label>Data & AI area<select name="role_category" required defaultValue=""><option value="" disabled>Select area</option><option>Data Analytics</option><option>Business Intelligence</option><option>Data Engineering</option><option>Analytics Engineering</option><option>Data Science</option><option>Machine Learning / AI</option><option>Data Governance</option><option>Data Product / Strategy</option><option>Research / Statistics</option></select></label>
      <label>Work arrangement<select name="work_arrangement" required defaultValue="unknown"><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option><option value="unknown">Not specified</option></select></label>
      <label>Location<input name="location" maxLength={180} placeholder="London, UK / Remote"/></label>
      <label>Country code<input name="country_code" maxLength={2} pattern="[A-Za-z]{2}" placeholder="GB" style={{textTransform:'uppercase'}}/></label>
      <label>Who can apply?<select name="applicant_scope" required defaultValue="unknown"><option value="global">Worldwide</option><option value="region">International / regional applicants accepted</option><option value="country">Restricted to the stated country</option><option value="unknown">Not stated</option></select></label>
      <label>Visa sponsorship<select name="sponsorship_status" required defaultValue="unknown"><option value="available">Confirmed available</option><option value="case_by_case">Case by case / unclear</option><option value="not_available">Not offered</option><option value="unknown">Not stated</option></select></label>
      <label>Official application URL<input name="official_application_url" type="url" required placeholder="https://company.com/careers/..."/></label>
      <label>Closing date<input name="closes_at" type="date"/></label>
    </div>
    <label>Eligibility / right-to-work information<textarea name="eligibility" rows={3} maxLength={1200} placeholder="State any country, right-to-work, graduate or other applicant restrictions."/></label>
    <label>Role summary<textarea name="summary" required rows={7} minLength={80} maxLength={5000} placeholder="Describe the Data / AI work, expected responsibilities, key skills and who the role is for."/></label>
    <div className="panel" style={{margin:'16px 0'}}><strong>Mettelo submission standard</strong><p style={{marginBottom:0}}>Only genuine Data & AI opportunities with an official application destination are accepted. Submission does not guarantee publication; Mettelo reviews relevance, employer identity, eligibility and closing information first.</p></div>
    <button className="button dark" type="submit" disabled={busy}>{busy?'Submitting…':'Submit opportunity for review →'}</button>
    <div className="formStatus" role="status" aria-live="polite">{status}</div>
  </form>;
}
