export type NormalizedProfessionalLink={ok:true;value:string|null}|{ok:false;error:string};

export function normalizeProfessionalLink(input:unknown):NormalizedProfessionalLink{
  const raw=String(input||'').trim();
  if(!raw)return{ok:true,value:null};
  if(raw.length>500)return{ok:false,error:'Professional link is too long.'};
  const candidate=/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)?raw:`https://${raw}`;
  try{
    const url=new URL(candidate);
    if(url.protocol!=='http:'&&url.protocol!=='https:')return{ok:false,error:'Enter a valid http or https professional link.'};
    if(!url.hostname)return{ok:false,error:'Enter a valid professional link.'};
    const normalized=url.toString();
    if(normalized.length>500)return{ok:false,error:'Professional link is too long.'};
    return{ok:true,value:normalized};
  }catch{return{ok:false,error:'Enter a valid professional link.'}}
}
