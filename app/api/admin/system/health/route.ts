import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {getAdminSystemHealth} from '@/lib/admin-system-health';

export const dynamic='force-dynamic';

export async function GET(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
 if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
 if(!hasAdminCapability(user,'system.audit.read'))return NextResponse.json({error:'System health access requires audit-read capability.'},{status:403});
 const health=await getAdminSystemHealth();
 return NextResponse.json({...health,can_manage_delivery:hasAdminCapability(user,'communications.manage')},{headers:{'cache-control':'no-store'}});
}
