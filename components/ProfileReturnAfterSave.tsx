'use client';

import {useEffect} from 'react';

function safeInternalNext(value:string|null){
  if(!value||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return null;
  try{
    const base='https://mettelo.local';
    const target=new URL(value,base);
    if(target.origin!==base)return null;
    return `${target.pathname}${target.search}${target.hash}`;
  }catch{return null}
}

export default function ProfileReturnAfterSave(){
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);const next=safeInternalNext(params.get('next'));if(!next)return;
    const handler=()=>window.location.assign(next);
    window.addEventListener('mettelo:profile-updated',handler);
    return()=>window.removeEventListener('mettelo:profile-updated',handler);
  },[]);
  return null;
}
