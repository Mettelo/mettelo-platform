import type {Metadata} from 'next';
import Image from 'next/image';
import {getPublicWebsitePage} from '@/lib/website-pages';
import './about.css';

export const metadata:Metadata={
  title:'About Mettelo',
  description:'Mettelo is building a connected professional capability ecosystem for Information Technology, Data and AI.'
};

const beliefs=[
  'Meaningful work develops technical and professional capability together.',
  'Contribution is more useful when the context behind it can be understood.',
  'Opportunity should respond to what people have demonstrated, not only what they claim.'
];

const audiences=[
  {label:'Professionals',title:'Build, contribute and progress.',body:'From early-career professionals and career changers to experienced practitioners, mentors and leaders — build experience and make capability easier to understand.'},
  {label:'Organisations',title:'Bring meaningful problems and see capability in action.',body:'Work with professionals around practical challenges and gain richer context on how people think, collaborate and deliver.'},
  {label:'Partners',title:'Help create stronger routes into meaningful work.',body:'Communities, institutions, mentors and learning partners can help connect knowledge, application and professional opportunity.'}
];

export default async function AboutPage(){
  const copy=(await getPublicWebsitePage('about')).values;
  return <div className="aboutEditorial">
    <section className="aboutMasthead" aria-labelledby="about-title">
      <div className="shell aboutMastheadGrid">
        <div className="eyebrow">ABOUT METTELO</div>
        <div>
          <h1 id="about-title">We are building a more connected way for professional capability to grow and be understood.</h1>
          <p className="aboutMastheadLead">Mettelo is a professional ecosystem for Information Technology, Data and AI — bringing people, practical work, evidence, insight and opportunity into a more connected journey.</p>
          <div className="aboutMastheadBelief"><strong>OUR SIMPLE BELIEF</strong><p>People should have meaningful opportunities to show what they can do.</p></div>
        </div>
      </div>
    </section>

    <section className="aboutSection aboutWhy" aria-labelledby="about-why-title">
      <div className="shell aboutSplit">
        <div><div className="eyebrow">WHY METTELO EXISTS</div><h2 id="about-why-title">Learning became easier to access. Meaningful application did not.</h2></div>
        <div className="aboutCopy"><p>People can build knowledge from almost anywhere. But professional capability develops through work that involves responsibility, judgement, collaboration and real outcomes.</p><blockquote>The gap is not only what people know. It is whether they get the opportunity to apply it and make that capability visible.</blockquote><p>Mettelo is being built around that gap.</p></div>
      </div>
    </section>

    <section className="aboutSection aboutBelief" aria-labelledby="about-belief-title">
      <div className="shell aboutBeliefGrid">
        <div><div className="eyebrow">WHAT WE BELIEVE</div><h2 id="about-belief-title">People are more than the titles, tools and qualifications on their profile.</h2></div>
        <ol className="aboutBeliefList">{beliefs.map((belief,index)=><li key={belief}><span>{String(index+1).padStart(2,'0')}</span><p>{belief}</p></li>)}</ol>
      </div>
    </section>

    <section className="aboutSection aboutJourney" aria-labelledby="about-journey-title">
      <div className="shell">
        <div className="aboutSectionHead"><div><div className="eyebrow">OUR JOURNEY</div><h2 id="about-journey-title">We started with community. The problem led us further.</h2></div><p>Mettelo was not born as a finished product. It evolved from what we learned by bringing people together.</p></div>
        <div className="aboutJourneyList">
          <article><span>OUR BEGINNING</span><h3>A simple IT, Data &amp; AI community.</h3><p>A place for people to connect, exchange knowledge and support professional growth.</p></article>
          <article><span>THE TURNING POINT</span><h3>We realised community alone could not solve the problem.</h3><p>People also needed somewhere to apply what they knew, work with others and build credible evidence of that contribution.</p></article>
          <article><span>TODAY</span><h3>A broader professional capability ecosystem.</h3><p>Community now sits alongside practical work, Proof, talent, research, AI and shared professional experiences.</p></article>
        </div>
      </div>
    </section>

    <section className="aboutSection aboutAudience" aria-labelledby="about-audience-title">
      <div className="shell">
        <div className="aboutSectionHead"><div><div className="eyebrow">WHO WE SERVE</div><h2 id="about-audience-title">One ecosystem. Different reasons to be part of it.</h2></div><p>Mettelo is built for the people developing and demonstrating capability, the organisations engaging it, and partners helping create stronger professional pathways.</p></div>
        <div className="aboutAudienceGrid">{audiences.map(item=><article key={item.label}><span>{item.label}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
      </div>
    </section>

    <section className="aboutSection aboutMissionVision" aria-labelledby="about-guides-title">
      <div className="shell">
        <div className="aboutGuideIntro"><div className="eyebrow">WHAT GUIDES US</div><h2 id="about-guides-title">What we do now. The future we want to help create.</h2></div>
        <div className="aboutGuideGrid">
          <article className="isMission"><span>OUR MISSION</span><h3>Help people turn knowledge into demonstrated capability through meaningful work.</h3></article>
          <article className="isVision"><span>OUR VISION</span><h3>A world where anyone building a career in technology, Data and AI can access the people, work, evidence and opportunities needed to progress.</h3></article>
        </div>
      </div>
    </section>

    <section className="aboutSection aboutFounder" aria-labelledby="founder-title">
      <div className="shell aboutFounderGrid">
        <figure className="founderMedia"><Image src="/api/founder-image" alt="O. Johnson Taiwo, Founder of Mettelo" width={640} height={640} sizes="(max-width: 820px) 90vw, 34vw" priority={false}/><figcaption className="founderCaption"><small>FOUNDER</small><strong>O. Johnson Taiwo</strong><span>Data &amp; AI Professional · Founder, Mettelo</span></figcaption></figure>
        <div className="founderBio"><div className="eyebrow">THE FOUNDER STORY</div><h2 id="founder-title">The idea came from seeing the same disconnect from both sides.</h2><p>Technical knowledge matters, but organisations ultimately need people who can apply it with judgement, communicate clearly, collaborate well and produce useful outcomes.</p><p>At the same time, capable people can invest heavily in learning and still struggle to access the situations where those skills become trusted experience.</p><blockquote>“The goal is not to tell people what they are capable of. It is to create better opportunities for them to show it.”</blockquote></div>
      </div>
    </section>

    <section className="aboutClose" aria-labelledby="about-close-title">
      <div className="shell aboutCloseGrid"><div><div className="eyebrow">THE NEXT CHAPTER</div><h2 id="about-close-title">The next chapter is being built together.</h2></div><div><p>Mettelo started with community. Professionals, organisations and partners will shape what it becomes next.</p><div className="actions"><a className="button light" href={copy.cta_primary_href}>{copy.cta_primary_label}</a><a className="button ghost" href={copy.cta_secondary_href}>{copy.cta_secondary_label}</a></div></div></div>
    </section>
  </div>;
}
