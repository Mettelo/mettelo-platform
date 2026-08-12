import type {Metadata} from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata:Metadata={title:'Volunteer as a Project Architect',description:'Help Data & AI teams shape meaningful projects, coordinate delivery and build a verified record of your contribution as a Mettelo Project Architect.'};

const experience=[
  ['Project leadership','Practise turning an idea or problem into a clear brief, delivery plan and team workflow.'],
  ['Professional collaboration','Work with contributors, reviewers and Mettelo Admin while building experience across different roles and perspectives.'],
  ['Structured review','Receive feedback on your project thinking, decisions, coordination and delivery record.'],
  ['Career evidence','Build a traceable record of approved projects, responsibilities and outcomes that can support your portfolio and professional story.'],
  ['Participation verification','After meaningful completed contribution, Mettelo may confirm your role, participation dates and verified outcomes for a reference request.'],
  ['Visible recognition','Approved members can use the Mettelo Data & AI Project Architect designation and share its public verification page.']
];
const responsibilities=[
  'Propose or refine useful Data & AI project problems and success measures.',
  'Choose a delivery approach, recommend roles and help a team understand the work.',
  'Coordinate progress, reviews, risks and project decisions inside the Mettelo workspace.',
  'Review project approaches and recommend whether work is ready to move forward.',
  'Help teams prepare a final presentation and, where they choose, an insight for publication.',
  'Keep decisions transparent while Mettelo Admin retains final approval and can reverse any action.'
];

export default function ProjectArchitectOpportunity(){return <>
  <section className={`hero ${styles.hero}`}><div className="shell heroGrid"><div><div className="eyebrow">Volunteer opportunity · Remote</div><h1>Help Data &amp; AI teams turn promising ideas into work they can deliver.</h1><p className="heroLead">Apply to become a Mettelo Project Architect: a trusted community identity for experienced professionals who can shape projects, guide teams and review progress.</p><div className="actions"><Link className="button primary" href="/member/project-architect">Apply as a member →</Link><Link className="button ghost" href="/join">Join Mettelo first</Link></div></div><aside className={`heroPanel ${styles.terms}`}><span className="chip">IMPORTANT</span><h3>This is an unpaid, voluntary opportunity.</h3><p>There is no salary, stipend, employee benefit or promise of future paid work. Participation is flexible, and acceptance depends on Mettelo&apos;s review, project availability and eligibility in your location.</p></aside></div></section>

  <section className="section"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">What you gain</div><h2>Build experience that can strengthen your career story.</h2></div><p>The value should be practical: meaningful collaboration, useful feedback and a record connected to real contribution—not an empty title.</p></div><div className={styles.benefitGrid}>{experience.map(([title,copy],index)=><article className="card" key={title}><span className="cardNumber">{String(index+1).padStart(2,'0')}</span><h3>{title}</h3><p>{copy}</p></article>)}</div><p className={styles.referenceNote}><strong>About references:</strong> Mettelo can provide factual participation verification after meaningful completed work. A personal recommendation is not automatic and will depend on the contribution actually observed.</p></div></section>

  <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">The contribution</div><h2>What a Project Architect may do.</h2></div><p>You can take meaningful project responsibility without replacing Mettelo Admin. Every elevated action remains reviewable and reversible.</p></div><div className={styles.responsibilityGrid}>{responsibilities.map(item=><div key={item}><span aria-hidden="true">✓</span><p>{item}</p></div>)}</div></div></section>

  <section className="section"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Who should apply</div><h2>Evidence matters more than job titles.</h2></div><p>You should be able to show experience in Data or AI, project delivery and working with people. Strong applications connect claims to work examples, repositories, dashboards, reports or verified Mettelo Proof.</p></div><div className="grid3"><article className="card"><span className="chip">01</span><h3>Become a member</h3><p>Create your Mettelo profile so your application and future contribution record stay connected.</p></article><article className="card"><span className="chip">02</span><h3>Submit your experience</h3><p>Explain what you have delivered, how you have coordinated work and the first project you would propose.</p></article><article className="card"><span className="chip">03</span><h3>Complete Admin review</h3><p>Mettelo may request more information. Approval changes your internal identity from Member to Project Architect.</p></article></div></div></section>

  <section className={styles.commitment}><div className="shell"><div className={styles.commitmentInner}><div><div className="eyebrow">Before you apply</div><h2>Choose contribution freely and agree each project clearly.</h2><p>You may decline a project or withdraw from voluntary participation. If accepted, you and Mettelo should agree the project scope, support, expected availability, data access and boundaries before work begins. This identity is not employment or professional certification.</p></div><Link className="button primary" href="/member/project-architect">Start your application →</Link></div></div></section>
</>}
