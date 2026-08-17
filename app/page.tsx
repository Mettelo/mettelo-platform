import HomeLiveContent from '@/components/HomeLiveContent';
import HomeHeroShowcase from '@/components/HomeHeroShowcase';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import './home.css';
import './home-refinement.css';
import './home-overhaul.css';
import './home-social-proof.css';
import './home-clarity.css';

const LIVE_THRESHOLD=500;
const ESTABLISHED_COMMUNITY_REACH=5689;

const steps=[
  {number:'01',title:'Discover',body:'Find a Data & AI project, opportunity or activity that matches what you want to build next.'},
  {number:'02',title:'Contribute',body:'Work with a team, take ownership of real tasks and produce useful outcomes.'},
  {number:'03',title:'Get verified',body:'Submit evidence of your contribution and move it through Mettelo’s review process.'},
  {number:'04',title:'Get discovered',body:'Use verified Proof and a stronger professional profile to make your capability easier to understand.'}
];

const dataAiAreas=[
  {title:'Data Analytics',body:'Turn data into useful analysis, reporting and decisions.'},
  {title:'Data Engineering',body:'Build reliable pipelines, models and data systems.'},
  {title:'Artificial Intelligence',body:'Work with AI systems, workflows and practical applications.'},
  {title:'Machine Learning',body:'Explore modelling, evaluation and applied ML problems.'},
  {title:'Business Intelligence',body:'Build dashboards and decision-support systems.'},
  {title:'Data & AI Product Delivery',body:'Help turn technical capability into useful products and outcomes.'}
];

const organisationRoutes=[
  {title:'Bring a project brief',body:'Turn a real business or social problem into structured Data & AI project work.'},
  {title:'Discover demonstrated talent',body:'Look beyond self-reported skills and explore evidence-backed contribution.'},
  {title:'Create opportunities',body:'Connect professionals to jobs, projects, research, events and other routes forward.'},
  {title:'Collaborate with the ecosystem',body:'Work with Mettelo on Data & AI initiatives, research, workshops and partnerships.'}
];

const signalSteps=[
  'Learning to practice',
  'Practice to contribution',
  'Contribution to evidence',
  'Evidence to opportunity'
];

async function getHeroMetrics(){
  const db=createPublicSupabaseClient();
  if(!db)return {members:null,projects:null,opportunities:null,proofs:null};
  const now=new Date().toISOString();
  const [members,projects,opportunities,proofs]=await Promise.all([
    db.from('profiles').select('id',{count:'exact',head:true}),
    db.from('projects').select('id',{count:'exact',head:true}).eq('visibility','public').in('status',['pilot','recruiting','active','review','completed']),
    db.from('opportunities').select('id',{count:'exact',head:true}).eq('status','published').eq('access_level','public').or(`closes_at.is.null,closes_at.gte.${now}`),
    db.from('contributions').select('id',{count:'exact',head:true}).eq('verification_status','verified').eq('is_public',true)
  ]);
  return {
    members:members.count??null,
    projects:projects.count??null,
    opportunities:opportunities.count??null,
    proofs:proofs.count??null
  };
}

