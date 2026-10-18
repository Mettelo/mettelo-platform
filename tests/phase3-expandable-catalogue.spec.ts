import {test,expect} from '@playwright/test';
import {buildExpandableCatalogue} from '../lib/expandable-github-catalogue';
import {getGithubMasterProjects} from '../lib/github-master-projects';

const id='MTL-DE-051';
const repository='https://github.com/Mettelo/phase3-new-data-pipeline';
const manifest={id,name:'Quality-First Data Pipeline',track:'Data Engineering',brief:'Build a reliable data pipeline',problem:'Poor quality ingestion data',sector:'Technology',roles:['Data Engineer'],capabilities:['SQL','Python'],repository,status:'Available' as const};
const published={id:'11111111-1111-4111-8111-111111111111',canonical_project_key:id,github_url:repository,title:manifest.name,summary:manifest.brief,problem_statement:manifest.problem,status:'open',visibility:'public',applications_open:true};
const audit={project_id:published.id,created_at:'2026-10-18T10:00:00Z',metadata:{github_import:{external_id:id,repository,revision:1,manifest_snapshot:manifest}}};

test('51st approved GitHub project appears once, preserves pinned 50, and points to operational application route',()=>{
 const base=getGithubMasterProjects();
 expect(base).toHaveLength(50);
 const output=buildExpandableCatalogue(base,[published],[audit]);
 expect(output).toHaveLength(51);
 expect(output.slice(0,50).map(p=>p.id)).toEqual(base.map(p=>p.id));
 expect(output[50]).toMatchObject({id,operationalId:published.id,applicationsOpen:true});
 expect(buildExpandableCatalogue(base,[published,published],[audit])).toHaveLength(51);
});

test('private drafts, unpublished projects, missing audit and mismatched manifests never appear',()=>{
 const base=getGithubMasterProjects();
 expect(buildExpandableCatalogue(base,[{...published,visibility:'private'}],[audit])).toHaveLength(50);
 expect(buildExpandableCatalogue(base,[{...published,status:'draft'}],[audit])).toHaveLength(50);
 expect(buildExpandableCatalogue(base,[published],[])).toHaveLength(50);
 expect(buildExpandableCatalogue(base,[published],[{...audit,metadata:{github_import:{...audit.metadata.github_import,external_id:'MTL-DE-999'}}}])).toHaveLength(50);
 expect(buildExpandableCatalogue(base,[published],[{...audit,metadata:{github_import:{...audit.metadata.github_import,manifest_snapshot:{...manifest,repository:'https://github.com/Mettelo/wrong-repo'}}}}])).toHaveLength(50);
});

test('a published project with closed intake remains discoverable but cannot advertise applications',()=>{
 const output=buildExpandableCatalogue(getGithubMasterProjects(),[{...published,applications_open:false}],[audit]);
 expect(output).toHaveLength(51);
 expect(output[50].applicationsOpen).toBe(false);
});
