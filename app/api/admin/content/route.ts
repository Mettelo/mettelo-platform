import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function slugify(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);}
function text(value:unknown,max=2000){return String(value??'').trim().slice(0,max);}
function slugs(value:unknown){return Array.isArray(value)?[...new Set(value.map(v=>text(v,120)).filter(Boolean))].slice(0,30):[];}

export async function POST(request:Request){
  try{
    const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
    if(!user) return NextResponse.json({error:'Authentication required.'},{status:401});
    if(user.app_metadata?.role!=='admin') return NextResponse.json({error:'Admin access required.'},{status:403});
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!serviceKey) return NextResponse.json({error:'Admin data service is not configured.'},{status:503});
    const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});const body=await request.json();const resource=text(body.resource,40);const title=text(body.title,180);const slug=slugify(text(body.slug||title,120));
    if(!title||!slug) return NextResponse.json({error:'Title is required.'},{status:400});

    if(resource==='project'){
      const status=text(body.status,30)||'draft';if(!['draft','pilot','recruiting','active','review','completed','archived'].includes(status)) return NextResponse.json({error:'Invalid project status.'},{status:400});
      const summary=text(body.summary,700);if(!summary) return NextResponse.json({error:'Project summary is required.'},{status:400});
      const difficulty=text(body.difficulty_level,30);if(difficulty&&!['entry','intermediate','advanced'].includes(difficulty))return NextResponse.json({error:'Invalid project level.'},{status:400});
      const locationType=text(body.location_type,30);if(locationType&&!['remote','hybrid','onsite'].includes(locationType))return NextResponse.json({error:'Invalid working model.'},{status:400});
      if(status==='completed'){const {data:existing}=await db.from('projects').select('id,status').eq('slug',slug).maybeSingle();if(!existing)return NextResponse.json({error:'A project cannot be created directly as Completed. Create and deliver it through the project workflow first.'},{status:409});}

      const primaryDomain=text(body.primary_domain,120);const requestedDomains=[...new Set([primaryDomain,...slugs(body.domains)].filter(Boolean))];const requestedTools=slugs(body.tools);const requestedMethods=slugs(body.methods);
      const [domainRows,toolRows,methodRows]=await Promise.all([
        requestedDomains.length?db.from('domains').select('id,slug').in('slug',requestedDomains):Promise.resolve({data:[],error:null}),
        requestedTools.length?db.from('tools').select('id,slug').in('slug',requestedTools):Promise.resolve({data:[],error:null}),
        requestedMethods.length?db.from('methods').select('id,slug').in('slug',requestedMethods):Promise.resolve({data:[],error:null})
      ]);
      if(domainRows.error||toolRows.error||methodRows.error)throw domainRows.error||toolRows.error||methodRows.error;
      if((domainRows.data||[]).length!==requestedDomains.length||(toolRows.data||[]).length!==requestedTools.length||(methodRows.data||[]).length!==requestedMethods.length)return NextResponse.json({error:'One or more project taxonomy selections are invalid. Refresh Admin and try again.'},{status:400});

      const {data,error}=await db.from('projects').upsert({slug,title,summary,problem_statement:text(body.problem_statement,2000)||null,status,visibility:'public',location:text(body.location,160)||null,location_type:locationType||null,difficulty_level:difficulty||null,duration_weeks:body.duration_weeks?Number(body.duration_weeks):null,weekly_commitment:text(body.weekly_commitment,120)||null,application_deadline:body.application_deadline||null,starts_at:body.starts_at||null,github_url:text(body.github_url,400)||null,presentation_required:body.presentation_required===true||body.presentation_required==='on'||body.presentation_required==='true',updated_at:new Date().toISOString()},{onConflict:'slug'}).select('*').single();
      if(error){if(error.message?.includes('Project is not ready for completion'))return NextResponse.json({error:'Project cannot be marked Completed until required milestones/tasks, member Proof and any required presentation are verified.'},{status:409});throw error;}

      const [clearDomains,clearTools,clearMethods]=await Promise.all([
        db.from('project_domains').delete().eq('project_id',data.id),db.from('project_tools').delete().eq('project_id',data.id),db.from('project_methods').delete().eq('project_id',data.id)
      ]);
      if(clearDomains.error||clearTools.error||clearMethods.error)throw clearDomains.error||clearTools.error||clearMethods.error;
      const domainLinks=(domainRows.data||[]).map(row=>({project_id:data.id,domain_id:row.id,is_primary:row.slug===primaryDomain}));const toolLinks=(toolRows.data||[]).map(row=>({project_id:data.id,tool_id:row.id}));const methodLinks=(methodRows.data||[]).map(row=>({project_id:data.id,method_id:row.id}));
      const [saveDomains,saveTools,saveMethods]=await Promise.all([
        domainLinks.length?db.from('project_domains').insert(domainLinks):Promise.resolve({error:null}),toolLinks.length?db.from('project_tools').insert(toolLinks):Promise.resolve({error:null}),methodLinks.length?db.from('project_methods').insert(methodLinks):Promise.resolve({error:null})
      ]);
      if(saveDomains.error||saveTools.error||saveMethods.error)throw saveDomains.error||saveTools.error||saveMethods.error;
      return NextResponse.json({ok:true,item:data});
    }

    if(resource==='opportunity'){
      const status=text(body.status,30)||'draft';const opportunityType=text(body.opportunity_type,30);if(!['job','referral','volunteer','fellowship','freelance','consulting','project','other'].includes(opportunityType)) return NextResponse.json({error:'Choose a valid opportunity type.'},{status:400});if(!['draft','published','closed','archived'].includes(status)) return NextResponse.json({error:'Invalid opportunity status.'},{status:400});const sourceUrl=text(body.source_url,500);if(status==='published'&&!sourceUrl)return NextResponse.json({error:'Published opportunities need a source or application URL.'},{status:400});
      const {data,error}=await db.from('opportunities').upsert({slug,title,organisation:text(body.organisation,180)||null,opportunity_type:opportunityType,summary:text(body.summary,900)||null,location:text(body.location,180)||null,eligibility:text(body.eligibility,900)||null,source_url:sourceUrl||null,access_level:body.access_level==='members'?'members':'public',status,published_at:status==='published'?new Date().toISOString():null,closes_at:body.closes_at||null,updated_at:new Date().toISOString()},{onConflict:'slug'}).select('*').single();if(error)throw error;return NextResponse.json({ok:true,item:data});
    }

    if(resource==='event'){
      const status=text(body.status,30)||'draft';const eventType=text(body.event_type,30);if(!['ama','workshop','showcase','networking','build_sprint','webinar','meetup','other'].includes(eventType))return NextResponse.json({error:'Choose a valid event type.'},{status:400});if(!['draft','published','completed','cancelled'].includes(status))return NextResponse.json({error:'Invalid event status.'},{status:400});if(!body.starts_at)return NextResponse.json({error:'Event start date and time are required.'},{status:400});const registrationUrl=text(body.registration_url,500);if(status==='published'&&!registrationUrl)return NextResponse.json({error:'Published events need a real registration URL.'},{status:400});
      const {data,error}=await db.from('events').upsert({slug,title,event_type:eventType,summary:text(body.summary,900)||null,starts_at:body.starts_at,ends_at:body.ends_at||null,location_label:text(body.location_label,180)||null,registration_url:registrationUrl||null,replay_url:text(body.replay_url,500)||null,status,updated_at:new Date().toISOString()},{onConflict:'slug'}).select('*').single();if(error)throw error;return NextResponse.json({ok:true,item:data});
    }
    return NextResponse.json({error:'Unknown content type.'},{status:400});
  }catch(error){console.error('admin content error',error);return NextResponse.json({error:'Unable to save this content. Check the fields and try again.'},{status:500});}
}
