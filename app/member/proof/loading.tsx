export default function ProofLoading(){
  return <div className="proofLoading" aria-busy="true" aria-live="polite">
    <span className="srOnly">Loading your verified Proof</span>
    <div className="proofLoadingHero"><div className="proofLoadingLine proofLoadingEyebrow"/><div className="proofLoadingLine proofLoadingTitle"/><div className="proofLoadingLine proofLoadingCopy"/></div>
    <div className="proofLoadingSummary">{[0,1,2].map(item=><div className="proofLoadingCard" key={item}/>)}</div>
    <div className="proofLoadingFilter"/>
    <div className="proofLoadingGrid">{[0,1,2,3].map(item=><div className="proofLoadingProof" key={item}/>)}</div>
    <style>{`
      .proofLoading{width:min(100%,1180px);margin:0 auto;min-width:0}.srOnly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.proofLoadingHero{padding:10px 0 25px;border-bottom:1px solid #d8dde3}.proofLoadingLine,.proofLoadingCard,.proofLoadingFilter,.proofLoadingProof{background:#e5e8e7;border-radius:10px}.proofLoadingEyebrow{width:170px;height:10px}.proofLoadingTitle{width:min(280px,65%);height:56px;margin-top:12px}.proofLoadingCopy{width:min(720px,90%);height:38px;margin-top:12px}.proofLoadingSummary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:20px 0 16px}.proofLoadingCard{height:105px}.proofLoadingFilter{height:70px;margin-bottom:32px}.proofLoadingGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.proofLoadingProof{height:300px}@media(max-width:1024px){.proofLoadingSummary{grid-template-columns:repeat(2,minmax(0,1fr))}.proofLoadingGrid{grid-template-columns:1fr}}@media(max-width:480px){.proofLoadingTitle{height:42px}.proofLoadingSummary{gap:8px}.proofLoadingCard{height:94px}.proofLoadingFilter{height:108px}.proofLoadingProof{height:250px}}
    `}</style>
  </div>;
}
