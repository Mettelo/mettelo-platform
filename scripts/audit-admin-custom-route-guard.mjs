import fs from 'node:fs';

const checks = [
  [
    'lib/admin-route-capabilities.ts',
    [
      'PAGE_RULES',
      'API_RULES',
      'isFullAdminConfiguration',
      'isCustomAdminConfiguration',
      'if(!rule)return false',
      '/admin/website/media',
      '/api/admin/website/media',
      '/api/admin/communications/documents',
    ],
  ],
  [
    'middleware.ts',
    [
      "pathname.startsWith('/api/admin')",
      'adminRouteAllowed',
      'isTrustedAdmin',
      'Admin capability required for this route.',
      "target.pathname='/admin'",
      'reason',
      'capability',
      "'/api/admin/:path*'",
      'Authentication required.',
    ],
  ],
  [
    'tests/admin-access-capabilities.spec.ts',
    [
      '/api/admin/intake',
      'reason',
      'capability',
      '/admin/website/media',
      'website.content.edit',
      'publishing capability',
    ],
  ],
  [
    'docs/ADMIN-CUSTOM-ADMIN-ROUTE-GUARD.md',
    ['fail closed', 'Full Admin', 'Legacy', 'Custom Admin', 'unmapped', '/api/admin', 'Rollback'],
  ],
];

let failed = false;
let passed = 0;

for (const [file, needles] of checks) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL missing ${file}`);
    failed = true;
    continue;
  }

  const source = fs.readFileSync(file, 'utf8');
  const missing = needles.filter((needle) => !source.includes(needle));

  if (missing.length) {
    console.error(`FAIL ${file}: missing ${missing.join(', ')}`);
    failed = true;
  } else {
    console.log(`PASS ${file}`);
    passed++;
  }
}

if (failed) process.exit(1);
console.log(`Custom Admin route guard audit passed: ${passed}/${checks.length} files.`);
