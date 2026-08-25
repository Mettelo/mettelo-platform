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

const LIVE_THRESHOLD=500;
const ESTABLISHED_COMMUNITY_REACH=5689;

const workSteps=[
  {number:'01',title:'Work in a real team',body:'Collaborate with people who bring different skills, perspectives and responsibilities.'},
  {number:'02',title:'Take ownership',body:'Own a task, lead part of the work, manage dependencies or contribute specialist expertise.'},
  {number:'03',title:'Think beyond the tool',body:'Analyse problems, make decisions, communicate ideas and understand the wider business context.'},
  {number:'04',title:'Deliver an outcome',body:'Produce something useful that leaves a clearer record of your contribution and how you worked.'}
];

const journeySteps=[
  {number:'01',title:'Discover real work',body:'Explore projects where your skills, interests and experience could be useful.'},
  {number:'02',title:'Contribute',body:'Work with a team, take responsibility for real tasks and help move the work forward.'},
  {number:'03',title:'Evidence & review',body:'Record what you contributed, connect supporting evidence and submit the contribution for review.'},
  {number:'04',title:'Mettelo Proof',body:'Reviewed contributions can become clearer evidence of demonstrated capability in context.'}
];

const professionalRoutes=[
  'Join practical project work',
  'Collaborate with real teams',
  'Take ownership and lead where relevant',
  'Build evidence of technical and professional capability',
  'Strengthen your Mettelo Proof'
];

const organisationRoutes=[
  'Bring real business or social problems',
  'Understand contribution in context',
  'See how people worked, not only what tools they used',
  'Explore evidence of demonstrated capability',
  'Create opportunities and collaborate with the ecosystem'
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

    <div className="homeDirectorV2">
      <section className="homeDirectorStatement" aria-labelledby="home-director-problem-title">
        <div className="shell homeDirectorStatementInner">
          <div className="eyebrow">{copy.why_eyebrow}</div>
          <h2 id="home-director-problem-title">Skills are easy to claim. Contribution is harder to fake.</h2>
          <p className="lead">{copy.why_lead}</p>
          <p className="homeDirectorBody">{copy.why_body}</p>
          <div className="homeDirectorContrast" aria-label="The shift Mettelo is designed to support">
            <strong>From “these are the skills I say I have”</strong>
            <span>to “this is what I actually did, how I applied the skill, how I worked with others, and the outcome I helped create.”</span>
          </div>
        </div>
      </section>

      <section className="homeDirectorWork" aria-labelledby="home-director-work-title">
        <div className="shell homeDirectorWorkGrid">
          <div className="homeDirectorWorkStory">
            <div className="eyebrow">{copy.how_eyebrow}</div>
            <h2 id="home-director-work-title">Capability becomes visible when people have something real to contribute to.</h2>
            <p className="lead">{copy.how_body}</p>
          </div>
          <ol className="homeDirectorWorkSteps">
            {workSteps.map(step=><li key={step.number}><span aria-hidden="true">{step.number}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}
          </ol>
        </div>
      </section>

      <section className="homeDirectorJourney" aria-labelledby="home-director-journey-title">
        <div className="shell">
          <div className="homeDirectorSectionHead">
            <div><div className="eyebrow">HOW METTELO WORKS</div><h2 id="home-director-journey-title">Real work becomes credible professional evidence.</h2></div>
            <p>The platform connects the activity itself with contribution, supporting evidence and review so the final record carries useful context.</p>
          </div>
          <ol className="homeDirectorJourneyTrack">
            {journeySteps.map(step=><li key={step.number}><span aria-hidden="true">{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="homeDirectorProof" aria-labelledby="home-director-proof-title">
        <div className="shell homeDirectorProofGrid">
          <div className="homeDirectorProofStory">
            <div className="eyebrow">{copy.proof_eyebrow}</div>
            <h2 id="home-director-proof-title">Your experience should show more than a list of skills.</h2>
            <p className="lead">{copy.proof_lead}</p>
            <p className="homeDirectorProofQuote">Not “I have analytical thinking.”<br/>“Here is where I demonstrated it.”</p>
            <p className="homeDirectorProofNote">{copy.proof_note}</p>
            <a className="button primary" href={copy.proof_cta_href}>{copy.proof_cta_label}</a>
          </div>
          <aside className="homeDirectorProofRecord" aria-label="Illustrative Mettelo Proof record">
            <div className="homeDirectorProofHeader"><div><span>VERIFIED CONTRIBUTION</span><h3>GA4 Marketing Analysis</h3><p>Illustrative Mettelo Proof record</p></div><strong>VERIFIED</strong></div>
            <dl>
              <div><dt>Project</dt><dd>Marketing automation analysis</dd></div>
              <div><dt>Role</dt><dd>Data Analyst</dd></div>
              <div><dt>Contribution</dt><dd>Analysed campaign performance, identified patterns and developed recommendations.</dd></div>
              <div><dt>Outcome</dt><dd>Recommendations informed the team’s proposed automation strategy.</dd></div>
              <div><dt>Technical capability</dt><dd className="homeDirectorPills"><span>GA4</span><span>SQL</span><span>Data analysis</span></dd></div>
              <div><dt>Professional capability</dt><dd className="homeDirectorPills"><span>Analytical thinking</span><span>Collaboration</span><span>Communication</span><span>Business acumen</span></dd></div>
              <div><dt>Evidence</dt><dd>Dashboard · analysis workbook · recommendation report</dd></div>
              <div><dt>Review</dt><dd>Contribution reviewed and verified</dd></div>
            </dl>
          </aside>
        </div>
      </section>

      <HomeLiveContent/>

      <section className="homeDirectorRoutes" aria-labelledby="home-director-routes-title">
        <div className="shell">
          <div className="eyebrow">TWO ROUTES THROUGH METTELO</div>
          <h2 id="home-director-routes-title">Build capability. Understand capability.</h2>
          <div className="homeDirectorRouteGrid">
            <article>
              <span className="homeDirectorKicker">FOR PROFESSIONALS</span>
              <h3>Build experience you can actually show.</h3>
              <ul>{professionalRoutes.map(route=><li key={route}>{route}</li>)}</ul>
              <a className="button dark" href="/projects">Explore Mettelo →</a>
            </article>
            <article>
              <span className="homeDirectorKicker">{copy.organisations_eyebrow}</span>
              <h3>{copy.organisations_title}</h3>
              <p>{copy.organisations_lead}</p>
              <ul>{organisationRoutes.map(route=><li key={route}>{route}</li>)}</ul>
              <a className="button ghost" href={copy.organisations_cta_href}>{copy.organisations_cta_label}</a>
            </article>
          </div>
        </div>
      </section>

      <section className="homeDirectorFinal" aria-labelledby="home-final-title">
        <div className="shell homeDirectorFinalGrid">
          <div><div className="eyebrow">{copy.final_eyebrow}</div><h2 id="home-final-title">Build experience people can understand.</h2></div>
          <div><p>{copy.final_body}</p><div className="actions"><a className="button dark" href={copy.final_primary_href}>{copy.final_primary_label}</a><a className="button ghost" href={copy.final_secondary_href}>{copy.final_secondary_label}</a></div></div>
        </div>
      </section>
    </div>
  </>;
}
