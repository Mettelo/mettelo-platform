import HomeLiveContent from '@/components/HomeLiveContent';
import HomeHeroShowcase from '@/components/HomeHeroShowcase';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import {getPublicWebsitePage} from '@/lib/website-pages';
import './home.css';
import './home-refinement.css';
import './home-overhaul.css';
import './home-social-proof.css';
import './home-clarity.css';

const LIVE_THRESHOLD=500;
const ESTABLISHED_COMMUNITY_REACH=5689;

const steps=[
  {number:'01',title:'Discover real work',body:'Explore projects where your skills, interests and experience could be useful.'},
  {number:'02',title:'Contribute',body:'Work with a team, take responsibility for real tasks and deliver useful outcomes.'},
  {number:'03',title:'Evidence & review',body:'Record what you contributed, link supporting evidence and submit the contribution for review.'},
  {number:'04',title:'Mettelo Proof',body:'Verified contributions can form Mettelo Proof that gives others clearer context about demonstrated work.'}
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
  {title:'Bring a project brief',body:'Turn a real business or social problem into structured technology, Data & AI project work.'},
  {title:'Understand demonstrated contribution',body:'Look beyond self-reported skills and explore reviewed contribution evidence in context.'},
  {title:'Create opportunities',body:'Connect professionals to jobs, projects, research, events and other routes forward.'},
  {title:'Collaborate with the ecosystem',body:'Work with Mettelo on technology, Data & AI initiatives, research, workshops and partnerships.'}
];

