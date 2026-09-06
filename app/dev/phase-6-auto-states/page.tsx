import MemberPhase6AdmissionSummary from '@/components/MemberPhase6AdmissionSummary';
import MemberProjectApplicationFlow from '@/components/MemberProjectApplicationFlow';

export default function Phase6AutoStatesPreview(){
 const now=Date.now();
 const items=[
  {id:'auto-confirmed',status:'approved',admission_decision:'auto_qualified',participation_preference:'solo',projects:{title:'Solo project ready for preparation',status:'open'},formation:null},
  {id:'auto-forming',status:'waiting_for_team',admission_decision:'auto_qualified',participation_preference:'team',projects:{title:'Team project forming',status:'open'},formation:{filled:1,threshold:2,status:'forming',scheduled_start_at:null,run_number:1}},
  {id:'auto-scheduled',status:'approved',admission_decision:'auto_qualified',participation_preference:'either',projects:{title:'Flexible project start scheduled',status:'open'},formation:{filled:2,threshold:2,status:'forming',scheduled_start_at:new Date(now+2*60*60*1000).toISOString(),run_number:2}},
  {id:'auto-active',status:'team_complete',admission_decision:'auto_qualified',participation_preference:'either',projects:{title:'Active project with open places',status:'active'},formation:{filled:2,threshold:5,status:'active',scheduled_start_at:null,run_number:3}}
 ];
 return <main id="main-content" style={{width:'min(1180px,100%)',margin:'0 auto',padding:'24px 16px',boxSizing:'border-box'}}><div className="eyebrow">PHASE 6 RESPONSIVE ACCEPTANCE</div><h1 style={{fontSize:'clamp(2rem,6vw,4rem)',overflowWrap:'anywhere'}}>Automatic entry, forming and start states</h1><MemberPhase6AdmissionSummary items={items}/><section aria-labelledby="phase6-form-preview"><h2 id="phase6-form-preview">Flexible project interest form</h2><MemberProjectApplicationFlow project={{id:'phase6-flexible-preview',title:'Flexible data project',commitment:'4–6 hours/week',participationMode:'flexible'}} initialAvailability="4–6 hours/week" initialPortfolioUrl="https://example.com/proof"/></section></main>
}
