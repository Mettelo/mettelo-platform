export type CatalogueFacet={slug:string;label:string;aliases?:string[]};
export type ProjectCatalogueSort='recent'|'closing'|'duration-short'|'duration-long';

export type ProjectCatalogueFilterable={
  title:string;
  summary:string;
  createdAt:string;
  deadline:string|null;
  durationWeeks:number|null;
  commitmentFacet:CatalogueFacet|null;
  workingModelFacet:CatalogueFacet|null;
  projectTypeFacet:CatalogueFacet|null;
  stageFacet:CatalogueFacet|null;
  roleFamilies:CatalogueFacet[];
  capabilities:CatalogueFacet[];
  domains:CatalogueFacet[];
  tools:CatalogueFacet[];
  methods:CatalogueFacet[];
  searchExtra?:string[];
};

export type ProjectCatalogueFilters={
  query:string;
  role:string;
  capability:string;
  domain:string;
  tool:string;
  commitment:string;
  workingModel:string;
  projectType:string;
  stage:string;
  duration:string;
  sort:ProjectCatalogueSort;
};

export const DEFAULT_PROJECT_CATALOGUE_FILTERS:ProjectCatalogueFilters={
  query:'',role:'all',capability:'all',domain:'all',tool:'all',commitment:'all',workingModel:'all',projectType:'all',stage:'all',duration:'all',sort:'recent'
};

export function normalizeCommitment(value:string|null|undefined):CatalogueFacet|null{
  const raw=value?.trim();
  if(!raw)return null;
  const normalized=raw.replace(/[–—]/g,'-').replace(/\s+/g,' ');
  const range=normalized.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
  if(range){
    const min=range[1],max=range[2];
    return{slug:`${min}-${max}-hours`,label:`${min}–${max} hours`};
  }
  const single=normalized.match(/^\s*(\d+(?:\.\d+)?)\s*(?:(?:hours?|hrs?))?(?:\s|$)/i);
  if(single){
    const amount=single[1];
    return{slug:`${amount}-hours`,label:`${amount} ${Number(amount)===1?'hour':'hours'}`};
  }
  return null;
}

export function durationFacet(value:number|null|undefined):CatalogueFacet|null{
  if(!value||value<=0)return null;
  return{slug:`${value}-weeks`,label:`${value} ${value===1?'week':'weeks'}`};
}

export function workingModelFacet(value:string|null|undefined):CatalogueFacet|null{
  const key=value?.trim().toLowerCase().replace(/[_\s]+/g,'-');
  if(!key)return null;
  if(key==='remote')return{slug:'remote',label:'Remote'};
  if(key==='hybrid')return{slug:'hybrid',label:'Hybrid'};
  if(['onsite','on-site'].includes(key))return{slug:'onsite',label:'On-site'};
  return null;
}

export function projectTypeFacet(value:string|null|undefined):CatalogueFacet|null{
  const key=value?.trim().toLowerCase();
  if(key==='open')return{slug:'open',label:'Open Project'};
  if(key==='partner')return{slug:'partner',label:'Partner Project'};
  return null;
}

export function projectStageFacet(value:string|null|undefined):CatalogueFacet|null{
  const key=value?.trim().toLowerCase();
  const labels:Record<string,string>={pilot:'Pilot',recruiting:'Recruiting',open:'Open',forming:'Team forming',active:'Active',review:'In review',completed:'Completed'};
  return key&&labels[key]?{slug:key,label:labels[key]}:null;
}

function facetText(facet:CatalogueFacet){
  return[facet.label,facet.slug,...(facet.aliases||[])].join(' ');
}

export function catalogueSearchText(item:ProjectCatalogueFilterable){
  return[
    item.title,item.summary,
    ...item.roleFamilies.map(facetText),
    ...item.capabilities.map(facetText),
    ...item.domains.map(facetText),
    ...item.tools.map(facetText),
    ...item.methods.map(facetText),
    item.commitmentFacet?facetText(item.commitmentFacet):'',
    item.workingModelFacet?facetText(item.workingModelFacet):'',
    item.projectTypeFacet?facetText(item.projectTypeFacet):'',
    item.stageFacet?facetText(item.stageFacet):'',
    durationFacet(item.durationWeeks)?facetText(durationFacet(item.durationWeeks)!):'',
    ...(item.searchExtra||[])
  ].join(' ').toLowerCase();
}