const signalSteps=[
  'Real work',
  'Contribution',
  'Evidence and review',
  'Mettelo Proof'
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

    <section className="homeActionSection" aria-labelledby="home-actions-title">
      <div className="shell">
        <div className="homeActionIntro">
          <div><div className="eyebrow">WHAT YOU CAN DO</div><h2 id="home-actions-title">Make real contribution easier to understand.</h2></div>
          <p>Mettelo connects real work, contribution evidence, review and professional opportunity in one system.</p>
        </div>
        <nav className="homeValueStrip" aria-label="Explore the main ways to use Mettelo">
          <div className="homeValueGrid">
            <a href="/projects"><span className="valueIcon" aria-hidden="true">01</span><p><strong>Join real project work</strong><small>Build experience through structured delivery with a team.</small></p><b aria-hidden="true">→</b></a>
            <a href="/showcase"><span className="valueIcon" aria-hidden="true">02</span><p><strong>Explore Mettelo Proof</strong><small>See reviewed contribution evidence with the work context preserved.</small></p><b aria-hidden="true">→</b></a>
            <a href="/opportunities"><span className="valueIcon" aria-hidden="true">03</span><p><strong>Find opportunities</strong><small>Explore current routes forward alongside stronger professional evidence.</small></p><b aria-hidden="true">→</b></a>
            <a href="/organisations"><span className="valueIcon" aria-hidden="true">04</span><p><strong>Bring a real problem</strong><small>Work with Mettelo on technology, Data &amp; AI challenges.</small></p><b aria-hidden="true">→</b></a>
          </div>
        </nav>
      </div>
    </section>

    <HomeLiveContent/>

    <section className="section homeHowSection" aria-labelledby="home-how-title">
      <div className="shell">
        <div className="homeHowHead"><div><div className="eyebrow">{copy.how_eyebrow}</div><h2 id="home-how-title">{copy.how_title}</h2></div><p>{copy.how_body}</p></div>
        <ol className="homeHowGrid">
          {steps.map(step=><li key={step.number}><span className="howNumber" aria-hidden="true">{step.number}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}
        </ol>
      </div>
    </section>

    <section className="section dark homeProofSection" aria-labelledby="home-proof-title">
      <div className="shell homeSplit">
        <div className="proofStory"><div className="eyebrow">{copy.proof_eyebrow}</div><h2 id="home-proof-title">{copy.proof_title}</h2><p className="lead">{copy.proof_lead}</p><div className="proofPrinciples" aria-label="What a Mettelo Proof record can show"><span>Project context</span><span>Your contribution</span><span>Supporting evidence</span><span>Review status</span></div><p className="proofNote">{copy.proof_note}</p><div className="actions"><a className="button primary" href={copy.proof_cta_href}>{copy.proof_cta_label}</a></div></div>
        <aside className="proofPreview" aria-label="Illustrative verified Proof record"><div className="proofPreviewHeader"><div><h3>Verified contribution</h3><p>Illustrative Proof record</p></div><span className="chip green">VERIFIED</span></div><dl className="proofGrid"><div className="proofField"><dt>Project</dt><dd>Data &amp; AI delivery</dd></div><div className="proofField"><dt>Role</dt><dd>Data Analyst</dd></div><div className="proofField"><dt>Contribution</dt><dd>Analysis · dashboard · recommendations</dd></div><div className="proofField"><dt>Evidence</dt><dd>Repository · report · dashboard</dd></div><div className="proofField"><dt>Review</dt><dd>Contribution verified</dd></div></dl></aside>
      </div>
    </section>

    <section className="section homeDataAiSection" aria-labelledby="home-data-ai-title">
      <div className="shell">
        <div className="homeDataAiIntro"><div><div className="eyebrow">DATA &amp; AI FOCUS</div><h2 id="home-data-ai-title">Start where practical technology work is moving fast.</h2></div><div><p>Data &amp; AI remain a major focus within Mettelo. Professionals need opportunities to practise, build, collaborate and demonstrate what they can actually do in context.</p><p><strong>The goal is not to collect more skill labels. It is to build credible evidence through real contribution.</strong></p></div></div>
        <div className="dataAiGrid">{dataAiAreas.map((area,index)=><article key={area.title}><span aria-hidden="true">0{index+1}</span><h3>{area.title}</h3><p>{area.body}</p></article>)}</div>
      </div>
    </section>

    <section className="section softSection homeOrganisationSection" aria-labelledby="home-organisations-title">
      <div className="shell homeOrganisationGrid">
        <div className="homeOrganisationStory"><div className="eyebrow">{copy.organisations_eyebrow}</div><h2 id="home-organisations-title">{copy.organisations_title}</h2><p className="lead">{copy.organisations_lead}</p><a className="button dark" href={copy.organisations_cta_href}>{copy.organisations_cta_label}</a></div>
        <div className="organisationRoutes">{organisationRoutes.map((route,index)=><article key={route.title}><span aria-hidden="true">0{index+1}</span><div><h3>{route.title}</h3><p>{route.body}</p></div></article>)}</div>
      </div>
    </section>

    <section className="section homeWhySection" aria-labelledby="home-why-title">
      <div className="shell homeWhyGrid">
        <div><div className="eyebrow">{copy.why_eyebrow}</div><h2 id="home-why-title">{copy.why_title}</h2><p className="lead">{copy.why_lead}</p><p>{copy.why_body}</p><p>{copy.why_scope}</p></div>
        <ol className="signalPath" aria-label="How Mettelo turns real work into stronger professional evidence">{signalSteps.map((step,index)=><li key={step}><span aria-hidden="true">0{index+1}</span><strong>{step}</strong></li>)}</ol>
      </div>
    </section>

    <section className="section homeFinalSection" aria-labelledby="home-final-title">
      <div className="shell"><div className="ctaBand"><div><div className="cardNumber">{copy.final_eyebrow}</div><h2 id="home-final-title">{copy.final_title}</h2><p>{copy.final_body}</p></div><div className="actions"><a className="button dark" href={copy.final_primary_href}>{copy.final_primary_label}</a><a className="button ghost" href={copy.final_secondary_href}>{copy.final_secondary_label}</a><a className="linkArrow" href="/signin">Already a member? Sign in →</a></div></div></div>
    </section>
  </>;
}
