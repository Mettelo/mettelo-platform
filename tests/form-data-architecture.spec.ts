import {expect,test} from '@playwright/test';
import {calculateProfileReadiness,PROFILE_APPLICATION_READY,PROFILE_INTEREST_READY} from '../lib/profile-readiness';

const completeProfile={
  full_name:'Test Member',
  headline:'Data analyst',
  professional_area:'Data Analysis / BI',
  location:'London, UK',
  experience_level:'mid',
  skills:['SQL','Power BI','Python'],
  preferred_roles:['Data Analyst / BI'],
  project_availability:'available_now',
  weekly_capacity:'4–6 hours/week',
  bio:'I turn operational data into decision-ready analysis and documented outcomes.',
  linkedin_url:'https://linkedin.com/in/test-member',
  employment_status:'employed',
  primary_goal:'Lead an end-to-end analytics project'
};

test.describe('canonical Mettelo readiness',()=>{
  test('full profile reaches application readiness without requiring Proof',()=>{
    const readiness=calculateProfileReadiness({profile:completeProfile,domainCount:1,toolCount:2});
    expect(readiness.score).toBe(95);
    expect(readiness.applicationReady).toBe(true);
    expect(readiness.score).toBeGreaterThanOrEqual(PROFILE_APPLICATION_READY);
  });

  test('interest unlocks before full application readiness',()=>{
    const readiness=calculateProfileReadiness({profile:{...completeProfile,bio:'',linkedin_url:'',project_availability:'',weekly_capacity:''},domainCount:1});
    expect(readiness.score).toBe(60);
    expect(readiness.interestReady).toBe(true);
    expect(readiness.applicationReady).toBe(false);
    expect(readiness.score).toBeGreaterThanOrEqual(PROFILE_INTEREST_READY);
  });
});

test.describe('public form data contracts',()=>{
  test('contact uses routed topic data without a redundant subject field',async({page})=>{
    await page.goto('/contact');
    await expect(page.locator('input[name="subject"]')).toHaveCount(0);
    const topic=page.locator('select[name="topic"]');
    await expect(topic).toBeVisible();
    await topic.selectOption('technical_issue');
    await expect(topic).toHaveValue('technical_issue');
  });

  test('partnership captures qualification fields with stable values',async({page})=>{
    await page.goto('/partnership');
    await expect(page.locator('input[name="country"][required]')).toBeVisible();
    await expect(page.locator('select[name="organisationType"][required]')).toBeVisible();
    await expect(page.locator('select[name="partnershipType"][required]')).toBeVisible();
    await expect(page.locator('select[name="timeframe"][required]')).toBeVisible();
    await expect(page.locator('select[name="scale"][required]')).toBeVisible();
    await page.locator('select[name="partnershipType"]').selectOption('labs_project');
    await expect(page.locator('select[name="partnershipType"]')).toHaveValue('labs_project');
  });

  test('feedback captures type, area and task impact',async({page})=>{
    await page.goto('/feedback');
    await expect(page.locator('select[name="kind"][required]')).toBeVisible();
    await expect(page.locator('select[name="area"][required]')).toBeVisible();
    await expect(page.locator('select[name="impact"][required]')).toBeVisible();
    await page.locator('select[name="impact"]').selectOption('blocked');
    await expect(page.locator('select[name="impact"]')).toHaveValue('blocked');
  });

  test('newsletter preferences are deliberate and at least one is required server-side',async({page,request})=>{
    await page.goto('/newsletter');
    const topics=page.locator('input[type="checkbox"][name="projects"],input[type="checkbox"][name="events"],input[type="checkbox"][name="opportunities"],input[type="checkbox"][name="insights"]');
    await expect(topics).toHaveCount(4);
    for(let index=0;index<4;index++)await expect(topics.nth(index)).not.toBeChecked();
    const response=await request.post('/api/newsletter',{data:{email:'form-contract@example.test',preferences:{projects:false,events:false,opportunities:false,insights:false}}});
    expect(response.status()).toBe(400);
  });
});
