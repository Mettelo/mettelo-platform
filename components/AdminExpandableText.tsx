'use client';

import {useState} from 'react';

export default function AdminExpandableText({text}:{text:string}){
  const [expanded,setExpanded]=useState(false);const long=text.length>720;
  return <div className="adminExpandableText"><p className={expanded?'expanded':''}>{text}</p>{long&&<button type="button" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'Show less':'Show more'}</button>}<style jsx>{`.adminExpandableText p{margin:0;color:#48515e;line-height:1.65;overflow-wrap:anywhere;word-break:break-word;white-space:pre-wrap}.adminExpandableText p:not(.expanded){display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:8;overflow:hidden}.adminExpandableText button{min-height:36px;margin-top:8px;padding:0;border:0;background:none;color:#72501b;font-weight:800;text-decoration:underline;text-underline-offset:3px}`}</style></div>;
}
