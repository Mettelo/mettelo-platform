'use client';

import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';

type Item={id:string;type:string;title:string;body:string;action_url:string|null;read_at:string|null;created_at:string};
type Anchor={top:number;right:number;maxHeight:number};

function BellIcon(){return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 21h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}

export default function NotificationMenu(){
  const [items,setItems]=useState<Item[]>([]);
  const [unread,setUnread]=useState(0);
  const [open,setOpen]=useState(false);
  const [compact,setCompact]=useState(false);
  const [mounted,setMounted]=useState(false);
  const [anchor,setAnchor]=useState<Anchor>({top:72,right:16,maxHeight:480});
  const triggerRef=useRef<HTMLButtonElement>(null);
  const panelRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{setMounted(true);fetch('/api/notifications').then(r=>r.ok?r.json():Promise.reject()).then(data=>{setItems(data.items||[]);setUnread(data.unread||0)}).catch(()=>{});},[]);

  useEffect(()=>{
    const media=window.matchMedia('(max-width: 900px)');
    const update=()=>setCompact(media.matches);
    update();
    media.addEventListener('change',update);
    return()=>media.removeEventListener('change',update);
  },[]);

  useEffect(()=>{
    if(!open)return;
    const updatePosition=()=>{
      const trigger=triggerRef.current;
      if(!trigger)return;
      const rect=trigger.getBoundingClientRect();
      const viewport=window.visualViewport;
      const viewportWidth=viewport?.width??window.innerWidth;
      const viewportHeight=viewport?.height??window.innerHeight;
      const offsetLeft=viewport?.offsetLeft??0;
      const offsetTop=viewport?.offsetTop??0;
      const top=Math.max(offsetTop+12,rect.bottom+8);
      const right=Math.max(12,viewportWidth+offsetLeft-rect.right);
      setAnchor({top,right,maxHeight:Math.max(220,Math.min(480,viewportHeight+offsetTop-top-16))});
    };
    updatePosition();
    const viewport=window.visualViewport;
    window.addEventListener('resize',updatePosition);
    window.addEventListener('scroll',updatePosition,true);
    viewport?.addEventListener('resize',updatePosition);
    viewport?.addEventListener('scroll',updatePosition);
    return()=>{
      window.removeEventListener('resize',updatePosition);
      window.removeEventListener('scroll',updatePosition,true);
      viewport?.removeEventListener('resize',updatePosition);
      viewport?.removeEventListener('scroll',updatePosition);
    };
  },[open]);

  useEffect(()=>{
    if(!open)return;
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);triggerRef.current?.focus();}};
    const outside=(event:PointerEvent)=>{const target=event.target as Node;if(!panelRef.current?.contains(target)&&!triggerRef.current?.contains(target))setOpen(false)};
    document.addEventListener('keydown',escape);
    document.addEventListener('pointerdown',outside);
    return()=>{document.removeEventListener('keydown',escape);document.removeEventListener('pointerdown',outside)};
  },[open]);

  useEffect(()=>{
    if(!open||!compact)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=previous};
  },[open,compact]);

  async function mark(id?:string){
    await fetch('/api/notifications',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(id?{id}:{})}).catch(()=>{});
    setItems(current=>current.map(item=>!id||item.id===id?{...item,read_at:item.read_at||new Date().toISOString()}:item));
    setUnread(current=>id?Math.max(0,current-1):0);
  }

  const close=()=>setOpen(false);
  const overlay=open&&mounted?createPortal(<>
    <button className="notificationBackdrop" type="button" aria-label="Close notifications" onClick={close}/>
    <div ref={panelRef} className={`memberNotificationPanel${compact?' memberNotificationPanelMobile':''}`} role="dialog" aria-modal={compact?'true':undefined} aria-label="Notifications" style={compact?undefined:{top:anchor.top,right:anchor.right,maxHeight:anchor.maxHeight}}>
      <div className="memberNotificationHead">
        <div className="memberNotificationTitle"><strong>Notifications</strong>{unread>0&&<small>{unread} unread</small>}</div>
        <div className="memberNotificationHeadActions">{unread>0&&<button type="button" onClick={()=>mark()}>Mark all read</button>}<button className="notificationClose" type="button" aria-label="Close notifications" onClick={close}>×</button></div>
      </div>
      <div className="memberNotificationList">{items.length?items.map(item=><a className={item.read_at?'':'unread'} href={item.action_url||'#'} key={item.id} onClick={()=>{if(!item.read_at)void mark(item.id);close()}}><strong>{item.title}</strong><span>{item.body}</span><small>{new Date(item.created_at).toLocaleString('en-GB')}</small></a>):<div className="memberNotificationEmpty"><strong>You’re all caught up.</strong><span>New activity will appear here.</span></div>}</div>
    </div>
  </>,document.body):null;

  return <div className="memberNotificationMenu">
    <button ref={triggerRef} className="memberNotificationTrigger" type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={`Notifications${unread?` — ${unread} unread`:''}`} onClick={()=>setOpen(current=>!current)}><BellIcon/>{unread>0&&<b>{unread>9?'9+':unread}</b>}</button>
    {overlay}
    <style jsx global>{`
      .memberNotificationMenu{position:relative;flex:none}
      .memberNotificationTrigger{list-style:none;cursor:pointer;position:relative;width:44px;height:44px;display:grid;place-items:center;border:1px solid rgba(16,19,29,.11);border-radius:11px;background:#fff;color:#10131d;box-sizing:border-box}
      .memberNotificationTrigger:hover{background:#fff8e8}
      .memberNotificationTrigger b{position:absolute;right:-5px;top:-6px;min-width:18px;height:18px;padding:0 4px;display:grid;place-items:center;border-radius:999px;background:#10131d;color:#fff;font-size:.62rem;line-height:1;box-shadow:0 0 0 2px #fff}
      .notificationBackdrop{position:fixed;inset:0;width:100vw;height:100dvh;border:0;padding:0;background:transparent;z-index:400;cursor:default}
      .memberNotificationPanel{position:fixed;width:min(390px,calc(100vw - 24px));display:flex;flex-direction:column;overflow:hidden;z-index:401;border:1px solid rgba(16,19,29,.1);border-radius:18px;background:#fff;box-shadow:0 22px 60px rgba(16,19,29,.2);box-sizing:border-box}
      .memberNotificationHead{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(16,19,29,.08);background:#fff}
      .memberNotificationTitle{display:grid;gap:2px;min-width:0}
      .memberNotificationTitle strong{font-size:.9rem;line-height:1.2}
      .memberNotificationTitle small{font-size:.65rem;color:#66707e}
      .memberNotificationHeadActions{display:flex;align-items:center;gap:5px;flex:none}
      .memberNotificationHeadActions button{min-height:44px;border:0;background:none;font:inherit;font-size:.72rem;cursor:pointer;color:#48515e}
      .memberNotificationHeadActions button:not(.notificationClose){padding:0 7px;text-decoration:underline;text-underline-offset:3px}
      .notificationClose{width:44px;min-width:44px;border-radius:10px!important;text-decoration:none!important;font-size:1.45rem!important;line-height:1!important;display:grid!important;place-items:center}
      .notificationClose:hover{background:#f2f4f6!important;color:#10131d}
      .memberNotificationList{min-height:0;flex:1;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
      .memberNotificationList>a{display:grid;gap:5px;min-width:0;min-height:74px;padding:14px 16px;border-bottom:1px solid rgba(16,19,29,.07);color:inherit;text-decoration:none;box-sizing:border-box}
      .memberNotificationList>a:last-child{border-bottom:0}
      .memberNotificationList>a:hover{background:#f7f7f5}
      .memberNotificationList>a.unread{background:#fbf6e9;box-shadow:inset 3px 0 0 #c6892a}
      .memberNotificationList>a.unread:hover{background:#f8efd9}
      .memberNotificationList>a strong,.memberNotificationList>a span,.memberNotificationList>a small{display:block;min-width:0;max-width:100%;overflow-wrap:anywhere;word-break:normal;white-space:normal}
      .memberNotificationList>a strong{font-size:.82rem;line-height:1.35;color:#10131d}
      .memberNotificationList>a span{font-size:.75rem;color:#596270;line-height:1.5}
      .memberNotificationList>a small{font-size:.65rem;color:#8a919b;line-height:1.35;margin-top:2px}
      .memberNotificationEmpty{display:grid;gap:5px;padding:28px 18px;color:#66707e;text-align:center}
      .memberNotificationEmpty strong{font-size:.86rem;color:#10131d}.memberNotificationEmpty span{font-size:.75rem}
      @media(max-width:900px){
        .notificationBackdrop{background:rgba(16,19,29,.38);backdrop-filter:blur(1px)}
        .memberNotificationPanelMobile{left:max(10px,env(safe-area-inset-left));right:max(10px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));bottom:calc(84px + env(safe-area-inset-bottom));width:auto;max-width:none;max-height:none;border-radius:20px;box-shadow:0 22px 70px rgba(16,19,29,.28)}
        .memberNotificationHead{padding:13px 14px}
        .memberNotificationTitle strong{font-size:1rem}
        .memberNotificationHeadActions{gap:1px}
        .memberNotificationList>a{min-height:82px;padding:16px 14px}
        .memberNotificationList>a strong{font-size:.92rem;line-height:1.35}
        .memberNotificationList>a span{font-size:.82rem;line-height:1.52}
        .memberNotificationList>a small{font-size:.7rem}
      }
      @media(max-width:420px){
        .memberNotificationPanelMobile{left:8px;right:8px;top:max(8px,env(safe-area-inset-top));bottom:calc(80px + env(safe-area-inset-bottom));border-radius:18px}
        .memberNotificationHead{padding:11px 12px}
        .memberNotificationHeadActions button:not(.notificationClose){font-size:.68rem;padding-inline:5px}
        .notificationClose{width:40px;min-width:40px;min-height:40px!important}
        .memberNotificationList>a{padding:14px 12px}
      }
      @media(prefers-reduced-motion:reduce){.memberNotificationPanel{scroll-behavior:auto}}
    `}</style>
  </div>;
}
