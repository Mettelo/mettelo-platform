import { NextResponse } from 'next/server';
import { createPublicSupabaseClient } from '@/lib/supabase/public';

export async function GET(){
  const db=createPublicSupabaseClient();
  if(!db) return NextResponse.json({domains:[],tools:[],methods:[]});
  const [domains,tools,methods]=await Promise.all([
    db.from('domains').select('slug,name,sort_order').eq('is_active',true).order('sort_order'),
    db.from('tools').select('slug,name,category,sort_order').eq('is_active',true).order('sort_order'),
    db.from('methods').select('slug,name,category,sort_order').eq('is_active',true).order('sort_order')
  ]);
  if(domains.error||tools.error||methods.error) return NextResponse.json({error:'Unable to load project taxonomy.'},{status:500});
  return NextResponse.json({domains:domains.data||[],tools:tools.data||[],methods:methods.data||[]});
}
