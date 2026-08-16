'use client';

import {useEffect,useRef} from 'react';

export default function ProjectConversationReadMarker({projectRunId,lastMessageId}:{projectRunId:string|null;lastMessageId:string|null}){
  const sent=useRef(false);
  useEffect(()=>{
    if(!projectRunId||sent.current)return;
    const target=document.getElementById('discussion');
    if(!target)return;
    const observer=new IntersectionObserver(entries=>{
      if(!entries.some(entry=>entry.isIntersecting)||sent.current)return;
      sent.current=true;
      void fetch('/api/project-conversation-read',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project_run_id:projectRunId,last_message_id:lastMessageId})});
      observer.disconnect();
    },{threshold:.2});
    observer.observe(target);
    return()=>observer.disconnect();
  },[projectRunId,lastMessageId]);
  return null;
}
