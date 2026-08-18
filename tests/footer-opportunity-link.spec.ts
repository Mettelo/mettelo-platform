import {expect,test} from '@playwright/test';

test('footer opportunity CTA uses the governed organisation intake',async({page})=>{
  await page.goto('/');
  const link=page.getByRole('link',{name:'Post an opportunity'});
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href','/partnership#partnership-form');
});
