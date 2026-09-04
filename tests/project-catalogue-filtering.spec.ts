import {expect,test} from '@playwright/test';
import {
  DEFAULT_PROJECT_CATALOGUE_FILTERS,activeProjectCatalogueFilterCount,catalogueDurationOptions,catalogueFacetOptions,catalogueSearchText,durationFacet,filterAndSortProjectCatalogue,normalizeCommitment,normalizeExperienceLevel,projectAvailabilityFacet,projectFormatFacet,projectStageFacet,projectTypeFacet,workingModelFacet,type CatalogueFacet,type ProjectCatalogueFilterable,type ProjectCatalogueFilters
} from '../lib/project-catalogue-filtering';

const facet=(slug:string,label:string,aliases:string[]=[]):CatalogueFacet=>({slug,label,aliases});
function item(overrides:Partial<ProjectCatalogueFilterable>&{title:string}):ProjectCatalogueFilterable{return{title:overrides.title,summary:overrides.summary||'',createdAt:overrides.createdAt||'2026-09-01T12:00:00.000Z',deadline:overrides.deadline===undefined?'2026-10-01T12:00:00.000Z':overrides.deadline,durationWeeks:overrides.durationWeeks===undefined?4:overrides.durationWeeks,commitmentFacet:overrides.commitmentFacet===undefined?normalizeCommitment('5–7 hours'):overrides.commitmentFacet,workingModelFacet:overrides.workingModelFacet===undefined?workingModelFacet('remote'):overrides.workingModelFacet,projectTypeFacet:overrides.projectTypeFacet===undefined?projectTypeFacet('open'):overrides.projectTypeFacet,stageFacet:overrides.stageFacet===undefined?projectStageFacet('open'):overrides.stageFacet,experienceFacet:overrides.experienceFacet??normalizeExperienceLevel('intermediate'),formatFacet:overrides.formatFacet??projectFormatFacet(5),availabilityFacet:overrides.availabilityFacet??projectAvailabilityFacet({status:'open',applicationsOpen:true,hasCapacity:true}),roleFamilies:overrides.roleFamilies||[facet('data-analyst','Data Analyst')],capabilities:overrides.capabilities||[facet('data-quality','Data Quality')],domains:overrides.domains||[facet('finance-fintech','Finance & FinTech')],tools:overrides.tools||[facet('python','Python')],methods:overrides.methods||[facet('forecasting','Forecasting')],searchExtra:overrides.searchExtra||[]}}
function filters(overrides:Partial<ProjectCatalogueFilters>):ProjectCatalogueFilters{return{...DEFAULT_PROJECT_CATALOGUE_FILTERS,...overrides}}

test('legacy project values normalize into canonical public discovery bands',()=>{
  expect(normalizeExperienceLevel('entry')).toEqual({slug:'beginner',label:'Beginner'});
  expect(normalizeExperienceLevel('foundation')).toEqual({slug:'beginner',label:'Beginner'});
  expect(normalizeExperienceLevel('Intermediate–Advanced')).toEqual({slug:'intermediate',label:'Intermediate'});
  expect(normalizeExperienceLevel('capstone')).toEqual({slug:'advanced',label:'Advanced'});
  expect(normalizeCommitment('2-3 hours/week')).toEqual({slug:'up-to-3-hours',label:'Up to 3 hours/week'});
  expect(normalizeCommitment('5–7 hrs/week')).toEqual({slug:'5-7-hours',label:'5–7 hours/week'});
  expect(normalizeCommitment('11+ hours/week')).toEqual({slug:'10-plus-hours',label:'10+ hours/week'});
  expect(normalizeCommitment('not specified')).toBeNull();
  expect(durationFacet(2)).toEqual({slug:'short',label:'Short · up to 3 weeks'});
  expect(durationFacet(5)).toEqual({slug:'standard',label:'Standard · 4–6 weeks'});
  expect(durationFacet(8)).toEqual({slug:'extended',label:'Extended · 7+ weeks'});
});

test('governed display facets use product wording without replacing lifecycle values',()=>{
  expect(workingModelFacet('remote')).toEqual({slug:'remote',label:'Remote'});
  expect(workingModelFacet('on-site')).toEqual({slug:'onsite',label:'On-site'});
  expect(projectTypeFacet('open')).toEqual({slug:'open',label:'Mettelo Open Projects'});
  expect(projectTypeFacet('partner')).toEqual({slug:'partner',label:'Partner Projects'});
  expect(projectFormatFacet(1)).toEqual({slug:'solo',label:'Solo'});
  expect(projectFormatFacet(5)).toEqual({slug:'team',label:'Team'});
  expect(projectStageFacet('forming')).toEqual({slug:'forming',label:'Team forming'});
  expect(projectAvailabilityFacet({status:'open',applicationsOpen:true,hasCapacity:true})?.slug).toBe('open-to-join');
  expect(projectAvailabilityFacet({status:'forming'})?.slug).toBe('team-forming');
  expect(projectAvailabilityFacet({status:'active'})?.slug).toBe('in-progress');
  expect(projectAvailabilityFacet({status:'completed'})?.slug).toBe('completed');
});

