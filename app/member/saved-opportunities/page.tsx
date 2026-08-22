import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@supabase/supabase-js';
import SaveOpportunityButton from '@/components/SaveOpportunityButton';
import SavedOpportunityReminderToggle from '@/components/SavedOpportunityReminderToggle';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import '../../opportunities/opportunities.css';

export const dynamic='force-dynamic';

type Opportunity={id:string;title:string;organisation:string|null;summary:string|null;location:string|null;opportunity_type:string;work_arrangement:string|null;applicant_scope:string;sponsorship_status:string;closes_at:string|null;status:string;access_level:string;data_ai_relevance_status:string;official_application_url:string|null;source_url:string|null};
type SavedRecord={opportunity_id:string;saved_at:string;reminders_enabled:boolean};
type SavedRow=SavedRecord&{opportunities:Opportunity|null};

const scopeLabels:Record<string,string>={worldwide:'Worldwide applicants',international_accepted:'International applicants',country_restricted:'Country restricted',remote_worldwide:'Remote worldwide',unknown:'Eligibility unknown'};
const sponsorshipLabels:Record<string,string>={confirmed:'Sponsorship confirmed',licensed_sponsor:'Licensed sponsor employer',not_offered:'No sponsorship',not_stated:'Sponsorship not stated',unclear:'Sponsorship unclear',unknown:'Sponsorship unknown'};

function cleanText(value:string|null){return(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()}
function formatDate(value:string){return new Date(value).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
function arrangement(value:string|null){if(!value||value==='unknown')return null;return value==='onsite'?'On-site':value.charAt(0).toUpperCase()+value.slice(1)}
function deadlineLabel(value:string|null,now:number){if(!value)return'No closing date published';const date=new Date(value);if(Number.isNaN(date.getTime()))return'Closing date unavailable';const days=Math.ceil((date.getTime()-now)/86400000);if(days<0)return`Closed ${formatDate(value)}`;if(days===0)return'Closes today';if(days===1)return'Closes tomorrow';if(days<=14)return`Closes in ${days} days`;return`Closes ${formatDate(value)}`}
function savedOpportunityReader(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!serviceKey)return null;return createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})}

