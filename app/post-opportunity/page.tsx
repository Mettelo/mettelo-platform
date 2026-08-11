import type {Metadata} from 'next';
import EmployerOpportunityForm from '@/components/EmployerOpportunityForm';

export const metadata:Metadata={title:'Post a Data & AI Opportunity',description:'Submit a genuine Data & AI job, internship, fellowship, apprenticeship or volunteer role for Mettelo review.'};

export default function PostOpportunityPage(){return <>
  <section className="hero"><div className="shell heroGrid"><div><div className="eyebrow">For Organisations · Opportunities</div><h1>Post a genuine Data & AI opportunity.</h1><p className="heroLead">Share a current role with the Mettelo network. Every submission is reviewed for Data & AI relevance, employer traceability, applicant eligibility and closing information before it can appear publicly.</p></div><aside className="heroPanel"><span className="chip">MANUAL REVIEW</span><h3 style={{marginTop:18}}>Submission is not publication.</h3><div className="listRow"><strong>1</strong><span>Organisation submits</span></div><div className="listRow"><strong>2</strong><span>Mettelo checks the role</span></div><div className="listRow"><strong>3</strong><span>Admin approves or rejects</span></div><div className="listRow"><strong>4</strong><span>Approved role enters Opportunities</span></div></aside></div></section>
  <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Opportunity submission</div><h2>Give us enough information to verify the role properly.</h2></div><p>Use an official employer application URL. Mettelo does not accept generic lead-generation pages, unrelated roles or opportunities without a traceable application destination.</p></div><EmployerOpportunityForm/></div></section>
</>}
