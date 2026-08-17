'use client';

import {Children,ReactNode,useEffect,useMemo,useRef,useState} from 'react';

const PAGE_SIZE=6;
const PROJECT_PAGE_SIZE=12;

export default function PaginatedCardGrid({children,label='items',className='',showCount=true}:{children:ReactNode;label?:string;className?:string;showCount?:boolean}){
  const cards=useMemo(()=>Children.toArray(children),[children]);
  const [page,setPage]=useState(1);
  const topRef=useRef<HTMLDivElement>(null);
  const total=cards.length;
  const pageSize=className.split(/\s+/).includes('projectBriefGrid')?PROJECT_PAGE_SIZE:PAGE_SIZE;
  const totalPages=Math.max(1,Math.ceil(total/pageSize));
  const safePage=Math.min(page,totalPages);
  const start=(safePage-1)*pageSize;
  const visible=cards.slice(start,start+pageSize);

  useEffect(()=>{if(page>totalPages)setPage(totalPages)},[page,totalPages]);

  function go(next:number){
    const target=Math.max(1,Math.min(totalPages,next));
    if(target===safePage)return;
    setPage(target);
    requestAnimationFrame(()=>topRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  return <div className="metteloBrowseGridWrap" ref={topRef}>
    {showCount&&total>0&&<div className="metteloBrowseCount" aria-live="polite"><strong>{total} {label}</strong><span>Showing {start+1}–{Math.min(start+pageSize,total)} of {total}</span></div>}
    <div className={`metteloBrowseGrid ${className}`.trim()}>{visible}</div>
    {totalPages>1&&<nav className="metteloBrowsePagination" aria-label={`${label} pages`}>
      <button className="button ghost" type="button" onClick={()=>go(safePage-1)} disabled={safePage===1}>← Previous</button>
      <span>Page {safePage} of {totalPages}</span>
      <button className="button ghost" type="button" onClick={()=>go(safePage+1)} disabled={safePage===totalPages}>Next →</button>
    </nav>}
    <style jsx global>{`
      .metteloBrowseGridWrap{scroll-margin-top:96px;min-width:0}
      .metteloBrowseCount{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:0 0 14px;color:var(--slate);font-size:.78rem}
      .metteloBrowseCount strong{color:var(--ink);font-size:.82rem}
      .metteloBrowseGrid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:18px!important;align-items:stretch;min-width:0}
      .metteloBrowseGrid>*{height:100%;min-width:0;width:100%;box-sizing:border-box}
      .metteloBrowsePagination{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;margin-top:24px}
      .metteloBrowsePagination span{text-align:center;color:var(--slate);font-size:.78rem}
      .metteloBrowsePagination .button{min-height:44px}
      .metteloBrowsePagination .button:disabled{opacity:.42;cursor:not-allowed;transform:none}

      .metteloBrowseGrid.projectBriefGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important;align-items:stretch!important}
      .projectBriefGrid .projectBriefCard{display:flex!important;flex-direction:column!important;gap:20px!important;min-width:0!important;height:100%!important;overflow:hidden!important}
      .projectBriefGrid .projectBriefHeader,.projectBriefGrid .projectBriefBody,.projectBriefGrid .projectBriefBody section{min-width:0!important}
      .projectBriefGrid .projectBriefHeader h3,.projectBriefGrid .projectBriefHeader h3 a,.projectBriefGrid .projectBriefSummary,.projectBriefGrid .projectCommitment,.projectBriefGrid .projectMuted{overflow-wrap:anywhere!important;word-break:normal!important}
      .projectBriefGrid .projectBriefSummary{display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:3!important;overflow:hidden!important}
      .projectBriefGrid .projectBriefBody{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:16px 18px!important}
      .projectBriefGrid .projectBriefStatus{max-width:100%!important}
      .projectBriefGrid .projectBriefStatus span{max-width:100%!important;white-space:normal!important;overflow-wrap:anywhere!important}
      .projectBriefGrid .projectRoleList,.projectBriefGrid .projectSkillList{min-width:0!important}
      .projectBriefGrid .projectRoleList span,.projectBriefGrid .projectSkillList span{max-width:100%!important;overflow-wrap:anywhere!important}
      article.projectBriefCard>footer.projectBriefFoot{display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:16px!important;margin-top:auto!important;padding:16px 0 0!important;border-top:1px solid #ece7de!important;background:transparent!important;color:inherit!important;box-shadow:none!important}
      .projectBriefGrid .projectBriefFoot>div:first-child{min-width:0!important}
      .projectBriefGrid .projectCardActions{flex:0 0 auto!important}

      @media(min-width:481px) and (max-width:1024px){
        .metteloBrowseGrid.projectBriefGrid{grid-template-columns:1fr!important}
        .projectBriefGrid .projectBriefCard{height:auto!important}
      }

      @media(max-width:480px){
        .metteloBrowseGrid{grid-template-columns:1fr!important}
        .metteloBrowseGrid.projectBriefGrid{grid-template-columns:minmax(0,1fr)!important;gap:14px!important}
        .metteloBrowseCount{align-items:flex-start;flex-direction:column;gap:2px}
        .projectBriefGrid .projectBriefCard{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:16px!important;height:auto!important;width:100%!important;max-width:100%!important;padding:18px!important;border-radius:14px!important;overflow:hidden!important}
        .projectBriefGrid .projectBriefStatus{display:flex!important;align-items:flex-start!important;flex-wrap:wrap!important;gap:6px!important;margin-bottom:4px!important}
        .projectBriefGrid .projectBriefStatus span{width:auto!important;min-width:0!important;min-height:28px!important;padding:5px 8px!important;font-size:.59rem!important;line-height:1.35!important}
        .projectBriefGrid .projectBriefHeader h3{font-size:1.22rem!important;line-height:1.22!important}
        .projectBriefGrid .projectBriefSummary{margin-top:9px!important;font-size:.88rem!important;line-height:1.55!important;-webkit-line-clamp:3!important}
        .projectBriefGrid .projectBriefBody{grid-template-columns:minmax(0,1fr)!important;gap:14px!important}
        .projectBriefGrid .projectBriefBody section{padding:0!important}
        .projectBriefGrid .projectBriefLabel{margin-bottom:6px!important}
        .projectBriefGrid .projectRoleList,.projectBriefGrid .projectSkillList{gap:6px!important}
        .projectBriefGrid .projectRoleList span,.projectBriefGrid .projectSkillList span{min-height:30px!important;padding:5px 8px!important;font-size:.66rem!important}
        article.projectBriefCard>footer.projectBriefFoot{display:grid!important;grid-template-columns:minmax(0,1fr)!important;align-items:start!important;gap:12px!important;margin-top:0!important;padding:14px 0 0!important;background:transparent!important;color:inherit!important}
        .projectBriefGrid .projectBriefFoot span{font-size:.72rem!important;line-height:1.5!important}
        .projectBriefGrid .projectCardActions{display:grid!important;grid-template-columns:1fr!important;width:100%!important;margin:0!important;gap:8px!important}
        .projectBriefGrid .projectCardActions>*{width:100%!important;min-width:0!important}
        .projectBriefGrid .projectCardActions .button{width:100%!important;min-height:46px!important}
        .metteloBrowsePagination{grid-template-columns:1fr 1fr;gap:10px}
        .metteloBrowsePagination span{grid-column:1/-1;grid-row:1}
        .metteloBrowsePagination .button{width:100%}
      }

      @media(max-width:360px){
        .projectBriefGrid .projectBriefCard{padding:16px!important}
        .projectBriefGrid .projectBriefStatus{display:grid!important;grid-template-columns:1fr!important}
        .projectBriefGrid .projectBriefStatus span{width:100%!important}
      }
    `}</style>
  </div>;
}
