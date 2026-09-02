import {NextResponse} from 'next/server';
import {architectContext} from '@/lib/project-governance';

export async function GET(){
 try{
  const ctx=await architectContext();if('error'in ctx)return ctx.error;
  if(!ctx.isAdmin)return NextResponse.json({error:'Admin access is required.'},{status:403});
  const {data,error}=await ctx.db.from('projects').select('id,slug,title,summary,governance_status,risk_level,created_by_user_id,updated_at').in('governance_status',['draft','changes_requested']).order('updated_at',{ascending:false}).limit(200);
  if(error)throw error;
  const creatorIds=[...new Set((data||[]).map(item=>item.created_by_user_id).filter((id):id is string=>Boolean(id)))];
  const {data:profiles,error:profileError}=creatorIds.length?await ctx.db.from('profiles').select('id,full_name').in('id',creatorIds):{data:[],error:null};
  if(profileError)throw profileError;
  const names=new Map((profiles||[]).map(item=>[item.id,item.full_name||'Project Architect']));
  return NextResponse.json({items:(data||[]).map(item=>({...item,creator_name:item.created_by_user_id?names.get(item.created_by_user_id)||'Project Architect':'Project Architect'}))});
 }catch(error){console.error('admin project experience draft index error',error);return NextResponse.json({error:'Unable to load editable canonical drafts.'},{status:500})}
}
