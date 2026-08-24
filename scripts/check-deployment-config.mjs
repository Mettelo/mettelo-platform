const required=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'];
const missing=required.filter(name=>!process.env[name]?.trim());
if(missing.length){
  console.error('Deployment configuration is incomplete. Set the following server environment variables before building: '+missing.join(', '));
  process.exit(1);
}
console.log('Deployment configuration check passed.');
