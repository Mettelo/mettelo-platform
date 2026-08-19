'use client';

import type {ReactNode} from 'react';
import {useSearchParams} from 'next/navigation';
import type {LabView} from './MetteloLabNavigation';

const valid:LabView[]=['home','plan','tasks','chat','data','proof','resources','events','team','more'];
export default function MetteloLabViewSurface({children,className}:{children:ReactNode;className?:string}){
 const raw=useSearchParams().get('view');const view:LabView=valid.includes(raw as LabView)?raw as LabView:'home';
 return <div className={className} data-lab-view={view}>{children}</div>;
}
