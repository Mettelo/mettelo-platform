import HomeLiveContent from '@/components/HomeLiveContent';
import HomeHeroShowcase from '@/components/HomeHeroShowcase';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import {getPublicWebsitePage} from '@/lib/website-pages';
import './home.css';
import './home-refinement.css';
import './home-overhaul.css';
import './home-social-proof.css';
import './home-clarity.css';
import './home-live-v4.css';
import './home-director-v2.css';
import './home-director-v3.css';

const LIVE_THRESHOLD=500;
const ESTABLISHED_COMMUNITY_REACH=5689;

const journeySteps=[
  {number:'01',title:'Find work worth contributing to',body:'Find a project where your skills and perspective can genuinely help move the work forward.'},
  {number:'02',title:'Take responsibility for real work',body:'Work with others, own meaningful tasks, communicate clearly and lead where the work needs it.'},
  {number:'03',title:'Show the evidence behind your contribution',body:'Connect the artefacts, decisions and outcomes that make your contribution understandable.'},
  {number:'04',title:'Build Proof of demonstrated capability',body:'Turn reviewed contribution into a professional record grounded in what you actually did.'}
];

const professionalRoutes=[
  'Join practical project work',
  'Take ownership and collaborate with real teams',
  'Build evidence of technical and professional capability',
  'Strengthen your Mettelo Proof'
];

const organisationRoutes=[
  'Bring meaningful business or social problems',
  'See contribution in the context of the work',
  'Understand how people think, collaborate and make decisions',
  'Review evidence of demonstrated capability'
];

