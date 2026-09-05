import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {normalizeCapability,normalizeCareerRole,normalizeIndustry,normalizeTool} from '../lib/project-catalogue-taxonomy';
import {normalizeCommitment,normalizeExperienceLevel,durationFacet} from '../lib/project-catalogue-filtering';

test.describe('project discovery taxonomy normalization',()=>{
  test('keeps project-specific titles out of canonical career filters',async()=>{
    expect(normalizeCareerRole('Data Analyst')?.label).toBe('Data Analyst');
    expect(normalizeCareerRole('business intelligence analyst')?.label).toBe('BI Analyst');
    expect(normalizeCareerRole('Agricultural/Extension Analyst')).toBeNull();
    const loader=await readFile('lib/public-project-catalogue-loader.ts','utf8');
    expect(loader).toContain('normalizeCareerRole(role.canonical_role_key)');
    expect(loader).not.toContain('key||title');
  });

  test('normalizes tool, industry and capability aliases',()=>{
    expect(normalizeTool('PowerBI')?.label).toBe('Power BI');
    expect(normalizeTool('power bi')?.label).toBe('Power BI');
    expect(normalizeTool('postgres')?.label).toBe('PostgreSQL');
    expect(normalizeTool('Git / GitHub')?.label).toBe('GitHub');
    expect(normalizeIndustry('banking')?.label).toBe('Financial Services');
    expect(normalizeIndustry('Finance & FinTech')?.label).toBe('Financial Services');
    expect(normalizeIndustry('Marketing & Customer Analytics')?.label).toBe('Marketing & Media');
    expect(normalizeIndustry('Transport, Logistics & Supply Chain')?.label).toBe('Transport & Logistics');
    expect(normalizeIndustry('Cross-industry / Open Data')?.label).toBe('Cross-industry');
    expect(normalizeIndustry('public sector')?.label).toBe('Government & Public Services');
    expect(normalizeCapability('data visualization')?.label).toBe('Data visualisation');
    expect(normalizeCapability('retrieval augmented generation')?.label).toBe('RAG');
  });

  test('keeps controlled public bands',()=>{
    expect(normalizeExperienceLevel('Foundation')?.label).toBe('Beginner');
    expect(normalizeExperienceLevel('Intermediate–Advanced')?.label).toBe('Intermediate');
    expect(normalizeExperienceLevel('Advanced / Capstone')?.label).toBe('Advanced');
    expect(normalizeCommitment('6-8 hours/week')?.label).toBe('5–7 hours/week');
    expect(durationFacet(3)?.slug).toBe('short');
    expect(durationFacet(6)?.slug).toBe('standard');
    expect(durationFacet(8)?.slug).toBe('extended');
  });

  test('requires Admin project roles to carry a controlled career classification',async()=>{
    const manager=await readFile('components/AdminProjectRoleManager.tsx','utf8');
    const route=await readFile('app/api/admin/project-roles/route.ts','utf8');
    expect(manager).toContain('CANONICAL_CAREER_ROLES');
    expect(manager).toContain('name="career_role"');
    expect(route).toContain("normalizeCareerRole(String(body.career_role||''))");
    expect(route).toContain('canonical_role_key:canonicalCareer.slug');
    expect(route).toContain('Choose a valid canonical Career / Role classification.');
  });
});

test('public and member filters retain reactive architecture contracts',async()=>{
  const publicFilters=await readFile('components/PublicProjectFilters.tsx','utf8');
  const memberFilters=await readFile('components/MemberDiscoverCatalogue.tsx','utf8');
  expect(publicFilters).toContain('AbortController');
  expect(publicFilters).toContain('window.history.pushState');
  expect(publicFilters).toContain('replaceCatalogue');
  expect(publicFilters).toContain('Show {previewCount}');
  expect(publicFilters).not.toContain('window.location.assign');
  expect(memberFilters).toContain("Career / Role");
  expect(memberFilters).toContain('experienceFacet');
  expect(memberFilters).toContain('availabilityFacet');
  expect(memberFilters).toContain('position:fixed;inset:0 0 0 auto');
  expect(memberFilters).toContain('Show {visible.length}');
});
