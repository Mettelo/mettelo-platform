import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

const allowed=new Set(['image/jpeg','image/png','image/webp']);
const extension:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};

export async function POST(request:Request){
  try{
    const auth=await createServerSupabaseClient();
    const {data:{user}}=await auth.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const form=await request.formData();
    const file=form.get('avatar');
    if(!(file instanceof File))return NextResponse.json({error:'Choose an image to upload.'},{status:400});
    if(!allowed.has(file.type))return NextResponse.json({error:'Choose a JPG, PNG or WebP image.'},{status:400});
    if(file.size>5*1024*1024)return NextResponse.json({error:'Profile images must be 5 MB or smaller.'},{status:400});
    const db=serviceDb();
    if(!db)return NextResponse.json({error:'Profile image service is not configured.'},{status:503});
    const path=`${user.id}/avatar.${extension[file.type]}`;
    const bytes=new Uint8Array(await file.arrayBuffer());
    const {error:uploadError}=await db.storage.from('profile-images').upload(path,bytes,{upsert:true,contentType:file.type,cacheControl:'3600'});
    if(uploadError)throw uploadError;
    const {data:publicData}=db.storage.from('profile-images').getPublicUrl(path);
    const avatarUrl=`${publicData.publicUrl}?v=${Date.now()}`;
    const {error:profileError}=await db.from('profiles').update({avatar_url:avatarUrl,updated_at:new Date().toISOString()}).eq('id',user.id);
    if(profileError)throw profileError;
    return NextResponse.json({ok:true,avatar_url:avatarUrl});
  }catch(error){
    console.error('profile avatar upload error',error);
    return NextResponse.json({error:'Unable to upload profile image. Please try again.'},{status:500});
  }
}

export async function DELETE(){
  try{
    const auth=await createServerSupabaseClient();
    const {data:{user}}=await auth.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Profile image service is not configured.'},{status:503});
    const {data:objects}=await db.storage.from('profile-images').list(user.id,{limit:20});
    const paths=(objects||[]).filter(item=>item.name.startsWith('avatar.')).map(item=>`${user.id}/${item.name}`);
    if(paths.length)await db.storage.from('profile-images').remove(paths);
    const {error}=await db.from('profiles').update({avatar_url:null,updated_at:new Date().toISOString()}).eq('id',user.id);if(error)throw error;
    return NextResponse.json({ok:true,avatar_url:null});
  }catch(error){console.error('profile avatar delete error',error);return NextResponse.json({error:'Unable to remove profile image.'},{status:500});}
}
