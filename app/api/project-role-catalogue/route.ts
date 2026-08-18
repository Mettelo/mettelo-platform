import {NextResponse} from 'next/server';
import {createPublicSupabaseClient} from '@/lib/supabase/public';

export async function GET(){const db=createPublicSupabaseClient();if(!db)return NextResponse.json({items:[]});const {data,error}=await db.from('project_role_catalogue').select('id,title,description,sort_order').eq('active',true).order('sort_order').order('title');if(error)return NextResponse.json({error:'Unable to load contribution roles.'},{status:500});return NextResponse.json({items:data||[]})}
