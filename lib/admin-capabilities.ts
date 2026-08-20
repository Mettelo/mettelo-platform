export const ADMIN_CAPABILITIES=[
  'system.audit.read',
  'system.audit.write',
  'admin.access.manage',
  'website.content.edit',
  'website.content.publish',
  'website.navigation.manage',
  'members.read',
  'members.suspend',
  'projects.manage',
  'projects.review',
  'proof.verify',
  'spotlight.govern',
  'careers.review',
  'communications.manage',
  'platform.settings.manage',
  'platform.flags.manage'
] as const;

export type AdminCapability=(typeof ADMIN_CAPABILITIES)[number];
export const ADMIN_CAPABILITY_META:Record<AdminCapability,{group:string;label:string;description:string}>={
  'system.audit.read':{group:'Security & audit',label:'Read audit log',description:'View governed Admin audit history and filters.'},
  'system.audit.write':{group:'Security & audit',label:'Record system audit events',description:'Use system-level operations that explicitly require audit-write authority.'},
  'admin.access.manage':{group:'Security & audit',label:'Manage Admin access',description:'Grant or revoke Admin access and manage capability sets.'},
  'website.content.edit':{group:'Website',label:'Edit Website content',description:'Edit Website drafts, SEO metadata and governed Media Library records.'},
  'website.content.publish':{group:'Website',label:'Publish Website content',description:'Publish Website page, chrome and SEO changes to public readers.'},
  'website.navigation.manage':{group:'Website',label:'Manage navigation',description:'Manage governed public navigation structure and destinations.'},
  'members.read':{group:'Members',label:'Read member operations',description:'View member records required for Admin operations.'},
  'members.suspend':{group:'Members',label:'Suspend members',description:'Apply governed member suspension actions.'},
  'projects.manage':{group:'Projects & Proof',label:'Manage projects',description:'Operate project records, teams and delivery controls.'},
  'projects.review':{group:'Projects & Proof',label:'Review project applications',description:'Review governed member-to-project applications and decisions.'},
  'proof.verify':{group:'Projects & Proof',label:'Verify Proof',description:'Review and verify contribution evidence and Proof records.'},
  'spotlight.govern':{group:'Projects & Proof',label:'Govern Spotlight',description:'Review and govern Spotlight recognition and public visibility.'},
  'careers.review':{group:'Careers & communications',label:'Review Careers',description:'Operate recruitment roles, candidates, interviews and offers.'},
  'communications.manage':{group:'Careers & communications',label:'Manage communications',description:'Manage governed templates, delivery operations and attachments.'},
  'platform.settings.manage':{group:'Platform',label:'Manage platform settings',description:'Manage governed platform-wide settings and taxonomies.'},
  'platform.flags.manage':{group:'Platform',label:'Manage feature flags',description:'Manage controlled feature-flag state where supported.'}
};

type AdminIdentity={app_metadata?:Record<string,unknown>|null};

export function isTrustedAdmin(user:AdminIdentity|null|undefined){
  return user?.app_metadata?.role==='admin';
}

export function isKnownAdminCapability(value:unknown):value is AdminCapability{
  return typeof value==='string'&&(ADMIN_CAPABILITIES as readonly string[]).includes(value);
}

function isValidConfiguredCapability(value:unknown){
  return value==='*'||isKnownAdminCapability(value);
}

export function hasAdminCapability(user:AdminIdentity|null|undefined,capability:AdminCapability){
  if(!isTrustedAdmin(user))return false;
  const metadata=user?.app_metadata||{};
  const configured=metadata.admin_capabilities;

  // Backward compatibility: existing trusted Admins have no capability array yet.
  // Once an explicit array exists it becomes authoritative. Any malformed or unknown
  // entry fails the entire configuration closed instead of being silently ignored.
  if(configured===undefined||configured===null)return true;
  if(!Array.isArray(configured)||!configured.every(isValidConfiguredCapability))return false;
  if(configured.includes('*'))return true;
  return configured.includes(capability);
}
