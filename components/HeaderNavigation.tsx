'use client';

import {useEffect,useRef,useState} from 'react';

type NavItem=[string,string,string];
type DropdownConfig={label:string;items:NavItem[]};

export default function HeaderNavigation({dropdowns}:{dropdowns:DropdownConfig[]}){
  const [open,setOpen]=useState<string|null>(null);
  const navRef=useRef<HTMLElement>(null);

  useEffect(()=>{
    function onPointerDown(event:MouseEvent){
      if(open&&navRef.current&&!navRef.current.contains(event.target as Node))setOpen(null);
    }
    function onKeyDown(event:KeyboardEvent){
      if(event.key==='Escape')setOpen(null);
    }
    document.addEventListener('mousedown',onPointerDown);
    document.addEventListener('keydown',onKeyDown);
    return()=>{
      document.removeEventListener('mousedown',onPointerDown);
      document.removeEventListener('keydown',onKeyDown);
    };
  },[open]);

  return <nav ref={navRef} className="primaryNav" aria-label="Primary navigation">
    <a className="primaryNavLink" href="/about">About</a>
    {dropdowns.map(({label,items})=>{
      const isOpen=open===label;
      const panelId=`nav-${label.toLowerCase()}-panel`;
      return <div className={`navDropdown${isOpen?' isOpen':''}`} key={label}>
        <button className="navDropdownTrigger" type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={()=>setOpen(isOpen?null:label)}>
          <span>{label}</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="navDropdownPanel" id={panelId} aria-hidden={!isOpen}>
          {items.map(([title,href,copy])=><a key={href} href={href} onClick={()=>setOpen(null)}><strong>{title}</strong><small>{copy}</small></a>)}
        </div>
      </div>;
    })}
    <a className="primaryNavLink" href="/partnership">Partner</a>
  </nav>;
}
