'use client';

import {useEffect} from 'react';

export default function ProfileReturnAfterSave(){
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);const next=params.get('next');if(!next||!next.startsWith('/'))return;
    const handler=()=>window.location.assign(next);
    window.addEventListener('mettelo:profile-updated',handler);
    return()=>window.removeEventListener('mettelo:profile-updated',handler);
  },[]);
  return null;
}
