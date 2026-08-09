'use client';

import { FormEvent, useState } from 'react';

export default function AdminPresentationSlots(){
  const [status,setStatus]=useState<'idle'|'saving'|'success'|'error'>('idle');
  const [message,setMessage]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setStatus('saving');setMessage('');
    const form=event.currentTarget;const data=Object.fromEntries(new FormData(form).entries());
    try{
      const response=await fetch('/api/admin/presentation-slots',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
      const body=await response.json().catch(()=>({}));if(!response.ok) throw new Error(body.error||'Unable to create slot.');
      setStatus('success');setMessage('Presentation slot published. Eligible project teams can now book it.');form.reset();
    }catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Unable to create slot.');}
  }
  return <section className="panel" id="presentation-slots"><div className="panelHead"><div><span className="cardNumber">FINAL DEMOS</span><h3 style={{marginTop:8}}>Publish presentation slots</h3></div><span className="chip">METTELO CALENDAR</span></div><form className="formCard" onSubmit={submit}>
    <div className="fieldRow"><div><label htmlFor="slot-start">Starts *</label><input id="slot-start" name="starts_at" type="datetime-local" required/></div><div><label htmlFor="slot-end">Ends *</label><input id="slot-end" name="ends_at" type="datetime-local" required/></div></div>
    <label htmlFor="slot-location">Location / label</label><input id="slot-location" name="location_label" placeholder="Online · Mettelo Demo Room"/>
    <label htmlFor="slot-link">Meeting link</label><input id="slot-link" name="meeting_url" type="url" placeholder="Google Meet, Microsoft Teams or Zoom URL"/>
    <button className="button dark" type="submit" disabled={status==='saving'} style={{width:'100%',marginTop:20}}>{status==='saving'?'Publishing…':'Publish presentation slot →'}</button><div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div>
  </form></section>;
}
