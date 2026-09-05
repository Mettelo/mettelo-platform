export default function ProjectsLoading(){
  return <main aria-busy="true" aria-live="polite">
    <section className="section softSection">
      <div className="shell" style={{maxWidth:1180}}>
        <div className="eyebrow">Discover projects</div>
        <h1 style={{marginBottom:12}}>Loading public projects…</h1>
        <p className="lead">Preparing the latest project opportunities, filters and availability.</p>
        <div className="projectGrid projectBriefGrid" aria-hidden="true" style={{marginTop:28}}>
          {[0,1,2].map(index=><div className="panel" key={index} style={{minHeight:280,opacity:.65}}/>) }
        </div>
      </div>
    </section>
  </main>;
}
