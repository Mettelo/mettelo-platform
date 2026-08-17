import type {Metadata} from 'next';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import OpportunityBoard from '@/components/OpportunityBoard';
import './opportunities.css';

export const metadata:Metadata={
  title:'Data & AI Opportunities',
  description:'Find current Data & AI jobs, internships, graduate roles, fellowships, apprenticeships and volunteering opportunities with clearer context on location, eligibility, remote work and sponsorship.'
};
export const dynamic='force-dynamic';

type Opportunity={id:string;title:string;organisation:string|null;opportunity_type:string;summary:string|null;location:string|null;eligibility:string|null;source_url:string|null;official_application_url:string|null;closes_at:string|null;published_at:string|null;data_ai_relevance_score:number|null;remote_scope:string|null;source_organisation:string|null;country_code:string|null;region_code:string|null;applicant_scope:string;work_arrangement:string|null;sponsorship_status:string};

export default async function OpportunitiesPage(){
  const supabase=createPublicSupabaseClient();
  let opportunities:Opportunity[]=[];
  let loadError=false;

  if(supabase){
    const result=await supabase
      .from('opportunities')
      .select('id,title,organisation,opportunity_type,summary,location,eligibility,source_url,official_application_url,closes_at,published_at,data_ai_relevance_score,remote_scope,source_organisation,country_code,region_code,applicant_scope,work_arrangement,sponsorship_status')
      .eq('status','published')
      .eq('access_level','public')
      .eq('data_ai_relevance_status','high')
      .order('published_at',{ascending:false})
      .limit(500);
    if(result.error)loadError=true;
    else{
      const now=Date.now();
      opportunities=((result.data||[]) as Opportunity[]).filter(item=>!item.closes_at||new Date(item.closes_at).getTime()>now);
    }
  }else loadError=true;

  return <>
    <section className="opportunityHero" aria-labelledby="opportunity-page-title">
      <div className="shell opportunityHeroInner">
        <div className="opportunityHeroCopy">
          <div className="eyebrow">DATA &amp; AI OPPORTUNITIES</div>
          <h1 id="opportunity-page-title">Find opportunities worth your attention.</h1>
          <p className="opportunityHeroLead">Explore Data &amp; AI jobs, internships, graduate roles, fellowships and other opportunities with clearer context on location, remote work, eligibility and sponsorship.</p>
        </div>
        <div className="opportunityHeroProof" aria-label="Opportunity feed summary">
          <div><strong>{opportunities.length}</strong><span>live Data &amp; AI opportunit{opportunities.length===1?'y':'ies'}</span></div>
          <ul>
            <li>Focused on Data &amp; AI relevance</li>
            <li>Expired roles are removed</li>
            <li>Eligibility context shown when available</li>
          </ul>
        </div>
      </div>
    </section>

    <main id="opportunity-feed" className="opportunityDiscovery">
      <div className="shell">
        <div className="opportunityDiscoveryIntro">
          <div>
            <div className="eyebrow">DISCOVER</div>
            <h2>Search first. Filter only when you need to.</h2>
          </div>
          <p>Start with a role, company, skill or location. Use quick filters for common searches, then open advanced filters for more control.</p>
        </div>

        {loadError?
          <div className="panel emptyState" role="status"><h3>Opportunity data is temporarily unavailable.</h3><p>Please try again shortly.</p></div>
          :opportunities.length?
          <OpportunityBoard items={opportunities}/>
          :<div className="panel emptyState"><h3>No Data &amp; AI opportunities are live right now.</h3><p>We keep the feed focused rather than showing expired or low-relevance listings.</p><div className="actions"><a className="button dark" href="/newsletter">Get opportunity alerts →</a></div></div>}
      </div>
    </main>

    <section className="opportunityTrustSection" aria-labelledby="opportunity-trust-title">
      <div className="shell opportunityTrustGrid">
        <div className="opportunityTrustIntro">
          <div className="eyebrow">WHY METTELO</div>
          <h2 id="opportunity-trust-title">Less noise. More useful context.</h2>
          <p>We surface the information that helps you decide whether an opportunity deserves your time.</p>
        </div>
        <div className="opportunityTrustItems">
          <article><span>01</span><h3>Relevant</h3><p>Focused on Data &amp; AI opportunities rather than a general-purpose jobs feed.</p></article>
          <article><span>02</span><h3>Current</h3><p>Roles leave the public feed when their closing date has passed.</p></article>
          <article><span>03</span><h3>Clearer</h3><p>Location, work arrangement, applicant scope and sponsorship are surfaced when known.</p></article>
        </div>
      </div>
    </section>

    <section className="opportunityAlertCta">
      <div className="shell opportunityAlertBand">
        <div><div className="eyebrow">STAY CLOSE TO THE MARKET</div><h2>Don&apos;t want to keep checking?</h2><p>Get new Data &amp; AI opportunities and Mettelo updates in your inbox.</p></div>
        <div className="actions"><a className="button dark" href="/newsletter">Get opportunity alerts →</a></div>
      </div>
    </section>
  </>;
}
