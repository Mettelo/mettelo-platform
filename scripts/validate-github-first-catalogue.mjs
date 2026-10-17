#!/usr/bin/env node
// Read-only, deterministic 50-project source-contract validator.
// Usage: node scripts/validate-github-first-catalogue.mjs path/to/projects.json
// Does not access Supabase, change files, fetch untrusted URLs or deploy.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const ID=/^MTL-(DA|DE|DS|AI|XF|BA)-(\d{3})$/;
const allowedTracks=new Set(['Data Analytics','Data Engineering','Data Science','Artificial Intelligence','Cross-Functional','Business Analysis']);
const isNonempty=v=>typeof v==='string'&&v.trim().length>0;
const distinctStrings=v=>Array.isArray(v)&&v.length>0&&v.every(isNonempty)&&new Set(v.map(s=>s.trim().toLowerCase())).size===v.length;
export function validateCatalogue(rows,{expectedCount=50}={}){
  const errors=[];const warnings=[];const ids=new Set();const suffixes=new Set();const urls=new Set();
  if(!Array.isArray(rows))return {ok:false,errors:['Root must be a JSON array.'],warnings:[],count:0};
  if(rows.length!==expectedCount)errors.push(`Expected ${expectedCount} records; got ${rows.length}.`);
  for(const [index,p] of rows.entries()){
    const where=`record[${index}]`;
    if(!p||typeof p!=='object'||Array.isArray(p)){errors.push(`${where}: object required`);continue}
    const id=isNonempty(p.id)?p.id.trim():`(missing #${index+1})`;
    const match=ID.exec(id);
    if(!match)errors.push(`${where}: invalid id ${id}`);
    if(ids.has(id))errors.push(`${where}: duplicate id ${id}`);
    ids.add(id);
    if(match){const n=Number(match[2]);if(n<1||n>expectedCount)errors.push(`${where}: out-of-range project number ${n}`);if(suffixes.has(n))errors.push(`${where}: repeated numeric suffix ${n}`);suffixes.add(n)}
    for(const key of ['name','brief','problem','sector','status'])if(!isNonempty(p[key]))errors.push(`${id}: missing ${key}`);
    if(!allowedTracks.has(p.track))errors.push(`${id}: unsupported track`);
    if(!distinctStrings(p.roles))errors.push(`${id}: roles must be nonempty distinct strings`);
    if(!distinctStrings(p.capabilities))errors.push(`${id}: capabilities must be nonempty distinct strings`);
    if(p.status!=='Available')errors.push(`${id}: unexpected catalogue status ${String(p.status)}`);
    if(!isNonempty(p.repository)){errors.push(`${id}: missing repository`)}
    else {
      let url;try{url=new URL(p.repository)}catch{}
      if(!url||url.protocol!=='https:'||url.hostname!=='github.com'||url.username||url.password||url.search||url.hash||!/^\/Mettelo\/[A-Za-z0-9_.-]+\/?$/.test(url.pathname))errors.push(`${id}: invalid master GitHub repository URL`);
      const normalized=url?.pathname.replace(/\/$/,'').toLowerCase();
      if(normalized&&urls.has(normalized))errors.push(`${id}: duplicate master repository`);
      if(normalized)urls.add(normalized);
    }
    for(const key of ['use_case','data_source'])if(!isNonempty(p[key]))warnings.push(`${id}: optional ${key} is empty; show approved brief/GitHub link instead of invented information`);
  }
  for(let i=1;i<=expectedCount;i++)if(!suffixes.has(i))errors.push(`Missing project numeric suffix ${String(i).padStart(3,'0')}`);
  return {ok:errors.length===0,errors,warnings,count:rows.length,uniqueIds:ids.size};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const file=process.argv[2];if(!file){console.error('Usage: node scripts/validate-github-first-catalogue.mjs <projects.json>');process.exit(2)}
  try{
    const result=validateCatalogue(JSON.parse(readFileSync(resolve(file),'utf8')));
    console.log(JSON.stringify(result,null,2));
    if(!result.ok)process.exitCode=1;
  }catch(error){console.error(`Catalogue validation failed: ${error.message}`);process.exitCode=1}
}
