'use client';

import type {ReactNode} from 'react';
import {useSearchParams} from 'next/navigation';

export default function MetteloLabSystemPanels({dataPanel,proofPanel,completionPanel}:{dataPanel:ReactNode;proofPanel:ReactNode;completionPanel:ReactNode}){
 const view=useSearchParams().get('view')||'home';
 if(view==='data')return <div data-lab-system-view="data">{dataPanel}</div>;
 if(view==='proof')return <div data-lab-system-view="proof">{proofPanel}{completionPanel}</div>;
 return null;
}
