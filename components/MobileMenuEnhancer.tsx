'use client';

import {useEffect} from 'react';

export default function MobileMenuEnhancer(){
  useEffect(()=>{
    const menu=document.querySelector<HTMLDetailsElement>('.mobileMenu');
    if(!menu)return;
    const panel=menu.querySelector<HTMLElement>('.mobileMenuPanel');
    if(!panel)return;

    const ensureBackdrop=()=>{
      let backdrop=document.querySelector<HTMLButtonElement>('.mobileMenuBackdrop');
      if(!backdrop){
        backdrop=document.createElement('button');
        backdrop.type='button';
        backdrop.className='mobileMenuBackdrop';
        backdrop.setAttribute('aria-label','Close navigation menu');
        backdrop.hidden=true;
        document.body.appendChild(backdrop);
      }
      return backdrop;
    };

    const backdrop=ensureBackdrop();
    const close=()=>{menu.open=false;document.body.classList.remove('mobileNavOpen');backdrop.hidden=true};
    const sync=()=>{document.body.classList.toggle('mobileNavOpen',menu.open);backdrop.hidden=!menu.open};

    const enhance=()=>{
      const nav=panel.querySelector<HTMLElement>('.metteloMobileNav');
      if(!nav||nav.dataset.compactReady==='true')return;
      nav.dataset.compactReady='true';

      const primary=nav.querySelector<HTMLElement>('nav[aria-label="Mobile primary navigation"]');
      if(primary&&!primary.querySelector('a[href="/"]')){
        const home=document.createElement('a');
        home.href='/';
        home.setAttribute('aria-label','Go to Mettelo homepage');
        home.innerHTML='<span>⌂ Home</span><span aria-hidden="true">→</span>';
        primary.prepend(home);
      }

      const explore=nav.querySelector<HTMLElement>('nav[aria-label="Mobile Explore navigation"]');
      const exploreGroup=explore?.closest<HTMLElement>('.mobileNavGroup');
      if(explore&&exploreGroup&&!exploreGroup.closest('.mobileExploreDisclosure')){
        const disclosure=document.createElement('details');
        disclosure.className='mobileExploreDisclosure';
        const summary=document.createElement('summary');
        summary.innerHTML='<span>Explore</span><span class="mobileExploreSymbol" aria-hidden="true">+</span>';
        disclosure.append(summary,explore);
        exploreGroup.replaceWith(disclosure);
        disclosure.addEventListener('toggle',()=>{
          const symbol=summary.querySelector<HTMLElement>('.mobileExploreSymbol');
          if(symbol)symbol.textContent=disclosure.open?'−':'+';
        });
      }

      const accountLinks=nav.querySelector<HTMLElement>('.mobileAccountLinks');
      accountLinks?.querySelector<HTMLAnchorElement>('a[href="/member/profile"]')?.classList.add('mobileSecondaryAccountAction');
    };

    const handlePanelClick=(event:MouseEvent)=>{
      const target=event.target as Element|null;
      if(target?.closest('a,button:not(.mobileExploreDisclosure summary)'))close();
    };
    const handleOutside=(event:PointerEvent)=>{if(menu.open&&!menu.contains(event.target as Node))close()};
    const handleKey=(event:KeyboardEvent)=>{if(event.key==='Escape'&&menu.open)close()};
    const handleBackdrop=()=>close();

    enhance();
    const observer=new MutationObserver(enhance);
    observer.observe(panel,{childList:true,subtree:true});
    menu.addEventListener('toggle',sync);
    panel.addEventListener('click',handlePanelClick);
    backdrop.addEventListener('click',handleBackdrop);
    document.addEventListener('pointerdown',handleOutside);
    document.addEventListener('keydown',handleKey);
    sync();

    return()=>{
      observer.disconnect();
      menu.removeEventListener('toggle',sync);
      panel.removeEventListener('click',handlePanelClick);
      backdrop.removeEventListener('click',handleBackdrop);
      document.removeEventListener('pointerdown',handleOutside);
      document.removeEventListener('keydown',handleKey);
      document.body.classList.remove('mobileNavOpen');
      backdrop.remove();
    };
  },[]);

  return null;
}
