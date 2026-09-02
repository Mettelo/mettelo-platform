import {expect,test} from '@playwright/test';
import {
  DEFAULT_PROJECT_CATALOGUE_FILTERS,
  activeProjectCatalogueFilterCount,
  catalogueFacetOptions,
  catalogueSearchText,
  filterAndSortProjectCatalogue,
  normalizeCommitment,
  projectStageFacet,
  projectTypeFacet,
  workingModelFacet,
  type CatalogueFacet,
  type ProjectCatalogueFilterable,
  type ProjectCatalogueFilters
} from '../lib/project-catalogue-filtering';

const facet=(slug:string,label:string,aliases:string[]=[]):CatalogueFacet=>({slug,label,aliases});

function item(overrides:Partial<ProjectCatalogueFilterable>&{title:string}):ProjectCatalogueFilterable{
  return{
    title:overrides.title,
    summary:overrides.summary||'',
    createdAt:overrides.createdAt||'2026-09-01T12:00:00.000Z',
    deadline:overrides.deadline??'2026-10-01T12:00:00.000Z',
    durationWeeks:overrides.durationWeeks??4,
    commitmentFacet:overrides.commitmentFacet??normalizeCommitment('5–7 hours'),
    workingModelFacet:overrides.workingModelFacet??workingModelFacet('remote'),
    projectTypeFacet:overrides.projectTypeFacet??projectTypeFacet('open'),
    stageFacet:overrides.stageFacet??projectStageFacet('open'),
    roleFamilies:overrides.roleFamilies||[facet('data-analyst','Data Analyst')],
    capabilities:overrides.capabilities||[facet('data-quality','Data Quality')],
    domains:overrides.domains||[facet('finance-fintech','Finance & Fintech')],
    tools:overrides.tools||[facet('python','Python')],
    methods:overrides.methods||[facet('forecasting','Forecasting')],
    searchExtra:overrides.searchExtra||[]
  };
}

function filters(overrides:Partial<ProjectCatalogueFilters>):ProjectCatalogueFilters{return{...DEFAULT_PROJECT_CATALOGUE_FILTERS,...overrides}}

test('commitment normalization collapses semantic text variants without rewriting source history',()=>{
  expect(normalizeCommitment('5-7 hours')).toEqual({slug:'5-7-hours',label:'5–7 hours'});
  expect(normalizeCommitment('5–7 hours')).toEqual({slug:'5-7-hours',label:'5–7 hours'});
  expect(normalizeCommitment('5–7 hours per member for 5 weeks')).toEqual({slug:'5-7-hours',label:'5–7 hours'});
  expect(normalizeCommitment('1')).toEqual({slug:'1-hours',label:'1 hour'});
  expect(normalizeCommitment('not specified')).toBeNull();
});

test('governed display facets use stable slugs and product wording',()=>{
  expect(workingModelFacet('remote')).toEqual({slug:'remote',label:'Remote'});
  expect(workingModelFacet('on-site')).toEqual({slug:'onsite',label:'On-site'});
  expect(projectTypeFacet('open')).toEqual({slug:'open',label:'Open Project'});
  expect(projectStageFacet('forming')).toEqual({slug:'forming',label:'Team forming'});
});

test('catalogue filters use AND semantics across canonical facets',()=>{
  const projects=[
    item({title:'Finance Forecasting',capabilities:[facet('forecasting','Forecasting')],domains:[facet('finance-fintech','Finance & Fintech')],tools:[facet('python','Python')]}),
    item({title:'Healthcare Forecasting',capabilities:[facet('forecasting','Forecasting')],domains:[facet('healthcare-life-sciences','Healthcare & Life Sciences')],tools:[facet('python','Python')]}),
    item({title:'Finance SQL Quality',capabilities:[facet('data-quality','Data Quality')],domains:[facet('finance-fintech','Finance & Fintech')],tools:[facet('sql','SQL')]})
  ];
  expect(filterAndSortProjectCatalogue(projects,filters({capability:'forecasting'})).map(value=>value.title)).toEqual(['Finance Forecasting','Healthcare Forecasting']);
  expect(filterAndSortProjectCatalogue(projects,filters({capability:'forecasting',domain:'finance-fintech',tool:'python'})).map(value=>value.title)).toEqual(['Finance Forecasting']);
  expect(filterAndSortProjectCatalogue(projects,filters({capability:'forecasting',domain:'finance-fintech',tool:'sql'}))).toEqual([]);
});

test('search covers canonical facets, aliases, methods and project-specific context',()=>{
  const project=item({
    title:'Trustworthy Model Review',
    capabilities:[facet('machine-learning','Machine Learning',['ml'])],
    domains:[facet('government-public-sector','Government & Public Sector')],
    tools:[facet('python','Python')],
    methods:[facet('model-explainability','Model Explainability')],
    searchExtra:['Senior Data Analyst','AI Assurance Path','Stage 2']
  });
  for(const query of ['machine learning','ml','government','python','explainability','senior data analyst','assurance path']){
    expect(filterAndSortProjectCatalogue([project],filters({query}))).toHaveLength(1);
  }
  expect(catalogueSearchText(project)).toContain('stage 2');
});

test('new governed facet associations appear automatically in available options',()=>{
  const projects=[item({title:'One'}),item({title:'Two',capabilities:[facet('forecasting','Forecasting')]})];
  expect(catalogueFacetOptions(projects,'capabilities').map(value=>value.slug)).toEqual(['data-quality','forecasting']);
});

test('sorting is deterministic and keeps missing dates or durations last',()=>{
  const projects=[
    item({title:'Older short',createdAt:'2026-08-01T00:00:00.000Z',deadline:'2026-09-20T00:00:00.000Z',durationWeeks:2}),
    item({title:'Newest long',createdAt:'2026-09-02T00:00:00.000Z',deadline:'2026-10-20T00:00:00.000Z',durationWeeks:8}),
    item({title:'Unknown',createdAt:'2026-09-01T00:00:00.000Z',deadline:null,durationWeeks:null})
  ];
  expect(filterAndSortProjectCatalogue(projects,filters({sort:'recent'})).map(value=>value.title)).toEqual(['Newest long','Unknown','Older short']);
  expect(filterAndSortProjectCatalogue(projects,filters({sort:'closing'})).map(value=>value.title)).toEqual(['Older short','Newest long','Unknown']);
  expect(filterAndSortProjectCatalogue(projects,filters({sort:'duration-short'})).map(value=>value.title)).toEqual(['Older short','Newest long','Unknown']);
  expect(filterAndSortProjectCatalogue(projects,filters({sort:'duration-long'})).map(value=>value.title)).toEqual(['Newest long','Older short','Unknown']);
});

test('active filter count excludes search and sort',()=>{
  expect(activeProjectCatalogueFilterCount(filters({query:'forecast',sort:'closing'}))).toBe(0);
  expect(activeProjectCatalogueFilterCount(filters({role:'data-analyst',capability:'forecasting',domain:'finance-fintech'}))).toBe(3);
});
