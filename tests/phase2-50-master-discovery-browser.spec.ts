import {test,expect} from '@playwright/test';

test.describe('Phase 2 GitHub master discovery opt-in',()=>{
 test.skip(process.env.METTELO_PHASE2_CATALOGUE_MODE!=='github50','Run with METTELO_PHASE2_CATALOGUE_MODE=github50 against isolated staging or local Next.js');
 test('public discovery has 50 results, search, track filtering, pagination and detail links',async({page})=>{
  await page.goto('/projects');
  await expect(page.getByRole('heading',{name:'Explore 50 real-world projects'})).toBeVisible();
  await expect(page.getByText('50 of 50 projects')).toBeVisible();
  await expect(page.locator('article')).toHaveCount(12);
  await page.getByRole('button',{name:'Next'}).click();
  await expect(page.getByText('Page 2 of 5')).toBeVisible();
  await page.getByLabel('Search projects').fill('Cybersecurity Framework Change Intelligence Assistant');
  await expect(page.getByText('1 of 50 projects')).toBeVisible();
  await expect(page.locator('article')).toHaveCount(1);
  await page.getByRole('link',{name:'View project brief'}).click();
  await expect(page.getByRole('heading',{name:'Cybersecurity Framework Change Intelligence Assistant'})).toBeVisible();
  await expect(page.getByText('Applications for this catalogue are not enabled yet.')).toBeVisible();
 });
 test('track filters and clear filters restore all projects',async({page})=>{
  await page.goto('/projects');
  await page.getByLabel('Project track').selectOption('Data Engineering');
  await expect(page.getByText(/of 50 projects/)).toBeVisible();
  await expect(page.locator('article').first()).toContainText('Data Engineering');
  await page.getByRole('button',{name:'Clear filters'}).click();
  await expect(page.getByText('50 of 50 projects')).toBeVisible();
 });
});