const ecosystem=[
  {number:'01',name:'Mettelo Community',verb:'Connect.',body:'Meet people, exchange practical knowledge and discover where you can contribute.',size:'standard'},
  {number:'02',name:'Mettelo Labs',verb:'Build.',body:'Work on practical technology projects, collaborate with others and help create useful outcomes.',size:'primary',dark:true},
  {number:'03',name:'Mettelo Proof',verb:'Show what you did.',body:'Turn contribution and evidence into credible Proof of demonstrated capability.',size:'primary',dark:true},
  {number:'04',name:'Mettelo Talent',verb:'Progress.',body:'Discover roles, projects and opportunities where demonstrated experience can carry more weight.',size:'standard'},
  {number:'05',name:'Mettelo Research',verb:'Understand.',body:'Explore research, surveys and practical insight into how technology, Data and AI work is changing.',size:'standard'},
  {number:'06',name:'Mettelo AI',verb:'Work smarter.',body:'Use intelligent tools designed around professional work, evidence, capability and opportunity.',size:'standard'},
  {number:'07',name:'Mettelo Summit',verb:'Come together.',body:'Join events and showcases that bring professionals, organisations, projects and ideas into the same room.',size:'standard'},
  {number:'METTELO',name:'One connected journey',verb:'Connect. Build. Prove. Progress.',body:'Each part strengthens the same journey: connect, contribute, build evidence and progress.',size:'anchor',dark:true}
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
  const [metrics,pageContent]=await Promise.all([getHeroMetrics(),getPublicWebsitePage('home')]);
  const copy=pageContent.values;
  const useLiveCommunity=metrics.members!==null&&metrics.members>=LIVE_THRESHOLD;
  const communityValue:number=useLiveCommunity?(metrics.members??ESTABLISHED_COMMUNITY_REACH):ESTABLISHED_COMMUNITY_REACH;
  const communityLabel='professionals in the Mettelo ecosystem';
  return <>
    <section className="homeHero homeHeroDark homeHeroOverhaul homeHeroClarity" aria-labelledby="home-hero-title">
      <div className="shell homeHeroShell">
        <div className="homeHeroGrid">
          <div className="homeHeroCopy">
            <div className="eyebrow">{copy.hero_eyebrow}</div>
            <h1 id="home-hero-title">{copy.hero_title} <span>{copy.hero_accent}</span></h1>
            <p className="heroLead">{copy.hero_lead}</p>
            <p className="heroSupport">{copy.hero_support}</p>
            <div className="homeHeroActions">
              <a className="button primary" href={copy.hero_primary_href}>{copy.hero_primary_label}</a>
              <a className="button heroGhost" href={copy.hero_secondary_href}>{copy.hero_secondary_label}</a>
            </div>
            <div className="heroCommunityProof" aria-label={`${communityValue.toLocaleString('en-GB')} plus ${communityLabel}`}>
              <div className="heroCommunityAvatars" aria-hidden="true">
                {Array.from({length:5},(_,index)=><span className={`heroCommunityAvatar heroCommunityAvatar${index+1}`} key={index}><i/><b/></span>)}
              </div>
              <p><strong>{communityValue.toLocaleString('en-GB')}+</strong><span>{communityLabel}</span></p>
            </div>
            <div className="heroPositioningLine" aria-label="Mettelo positioning">
              <strong>IT, Data &amp; AI experience, backed by real work</strong>
              <span>Visible contribution · supporting evidence · reviewed Proof</span>
            </div>
          </div>
          <HomeHeroShowcase metrics={{projects:metrics.projects,opportunities:metrics.opportunities,proofs:metrics.proofs}}/>
        </div>
      </div>
    </section>

    <div className="homeDirectorV3">
      <section className="homeV3Reality" aria-labelledby="home-v3-reality-title">
        <div className="shell homeV3RealityGrid">
          <div className="homeV3RealityCopy">
            <div className="eyebrow">WHY METTELO EXISTS</div>
            <h2 id="home-v3-reality-title">A skill claim tells us what you know. Contribution shows how you work.</h2>
            <p className="lead">Capability becomes more credible when people can see the problem, your role, your decisions, how you worked with others and what changed because you contributed.</p>
            <p className="homeV3RealityNote">Mettelo connects those signals so useful work can become clearer professional evidence and a stronger foundation for what comes next.</p>
          </div>
          <div className="homeV3Compare" aria-label="What Mettelo adds to a traditional skill claim">
            <div className="homeV3CompareHead"><span>WHAT A PROFILE CAN CLAIM</span><span>WHAT METTELO CAN SHOW</span></div>
            {[
              ['“I know SQL.”','The problem you used SQL to investigate — and the decision your analysis supported.'],
              ['“I work well in teams.”','How you collaborated, communicated and helped move shared work forward.'],
              ['“I have leadership skills.”','Where you took ownership, coordinated others or led a meaningful decision.'],
              ['“I delivered a project.”','Your role, the evidence behind the work and the outcome you helped create.']
            ].map(([claim,signal],index)=><div className="homeV3CompareRow" key={claim}><div data-label="CLAIM"><span>{String(index+1).padStart(2,'0')}</span><strong>{claim}</strong></div><div data-label="METTELO EVIDENCE"><span aria-hidden="true">→</span><strong>{signal}</strong></div></div>)}
          </div>
        </div>
      </section>

      <section className="homeV3Connected" id="home-connected-layer" aria-labelledby="home-v3-connected-title">
        <div className="shell">
          <div className="homeV3SectionHead homeV3SectionHeadMajor"><div><div className="eyebrow">ONE CONNECTED LAYER</div><h2 id="home-v3-connected-title">Your work, evidence and opportunities should build on each other.</h2></div><p>Mettelo connects project work, contribution, review, Proof and opportunity so every useful action can strengthen the next.</p></div>
          <ol className="homeV3LayerRail">
            {[
              ['01','Projects & Labs','Join practical work where your role, responsibility and contribution are clear.','BUILD'],
              ['02','Contribution','Record the work you owned, the decisions you influenced and how you contributed.','WORK'],
              ['03','Evidence','Attach the artefacts, decisions and outputs that make your contribution easier to understand.','EVIDENCE'],
              ['04','Mettelo Proof','Turn reviewed contribution into credible evidence of demonstrated capability in context.','PROVE'],
              ['05','Opportunity','Use demonstrated experience to discover projects, roles and opportunities where that capability is relevant.','PROGRESS']
            ].map(([number,title,body,state],index)=><li className={index===3?'isProof':''} key={number}><span className="homeV3LayerNo">{number}</span><div><h3>{title}</h3><p>{body}</p></div><strong>{state}</strong></li>)}
          </ol>
        </div>
      </section>

      <section className="homeV3Journey" aria-labelledby="home-v3-journey-title">
        <div className="shell">
          <div className="homeV3JourneyHead"><div><div className="eyebrow">HOW METTELO WORKS</div><h2 id="home-v3-journey-title">Turn useful work into evidence people can trust.</h2></div><p>Mettelo gives real project activity a structure: the work you take on, how you contribute, the evidence behind it and the outcome you help create.</p></div>
          <ol className="homeV3JourneyTrack">{journeySteps.map((step,index)=><li key={step.number} className={index===3?'isProof':''}><span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol>
        </div>
      </section>

      <HomeLiveContent/>

      <section className="homeV3Proof" aria-labelledby="home-v3-proof-title">
        <div className="shell homeV3ProofGrid">
          <div className="homeV3ProofStory"><div className="eyebrow">METTELO PROOF</div><h2 id="home-v3-proof-title">Show the work behind the skill.</h2><p>Mettelo Proof connects what you did with the evidence, decisions, collaboration and outcomes behind it — so capability is easier to understand and harder to reduce to a badge.</p><blockquote>Don’t just say you can analyse problems.<strong>Show where your thinking changed the work.</strong></blockquote><a className="button primary" href={copy.proof_cta_href}>{copy.proof_cta_label}</a></div>
          <div className="homeV3ProofStage"><aside className="homeV3ProofRecord" aria-label="Illustrative Mettelo Proof record"><div className="homeV3ProofHeader"><div><span>VERIFIED CONTRIBUTION</span><h3>GA4 Marketing Analysis</h3></div><strong>VERIFIED</strong></div><dl><div><dt>Project</dt><dd>Marketing automation analysis</dd></div><div><dt>Role</dt><dd>Data Analyst</dd></div><div><dt>Contribution</dt><dd>Analysed campaign performance, identified patterns and developed recommendations.</dd></div><div><dt>Professional capability</dt><dd>Analytical thinking · collaboration · communication · business acumen</dd></div><div><dt>Evidence</dt><dd>Dashboard · analysis workbook · recommendation report</dd></div><div><dt>Review</dt><dd>Contribution reviewed and verified</dd></div></dl></aside></div>
        </div>
      </section>

      <section className="homeV3Routes" aria-labelledby="home-v3-routes-title">
        <div className="shell"><div className="homeV3SectionHead"><div><div className="eyebrow">TWO ROUTES THROUGH METTELO</div><h2 id="home-v3-routes-title">Build capability. See capability in action.</h2></div><p>Mettelo connects people who want meaningful experience with organisations that want to engage real capability around useful work.</p></div><div className="homeV3RouteGrid"><article><span>FOR PROFESSIONALS</span><h3>Build experience that carries weight.</h3><p>Contribute to practical work, collaborate with others and leave with more than participation — a clearer record of what you were responsible for and what you helped achieve.</p><ul>{professionalRoutes.map(route=><li key={route}>{route}</li>)}</ul><a className="button dark" href="/projects">Explore Mettelo →</a></article><article><span>FOR ORGANISATIONS</span><h3>Bring real work. See capability in action.</h3><p>Engage professionals around meaningful technology, Data and AI problems and gain richer context on how people think, collaborate, take ownership and deliver.</p><ul>{organisationRoutes.map(route=><li key={route}>{route}</li>)}</ul><a className="button dark" href={copy.organisations_cta_href}>Work with Mettelo →</a></article></div></div>
      </section>

      <section className="homeV3Ecosystem" aria-labelledby="home-v3-ecosystem-title">
        <div className="shell"><div className="homeV3SectionHead homeV3SectionHeadMajor"><div><div className="eyebrow">THE METTELO ECOSYSTEM</div><h2 id="home-v3-ecosystem-title">One ecosystem built around how professional growth actually happens.</h2></div><p>People learn, contribute, connect, build evidence and discover opportunities in different ways. Mettelo brings those moments into one connected professional system.</p></div><div className="homeV3EcosystemGrid">{ecosystem.map(item=><article className={`is-${item.size}${item.dark?' isDark':''}`} key={item.number}><span>{item.number}</span><i aria-hidden="true"/><h3>{item.name}</h3><strong>{item.verb}</strong><p>{item.body}</p></article>)}</div></div>
      </section>

      <section className="homeV3Final" aria-labelledby="home-v3-final-title">
        <div className="shell homeV3FinalGrid"><div><div className="eyebrow">START WITH SOMETHING REAL</div><h2 id="home-v3-final-title">Your next opportunity should start with something real.</h2></div><div><p>Find a project, contribute to meaningful work and start building a professional record grounded in what you actually did.</p><div className="actions"><a className="button light" href="/projects">Explore projects →</a><a className="button ghost" href={copy.final_secondary_href}>Join Mettelo</a></div></div></div>
      </section>
    </div>
  </>;
}