test('catalogue filters use AND semantics across canonical facets',()=>{
  const projects=[item({title:'Finance Forecasting',durationWeeks:4,capabilities:[facet('forecasting','Forecasting')],domains:[facet('finance-fintech','Finance & FinTech')],tools:[facet('python','Python')]}),item({title:'Healthcare Forecasting',durationWeeks:8,capabilities:[facet('forecasting','Forecasting')],domains:[facet('healthcare-life-sciences','Healthcare & Life Sciences')],tools:[facet('python','Python')]}),item({title:'Finance SQL Quality',durationWeeks:8,capabilities:[facet('data-quality','Data Quality')],domains:[facet('finance-fintech','Finance & FinTech')],tools:[facet('sql','SQL')]})];
  expect(filterAndSortProjectCatalogue(projects,filters({capability:'forecasting'})).map(value=>value.title)).toEqual(['Finance Forecasting','Healthcare Forecasting']);
  expect(filterAndSortProjectCatalogue(projects,filters({capability:'forecasting',domain:'finance-fintech',tool:'python',duration:'standard',experience:'intermediate',format:'team'})).map(value=>value.title)).toEqual(['Finance Forecasting']);
  expect(filterAndSortProjectCatalogue(projects,filters({capability:'forecasting',domain:'finance-fintech',tool:'sql'}))).toEqual([]);
});

test('search covers canonical facets, aliases, methods and project-specific context',()=>{
  const project=item({title:'Trustworthy Model Review',capabilities:[facet('machine-learning','Machine Learning',['ml'])],domains:[facet('government-public-sector','Government & Public Sector')],tools:[facet('python','Python')],methods:[facet('model-explainability','Model Explainability')],searchExtra:['Senior Data Analyst','AI Assurance Path','Stage 2']});
  for(const query of ['machine learning','ml','government','python','explainability','senior data analyst','assurance path','standard'])expect(filterAndSortProjectCatalogue([project],filters({query}))).toHaveLength(1);
  expect(catalogueSearchText(project)).toContain('stage 2');
});

test('governed options stay complete while taxonomy associations remain data-driven',()=>{
  const projects=[item({title:'One',durationWeeks:2}),item({title:'Two',durationWeeks:8,capabilities:[facet('forecasting','Forecasting')]}),item({title:'Unknown',durationWeeks:null})];
  expect(catalogueFacetOptions(projects,'capabilities').map(value=>value.slug)).toEqual(['data-quality','forecasting']);
  expect(catalogueDurationOptions(projects).map(value=>value.slug)).toEqual(['short','standard','extended']);
});

test('approved sorting is deterministic and keeps missing dates or durations last',()=>{
  const projects=[item({title:'Older short',createdAt:'2026-08-01T00:00:00.000Z',deadline:'2026-09-20T00:00:00.000Z',durationWeeks:2,commitmentFacet:normalizeCommitment('2 hours/week')}),item({title:'Newest long',createdAt:'2026-09-02T00:00:00.000Z',deadline:'2026-10-20T00:00:00.000Z',durationWeeks:8,commitmentFacet:normalizeCommitment('10+ hours/week')}),item({title:'Unknown',createdAt:'2026-09-01T00:00:00.000Z',deadline:null,durationWeeks:null,commitmentFacet:null})];
  expect(filterAndSortProjectCatalogue(projects,filters({sort:'newest'})).map(value=>value.title)).toEqual(['Newest long','Unknown','Older short']);
  expect(filterAndSortProjectCatalogue(projects,filters({sort:'closing'})).map(value=>value.title)).toEqual(['Older short','Newest long','Unknown']);
  expect(filterAndSortProjectCatalogue(projects,filters({sort:'duration-short'})).map(value=>value.title)).toEqual(['Older short','Newest long','Unknown']);
  expect(filterAndSortProjectCatalogue(projects,filters({sort:'commitment-low'})).map(value=>value.title)).toEqual(['Older short','Newest long','Unknown']);
});

test('recommended sorting prioritises joinable work before recency',()=>{
  const joinable=item({title:'Joinable',createdAt:'2026-08-01T00:00:00.000Z',availabilityFacet:projectAvailabilityFacet({status:'open',applicationsOpen:true,hasCapacity:true})});
  const completed=item({title:'Completed newer',createdAt:'2026-09-03T00:00:00.000Z',availabilityFacet:projectAvailabilityFacet({status:'completed'})});
  expect(filterAndSortProjectCatalogue([completed,joinable],filters({sort:'recommended'})).map(value=>value.title)).toEqual(['Joinable','Completed newer']);
});

test('active filter count excludes search and sort but includes new canonical dimensions',()=>{
  expect(activeProjectCatalogueFilterCount(filters({query:'forecast',sort:'closing'}))).toBe(0);
  expect(activeProjectCatalogueFilterCount(filters({role:'data-analyst',experience:'intermediate',format:'team',capability:'forecasting',domain:'finance-fintech',duration:'standard',availability:'open-to-join'}))).toBe(7);
});
