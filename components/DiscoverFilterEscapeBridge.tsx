'use client';

import {useEffect} from 'react';

/**
 * The capability combobox owns the first Escape press so its listbox can close
 * without dismissing the whole filter surface. When focus remains on the input,
 * the next Escape must dismiss the surrounding modal and return focus to the
 * filter trigger. Keep this bridge outside the catalogue component so the dialog
 * contract remains deterministic even when native <dialog> cancel behaviour differs
 * between Chromium versions.
 */
export default function DiscoverFilterEscapeBridge(){
  useEffect(()=>{
    function onKeyDown(event:KeyboardEvent){
      if(event.key!=='Escape')return;
      const target=event.target;
      if(!(target instanceof HTMLInputElement)||target.id!=='member-capability-filter')return;
      if(target.getAttribute('aria-expanded')==='true')return;
      const dialog=target.closest('dialog');
      if(!(dialog instanceof HTMLDialogElement)||!dialog.open)return;
      event.preventDefault();
      event.stopPropagation();
      const closeButton=dialog.querySelector<HTMLButtonElement>('button[aria-label="Close project filters"]');
      if(closeButton){closeButton.click();return}
      dialog.close();
      document.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"][aria-expanded="true"]')?.focus();
    }
    document.addEventListener('keydown',onKeyDown,true);
    return()=>document.removeEventListener('keydown',onKeyDown,true);
  },[]);
  return null;
}
