import { runOpportunityDiscovery } from '@/lib/opportunities/discovery';
import { runOpportunityQualitySweep } from '@/lib/opportunities/quality';

export async function runOpportunityPipeline(){
  const discovery=await runOpportunityDiscovery();
  const quality=await runOpportunityQualitySweep();
  return {...discovery,quality};
}
