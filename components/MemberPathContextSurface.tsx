'use client';

import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import MemberCapabilityPathSummary from './MemberCapabilityPathSummary';
import type {MemberCapabilityPathOverview} from '@/lib/member-capability-paths';

const empty:MemberCapabilityPathOverview={followedCount:0,primary:null};

export default function MemberPathContextSurface(){
  const pathname=usePathname();const visible=pathname==='/member'||pathname==='/member/profile';const [overview,setOverview]=useState<MemberCapabilityPathOverview>(empty);
  useEffect(()=>{if(!visible)return;let active=true;fetch('/api/member/capability-paths?mode=overview',{cache:'no-store'}).then(async response=>response.ok?response.json():{overview:empty}).then(body=>{if(active)setOverview(body.overview||empty)}).catch(()=>{if(active)setOverview(empty)});return()=>{active=false}},[visible]);
  if(!visible)return null;
  return <div className="memberPathContextSurface"><MemberCapabilityPathSummary overview={overview} context={pathname==='/member'?'home':'profile'}/><style jsx global>{`.memberPathContextSurface{width:min(100%,1240px);margin:0 0 14px}.memberPathContextSurface .mcpSummary{margin-bottom:0}@media(max-width:900px){.memberPathContextSurface{width:100%}}`}</style></div>;
}
