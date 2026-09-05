export const RESERVED_USERNAMES=new Set([
  'admin','administrator','api','auth','billing','community','contact','help','info','mettelo','moderator','root','security','staff','support','system','team'
]);

export function normalizeUsername(value:string){
  return value.trim().toLowerCase();
}

export function validateUsername(value:string){
  const username=normalizeUsername(value);
  if(username.length<3||username.length>30)return {ok:false as const,username,error:'Username must be 3 to 30 characters.'};
  if(!/^[a-z][a-z0-9_]*$/.test(username))return {ok:false as const,username,error:'Use lowercase letters, numbers or underscores, and start with a letter.'};
  if(RESERVED_USERNAMES.has(username))return {ok:false as const,username,error:'That username is reserved. Choose another.'};
  return {ok:true as const,username,error:''};
}
