#!/usr/bin/env node
/**
 * Phase 2 isolated-catalogue import rehearsal.
 * Generates a transaction for review; NEVER connects to a database.
 * Default output ends with ROLLBACK, even when executed by psql.
 * --commit requires both an explicit CLI flag and an isolated-target attestation.
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {previewCatalogueImport} from './preview-github-catalogue-import.mjs';

const quote = value => "'" + String(value).replaceAll("'","''") + "'";
export function buildIsolatedCatalogueSql(rows,sha,{commit=false,isolatedTarget=false}={}){
 const preview=previewCatalogueImport(rows,sha);
 if(!preview.ok)return {ok:false,errors:preview.errors,warnings:preview.warnings};
 if(commit&&!isolatedTarget)return {ok:false,errors:['Committing requires explicit isolated-target attestation.'],warnings:preview.warnings};
 const records=[...rows].sort((a,b)=>a.id.localeCompare(b.id)).map(p=>({
   external_id:p.id,name:p.name,brief:p.brief,master_repository_url:p.repository,
   metadata:{problem:p.problem,sector:p.sector,track:p.track,roles:p.roles,capabilities:p.capabilities,status:p.status,use_case:p.use_case??'',data_source:p.data_source??''}
 }));
 const json=JSON.stringify(records);
 // Fixed schema and SQL; source content only ever enters as a safely quoted JSON literal.
 const sql=`-- ISOLATED TEST DATABASE ONLY. Generated review artifact, not a deployment.
-- Source: Mettelo/project-library @ ${sha}
-- SHA256 of canonical catalogue: ${preview.contentSha256}
-- ${commit?'EXPLICIT COMMIT REQUESTED — isolated target must be independently verified':'SAFE DEFAULT: ROLLBACK'}
BEGIN;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';
DO $phase2$
DECLARE v_revision uuid; v_count integer;
BEGIN
  IF to_regclass('catalogue_private.revisions') IS NULL OR to_regclass('catalogue_private.projects') IS NULL THEN
    RAISE EXCEPTION 'Private catalogue schema absent; aborting';
  END IF;
  INSERT INTO catalogue_private.revisions (source_repo,source_commit_sha,content_sha256,record_count,state)
  VALUES ('Mettelo/project-library',${quote(sha)},${quote(preview.contentSha256)},50,'staged')
  ON CONFLICT (source_repo,source_commit_sha,content_sha256)
  DO UPDATE SET source_repo=EXCLUDED.source_repo
  RETURNING id INTO v_revision;
  INSERT INTO catalogue_private.projects (revision_id,external_id,name,brief,master_repository_url,metadata)
  SELECT v_revision,p.external_id,p.name,p.brief,p.master_repository_url,p.metadata
  FROM jsonb_to_recordset(${quote(json)}::jsonb)
    AS p(external_id text,name text,brief text,master_repository_url text,metadata jsonb)
  ON CONFLICT (revision_id,external_id)
  DO UPDATE SET name=EXCLUDED.name,brief=EXCLUDED.brief,
    master_repository_url=EXCLUDED.master_repository_url,metadata=EXCLUDED.metadata;
  SELECT count(*) INTO v_count FROM catalogue_private.projects WHERE revision_id=v_revision;
  IF v_count <> 50 THEN RAISE EXCEPTION 'Expected 50 staged projects; found %',v_count; END IF;
  IF EXISTS (SELECT 1 FROM catalogue_private.projects WHERE revision_id=v_revision
             GROUP BY master_repository_url HAVING count(*)>1) THEN
    RAISE EXCEPTION 'Duplicate master repository in staged catalogue';
  END IF;
END
$phase2$;
${commit?'COMMIT;':'ROLLBACK;'}
`;
 return {ok:true,sql,recordCount:50,contentSha256:preview.contentSha256,warnings:preview.warnings,transactionMode:commit?'commit':'rollback'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [file,sha,...flags]=process.argv.slice(2);
 if(!file||!sha||flags.some(f=>!['--commit','--isolated-target-confirmed'].includes(f))){
  console.error('Usage: node scripts/generate-isolated-catalogue-rehearsal.mjs <projects.json> <40-char-source-sha> [--commit --isolated-target-confirmed]');
  process.exitCode=2;
 }else{
  try{
   const result=buildIsolatedCatalogueSql(JSON.parse(readFileSync(resolve(file),'utf8')),sha,{commit:flags.includes('--commit'),isolatedTarget:flags.includes('--isolated-target-confirmed')});
   if(!result.ok){console.error(result.errors.join('\n'));process.exitCode=1}
   else process.stdout.write(result.sql);
  }catch(error){console.error(error.message);process.exitCode=1}
 }
}
