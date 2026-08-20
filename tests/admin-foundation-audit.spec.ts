import {expect,test} from '@playwright/test';
import {ADMIN_CAPABILITIES,hasAdminCapability,isKnownAdminCapability,isTrustedAdmin} from '@/lib/admin-capabilities';
import {sanitizeAuditValue} from '@/lib/admin-audit';

test('trusted Admin authority remains rooted in app_metadata role',()=>{
  expect(isTrustedAdmin({app_metadata:{role:'admin'}})).toBe(true);
  expect(isTrustedAdmin({app_metadata:{role:'member'}})).toBe(false);
  expect(isTrustedAdmin(null)).toBe(false);
});

test('existing trusted Admins remain compatible until explicit capabilities are configured',()=>{
  const legacy={app_metadata:{role:'admin'}};
  expect(hasAdminCapability(legacy,'system.audit.read')).toBe(true);
  expect(hasAdminCapability(legacy,'website.content.publish')).toBe(true);
});

test('explicit capability arrays become authoritative and fail closed',()=>{
  const scoped={app_metadata:{role:'admin',admin_capabilities:['system.audit.read']}};
  expect(hasAdminCapability(scoped,'system.audit.read')).toBe(true);
  expect(hasAdminCapability(scoped,'website.content.publish')).toBe(false);
  expect(hasAdminCapability({app_metadata:{role:'admin',admin_capabilities:'system.audit.read'}},'system.audit.read')).toBe(false);
  expect(hasAdminCapability({app_metadata:{role:'member',admin_capabilities:['*']}},'system.audit.read')).toBe(false);
});

test('capability registry contains only known values',()=>{
  for(const capability of ADMIN_CAPABILITIES)expect(isKnownAdminCapability(capability)).toBe(true);
  expect(isKnownAdminCapability('database.superuser')).toBe(false);
});

test('audit sanitization redacts sensitive keys recursively',()=>{
  expect(sanitizeAuditValue({
    email:'member@example.com',
    token:'secret-token',
    nested:{authorization:'Bearer secret',safe:'ok'},
    list:[{api_key:'hidden',value:1}]
  })).toEqual({
    email:'member@example.com',
    token:'[redacted]',
    nested:{authorization:'[redacted]',safe:'ok'},
    list:[{api_key:'[redacted]',value:1}]
  });
});
