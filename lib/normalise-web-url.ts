export type NormalisedWebUrl=
  |{ok:true;value:string}
  |{ok:false;value:string};

const DOMAIN_LABEL=/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

/**
 * Normalise an optional public web address without making users type a scheme.
 * Empty values remain empty; non-empty values must be an HTTP(S) URL with a
 * plausible public domain name.
 */
export function normaliseOptionalWebUrl(input:string):NormalisedWebUrl{
  const value=input.trim();
  if(!value)return{ok:true,value:''};

  const candidate=/^https?:\/\//i.test(value)?value:`https://${value}`;
  try{
    const url=new URL(candidate);
    const labels=url.hostname.toLowerCase().split('.');
    const hasPlausibleDomain=labels.length>=2&&labels.every(label=>DOMAIN_LABEL.test(label))&&/[a-z]/i.test(labels.at(-1)||'');
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!hasPlausibleDomain)return{ok:false,value};
    return{ok:true,value:url.toString()};
  }catch{
    return{ok:false,value};
  }
}
