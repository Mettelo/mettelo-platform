'use client';

import {useEffect,useState} from 'react';

type Props={url:string;text:string;collaborationNeedId:string};

export default function CollaborationShareActions({url,text,collaborationNeedId}:Props){
 const[copied,setCopied]=useState(false);const[sharing,setSharing]=useState(false);const[absoluteUrl,setAbsoluteUrl]=useState(url);
 useEffect(()=>{try{setAbsoluteUrl(new URL(url,window.location.origin).toString())}catch{setAbsoluteUrl(url)}},[url]);
 const encodedUrl=encodeURIComponent(absoluteUrl),encodedText=encodeURIComponent(text);
 function track(event_type:'share_linkedin'|'share_x'|'share_whatsapp'|'share_copy'|'share_native'){void fetch('/api/collaboration-analytics',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event_type,collaboration_need_id:collaborationNeedId}),keepalive:true}).catch(()=>undefined)}
 async function copy(){try{await navigator.clipboard.writeText(`${text}\n\n${absoluteUrl}`);track('share_copy');setCopied(true);window.setTimeout(()=>setCopied(false),1800)}catch{setCopied(false)}}
 async function nativeShare(){if(!navigator.share)return void copy();setSharing(true);try{await navigator.share({title:'Mettelo collaboration opportunity',text,url:absoluteUrl});track('share_native')}catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))await copy()}finally{setSharing(false)}}
 return <div className="actions" aria-label="Share collaboration opportunity">
  <a className="button ghost" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Share this collaboration opportunity on LinkedIn" onClick={()=>track('share_linkedin')}>LinkedIn</a>
  <a className="button ghost" href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Share this collaboration opportunity on X" onClick={()=>track('share_x')}>X</a>
  <a className="button ghost" href={`https://wa.me/?text=${encodeURIComponent(`${text}\n\n${absoluteUrl}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Share this collaboration opportunity on WhatsApp" onClick={()=>track('share_whatsapp')}>WhatsApp</a>
  <button className="button ghost" type="button" onClick={()=>void copy()} aria-live="polite">{copied?'Link copied':'Copy link'}</button>
  <button className="button ghost" type="button" onClick={()=>void nativeShare()} disabled={sharing}>{sharing?'Sharing…':'More / native share'}</button>
 </div>;
}