function hasFacet(values:CatalogueFacet[],slug:string){return slug==='all'||values.some(item=>item.slug===slug)}
function hasSingle(value:CatalogueFacet|null,slug:string){return slug==='all'||value?.slug===slug}
function timestamp(value:string|null){if(!value)return null;const n=new Date(value).getTime();return Number.isFinite(n)?n:null}
function recentTieBreak(a:ProjectCatalogueFilterable,b:ProjectCatalogueFilterable){return(timestamp(b.createdAt)||0)-(timestamp(a.createdAt)||0)||a.title.localeCompare(b.title)}

export function filterAndSortProjectCatalogue<T extends ProjectCatalogueFilterable>(projects:T[],filters:ProjectCatalogueFilters):T[]{
  const q=filters.query.trim().toLowerCase();
  const filtered=projects.filter(item=>(!q||catalogueSearchText(item).includes(q))
    &&hasFacet(item.roleFamilies,filters.role)
    &&hasFacet(item.capabilities,filters.capability)
    &&hasFacet(item.domains,filters.domain)
    &&hasFacet(item.tools,filters.tool)
    &&hasSingle(item.commitmentFacet,filters.commitment)
    &&hasSingle(item.workingModelFacet,filters.workingModel)
    &&hasSingle(item.projectTypeFacet,filters.projectType)
    &&hasSingle(item.stageFacet,filters.stage)
    &&hasSingle(durationFacet(item.durationWeeks),filters.duration));

  return[...filtered].sort((a,b)=>{
    if(filters.sort==='closing'){
      const ad=timestamp(a.deadline),bd=timestamp(b.deadline);
      if(ad===null&&bd!==null)return 1;
      if(ad!==null&&bd===null)return-1;
      if(ad!==null&&bd!==null&&ad!==bd)return ad-bd;
      return recentTieBreak(a,b);
    }
    if(filters.sort==='duration-short'||filters.sort==='duration-long'){
      const ad=a.durationWeeks,bd=b.durationWeeks;
      if(ad===null&&bd!==null)return 1;
      if(ad!==null&&bd===null)return-1;
      if(ad!==null&&bd!==null&&ad!==bd)return filters.sort==='duration-short'?ad-bd:bd-ad;
      return recentTieBreak(a,b);
    }
    return recentTieBreak(a,b);
  });
}

export function catalogueFacetOptions(projects:ProjectCatalogueFilterable[],key:'roleFamilies'|'capabilities'|'domains'|'tools'){
  const map=new Map<string,CatalogueFacet>();
  for(const item of projects)for(const facet of item[key])if(!map.has(facet.slug))map.set(facet.slug,facet);
  return[...map.values()].sort((a,b)=>a.label.localeCompare(b.label));
}

export function catalogueSingleFacetOptions(projects:ProjectCatalogueFilterable[],key:'commitmentFacet'|'workingModelFacet'|'projectTypeFacet'|'stageFacet'){
  const map=new Map<string,CatalogueFacet>();
  for(const item of projects){const facet=item[key];if(facet&&!map.has(facet.slug))map.set(facet.slug,facet)}
  return[...map.values()].sort((a,b)=>a.label.localeCompare(b.label));
}

export function catalogueDurationOptions(projects:ProjectCatalogueFilterable[]){
  return[...new Set(projects.map(item=>item.durationWeeks).filter((value):value is number=>Boolean(value&&value>0)))].sort((a,b)=>a-b).map(value=>durationFacet(value)!);
}

export function activeProjectCatalogueFilterCount(filters:ProjectCatalogueFilters){
  return[filters.role,filters.capability,filters.domain,filters.tool,filters.commitment,filters.workingModel,filters.projectType,filters.stage,filters.duration].filter(value=>value!=='all').length;
}
