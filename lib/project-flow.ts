import {createClient} from '@supabase/supabase-js';
export {notifyUser,notifyAdmins,processEmailQueue,deliverOutboxItem,enqueueEmail} from '@/lib/notifications';

export function serviceDb(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
}
