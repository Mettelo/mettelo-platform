'use client';

import {useState} from 'react';

type Props={url:string;text:string};

export default function CollaborationShareActions({url,text}:Props){
 const [copied,setCopied]=useState(false);
 const encodedUrl=encodeURIComponent(url),encodedText=encodeURIComponent(text);
 async function copy(){try{await navigator.clipboard.writeText(`${text}\n\n${url}`);setCopied(true);window.setTimeout(()=>setCopied(false),1800)}catch{setCopied(false)}}
 return <div className="actions" aria-label="Share collaboration opportunity">
  <a className="button ghost" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Share this collaboration opportunity on LinkedIn">LinkedIn</a>
  <a className="button ghost" href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Share this collaboration opportunity on X">X</a>
  <a className="button ghost" href={`https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Share this collaboration opportunity on WhatsApp">WhatsApp</a>
  <button className="button ghost" type="button" onClick={copy} aria-live="polite">{copied?'Link copied':'Copy link'}</button>
 </div>;
}
