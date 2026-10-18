export type GithubProjectManifest={
 id:string;name:string;track:string;brief:string;problem:string;sector:string;
 roles:string[];capabilities:string[];repository:string;status:'Available';
};
const idPattern=/^MTL-(DA|DE|DS|AI|XF|BA)-([0-9]{3,6})$/;
const allowedTracks=new Set(['Data Analytics','Data Engineering','Data Science','Artificial Intelligence','Cross-Functional','Business Analysis']);
export function parseMetteloGithubRepository(input:unknown){
 if(typeof input!=='string'||input.length>300)return null;
 try{
  const url=new URL(input);
  if(url.protocol!=='https:'||url.hostname!=='github.com'||url.port||url.username||url.password||url.search||url.hash)return null;
  const match=/^\/Mettelo\/([A-Za-z0-9_.-]+)\/?$/.exec(url.pathname);
  if(!match||match[1]==='.'||match[1]==='..')return null;
  return {owner:'Mettelo' as const,repo:match[1],url:`https://github.com/Mettelo/${match[1]}`};
 }catch{return null}
}
export function validateGithubProjectManifest(value:unknown,repositoryUrl:string){
 const errors:string[]=[];
 const repo=parseMetteloGithubRepository(repositoryUrl);
 if(!repo)errors.push('Repository must be a GitHub URL under the Mettelo organisation.');
 if(!value||typeof value!=='object'||Array.isArray(value))return {ok:false,errors:['Project manifest must be a JSON object.'],manifest:null};
 const v=value as Record<string,unknown>;
 const str=(key:string,max:number)=>typeof v[key]==='string'&&(v[key] as string).trim().length>0&&(v[key] as string).length<=max;
 for(const [key,max] of [['id',32],['name',180],['brief',900],['problem',4000],['sector',160]] as const)if(!str(key,max))errors.push(`Missing or invalid ${key}.`);
 if(!idPattern.test(String(v.id??'')))errors.push('Project ID must follow MTL-TRACK-051 (up to six digits).');
 if(!allowedTracks.has(String(v.track??'')))errors.push('Unsupported project track.');
 for(const key of ['roles','capabilities'] as const){
  const arr=v[key];
  if(!Array.isArray(arr)||!arr.length||arr.length>30||!arr.every(x=>typeof x==='string'&&x.trim().length>0&&x.length<=120)||new Set(arr.map(x=>String(x).toLowerCase().trim())).size!==arr.length)errors.push(`Invalid ${key} list.`);
 }
 if(v.status!=='Available')errors.push('Manifest must have status Available.');
 if(repo&&v.repository!==repo.url&&v.repository!==repo.url+'/')errors.push('Manifest repository must match the URL being imported.');
 return {ok:errors.length===0,errors,manifest:errors.length?null:v as GithubProjectManifest};
}
export async function fetchGithubProjectManifest(repositoryUrl:string){
 const repo=parseMetteloGithubRepository(repositoryUrl);
 if(!repo)return {ok:false,errors:['Only https://github.com/Mettelo/<repository> is supported.'],manifest:null,commit:null};
 const token=process.env.METTELO_GITHUB_TOKEN||process.env.GITHUB_TOKEN;
 const headers:Record<string,string>={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 if(token)headers.Authorization=`Bearer ${token}`;
 try{
  // GitHub API endpoint is fixed; user input never controls the request hostname.
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),7000);
  let response:Response;
  try{response=await fetch(`https://api.github.com/repos/Mettelo/${encodeURIComponent(repo.repo)}/contents/mettelo-project.json`,{headers,signal:controller.signal,cache:'no-store',redirect:'error'})}
  finally{clearTimeout(timeout)}
  if(!response.ok)return {ok:false,errors:[response.status===404?'Repository manifest mettelo-project.json not found or inaccessible.':`GitHub API returned HTTP ${response.status}.`],manifest:null,commit:null};
  const body=await response.json() as {type?:string;encoding?:string;content?:string;sha?:string;size?:number};
  if(body.type!=='file'||body.encoding!=='base64'||typeof body.content!=='string'||body.content.length>120000||Number(body.size)>80000)return {ok:false,errors:['GitHub project manifest is missing or too large.'],manifest:null,commit:null};
  const decoded=Buffer.from(body.content.replace(/\s/g,''),'base64').toString('utf8');
  const checked=validateGithubProjectManifest(JSON.parse(decoded),repo.url);
  return {...checked,commit:body.sha||null};
 }catch{return {ok:false,errors:['Unable to validate the GitHub project manifest.'],manifest:null,commit:null}}
}
