import {serviceDb} from '@/lib/project-flow';

type Props={projectId:string;maximum:number};
type Offer={id:string;status:string;user_id:string;offered_at:string;expires_at:string;accepted_at:string|null;declined_at:string|null;expired_at:string|null;capacity_reserved_at:string;capacity_released_at:string|null;capacity_consumed_at:string|null};

function dateTime(value:string|null){return value?new Date(value).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/London'}):'—'}

export default async function AdminProjectOfferSummary({projectId,maximum}:Props){
  const db=serviceDb();
  if(!db)return <section className="apoPanel"><span className="eyebrow">PROJECT OFFERS</span><h2>Offer operations unavailable</h2><p>The privileged project operations service is not configured.</p></section>;

  const [{data:offers,error},{count:members}]=await Promise.all([
    db.from('project_offers').select('id,status,user_id,offered_at,expires_at,accepted_at,declined_at,expired_at,capacity_reserved_at,capacity_released_at,capacity_consumed_at').eq('project_id',projectId).order('offered_at',{ascending:false}),
    db.from('project_members').select('id',{count:'exact',head:true}).eq('project_id',projectId).in('membership_status',['waiting','active'])
  ]);
  if(error)return <section className="apoPanel"><span className="eyebrow">PROJECT OFFERS</span><h2>Offer state unavailable</h2><p>Refresh after the Phase 8 migration is available in this environment.</p></section>;

  const rows=(offers||[]) as Offer[];
  const userIds=[...new Set(rows.map(item=>item.user_id))];
  const {data:profiles}=userIds.length?await db.from('profiles').select('id,full_name,username,member_id').in('id',userIds):{data:[]};
  const profileMap=new Map((profiles||[]).map(profile=>[profile.id,profile]));
  const pending=rows.filter(item=>item.status==='pending').length;
  const accepted=rows.filter(item=>item.status==='accepted').length;
  const declined=rows.filter(item=>item.status==='declined').length;
  const expired=rows.filter(item=>item.status==='expired').length;
  const reserved=rows.filter(item=>['pending','accepted'].includes(item.status)&&!item.capacity_released_at&&!item.capacity_consumed_at).length;
  const consumed=rows.filter(item=>Boolean(item.capacity_consumed_at)).length;
  const confirmed=members||0;
  const available=Math.max(0,maximum-confirmed-reserved);

  return <section className="apoPanel" aria-labelledby="admin-project-offers-title">
    <div className="apoHead"><div><span className="eyebrow">PROJECT OFFERS</span><h2 id="admin-project-offers-title">Offer & reservation state</h2><p>Pending and accepted Offers reserve project capacity until decline, expiry or canonical team membership consumes the accepted place.</p></div><a href={`/admin/project-operations/applications?project=${projectId}`}>Review applications →</a></div>
    <div className="apoMetrics" aria-label="Project offer capacity summary"><div><strong>{confirmed}</strong><span>Confirmed membership</span></div><div><strong>{reserved}</strong><span>Reserved offers</span></div><div><strong>{available}</strong><span>Available places</span></div><div><strong>{maximum}</strong><span>Maximum capacity</span></div></div>
    <div className="apoLifecycle"><span>{pending} pending</span><span>{accepted} accepted</span><span>{declined} declined</span><span>{expired} expired</span><span>{consumed} consumed into membership</span></div>
    {rows.length?<div className="apoTableWrap"><table className="apoTable"><thead><tr><th>Member</th><th>Status</th><th>Offered</th><th>Expires / resolved</th><th>Capacity</th></tr></thead><tbody>{rows.slice(0,12).map(offer=>{const profile=profileMap.get(offer.user_id);const resolved=offer.accepted_at||offer.declined_at||offer.expired_at;const capacity=offer.capacity_consumed_at?'Consumed by membership':offer.capacity_released_at?'Released':'Reserved';return <tr key={offer.id}><td><strong>{profile?.full_name||'Mettelo member'}</strong>{profile?.username&&<small>@{profile.username}</small>}{profile?.member_id&&<small>{profile.member_id}</small>}</td><td><span className={`apoStatus apo-${offer.status}`}>{offer.status}</span></td><td>{dateTime(offer.offered_at)}</td><td>{resolved?dateTime(resolved):dateTime(offer.expires_at)}</td><td>{capacity}</td></tr>})}</tbody></table></div>:<p className="apoEmpty">No project place has been offered yet.</p>}
    <style>{`.apoPanel{padding:18px;border:1px solid #d9dde2;border-radius:14px;background:#fff;min-width:0}.apoPanel h2{margin:5px 0 8px;font-size:1.08rem}.apoPanel p{margin:0;color:#5b6470;font-size:.74rem;line-height:1.55}.apoHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.apoHead>a{font-size:.72rem;font-weight:800;color:#72501b;white-space:nowrap}.apoMetrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:14px}.apoMetrics>div{padding:11px;border:1px solid #e3e6e9;border-radius:10px;background:#fbfaf7}.apoMetrics strong{display:block;font-size:1.1rem}.apoMetrics span{display:block;margin-top:3px;color:#5b6470;font-size:.66rem}.apoLifecycle{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.apoLifecycle span,.apoStatus{display:inline-flex;padding:4px 7px;border-radius:999px;background:#f0f2f4;color:#48515e;font-size:.64rem;font-weight:800;text-transform:capitalize}.apo-pending{background:#eef3fb;color:#2356a8}.apo-accepted{background:#edf7f1;color:#157347}.apoTableWrap{margin-top:14px;overflow-x:auto}.apoTable{width:100%;border-collapse:collapse;min-width:680px;font-size:.69rem}.apoTable th,.apoTable td{padding:9px 8px;border-top:1px solid #e6e8eb;text-align:left;vertical-align:top}.apoTable th{color:#5b6470;font-size:.62rem;text-transform:uppercase;letter-spacing:.04em}.apoTable td strong,.apoTable td small{display:block}.apoTable td small{margin-top:2px;color:#69727d}.apoEmpty{margin-top:14px!important}@media(max-width:700px){.apoHead{display:grid}.apoHead>a{white-space:normal}.apoMetrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:380px){.apoMetrics{grid-template-columns:1fr}}`}</style>
  </section>;
}
