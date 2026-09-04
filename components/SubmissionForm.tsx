'use client';

import { FormEvent, ReactNode, useRef, useState } from 'react';
import {PROJECT_PARTICIPATION_TERMS_FULL,PROJECT_PARTICIPATION_TERMS_SUMMARY,PROJECT_PARTICIPATION_TERMS_VERSION} from '@/lib/project-participation-terms';

type Props={
  formType:string;
  children:ReactNode;
  submitLabel:string;
  className?:string;
  successMessage?:string;
};

function confirmationType(formType:string){return formType==='project_application'?'project_interest':formType}

export default function SubmissionForm({formType,children,submitLabel,className='formCard'}:Props){
  const [status,setStatus]=useState<'idle'|'submitting'|'error'>('idle');
  const [message,setMessage]=useState('');
  const [acceptedTerms,setAcceptedTerms]=useState(false);
  const termsDialog=useRef<HTMLDialogElement>(null);
  const projectInterest=formType==='project_application';

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(projectInterest&&!acceptedTerms){setStatus('error');setMessage('Please read, understand and agree to the Mettelo Project Participation Terms before submitting your interest.');return}
    setStatus('submitting');
    setMessage('');
    const form=event.currentTarget;
    const data=Object.fromEntries(new FormData(form).entries());
    try{
      const requestBody=projectInterest?{project_id:data.project_id,application_kind:'interest',requested_role:data.role,contribution_statement:data.contribution,portfolio_url:data.profile,terms_accepted:true,terms_version:PROJECT_PARTICIPATION_TERMS_VERSION}:{formType,data};
      const response=await fetch(projectInterest?'/api/project-applications':'/api/forms',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(requestBody)});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.error||'We could not submit this form. Please try again.');
      if(typeof window!=='undefined' && (window as Window & {gtag?:(...args:unknown[])=>void}).gtag){
        (window as Window & {gtag?:(...args:unknown[])=>void}).gtag?.('event',`${formType}_submitted`);
      }
      window.location.assign(`/submitted?type=${encodeURIComponent(confirmationType(formType))}`);
    }catch(error){
      setStatus('error');
      setMessage(error instanceof Error?error.message:'We could not submit this form. Please try again.');
    }
  }

  return <form className={className} onSubmit={submit} noValidate={false}>
    {children}
    {projectInterest&&<section className="projectInterestTerms" aria-labelledby="project-interest-terms-title">
      <div className="projectInterestTermsEyebrow">Before you submit</div>
      <h3 id="project-interest-terms-title">Participation terms</h3>
      <p>{PROJECT_PARTICIPATION_TERMS_SUMMARY}</p>
      <button className="projectInterestTermsLink" type="button" onClick={()=>termsDialog.current?.showModal()}>Read full participation terms</button>
      <label className="projectInterestTermsCheck">
        <input type="checkbox" checked={acceptedTerms} onChange={event=>setAcceptedTerms(event.target.checked)} required/>
        <span>I have read, understood and agree to the Mettelo Project Participation Terms.</span>
      </label>
      <dialog ref={termsDialog} className="projectInterestTermsDialog" aria-labelledby="project-interest-full-terms-title" onClick={event=>{if(event.target===event.currentTarget)event.currentTarget.close()}}>
        <div className="projectInterestTermsDialogCard">
          <div className="projectInterestTermsDialogHead"><div><div className="projectInterestTermsEyebrow">Mettelo</div><h2 id="project-interest-full-terms-title">Project Participation Terms</h2></div><button type="button" className="projectInterestTermsClose" aria-label="Close participation terms" onClick={()=>termsDialog.current?.close()}>×</button></div>
          <div className="projectInterestTermsBody">{PROJECT_PARTICIPATION_TERMS_FULL.split('\n\n').slice(1).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
          <div className="projectInterestTermsDialogActions"><button className="button dark" type="button" onClick={()=>termsDialog.current?.close()}>Done reading</button></div>
        </div>
      </dialog>
    </section>}
    <button className="button dark" type="submit" disabled={status==='submitting'||(projectInterest&&!acceptedTerms)} style={{width:'100%',marginTop:20}}>
      {status==='submitting'?'Submitting…':projectInterest?'Submit interest':submitLabel}
    </button>
    <div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div>
    {projectInterest&&<style jsx>{`
      .projectInterestTerms{margin-top:22px;padding:18px;border:1px solid #d8dde3;border-radius:14px;background:#fbf7ee}.projectInterestTermsEyebrow{font-family:var(--font-plex-mono),ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em;font-size:10px;font-weight:700;color:#72551e}.projectInterestTerms h3{margin:6px 0 8px;font-size:18px}.projectInterestTerms p{margin:0;color:#4f5965;font-size:13px;line-height:1.65}.projectInterestTermsLink{min-height:44px;margin-top:10px;padding:0;border:0;background:transparent;color:#173f8f;font-weight:800;text-decoration:underline;text-underline-offset:3px;cursor:pointer}.projectInterestTermsCheck{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;align-items:start;margin-top:12px;padding:13px;border:1px solid #d0d6dd;border-radius:10px;background:#fff;font-size:13px;font-weight:700;line-height:1.5}.projectInterestTermsCheck input{width:18px;height:18px;margin-top:1px}.projectInterestTermsDialog{width:min(92vw,720px);max-height:88vh;padding:0;border:0;border-radius:18px;background:transparent}.projectInterestTermsDialog::backdrop{background:rgba(16,19,29,.58)}.projectInterestTermsDialogCard{display:flex;max-height:88vh;flex-direction:column;background:#fff;border-radius:18px;overflow:hidden}.projectInterestTermsDialogHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:20px;border-bottom:1px solid #e7e1d6}.projectInterestTermsDialogHead h2{margin:5px 0 0;font-size:24px}.projectInterestTermsClose{width:44px;height:44px;border:1px solid #c8ced5;border-radius:10px;background:#fff;color:#10131d;font-size:28px;line-height:1;cursor:pointer}.projectInterestTermsBody{overflow:auto;padding:20px}.projectInterestTermsBody p{margin:0 0 14px;color:#3f4853;font-size:14px;line-height:1.68}.projectInterestTermsDialogActions{padding:14px 20px 20px;border-top:1px solid #e7e1d6}.projectInterestTermsDialogActions .button{width:100%}.projectInterestTermsLink:focus-visible,.projectInterestTermsCheck input:focus-visible,.projectInterestTermsClose:focus-visible{outline:3px solid #173f8f;outline-offset:3px}@media(max-width:480px){.projectInterestTerms{padding:15px}.projectInterestTermsDialog{width:94vw;max-height:92vh}.projectInterestTermsDialogCard{max-height:92vh}.projectInterestTermsDialogHead,.projectInterestTermsBody{padding:16px}.projectInterestTermsDialogHead h2{font-size:21px}}
    `}</style>}
  </form>;
}
