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
  return <div className="proofShare socialShare" aria-label={`${label} on social media`}>
    <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label={`${label} on LinkedIn`} title="LinkedIn"><span aria-hidden="true">in</span></a>
    <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label={`${label} on X`} title="X"><span aria-hidden="true">𝕏</span></a>
    <a href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label={`${label} on WhatsApp`} title="WhatsApp"><span aria-hidden="true">WA</span></a>
    <button type="button" onClick={nativeShare} aria-label={`${label} using device share`} title="Share or copy link"><span aria-hidden="true">{copied?'✓':'↗'}</span></button>
    <span className="socialShareStatus" role="status" aria-live="polite">{copied?'Link copied':''}</span>
    <style jsx>{`
      .socialShare{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0}
      .socialShare a,.socialShare button{width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 44px;border:1px solid #d8dde3;border-radius:11px;background:#fff;color:#111318;text-decoration:none;font:inherit;font-size:.76rem;font-weight:850;line-height:1;cursor:pointer}
      .socialShare a:hover,.socialShare button:hover{background:#fbf7ee;border-color:#c9b78f}
      .socialShare a:focus-visible,.socialShare button:focus-visible{outline:3px solid #173f8f;outline-offset:3px}
      .socialShareStatus{align-self:center;min-height:1em;color:#596473;font-size:.72rem;font-weight:650}
      @media(max-width:480px){.socialShare{gap:9px}.socialShare a,.socialShare button{width:46px;height:46px;flex-basis:46px}}
      @media(prefers-reduced-motion:reduce){.socialShare a,.socialShare button{transition:none!important}}
    `}</style>
  </div>;
}
