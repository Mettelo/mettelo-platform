import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const allowedTypes=new Set(['contact','partnership','project_application','contributor','feedback']);

export async function POST(request:Request){
  try{
    const {formType,data}=await request.json();
    if(!allowedTypes.has(formType) || !data || typeof data!=='object'){
      return NextResponse.json({error:'Invalid form submission.'},{status:400});
    }
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url || !serviceKey){
      return NextResponse.json({error:'Submissions are temporarily unavailable. Please contact Mettelo through the Community page.'},{status:503});
    }
    const supabase=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {error}=await supabase.from('form_submissions').insert({form_type:formType,payload:data,status:'new'});
    if(error){
      console.error('form submission error',error);
      return NextResponse.json({error:'We could not save your submission. Please try again.'},{status:500});
    }
    return NextResponse.json({ok:true});
  }catch{
    return NextResponse.json({error:'Invalid request.'},{status:400});
  }
}
