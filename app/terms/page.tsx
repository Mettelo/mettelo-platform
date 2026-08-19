import type {Metadata} from 'next';
import styles from '../legal-trust.module.css';

export const metadata:Metadata={title:'Terms of Use',description:'Terms for using Mettelo, its community, projects and contribution systems.'};

const sections=[
  ['using-mettelo','Using Mettelo',<>Mettelo provides community, project, event, content, contribution and opportunity-discovery experiences for Data & AI professionals. You must provide accurate account information, keep credentials secure and use the service lawfully.</>],
  ['no-guaranteed-outcome','No guaranteed outcome',<>Membership, contribution, project participation, mentoring, referrals or visibility do not guarantee employment, sponsorship, funding, certification, promotion or any other professional outcome.</>],
  ['projects-contribution','Projects and contribution',<>Project briefs may involve public data, partner-provided material or open-source work. Contributors must follow the project brief, repository licence, data-handling rules and team standards. Public credit is based on verified contribution, not attendance alone.</>],
  ['opportunities','Opportunities',<>Mettelo may curate or link to third-party jobs, fellowships, volunteering and other opportunities. Unless explicitly stated, Mettelo is not the employer or organiser and cannot guarantee that a third-party listing remains open, accurate or suitable.</>],
  ['community-conduct','Community conduct',<>Use of Mettelo Community spaces is subject to the <a href="/community-guidelines">Community Guidelines</a>. We may restrict or remove access where behaviour creates safety, integrity, spam, harassment or trust risks.</>],
  ['content-ip','Content and intellectual property',<>You retain ownership of content you create unless a project or open-source licence states otherwise. By submitting material for publication, you grant Mettelo permission to display, reproduce and promote that approved material in connection with the platform and community.</>],
  ['availability','Availability',<>Mettelo is an early-stage product. Features may change, be paused or be removed as we learn what is useful. We aim to label unfinished or unavailable functionality clearly.</>],
  ['privacy','Privacy',<>Personal information is handled as described in the <a href="/privacy">Privacy Policy</a>.</>],
  ['contact','Contact',<>Use the <a href="/contact">Contact page</a> for questions about these terms.</>]
] as const;

export default function TermsPage(){return <section className={styles.page}><div className="shell"><div className={styles.hero}><div><div className="eyebrow">Legal · Terms</div><h1>Terms of Use</h1><p>The rules and boundaries that keep Mettelo projects, community and professional evidence trustworthy.</p></div><aside className={styles.meta}><strong>Last updated 9 August 2026</strong><span>These terms apply across public discovery, member participation, contribution and community activity.</span></aside></div><div className={styles.layout}><nav className={styles.toc} aria-label="Terms sections"><strong>On this page</strong>{sections.map(([id,title])=><a href={`#${id}`} key={id}>{title}</a>)}</nav><div className={styles.content}>{sections.map(([id,title,copy])=><section className={styles.section} id={id} key={id}><h2>{title}</h2><p>{copy}</p></section>)}</div></div></div></section>}