export default async function HomePage(){
  const metrics=await getHeroMetrics();
  const useLiveCommunity=metrics.members!==null&&metrics.members>=LIVE_THRESHOLD;
  const communityValue:number=useLiveCommunity?(metrics.members??ESTABLISHED_COMMUNITY_REACH):ESTABLISHED_COMMUNITY_REACH;
  const communityLabel='professionals in the Mettelo ecosystem';
  return <>
    <section className="homeHero homeHeroDark homeHeroOverhaul homeHeroClarity" aria-labelledby="home-hero-title">
      <div className="shell homeHeroShell">
        <div className="homeHeroGrid">
          <div className="homeHeroCopy">
            <div className="eyebrow">BUILD · PROVE · GET DISCOVERED</div>
            <h1 id="home-hero-title">Build Data &amp; AI skills through <span>real work.</span></h1>
            <p className="heroLead">Join practical projects, contribute to real outcomes, and build verified Proof of what you can do.</p>
            <p className="heroSupport">Use that evidence to strengthen your profile, demonstrate your capability, and become easier to discover for opportunities.</p>
            <div className="homeHeroActions">
              <a className="button primary" href="/projects">Explore projects →</a>
              <a className="button heroGhost" href="/signin?mode=signup">Join Mettelo</a>
            </div>
            <div className="heroCommunityProof" aria-label={`${communityValue.toLocaleString('en-GB')} plus ${communityLabel}`}>
              <div className="heroCommunityAvatars" aria-hidden="true">
                {Array.from({length:5},(_,index)=><span className={`heroCommunityAvatar heroCommunityAvatar${index+1}`} key={index}><i/><b/></span>)}
              </div>
              <p><strong>{communityValue.toLocaleString('en-GB')}+</strong><span>{communityLabel}</span></p>
            </div>
            <div className="heroPositioningLine" aria-label="Mettelo positioning">
              <strong>Data &amp; AI capability, backed by evidence</strong>
              <span>Real projects · reviewed contribution · current opportunities</span>
            </div>
          </div>
          <HomeHeroShowcase metrics={{projects:metrics.projects,opportunities:metrics.opportunities,proofs:metrics.proofs}}/>
        </div>
      </div>
    </section>

    <section className="homeActionSection" aria-labelledby="home-actions-title">
      <div className="shell">
        <div className="homeActionIntro">
          <div><div className="eyebrow">WHAT YOU CAN DO</div><h2 id="home-actions-title">Turn capability into something people can see.</h2></div>
          <p>Mettelo connects real work, evidence and opportunity in one professional platform.</p>
        </div>
        <nav className="homeValueStrip" aria-label="Explore the main ways to use Mettelo">
          <div className="homeValueGrid">
            <a href="/projects"><span className="valueIcon" aria-hidden="true">01</span><p><strong>Join real Data &amp; AI projects</strong><small>Build capability through structured delivery.</small></p><b aria-hidden="true">→</b></a>
            <a href="/showcase"><span className="valueIcon" aria-hidden="true">02</span><p><strong>Build verified Proof</strong><small>Show what you actually contributed.</small></p><b aria-hidden="true">→</b></a>
            <a href="/opportunities"><span className="valueIcon" aria-hidden="true">03</span><p><strong>Find opportunities</strong><small>Use stronger evidence for your next move.</small></p><b aria-hidden="true">→</b></a>
            <a href="/organisations"><span className="valueIcon" aria-hidden="true">04</span><p><strong>Bring a real problem</strong><small>Work with Mettelo on Data &amp; AI challenges.</small></p><b aria-hidden="true">→</b></a>
          </div>
        </nav>
      </div>
    </section>

    <HomeLiveContent/>

    <section className="section homeHowSection" aria-labelledby="home-how-title">
      <div className="shell">
        <div className="homeHowHead"><div><div className="eyebrow">HOW METTELO WORKS</div><h2 id="home-how-title">From interest to evidence.</h2></div><p>You do not need another place to simply list skills. Mettelo helps you develop them through work that produces visible evidence.</p></div>
        <ol className="homeHowGrid">
          {steps.map(step=><li key={step.number}><span className="howNumber" aria-hidden="true">{step.number}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}
        </ol>
      </div>
    </section>

    <section className="section dark homeProofSection" aria-labelledby="home-proof-title">
      <div className="shell homeSplit">
        <div className="proofStory"><div className="eyebrow">METTELO PROOF</div><h2 id="home-proof-title">Show the work behind the skill.</h2><p className="lead">A CV can tell people what you know. Mettelo Proof helps show what you worked on, what you contributed, and what evidence supports it.</p><div className="proofPrinciples" aria-label="What a Mettelo Proof record can show"><span>Project context</span><span>Your contribution</span><span>Supporting evidence</span><span>Review status</span></div><p className="proofNote">Verification confirms the recorded contribution has been reviewed. It is not a claim of employment, certification or endorsement beyond the evidence shown.</p><div className="actions"><a className="button primary" href="/showcase">Explore verified Proof →</a></div></div>
        <aside className="proofPreview" aria-label="Illustrative verified Proof record"><div className="proofPreviewHeader"><div><h3>Verified contribution</h3><p>Illustrative Proof record</p></div><span className="chip green">VERIFIED</span></div><dl className="proofGrid"><div className="proofField"><dt>Project</dt><dd>Data &amp; AI delivery</dd></div><div className="proofField"><dt>Role</dt><dd>Data Analyst</dd></div><div className="proofField"><dt>Contribution</dt><dd>Analysis · dashboard · recommendations</dd></div><div className="proofField"><dt>Evidence</dt><dd>Repository · report · dashboard</dd></div><div className="proofField"><dt>Review</dt><dd>Contribution verified</dd></div></dl></aside>
      </div>
    </section>

    <section className="section homeDataAiSection" aria-labelledby="home-data-ai-title">
      <div className="shell">
        <div className="homeDataAiIntro"><div><div className="eyebrow">DATA &amp; AI</div><h2 id="home-data-ai-title">Build capability where the work is changing fastest.</h2></div><div><p>Knowing the terminology is not enough. Professionals need opportunities to practise, build, collaborate and demonstrate what they can actually do.</p><p><strong>The goal is not to collect more skill labels. It is to build evidence behind them.</strong></p></div></div>
        <div className="dataAiGrid">{dataAiAreas.map((area,index)=><article key={area.title}><span aria-hidden="true">0{index+1}</span><h3>{area.title}</h3><p>{area.body}</p></article>)}</div>
      </div>
    </section>

    <section className="section softSection homeOrganisationSection" aria-labelledby="home-organisations-title">
      <div className="shell homeOrganisationGrid">
        <div className="homeOrganisationStory"><div className="eyebrow">FOR ORGANISATIONS</div><h2 id="home-organisations-title">Bring a Data &amp; AI problem worth solving.</h2><p className="lead">Mettelo gives organisations a structured way to engage professionals around practical challenges, talent and collaboration.</p><a className="button dark" href="/organisations">Work with Mettelo →</a></div>
        <div className="organisationRoutes">{organisationRoutes.map((route,index)=><article key={route.title}><span aria-hidden="true">0{index+1}</span><div><h3>{route.title}</h3><p>{route.body}</p></div></article>)}</div>
      </div>
    </section>

    <section className="section homeWhySection" aria-labelledby="home-why-title">
      <div className="shell homeWhyGrid">
        <div><div className="eyebrow">WHY METTELO</div><h2 id="home-why-title">Real work creates stronger signals.</h2><p className="lead">Capability becomes more useful when there is evidence behind it.</p><p>Mettelo is a technology-led platform focused on helping Data &amp; AI professionals build practical capability through real work, prove contribution with evidence and connect that evidence to opportunity.</p><p>We are building this professional infrastructure with a focus on Africa and beyond — creating signals that can travel across teams, organisations and borders.</p></div>
        <ol className="signalPath" aria-label="How Mettelo connects capability to opportunity">{signalSteps.map((step,index)=><li key={step}><span aria-hidden="true">0{index+1}</span><strong>{step}</strong></li>)}</ol>
      </div>
    </section>

    <section className="section homeFinalSection" aria-labelledby="home-final-title">
      <div className="shell"><div className="ctaBand"><div><div className="cardNumber">YOUR NEXT STEP</div><h2 id="home-final-title">Build the evidence behind your skills.</h2><p>Join Mettelo, find a Data &amp; AI project and start turning real contribution into stronger professional Proof.</p></div><div className="actions"><a className="button dark" href="/projects">Explore projects →</a><a className="button ghost" href="/signin?mode=signup">Join Mettelo</a><a className="linkArrow" href="/signin">Already a member? Sign in →</a></div></div></div>
    </section>
  </>;
}
