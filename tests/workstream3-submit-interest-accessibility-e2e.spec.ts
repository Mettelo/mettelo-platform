import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

const releaseProject = '00000000-0000-4000-8000-00000000e2e1';

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function db() {
  const url = required('E2E_SUPABASE_URL');
  if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) {
    throw new Error('Workstream 3 accessibility tests refuse non-local Supabase hosts.');
  }
  return createClient(url, required('E2E_SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function architectId() {
  const client = db();
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const architect = data.users.find((user) => user.email === required('E2E_ARCHITECT_EMAIL'));
  if (!architect) throw new Error('Workstream 3 accessibility test requires the disposable architect identity.');
  return architect.id;
}

async function signIn(page: import('@playwright/test').Page) {
  await page.goto(`/signin?next=${encodeURIComponent(`/member/discover/${releaseProject}/apply`)}`, {
    waitUntil: 'networkidle',
  });
  await page.locator('main input[type="email"]').fill(required('E2E_ARCHITECT_EMAIL'));
  await page.locator('main input[type="password"]').fill(required('E2E_ARCHITECT_PASSWORD'));
  await page.getByRole('button', { name: 'Sign in →' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/signin'), { timeout: 20_000 });
}

test.describe('Workstream 3 Submit Interest V3 accessibility', () => {
  test('mobile, keyboard, accessible semantics and 200% reflow remain operational', async ({ browser }) => {
    const client = db();
    const userId = await architectId();

    const [{ data: originalProfile, error: profileError }, { data: originalProject, error: projectError }] = await Promise.all([
      client
        .from('profiles')
        .select('full_name,headline,current_job_title,professional_area,location,experience_level,skills,preferred_roles,project_availability,weekly_capacity')
        .eq('id', userId)
        .single(),
      client
        .from('projects')
        .select('participation_mode,admission_mode,min_team_size,target_team_size,max_team_size,team_size_threshold,auto_start_delay_minutes,applications_open,status,visibility')
        .eq('id', releaseProject)
        .single(),
    ]);
    if (profileError) throw profileError;
    if (projectError) throw projectError;

    const { data: domain, error: domainError } = await client
      .from('domains')
      .select('id')
      .eq('slug', 'cross-industry-open-data')
      .single();
    if (domainError || !domain) throw domainError ?? new Error('Required E2E domain fixture is missing.');

    const { data: existingPreference, error: preferenceError } = await client
      .from('profile_domain_preferences')
      .select('domain_id')
      .eq('user_id', userId)
      .eq('domain_id', domain.id)
      .maybeSingle();
    if (preferenceError) throw preferenceError;

    const { data: existingApplication, error: applicationError } = await client
      .from('project_applications')
      .select('id')
      .eq('project_id', releaseProject)
      .eq('user_id', userId)
      .not('status', 'in', '(declined,withdrawn)')
      .limit(1)
      .maybeSingle();
    if (applicationError) throw applicationError;
    if (existingApplication) {
      throw new Error('Architect fixture has an active release-project application, so the V3 route cannot be audited deterministically.');
    }

    let insertedPreference = false;
    try {
      const profileUpdate = await client
        .from('profiles')
        .update({
          full_name: 'E2E architect',
          headline: 'Data architect',
          current_job_title: 'Data architect',
          professional_area: 'Data & AI',
          location: 'CI',
          experience_level: 'mid',
          skills: ['SQL', 'Data modelling', 'Quality assurance'],
          preferred_roles: ['Data Analyst'],
          project_availability: 'Available',
          weekly_capacity: '10 hours/week',
        })
        .eq('id', userId);
      if (profileUpdate.error) throw profileUpdate.error;

      if (!existingPreference) {
        const inserted = await client
          .from('profile_domain_preferences')
          .insert({ user_id: userId, domain_id: domain.id });
        if (inserted.error) throw inserted.error;
        insertedPreference = true;
      }

      const projectUpdate = await client
        .from('projects')
        .update({
          participation_mode: 'team',
          admission_mode: 'auto',
          min_team_size: 2,
          target_team_size: 5,
          max_team_size: 5,
          team_size_threshold: 2,
          auto_start_delay_minutes: 360,
          applications_open: true,
          status: 'active',
          visibility: 'public',
        })
        .eq('id', releaseProject);
      if (projectUpdate.error) throw projectUpdate.error;

      const context = await browser.newContext({
        baseURL: required('E2E_BASE_URL'),
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await signIn(page);
      await page.goto(`/member/discover/${releaseProject}/apply`, { waitUntil: 'networkidle' });

      await expect(page.getByRole('heading', { name: /Submit Interest/ })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Interest form progress' })).toBeVisible();
      await expect(page.getByRole('status')).toBeAttached();
      await expect(page.getByRole('heading', { name: 'Participation', exact: true })).toBeVisible();
      await expect(page.getByRole('radio', { name: /^Team/ })).toBeChecked();

      const unlabeledControls = await page.locator('.mpi3Flow input, .mpi3Flow select, .mpi3Flow textarea').evaluateAll((controls) =>
        controls.filter((control) => {
          const element = control as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          return !(element.labels?.length || element.getAttribute('aria-label') || element.getAttribute('aria-labelledby'));
        }).length,
      );
      expect(unlabeledControls).toBe(0);

      const continueButton = page.getByRole('button', { name: 'Continue' });
      await continueButton.focus();
      await expect(continueButton).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { name: 'Role & Contribution', exact: true })).toBeFocused();
      await expect(page.getByLabel(/Primary role/)).toBeVisible();

      const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(mobileOverflow).toBeLessThanOrEqual(1);

      await page.setViewportSize({ width: 320, height: 800 });
      await expect(page.getByRole('heading', { name: 'Role & Contribution', exact: true })).toBeVisible();
      const reflowOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(reflowOverflow).toBeLessThanOrEqual(1);
      await expect(page.locator('.mpi3Card')).toBeInViewport();

      await context.close();
    } finally {
      if (insertedPreference) {
        await client
          .from('profile_domain_preferences')
          .delete()
          .eq('user_id', userId)
          .eq('domain_id', domain.id);
      }
      await client.from('profiles').update(originalProfile).eq('id', userId);
      await client.from('projects').update(originalProject).eq('id', releaseProject);
    }
  });
});
