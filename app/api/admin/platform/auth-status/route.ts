import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {getPlatformAuthStatus} from '@/lib/platform-auth-status';

export const dynamic='force-dynamic';

export async function GET(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
 if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
 if(!hasAdminCapability(user,'platform.settings.manage'))return NextResponse.json({error:'Platform settings capability required.'},{status:403});
 const status=await getPlatformAuthStatus();
 return NextResponse.json({status});
}
