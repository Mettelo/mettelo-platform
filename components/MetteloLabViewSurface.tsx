'use client';

import type {ReactNode} from 'react';
import {useLayoutEffect,useRef} from 'react';
import {useSearchParams} from 'next/navigation';
import type {LabView} from './MetteloLabNavigation';

const valid:LabView[]=['home','plan','tasks','chat','data','proof','resources','events','team','more'];
const legacyChromeSelectors=[':scope > section.softSection > .shell > .sectionHead',':scope > section.softSection > .shell > .workspaceNav',':scope > section.softSection > .shell > .statBand'];

export default function MetteloLabViewSurface({children,className}:{children:ReactNode;className?:string}){
 const raw=useSearchParams().get('view');const view:LabView=valid.includes(raw as LabView)?raw as LabView:'home';const surfaceRef=useRef<HTMLDivElement>(null);
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
  <div ref={surfaceRef} className={className} data-lab-view={view} data-lab-surface>{children}</div>
  <style jsx global>{`
   [data-lab-surface] > section.softSection{padding:0!important;background:transparent!important}
   [data-lab-surface] > section.softSection > .shell{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}
   [data-lab-surface] > section.softSection > .shell > .sectionHead,
   [data-lab-surface] > section.softSection > .shell > .workspaceNav,
   [data-lab-surface] > section.softSection > .shell > .statBand{display:none!important}
   @media(max-width:480px){body.metteloLabActive header:has(+ main#mettelo-lab-content){display:none!important}}
  `}</style>
 </>;
}
