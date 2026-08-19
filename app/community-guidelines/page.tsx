import type {Metadata} from 'next';
import styles from '../legal-trust.module.css';

export const metadata:Metadata={title:'Community Guidelines',description:'The participation, moderation and conduct standards for Mettelo Community.'};

const sections=[
  ['contribute','Contribute more than noise',<>Share questions, answers, opportunities, resources and feedback that help people move. Avoid repetitive self-promotion, unsolicited mass messaging, referral spam and low-context job dumping.</>],
  ['respect','Respect people and boundaries',<>No harassment, discrimination, threats, doxxing, sexual harassment, impersonation or targeted abuse. Debate ideas without attacking people.</>],
  ['privacy','Protect private information',<>Do not share another person’s private messages, contact details, application information, project data or confidential organisational material without permission.</>],
  ['opportunities','Keep opportunities credible',<>When sharing jobs, referrals or programmes, include the source, eligibility and important constraints where possible. Do not knowingly share scams, misleading claims or paid opportunities disguised as volunteering.</>],
  ['integrity','Project integrity',<>Contributors should be transparent about what they did. Do not claim work, authorship, leadership, credentials or outcomes you did not earn. Respect repository licences, attribution and data restrictions.</>],
  ['moderation','Moderation',<>Mettelo moderators may remove content, limit posting, suspend access or remove members when behaviour creates safety, spam, integrity or trust risks. Serious incidents can be escalated to the Core Team. Decisions are based on context and evidence, not popularity.</>],
  ['reporting','Reporting',<>Use the <a href="/contact">Contact page</a> and choose a community or technical topic to report conduct, safety or moderation concerns. Include enough context for review without reposting sensitive information publicly.</>]
] as const;

export default function GuidelinesPage(){return <section className={styles.page}><div className="shell"><div className={styles.hero}><div><div className="eyebrow">Community standards</div><h1>Community Guidelines</h1><p>Mettelo is for serious professional growth, useful contribution and respectful collaboration.</p></div><aside className={styles.meta}><strong>Participation with standards</strong><span>Useful contribution, professional respect, privacy and evidence integrity matter more than activity volume.</span></aside></div><div className={styles.layout}><nav className={styles.toc} aria-label="Community guideline sections"><strong>On this page</strong>{sections.map(([id,title])=><a href={`#${id}`} key={id}>{title}</a>)}</nav><div className={styles.content}>{sections.map(([id,title,copy])=><section className={styles.section} id={id} key={id}><h2>{title}</h2><p>{copy}</p></section>)}</div></div></div></section>}
