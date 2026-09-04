import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const files={
  member:'components/MemberProjectApplicationFlow.tsx',
  interest:'components/SubmissionForm.tsx',
  api:'app/api/project-applications/route.ts'
};

async function source(path:string){return readFile(path,'utf8')}

test('project interest and full application share the inline versioned participation terms contract',async()=>{
  const [member,interest,api]=await Promise.all([source(files.member),source(files.interest),source(files.api)]);

  for(const ui of [member,interest]){
    expect(ui).toContain('PROJECT_PARTICIPATION_TERMS_SUMMARY');
    expect(ui).toContain('PROJECT_PARTICIPATION_TERMS_FULL');
    expect(ui).toContain('PROJECT_PARTICIPATION_TERMS_VERSION');
    expect(ui).toContain('Read full participation terms');
    expect(ui).toContain('I have read, understood and agree to the Mettelo Project Participation Terms.');
    expect(ui).toContain('terms_accepted:true');
    expect(ui).toContain('terms_version:PROJECT_PARTICIPATION_TERMS_VERSION');
  }

  expect(member).not.toContain("fetch('/api/project-terms'");
  expect(member).not.toContain('terms_attachment_id');
  expect(api).not.toContain('communication_template_attachments');
  expect(api).not.toContain("template_key','project_application_terms");
  expect(api).toContain('termsVersion!==PROJECT_PARTICIPATION_TERMS_VERSION');
  expect(api).toContain('terms_version:PROJECT_PARTICIPATION_TERMS_VERSION');
  expect(api).toContain('terms_attachment_id:null');
  expect(api).toContain('terms_accepted_at:new Date().toISOString()');
});
