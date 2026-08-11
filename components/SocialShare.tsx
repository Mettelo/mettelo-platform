'use client';

import {useState} from 'react';

type Props={url:string;text:string;label?:string};

export default function SocialShare({url,text,label='Share'}:Props){
  const [copied,setCopied]=useState(false);
  async function nativeShare(){
    if(typeof navigator!=='undefined'&&navigator.share){
      try{await navigator.share({title:text,text,url});return;}catch(error){if((error as Error).name==='AbortError')return;}
    }
    try{await navigator.clipboard.writeText(url);setCopied(true);window.setTimeout(()=>setCopied(false),1800);}catch{}
  }
  return <div className="proofShare" aria-label={`${label} on social media`}>
    <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label={`${label} on LinkedIn`} title="LinkedIn">in</a>
    <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label={`${label} on X`} title="X">𝕏</a>
    <a href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label={`${label} on WhatsApp`} title="WhatsApp">WA</a>
    <button type="button" onClick={nativeShare} aria-label={`${label} using device share`} title="Share or copy link" style={{border:0,background:'transparent',cursor:'pointer',font:'inherit',fontWeight:800}}>{copied?'✓':'↗'}</button>
  </div>;
}
