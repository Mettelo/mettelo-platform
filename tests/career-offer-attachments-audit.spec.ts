import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const composer=fs.readFileSync('components/AdminCareerFormalOfferComposer.tsx','utf8');
const documentsApi=fs.readFileSync('app/api/admin/communications/documents/route.ts','utf8');
const attachmentResolver=fs.readFileSync('lib/email-attachments.ts','utf8');

test('formal offer documents do not require a linked candidate account',()=>{
  expect(documentsApi).toContain(".from('career_applications').select('id,email')");
  expect(documentsApi).not.toContain('Secure offer documents require the candidate to have a linked Mettelo account.');
  expect(documentsApi).not.toContain('if(!application.user_id)');
  expect(documentsApi).toContain("entity_type:'career_application'");
});

test('offer upload and delivery share the same four-document and 28MB envelope',()=>{
  expect(documentsApi).toContain('MAX_EMAIL_ATTACHMENTS,MAX_EMAIL_ATTACHMENT_RAW_BYTES');
  expect(documentsApi).toContain('templateAttachmentUsage');
  expect(documentsApi).toContain('templateUsage.count+offerUsage.count');
  expect(documentsApi).toContain('templateUsage.bytes+offerUsage.bytes+file.size');
  expect(attachmentResolver).toContain('MAX_EMAIL_ATTACHMENTS=4');
  expect(attachmentResolver).toContain('MAX_EMAIL_ATTACHMENT_RAW_BYTES=28*1024*1024');
});

test('composer exposes staged multi-file state and blocks send until uploads finish',()=>{
  expect(composer).toContain('multiple onChange={e=>chooseFiles(e.target.files)}');
  expect(composer).toContain('Selected, not attached yet');
  expect(composer).toContain('Attach ${files.length} document');
  expect(composer).toContain('removeStaged');
  expect(composer).toContain('if(files.length){setStatus');
  expect(composer).toContain("disabled={busy||uploading||Boolean(removing)||!valid}");
});

test('composer reports governed template attachment capacity',()=>{
  expect(composer).toContain('template_documents');
  expect(composer).toContain('governed template document');
  expect(composer).toContain('docs.length+limits.template_documents');
  expect(documentsApi).toContain('available_documents');
  expect(documentsApi).toContain('available_bytes');
});
