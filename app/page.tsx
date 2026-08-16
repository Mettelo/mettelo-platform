import HomeLiveContent from '@/components/HomeLiveContent';
import HomeHeroShowcase from '@/components/HomeHeroShowcase';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import './home.css';
import './home-refinement.css';
import './home-overhaul.css';
import './home-social-proof.css';

const LIVE_THRESHOLD=500;
const ESTABLISHED_COMMUNITY_REACH=5689;
const fallbackAvatarInitials=['M','E','T','T','O'];

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

type HeroAvatar={full_name:string|null;avatar_url:string|null};

async function getHeroMetrics(){
  const db=createPublicSupabaseClient();
  if(!db)return {members:null,projects:null,opportunities:null,proofs:null,avatars:[] as HeroAvatar[]};
  const now=new Date().toISOString();
  const [members,projects,opportunities,proofs,avatars]=await Promise.all([
    db.from('profiles').select('id',{count:'exact',head:true}),
    db.from('projects').select('id',{count:'exact',head:true}).eq('visibility','public').in('status',['pilot','recruiting','active','review','completed']),
    db.from('opportunities').select('id',{count:'exact',head:true}).eq('status','published').eq('access_level','public').or(`closes_at.is.null,closes_at.gte.${now}`),
    db.from('contributions').select('id',{count:'exact',head:true}).eq('verification_status','verified').eq('is_public',true),
    db.from('profiles').select('full_name,avatar_url').eq('is_public',true).not('avatar_url','is',null).order('updated_at',{ascending:false}).limit(5)
  ]);
  return {
    members:members.count??null,
    projects:projects.count??null,
    opportunities:opportunities.count??null,
    proofs:proofs.count??null,
    avatars:(avatars.data||[]) as HeroAvatar[]
  };
}

export default async function HomePage(){
  const metrics=await getHeroMetrics();
  const useLiveCommunity=metrics.members!==null&&metrics.members>=LIVE_THRESHOLD;
  const communityValue:number=useLiveCommunity?(metrics.members??ESTABLISHED_COMMUNITY_REACH):ESTABLISHED_COMMUNITY_REACH;
  const communityLabel=useLiveCommunity?'Mettelo members building capability and making impact':'professionals reached through the wider Mettelo community';
  const heroAvatars=Array.from({length:5},(_,index)=>metrics.avatars[index]||{full_name:fallbackAvatarInitials[index],avatar_url:null});
  return <>
    <section className="homeHero homeHeroDark homeHeroOverhaul" aria-labelledby="home-hero-title">
      <div className="shell homeHeroShell">
        <div className="homeHeroGrid">
          <div className="homeHeroCopy">
            <div className="eyebrow">BUILD · PROVE · GET DISCOVERED</div>
            <h1 id="home-hero-title">Build real capability.<br/>Prove it with evidence.<br/><span>Get discovered.</span></h1>
            <p className="heroLead">Mettelo is a technology-led platform where professionals build capability through structured real-world work, turn contribution into verified Proof and use stronger evidence to reach opportunity across Africa and beyond.</p>
            <div className="homeHeroActions">
              <a className="button primary" href="/projects">Explore projects →</a>
              <a className="button heroGhost" href="/auth/signup">Create your profile</a>
            </div>
            <div className="heroCommunityProof" aria-label={`${communityValue.toLocaleString('en-GB')} plus ${communityLabel}`}>
              <div className="heroCommunityAvatars" aria-hidden="true">
                {heroAvatars.map((avatar,index)=>{
                  const initial=(avatar.full_name?.trim()?.charAt(0)||fallbackAvatarInitials[index]).toUpperCase();
                  return <span className="heroCommunityAvatar" key={`${avatar.avatar_url||initial}-${index}`} style={avatar.avatar_url?{backgroundImage:`url(${avatar.avatar_url})`}:undefined}>{avatar.avatar_url?'':initial}</span>;
                })}
              </div>
              <p><strong>{communityValue.toLocaleString('en-GB')}+</strong><span>{communityLabel}</span></p>
            </div>
            <div className="heroPositioningLine" aria-label="Mettelo positioning">
              <strong>Professional capability infrastructure</strong>
              <span>Real projects · reviewed evidence · stronger professional signals</span>
            </div>
          </div>
          <HomeHeroShowcase metrics={{projects:metrics.projects,opportunities:metrics.opportunities,proofs:metrics.proofs}}/>
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
        <div className="homeHowHead"><div><div className="eyebrow">How Mettelo works</div><h2 id="home-how-title">A clear route from discovery to credible professional signal.</h2></div><p>One connected journey turns real contribution into evidence that is easier to trust, understand and use.</p></div>
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
        <div className="homeImpactIntro"><div><div className="eyebrow">Africa and beyond</div><h2 id="home-impact-title">Infrastructure designed for ambitious professionals and organisations.</h2></div><p>Mettelo is building systems that help professionals develop capability through real work, prove it with credible evidence and become easier to discover across borders.</p></div>
        <div className="impactPillars">{impactPillars.map((pillar,index)=><article key={pillar.title}><span aria-hidden="true">0{index+1}</span><h3>{pillar.title}</h3><p>{pillar.body}</p></article>)}</div>
      </div>
    </section>

    <section className="section homeFinalSection" aria-labelledby="home-final-title">
      <div className="shell"><div className="ctaBand"><div><div className="cardNumber">START HERE</div><h2 id="home-final-title">Build something real behind your next opportunity.</h2><p>Create your account, complete your profile and find the project or opportunity that fits your next move.</p></div><div className="actions"><a className="button dark" href="/auth/signup">Join Mettelo →</a><a className="button ghost" href="/faq">Read the FAQ</a></div></div></div>
    </section>
  </>;
}
