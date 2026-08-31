'use client';

import type {ReactNode} from 'react';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import MetteloLabCapabilityPathContext from '@/components/MetteloLabCapabilityPathContext';
import type {LabView} from './MetteloLabNavigation';

const valid:LabView[]=['home','plan','tasks','chat','data','proof','resources','events','team','more'];
const LAB_VIEW_EVENT='mettelo-lab-view-change';
const legacyChromeSelectors=[':scope > section.softSection > .shell > .sectionHead',':scope > section.softSection > .shell > .workspaceNav',':scope > section.softSection > .shell > .statBand'];
function resolveView(raw:string|null):LabView{if(raw==='more')return'home';return valid.includes(raw as LabView)?raw as LabView:'home'}

export default function MetteloLabViewSurface({children,className}:{children:ReactNode;className?:string}){
 const params=useSearchParams();const [view,setView]=useState<LabView>(()=>resolveView(params.get('view')));const surfaceRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{const sync=()=>setView(resolveView(new URL(window.location.href).searchParams.get('view')));const custom=(event:Event)=>{const detail=(event as CustomEvent<{view?:LabView}>).detail;setView(detail?.view||resolveView(new URL(window.location.href).searchParams.get('view')))};window.addEventListener('popstate',sync);window.addEventListener(LAB_VIEW_EVENT,custom);return()=>{window.removeEventListener('popstate',sync);window.removeEventListener(LAB_VIEW_EVENT,custom)}},[]);
 useLayoutEffect(()=>{
  const surface=surfaceRef.current;if(!surface)return;
  // The project workspace predates Mettelo Lab and still renders its own hero,
  // anchor navigation and status band around the Lab content. Lab owns that
  // context now, so neutralise the legacy chrome at the surface boundary rather
  // than depending on stylesheet order. Inline !important keeps this invariant
  // stable even when older global project styles load after the Lab bundle.
  for(const selector of legacyChromeSelectors){
   const element=surface.querySelector<HTMLElement>(selector);if(!element)continue;
   element.hidden=true;element.setAttribute('aria-hidden','true');element.style.setProperty('display','none','important');
  }
 },[view]);
 return <>
  <div ref={surfaceRef} className={className} data-lab-view={view} data-lab-surface><MetteloLabCapabilityPathContext/>{children}<a data-lab-back href="/member#projects">← Back to My Mettelo</a></div>
  <style jsx global>{`
   [data-lab-surface] > section.softSection{padding:0!important;background:transparent!important}
   [data-lab-surface] > section.softSection > .shell{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}
   [data-lab-surface] > section.softSection > .shell > .sectionHead,
   [data-lab-surface] > section.softSection > .shell > .workspaceNav,
   [data-lab-surface] > section.softSection > .shell > .statBand{display:none!important}
   @media(max-width:480px){
    body.metteloLabActive header:has(+ main#mettelo-lab-content){display:none!important}
    body.metteloLabActive [data-lab-surface][data-lab-view="chat"] #discussion .messageBubble header{
     grid-template-columns:minmax(0,1fr)!important;
     gap:2px!important;
    }
    body.metteloLabActive [data-lab-surface][data-lab-view="chat"] #discussion .messageBubble header strong{
     grid-column:1!important;
     width:100%!important;
     min-width:0!important;
     justify-self:stretch!important;
    }
    body.metteloLabActive [data-lab-surface][data-lab-view="chat"] #discussion .messageBubble time{
     grid-column:1!important;
     justify-self:start!important;
     max-width:100%!important;
    }
    body.metteloLabActive [data-lab-surface][data-lab-view="chat"] #discussion .messageBubble header span{
     grid-column:1!important;
    }
   }
  `}</style>
 </>;
}
