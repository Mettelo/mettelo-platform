import { createClient } from '@supabase/supabase-js';

const email=String(process.argv[2]||'').trim().toLowerCase();
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;

if(!email){
  console.error('Usage: npm run admin:promote -- you@example.com');
  process.exit(1);
}
if(!/^\S+@\S+\.\S+$/.test(email)){
  console.error('Provide a valid email address.');
  process.exit(1);
}
if(!url||!serviceKey){
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const supabase=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
let page=1;
let matched=null;
while(!matched){
  const {data,error}=await supabase.auth.admin.listUsers({page,perPage:100});
  if(error) throw error;
  matched=data.users.find(user=>user.email?.toLowerCase()===email)||null;
  if(matched||data.users.length<100) break;
  page+=1;
}

if(!matched){
  console.error(`No Supabase user exists for ${email}. Create and confirm the account first.`);
  process.exit(1);
}

const existingRole=matched.app_metadata?.role;
if(existingRole==='admin'){
  console.log(`${email} is already an admin.`);
  process.exit(0);
}

const {error}=await supabase.auth.admin.updateUserById(matched.id,{
  app_metadata:{...matched.app_metadata,role:'admin'}
});
if(error) throw error;
console.log(`Promoted ${email} to Mettelo admin.`);
