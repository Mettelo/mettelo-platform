'use client';

import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';

export type LabView='home'|'plan'|'tasks'|'chat'|'data'|'proof'|'resources'|'events'|'team';
type Placement='rail-primary'|'rail-tools'|'mobile'|'more';
type Item={view:LabView;label:string;icon:string;description?:string};
const primary:Item[]=[{view:'home',label:'Home',icon:'⌂'},{view:'plan',label:'Plan',icon:'◇'},{view:'tasks',label:'Tasks',icon:'☑'},{view:'chat',label:'Chat',icon:'◌'},{view:'data',label:'Data',icon:'▦'},{view:'proof',label:'Proof',icon:'✓'}];
const tools:Item[]=[{view:'resources',label:'Resources',icon:'⌑',description:'Files and project references'},{view:'events',label:'Events',icon:'◷',description:'Sessions and presentation'},{view:'team',label:'Team',icon:'◎',description:'Your team and working state'}];
const more:Item[]=[{view:'plan',label:'Plan',icon:'◇',description:'Problem, outcomes and milestones'},{view:'proof',label:'Proof',icon:'✓',description:'Evidence and completion'},...tools];
const mobile:Item[]=[{view:'home',label:'Home',icon:'⌂'},{view:'tasks',label:'Tasks',icon:'☑'},{view:'chat',label:'Chat',icon:'◌'},{view:'data',label:'Data',icon:'▦'}];

export default function MetteloLabNavigation({placement,unreadCount=0,className}:{placement:Placement;unreadCount?:number;className?:string}){
 const pathname=usePathname();const params=useSearchParams();const raw=params.get('view');const active:LabView=(['home','plan','tasks','chat','data','proof','resources','events','team'] as const).includes(raw as LabView)?raw as LabView:'home';
 const hrefFor=(view:LabView)=>{const next=new URLSearchParams(params.toString());next.set('view',view);return `${pathname}?${next.toString()}`};
 if(placement==='rail-primary'||placement==='rail-tools'){const items=placement==='rail-primary'?primary:tools;return <nav className={className} aria-label={placement==='rail-primary'?'Mettelo Lab primary navigation':'Mettelo Lab project tools'}>{items.map(item=><Link href={hrefFor(item.view)} aria-current={active===item.view?'page':undefined} data-active={active===item.view?'true':undefined} key={item.view}><span aria-hidden="true">{item.icon}</span><span>{item.label}</span>{item.view==='chat'&&unreadCount>0?<b aria-label={`${unreadCount} unread messages`}>{unreadCount}</b>:null}</Link>)}</nav>}
 if(placement==='mobile')return <nav className={className} aria-label="Mettelo Lab mobile navigation">{mobile.map(item=><Link href={hrefFor(item.view)} aria-current={active===item.view?'page':undefined} data-active={active===item.view?'true':undefined} key={item.view}><span aria-hidden="true">{item.icon}</span><small>{item.label}</small>{item.view==='chat'&&unreadCount>0?<b aria-label={`${unreadCount} unread messages`}>{unreadCount}</b>:null}</Link>)}<Link href="#lab-more" data-active={['plan','proof','resources','events','team'].includes(active)?'true':undefined}><span aria-hidden="true">•••</span><small>More</small></Link></nav>;
 return <section className={className} id="lab-more" aria-labelledby="lab-more-title"><p>METTELO LAB</p><h2 id="lab-more-title">More</h2><p>Additional project areas.</p><div>{more.map(item=><Link href={hrefFor(item.view)} aria-current={active===item.view?'page':undefined} key={item.view}><strong>{item.label}</strong><small>{item.description}</small></Link>)}</div></section>;
}
