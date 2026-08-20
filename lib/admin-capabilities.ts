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

type AdminIdentity={app_metadata?:Record<string,unknown>|null};

export function isTrustedAdmin(user:AdminIdentity|null|undefined){
  return user?.app_metadata?.role==='admin';
}

export function isKnownAdminCapability(value:unknown):value is AdminCapability{
  return typeof value==='string'&&(ADMIN_CAPABILITIES as readonly string[]).includes(value);
}

export function hasAdminCapability(user:AdminIdentity|null|undefined,capability:AdminCapability){
  if(!isTrustedAdmin(user))return false;
  const metadata=user?.app_metadata||{};
  const configured=metadata.admin_capabilities;

  // Backward compatibility: existing trusted Admins have no capability array yet.
  // Once an explicit array exists it becomes authoritative and is evaluated fail-closed.
  if(configured===undefined||configured===null)return true;
  if(!Array.isArray(configured))return false;
  if(configured.includes('*'))return true;
  return configured.some(value=>isKnownAdminCapability(value)&&value===capability);
}
