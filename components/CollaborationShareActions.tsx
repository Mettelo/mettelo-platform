'use client';

import {useEffect,useState} from 'react';

type Props={url:string;text:string;collaborationNeedId:string};

export default function CollaborationShareActions({url,text,collaborationNeedId}:Props){
 const[copied,setCopied]=useState(false);
 const[sharing,setSharing]=useState(false);
 const[feedback,setFeedback]=useState('');
 const[absoluteUrl,setAbsoluteUrl]=useState(url);

 useEffect(()=>{try{setAbsoluteUrl(new URL(url,window.location.origin).toString())}catch{setAbsoluteUrl(url)}},[url]);

 const encodedUrl=encodeURIComponent(absoluteUrl),encodedText=encodeURIComponent(text);
 function track(event_type:'share_linkedin'|'share_x'|'share_whatsapp'|'share_copy'|'share_native'){
  void fetch('/api/collaboration-analytics',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event_type,collaboration_need_id:collaborationNeedId}),keepalive:true}).catch(()=>undefined);
 }

 async function copy(){
  setFeedback('');
  try{
   if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
   await navigator.clipboard.writeText(absoluteUrl);
   track('share_copy');
   setCopied(true);
   setFeedback('Link copied');
   window.setTimeout(()=>{setCopied(false);setFeedback('')},1800);
  }catch{
   setCopied(false);
   setFeedback('We could not copy the link. Select and copy the public URL manually.');
  }
 }

 async function nativeShare(){
  if(!navigator.share){setFeedback('Native sharing is unavailable on this device. Use one of the share options or Copy link.');return}
  setSharing(true);setFeedback('');
  try{
   await navigator.share({title:'Mettelo collaboration opportunity',text,url:absoluteUrl});
   track('share_native');setFeedback('Share sheet opened');
  }catch(error){
   if(error instanceof DOMException&&error.name==='AbortError'){setFeedback('Sharing cancelled.')}
   else setFeedback('Native sharing is unavailable. Use LinkedIn, X, WhatsApp or Copy link.');
  }finally{setSharing(false)}
 }

 return <div className="shareRoot">
  <div className="actions" aria-label="Share collaboration opportunity">
   <a className="button ghost" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Share this collaboration opportunity on LinkedIn" onClick={()=>track('share_linkedin')}>LinkedIn</a>
   <a className="button ghost" href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Share this collaboration opportunity on X" onClick={()=>track('share_x')}>X</a>
   <a className="button ghost" href={`https://wa.me/?text=${encodeURIComponent(`${text}\n\n${absoluteUrl}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Share this collaboration opportunity on WhatsApp" onClick={()=>track('share_whatsapp')}>WhatsApp</a>
   <button className="button ghost" type="button" onClick={()=>void copy()}>{copied?'Link copied':'Copy link'}</button>
   <button className="button ghost" type="button" onClick={()=>void nativeShare()} disabled={sharing}>{sharing?'Opening…':'More / native share'}</button>
  </div>
  <p className="shareFeedback" role="status" aria-live="polite">{feedback}</p>
  <style jsx>{`.shareRoot{display:grid;gap:8px}.shareFeedback{min-height:18px;margin:0;color:var(--slate);font-size:.75rem}`}</style>
 </div>;
}
