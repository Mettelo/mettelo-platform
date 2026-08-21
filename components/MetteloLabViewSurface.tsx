'use client';

import type {ReactNode} from 'react';
import {useSearchParams} from 'next/navigation';
import type {LabView} from './MetteloLabNavigation';

const valid:LabView[]=['home','plan','tasks','chat','data','proof','resources','events','team','more'];
export default function MetteloLabViewSurface({children,className}:{children:ReactNode;className?:string}){
 const raw=useSearchParams().get('view');const view:LabView=valid.includes(raw as LabView)?raw as LabView:'home';
 return <>
  <div className={className} data-lab-view={view} data-lab-surface>{children}</div>
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
