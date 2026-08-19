import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function source(path:string){return readFile(path,'utf8')}

test('My Mettelo Applications stays project-only at the data and UI layer',async()=>{
  const [page,tracker,careerNotifications,careerPage]=await Promise.all([
    source('app/member/applications/page.tsx'),
    source('components/MemberApplicationTracker.tsx'),
    source('lib/career-notifications.ts'),
    source('app/careers/applications/page.tsx')
  ]);

  expect(page).toContain("from('project_applications')");
  expect(page).not.toContain("from('career_applications')");
  expect(page).not.toContain('CareerApplicationTracker');
  expect(page).not.toContain('career_offer_documents');
  expect(page).not.toContain('career_onboarding_items');
  expect(page).not.toContain('career_application_events');

  expect(tracker).toContain('Open in Projects');
  expect(tracker).toContain('href="/member/projects"');
  expect(tracker).not.toContain('href={`/member/projects/${');
  expect(tracker).not.toContain('Open Mettelo Lab');
  expect(tracker).toContain('aria-pressed');
  expect(tracker).toContain('Confirm withdrawal');

  expect(careerPage).toContain("from('career_applications')");
  expect(careerPage).toContain('CareerApplicationTracker');
  expect(careerNotifications).not.toContain('notifyUser');
  expect(careerNotifications).toContain("'/careers/applications'");
});
