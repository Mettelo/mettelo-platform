import HomeLiveContent from '@/components/HomeLiveContent';
import './home.css';

const steps=[
  {number:'01',title:'Discover',body:'Find projects, opportunities and events that match your skills, interests and next move.'},
  {number:'02',title:'Contribute',body:'Join structured work, collaborate with a team and make meaningful contributions with clear ownership.'},
  {number:'03',title:'Get verified',body:'Connect reviewed evidence to what you delivered and turn contribution into verified Mettelo Proof.'},
  {number:'04',title:'Get opportunities',body:'Use stronger professional signals to get discovered by organisations, collaborators and employers.'}
];

const impactPillars=[
  {title:'Real work',body:'Structured problems, accountable roles and delivery teams.'},
  {title:'Verified evidence',body:'Contribution connected to review, evidence and Proof.'},
  {title:'Professional systems',body:'Project, reputation and opportunity workflows in one platform.'},
  {title:'Cross-border scope',body:'Infrastructure designed for Africa and useful beyond it.'}
];

export default function HomePage(){
  return <>
    <section className="homeHero homeHeroDark" aria-labelledby="home-hero-title">
      <div className="shell homeHeroShell">
        <div className="homeHeroGrid">
          <div className="homeHeroCopy">
            <div className="eyebrow">Professional capability infrastructure</div>
            <h1 id="home-hero-title">Build real capability.<br/>Prove it with evidence.<br/><span>Get discovered.</span></h1>
            <p className="heroLead">Mettelo is a technology-led platform where professionals join structured real-world projects, deliver with teams and turn meaningful contribution into verified Proof that can travel with them into opportunity across Africa and beyond.</p>
            <div className="homeHeroActions">
              <a className="button primary" href="/projects">Explore projects →</a>
              <a className="button heroGhost" href="/auth/signup">Create your profile</a>
            </div>
            <div className="homeAssurance" aria-label="What Mettelo provides">
              <span>Structured delivery</span><span>Verified Proof</span><span>Professional discovery</span><span>Africa and beyond</span>
            </div>
          </div>

          <aside className="productShowcase" aria-label="Illustrative preview of the Mettelo project workspace and Proof system">
            <div className="showcaseWindow">
              <div className="showcaseHeader"><span className="showcaseDot"/><strong>Mettelo Project Workspace</strong><small>PLATFORM PREVIEW</small></div>
              <div className="showcaseBody">
                <div className="showcaseProof">
                  <span className="verifiedMark" aria-hidden="true">✓</span>
                  <div><small>VERIFIED PROOF</small><strong>Contribution reviewed</strong><span>Evidence connected to delivery</span></div>
                </div>
                <div className="showcaseProject">
                  <span className="chip">ACTIVE PROJECT</span>
                  <h3>Structured real-world delivery</h3>
                  <p>Brief, roles, tasks, data, events and evidence in one governed workspace.</p>
                  <div className="showcaseMeta"><span><small>Your role</small><strong>Data Analyst</strong></span><span><small>Team</small><strong>6 contributors</strong></span></div>
                  <div className="showcaseProgress" aria-hidden="true"><i/></div>
                  <div className="showcaseProjectFoot"><span>Next action</span><strong>Submit evidence →</strong></div>
                </div>
                <div className="showcaseSignals"><div><small>DELIVERY</small><strong>Milestones</strong></div><div><small>EVIDENCE</small><strong>Reviewed</strong></div><div><small>OUTCOME</small><strong>Verified Proof</strong></div></div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <nav className="homeValueStrip" aria-label="Explore the main ways to use Mettelo">
      <div className="shell homeValueGrid">
        <a href="/projects"><span className="valueIcon" aria-hidden="true">01</span><p><strong>Join real projects</strong><small>Build capability through structured delivery.</small></p></a>
        <a href="/showcase"><span className="valueIcon" aria-hidden="true">02</span><p><strong>Earn verified Proof</strong><small>Connect contribution to reviewed evidence.</small></p></a>
        <a href="/opportunities"><span className="valueIcon" aria-hidden="true">03</span><p><strong>Get discovered</strong><small>Use stronger professional signals.</small></p></a>
        <a href="/organisations"><span className="valueIcon" aria-hidden="true">04</span><p><strong>For organisations</strong><small>Bring problems, talent needs and partnerships.</small></p></a>
      </div>
    </nav>

    <section className="section homeHowSection" aria-labelledby="home-how-title">
      <div className="shell">
        <div className="homeHowHead"><div><div className="eyebrow">How Mettelo works</div><h2 id="home-how-title">From discovery to credible professional signal.</h2></div><p>One connected journey turns real contribution into evidence that is easier to trust, understand and use.</p></div>
        <ol className="homeHowGrid">
          {steps.map(step=><li key={step.number}><span className="howNumber" aria-hidden="true">{step.number}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}
        </ol>
      </div>
    </section>

    <section className="section dark homeProofSection" aria-labelledby="home-proof-title">
      <div className="shell homeSplit">
        <div className="proofStory"><div className="eyebrow">Built for trusted evidence</div><h2 id="home-proof-title">Your work should carry more weight than a claim on a CV.</h2><p className="lead">Mettelo Proof ties professional evidence to the project, contribution, review and verification state behind it. The result is a stronger signal for collaborators, employers and partners.</p><div className="proofPrinciples" aria-label="What makes Mettelo Proof useful"><span>Context attached</span><span>Contribution reviewed</span><span>Evidence traceable</span></div><div className="actions"><a className="button primary" href="/showcase">See verified work →</a></div></div>
        <aside className="proofPreview" aria-label="Illustrative verified Proof record"><div className="proofPreviewHeader"><div><h3>Verified contribution</h3><p>Illustrative Proof record</p></div><span className="chip green">VERIFIED</span></div><dl className="proofGrid"><div className="proofField"><dt>Project</dt><dd>Data & AI delivery</dd></div><div className="proofField"><dt>Role</dt><dd>Data Analyst</dd></div><div className="proofField"><dt>Evidence</dt><dd>Repository · report · dashboard</dd></div><div className="proofField"><dt>Review</dt><dd>Contribution verified</dd></div></dl></aside>
      </div>
    </section>

    <HomeLiveContent/>

    <section className="section softSection homeImpactSection" aria-labelledby="home-impact-title">
      <div className="shell">
        <div className="homeImpactIntro"><div><div className="eyebrow">Africa and beyond</div><h2 id="home-impact-title">Professional infrastructure with global usefulness and African ambition.</h2></div><p>Mettelo is building for professionals who should be able to develop capability through real work, prove it with credible evidence and become easier to discover across borders.</p></div>
        <div className="impactPillars">{impactPillars.map((pillar,index)=><article key={pillar.title}><span aria-hidden="true">0{index+1}</span><h3>{pillar.title}</h3><p>{pillar.body}</p></article>)}</div>
      </div>
    </section>

    <section className="section homeFinalSection" aria-labelledby="home-final-title">
      <div className="shell"><div className="ctaBand"><div><div className="cardNumber">START HERE</div><h2 id="home-final-title">Build something real behind your next opportunity.</h2><p>Create your account, complete your profile and find the project or opportunity that fits your next move.</p></div><div className="actions"><a className="button dark" href="/auth/signup">Join Mettelo →</a><a className="button ghost" href="/faq">Read the FAQ</a></div></div></div>
    </section>
  </>;
}
