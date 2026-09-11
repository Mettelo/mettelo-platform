'use client';

import {useEffect,useState} from 'react';
import ProjectSupportCaseSection from '@/components/project-experience/ProjectSupportCaseSection';

const LAB_VIEW_EVENT='mettelo-lab-view-change';

export default function MetteloLabSupportView({projectId,projectRunId,runStatus}:{projectId:string;projectRunId:string;runStatus:string}){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  const sync=()=>setVisible(new URL(window.location.href).searchParams.get('view')==='support');
  const onViewChange=(event:Event)=>{
   const view=(event as CustomEvent<{view?:string}>).detail?.view;
   setVisible(view==='support');
  };
  sync();
  window.addEventListener('popstate',sync);
  window.addEventListener(LAB_VIEW_EVENT,onViewChange);
  return()=>{
   window.removeEventListener('popstate',sync);
   window.removeEventListener(LAB_VIEW_EVENT,onViewChange);
  };
 },[]);
 if(!visible)return null;
 return <ProjectSupportCaseSection projectId={projectId} projectRunId={projectRunId} runStatus={runStatus}/>;
}
