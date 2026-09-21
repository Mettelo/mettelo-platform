import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {startProjectRun} from '@/lib/project-start-service';

type FormationResult={membership_id?:string;membership_status?:string;run_id?:string;required_team_size?:number;participation_preference?:'solo'|'team'|'flexible'};

type OfferRow={
  id:string;
  project_id:string;
  status:string;
  capacity_consumed_at?:string|null;
  projects:{min_team_size?:number|null;target_team_size?:number|null;max_team_size?:number|null}|{min_team_size?:number|null;target_team_size?:number|null;max_team_size?:number|null}[]|null;
  [key:string]:unknown;
};

export async function GET(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});

  const {data,error}=await auth
    .from('project_offers')
    .select('id,application_id,project_id,project_run_id,status,offered_at,expires_at,accepted_at,declined_at,expired_at,capacity_reserved_at,capacity_released_at,capacity_consumed_at,projects(title,project_type,partner_name,weekly_commitment,duration_weeks,participation_mode,kickoff_at,min_team_size,target_team_size,max_team_size)')
    .eq('user_id',user.id)
    .order('offered_at',{ascending:false});

  if(error){
    console.error('member project offers query failed',{user_id:user.id,code:error.code,message:error.message});
    return NextResponse.json({error:'We could not load your project offers right now.'},{status:500});
  }

  let offers=(data||[]) as unknown as OfferRow[];
  const service=serviceDb();

  // Self-heal accepted Offers that were durably recorded but did not complete
  // canonical formation (for example, a transient formation/start failure after
  // Phase 8 acceptance). This is idempotent: Phase 10 reuses existing membership
  // and the Phase 9 activation boundary returns already-started when appropriate.
  if(service){
    const stranded=offers.filter(offer=>
      offer.status==='accepted'
      && !offer.capacity_released_at
      && !offer.capacity_consumed_at
    );
    for(const offer of stranded){
      try{
        const {data:formationData,error:formationError}=await service.rpc('phase10_form_accepted_offer',{p_application_id:String(offer.application_id)});
        if(formationError)throw formationError;
        const formation=(formationData||{}) as FormationResult;
        const independent=formation.participation_preference==='solo'||formation.participation_preference==='flexible';
        const onePerson=Math.max(1,Number(formation.required_team_size||1))===1;
        if(independent&&onePerson&&formation.run_id){
          await startProjectRun({
            db:service,
            projectId:offer.project_id,
            runId:formation.run_id,
            source:'manual',
            actorUserId:user.id
          });
        }
      }catch(recoveryError){
        console.error('accepted project offer self-heal failed',{
          user_id:user.id,
          offer_id:offer.id,
          application_id:offer.application_id,
          project_id:offer.project_id,
          error:recoveryError
        });
      }
    }

    if(stranded.length){
      const refreshed=await auth
        .from('project_offers')
        .select('id,application_id,project_id,project_run_id,status,offered_at,expires_at,accepted_at,declined_at,expired_at,capacity_reserved_at,capacity_released_at,capacity_consumed_at,projects(title,project_type,partner_name,weekly_commitment,duration_weeks,participation_mode,kickoff_at,min_team_size,target_team_size,max_team_size)')
        .eq('user_id',user.id)
        .order('offered_at',{ascending:false});
      if(!refreshed.error)offers=(refreshed.data||[]) as unknown as OfferRow[];
      else console.error('member project offers refresh after self-heal failed',{user_id:user.id,code:refreshed.error.code,message:refreshed.error.message});
    }
  }

  const projectIds=[...new Set(offers.map(offer=>offer.project_id).filter(Boolean))];
  const aggregate=new Map<string,{confirmed:number;reserved:number}>();

  if(service&&projectIds.length){
    const [{data:members,error:memberError},{data:reservations,error:reservationError}]=await Promise.all([
      service.from('project_members').select('project_id,membership_status').in('project_id',projectIds).in('membership_status',['waiting','active']),
      service.from('project_offers').select('project_id,status,capacity_released_at,capacity_consumed_at').in('project_id',projectIds).in('status',['pending','accepted']).is('capacity_released_at',null).is('capacity_consumed_at',null)
    ]);
    if(memberError)console.error('member project offer team aggregate failed',{user_id:user.id,code:memberError.code,message:memberError.message});
    if(reservationError)console.error('member project offer reservation aggregate failed',{user_id:user.id,code:reservationError.code,message:reservationError.message});
    for(const projectId of projectIds){
      aggregate.set(projectId,{
        confirmed:(members||[]).filter(item=>item.project_id===projectId).length,
        reserved:(reservations||[]).filter(item=>item.project_id===projectId).length
      });
    }
  }

  const enriched=offers.map(offer=>{
    const project=Array.isArray(offer.projects)?offer.projects[0]||null:offer.projects;
    const fallbackReserved=(offer.status==='pending'||offer.status==='accepted')&&!offer.capacity_consumed_at?1:0;
    const counts=aggregate.get(offer.project_id)||{confirmed:0,reserved:fallbackReserved};
    return{
      ...offer,
      team_state:{
        confirmed:counts.confirmed,
        reserved:counts.reserved,
        minimum:Math.max(1,Number(project?.min_team_size||1)),
        target:Math.max(1,Number(project?.target_team_size||project?.min_team_size||1)),
        maximum:Math.max(1,Number(project?.max_team_size||project?.target_team_size||project?.min_team_size||1))
      }
    };
  });

  return NextResponse.json({offers:enriched});
}