export default async function SavedOpportunitiesPage(){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/signin?next=%2Fmember%2Fsaved-opportunities');

  // The authenticated user is established above. A server-only service reader is deliberately
  // scoped back to that exact user ID so saved listings can still be rendered after a source
  // listing becomes closed/changed and is no longer visible through the public opportunity RLS.
  const reader=savedOpportunityReader()||supabase;
  const savedResult=await reader.from('saved_opportunities').select('opportunity_id,saved_at,reminders_enabled').eq('user_id',user.id).order('saved_at',{ascending:false});
  const saved=(savedResult.data||[])as SavedRecord[];
  const opportunityIds=saved.map(row=>row.opportunity_id);
  const opportunityResult=opportunityIds.length?await reader.from('opportunities').select('id,title,organisation,summary,location,opportunity_type,work_arrangement,applicant_scope,sponsorship_status,closes_at,status,access_level,data_ai_relevance_status,official_application_url,source_url').in('id',opportunityIds):{data:[] as Opportunity[],error:null};
  const error=savedResult.error||opportunityResult.error;
  const opportunities=new Map(((opportunityResult.data||[])as Opportunity[]).map(item=>[item.id,item]));
  const rows:SavedRow[]=saved.map(row=>({...row,opportunities:opportunities.get(row.opportunity_id)||null})).filter(row=>row.opportunities);
  const now=Date.now();
  const isClosed=(item:Opportunity)=>item.status!=='published'||item.access_level!=='public'||item.data_ai_relevance_status!=='high'||Boolean(item.closes_at&&new Date(item.closes_at).getTime()<=now);
  const openCount=rows.filter(row=>!isClosed(row.opportunities!)).length;
  const changedCount=rows.length-openCount;
  const reminderCount=rows.filter(row=>row.reminders_enabled&&!isClosed(row.opportunities!)).length;

  return <div className="soPage">
    <header className="soHero">
      <div className="soEyebrow">EXPLORE · SAVED OPPORTUNITIES</div>
      <div className="soHeroRow"><div><h1>Saved opportunities</h1><p>Keep promising roles in one place, compare what matters, and decide what deserves your attention next.</p></div><Link className="soButton soPrimary" href="/opportunities">Browse opportunities</Link></div>
      {!error&&rows.length>0&&<div className="soMetrics" aria-label="Saved opportunity summary"><div><strong>{rows.length}</strong><span>Saved role{rows.length===1?'':'s'}</span></div><div><strong>{openCount}</strong><span>Still open</span></div><div><strong>{reminderCount}</strong><span>Reminder{reminderCount===1?'':'s'} on</span></div><div><strong>{changedCount}</strong><span>Closed or changed</span></div></div>}
    </header>

    {error?<section className="soState" role="alert"><span className="soStateIcon" aria-hidden="true">!</span><div><h2>Saved opportunities are temporarily unavailable</h2><p>Your saved roles have not been changed. Refresh the page and try again.</p></div></section>:rows.length?<section className="soList" aria-label="Saved opportunities">{rows.map(row=>{
      const item=row.opportunities!;const closed=isClosed(item);const text=cleanText(item.summary);const workArrangement=arrangement(item.work_arrangement);const applicationChannel=item.official_application_url||item.source_url?'Employer website':'Application unavailable';const positive=['confirmed','licensed_sponsor'].includes(item.sponsorship_status);
      const deadlinePassed=Boolean(item.closes_at&&new Date(item.closes_at).getTime()<=now);
      const reason=deadlinePassed?'The published closing date has passed.':item.status!=='published'?'The source listing is no longer published on Mettelo.':item.access_level!=='public'?'This listing is no longer public.':item.data_ai_relevance_status!=='high'?'This listing no longer meets Mettelo discovery criteria.':null;
      return <article className={`soCard${closed?' soCardClosed':''}`} key={item.id}>
        <div className="soMain">
          <div className="soTopline"><span className="soType">{item.opportunity_type.toUpperCase()}</span><span className={`soStatus${closed?' soStatusChanged':''}`}>{closed?'Closed / changed':'Open'}</span>{workArrangement&&<span className="soTag">{workArrangement}</span>}</div>
          <div className="soIdentity"><h2><Link href={`/opportunities/${item.id}`}>{item.title}</Link></h2><p><strong>{item.organisation||'Organisation'}</strong>{item.location&&<> <span aria-hidden="true">·</span> {item.location}</>}</p></div>
          <div className="soSignals" aria-label="Opportunity eligibility signals"><span>{scopeLabels[item.applicant_scope]||item.applicant_scope}</span><span className={positive?'positive':''}>{sponsorshipLabels[item.sponsorship_status]||item.sponsorship_status}</span><span>Apply: {applicationChannel}</span></div>
          {text&&<p className="soDescription">{text.length>220?`${text.slice(0,220).trim()}…`:text}</p>}
          {reason&&<div className="soChange" role="status"><strong>Status update:</strong><span>{reason}</span></div>}
        </div>
        <aside className="soDecision" aria-label={`Saved controls for ${item.title}`}><div className="soTiming"><span>{closed?'Listing status':'Deadline'}</span><strong>{deadlineLabel(item.closes_at,now)}</strong><small>Saved {formatDate(row.saved_at)}</small></div>{!closed&&<SavedOpportunityReminderToggle opportunityId={item.id} initialEnabled={row.reminders_enabled}/>}<div className="soActions"><Link className="soButton soPrimary" href={`/opportunities/${item.id}`}>{closed?'Review listing':'View role'} <span aria-hidden="true">→</span></Link><SaveOpportunityButton opportunityId={item.id} compact/></div></aside>
      </article>
    })}</section>:<section className="soState soEmpty"><span className="soStateIcon" aria-hidden="true">☆</span><div><div className="soEyebrow">YOUR SHORTLIST STARTS HERE</div><h2>No saved opportunities yet</h2><p>Save roles from Opportunities to build a shortlist you can return to, compare, and act on later.</p><Link className="soButton soPrimary" href="/opportunities">Browse opportunities</Link></div></section>}

    <section className="soBridge"><div><div className="soEyebrow">SAVED PROJECTS</div><h2>Looking for member projects?</h2><p>Project participation and employment opportunities stay separate so each journey remains clear.</p></div><Link className="soButton" href="/member/saved">View saved projects</Link></section>

    <style>{`
      .soPage{width:min(100%,1180px);margin:0 auto;min-width:0;color:#111318}.soEyebrow{font-family:var(--font-plex-mono),ui-monospace,monospace;font-size:10px;font-weight:750;letter-spacing:.11em;text-transform:uppercase;color:#72551e}.soHero{padding:8px 0 24px;border-bottom:1px solid #d8dde3}.soHeroRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:28px;align-items:end;margin-top:7px}.soHero h1{margin:0 0 8px;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:clamp(42px,5vw,60px);line-height:1;letter-spacing:-.05em}.soHero p{max-width:720px;margin:0;color:#59636f;font-size:14px;line-height:1.65}.soMetrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin-top:22px;border:1px solid #d8dde3;border-radius:14px;background:#fff;overflow:hidden}.soMetrics>div{display:grid;gap:3px;padding:13px 16px;border-right:1px solid #e2e6e9}.soMetrics>div:last-child{border-right:0}.soMetrics strong{font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:22px;line-height:1}.soMetrics span{font-size:11px;color:#68727d}.soList{display:grid;gap:14px;margin-top:20px}.soCard{display:grid;grid-template-columns:minmax(0,1fr) 280px;min-width:0;overflow:hidden;border:1px solid #d8dde3;border-radius:17px;background:#fff;box-shadow:0 8px 24px rgba(17,19,24,.035)}.soCardClosed{background:#fbfbfa}.soMain{display:grid;align-content:start;gap:14px;min-width:0;padding:19px 20px}.soTopline,.soSignals{display:flex;flex-wrap:wrap;gap:7px;align-items:center}.soType,.soStatus,.soTag,.soSignals span{display:inline-flex;align-items:center;min-height:27px;padding:4px 9px;border-radius:999px;font-size:10px;font-weight:800;line-height:1.2}.soType{background:#f4ead7;color:#62450d}.soStatus{background:#eaf6ee;color:#205b3f}.soStatusChanged{background:#f1ece6;color:#654c37}.soTag{background:#eef1f4;color:#59636f}.soIdentity{display:grid;gap:5px}.soIdentity h2{margin:0;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:22px;line-height:1.18;letter-spacing:-.025em;overflow-wrap:anywhere}.soIdentity h2 a{color:inherit;text-decoration:none}.soIdentity h2 a:hover{text-decoration:underline;text-underline-offset:4px}.soIdentity p{margin:0;color:#68727d;font-size:12px}.soIdentity p strong{color:#303845}.soSignals span{border:1px solid #e2e6e9;background:#f4f5f6;color:#59636f}.soSignals .positive{border-color:#d6eadf;background:#edf7f1;color:#1e6243}.soDescription{max-width:760px;margin:0;color:#4f5965;font-size:13px;line-height:1.6}.soChange{display:grid;gap:3px;padding:11px 12px;border-left:3px solid #9d7340;border-radius:0 9px 9px 0;background:#f8f4ed}.soChange strong,.soChange span{font-size:11px}.soChange span{color:#66594b;line-height:1.45}.soDecision{display:grid;align-content:start;gap:13px;padding:18px;border-left:1px solid #e2e6e9;background:#f7f7f5}.soTiming{display:grid;gap:4px}.soTiming>span{font-family:var(--font-plex-mono),ui-monospace,monospace;font-size:9px;font-weight:750;letter-spacing:.1em;text-transform:uppercase;color:#737e89}.soTiming strong{font-size:14px}.soTiming small{font-size:10px;color:#68727d}.soActions{display:grid;gap:8px}.soButton{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:max-content;max-width:100%;min-height:44px;padding:0 15px;border:1px solid #b8c0c9;border-radius:10px;background:#fff;color:#111318;text-decoration:none;font-size:12px;font-weight:850}.soPrimary{border-color:#111318;background:#111318;color:#fff}.soActions .soButton,.soActions .saveOpportunity,.soActions .saveOpportunity .button{width:100%}.soActions .saveOpportunity .button{min-height:44px;border-radius:10px}.soButton:focus-visible,.soIdentity a:focus-visible{outline:3px solid #173f8f;outline-offset:3px}.soState{display:grid;grid-template-columns:46px minmax(0,1fr);gap:15px;align-items:start;margin-top:20px;padding:22px;border:1px solid #d8dde3;border-radius:16px;background:#fff}.soStateIcon{display:grid;place-items:center;width:46px;height:46px;border-radius:13px;background:#f4ead7;font-size:19px;font-weight:850}.soState h2{margin:2px 0 7px;font-size:22px}.soState p{max-width:650px;margin:0;color:#59636f;line-height:1.6}.soEmpty .soButton{margin-top:15px}.soBridge{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:center;margin-top:28px;padding:18px 20px;border:1px solid #d8c9ab;border-radius:16px;background:#eee7da}.soBridge h2{margin:4px 0 5px;font-size:20px}.soBridge p{margin:0;color:#5f5a50;font-size:12px;line-height:1.5}
      @media(max-width:1024px){.soHeroRow{grid-template-columns:1fr}.soHeroRow>.soButton{justify-self:start}.soCard{grid-template-columns:1fr}.soDecision{grid-template-columns:minmax(0,1fr) minmax(250px,1fr);border-left:0;border-top:1px solid #e2e6e9;align-items:start}.soTiming,.soDecision>.savedReminder{grid-column:1}.soActions{grid-column:2;grid-row:1/span 2}.soBridge{grid-template-columns:1fr}.soBridge>.soButton{justify-self:start}}
      @media(max-width:700px){.soMetrics{grid-template-columns:repeat(2,minmax(0,1fr))}.soMetrics>div:nth-child(2){border-right:0}.soMetrics>div:nth-child(-n+2){border-bottom:1px solid #e2e6e9}.soDecision{grid-template-columns:1fr}.soTiming,.soDecision>.savedReminder,.soActions{grid-column:1;grid-row:auto}.soHero h1{font-size:40px}}
      @media(max-width:480px){.soHero{padding-top:4px}.soHero h1{font-size:36px}.soHeroRow>.soButton,.soBridge>.soButton,.soState .soButton{width:100%}.soMetrics>div{padding:12px}.soMain,.soDecision{padding:15px}.soIdentity h2{font-size:20px}.soSignals{display:grid;grid-template-columns:1fr}.soSignals span{width:100%;justify-content:flex-start}.soState{grid-template-columns:1fr;padding:17px}.soBridge{padding:16px}.soButton{min-height:46px;font-size:13px}}
    `}</style>
  </div>
}
