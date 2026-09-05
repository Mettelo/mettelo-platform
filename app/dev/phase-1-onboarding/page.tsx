import {notFound} from 'next/navigation';
import OnboardingFlow from '@/components/OnboardingFlow';

const domains=[{slug:'health',name:'Health'},{slug:'public-sector',name:'Public sector'},{slug:'climate',name:'Climate'}];
const tools=[{slug:'sql',name:'SQL'},{slug:'power-bi',name:'Power BI'},{slug:'python',name:'Python'}];

export default async function PhaseOneOnboardingPreview({searchParams}:{searchParams?:Promise<{step?:string|string[]}>}){
  if(process.env.VERCEL_ENV==='production')notFound();
  const raw=(await searchParams||{}).step;const value=Array.isArray(raw)?raw[0]:raw;const parsed=Number(value);const initialStep=Number.isFinite(parsed)?Math.max(0,Math.min(4,Math.trunc(parsed))):0;
  return <main><OnboardingFlow initialStep={initialStep} initialProfile={{full_name:'Responsive Test Member',headline:'Data analyst',location:'London',professional_area:'Data Analysis / BI',primary_goal:'Build evidence through collaborative data projects',skills:['SQL','Power BI'],preferred_roles:['Data analyst'],project_availability:'available_now',weekly_capacity:'5–8 hours per week',is_public:false}} domains={domains} tools={tools} domainPreferences={['health']} toolPreferences={['sql','power-bi']} returnTo="/member"/></main>;
}
