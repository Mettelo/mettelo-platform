import {hasAdminCapability,isKnownAdminCapability,isTrustedAdmin,type AdminCapability} from '@/lib/admin-capabilities';

type AdminIdentity={app_metadata?:Record<string,unknown>|null};
type RouteRule={prefix:string;capabilities:readonly AdminCapability[]};

const PAGE_RULES:readonly RouteRule[]=[
 {prefix:'/admin/access',capabilities:['admin.access.manage']},
 {prefix:'/admin/settings',capabilities:['platform.settings.manage']},
 {prefix:'/admin/platform/auth',capabilities:['platform.settings.manage']},
 {prefix:'/admin/platform',capabilities:['platform.settings.manage','admin.access.manage','system.audit.read','platform.flags.manage']},
 {prefix:'/admin/system/audit',capabilities:['system.audit.read']},
 {prefix:'/admin/system/health',capabilities:['system.audit.read']},
 {prefix:'/admin/system',capabilities:['system.audit.read','communications.manage','admin.access.manage']},
 {prefix:'/admin/notifications',capabilities:['communications.manage']},
 {prefix:'/admin/careers',capabilities:['careers.review']},
 {prefix:'/admin/project-operations/applications',capabilities:['projects.review']},
 {prefix:'/admin/applications',capabilities:['projects.review']},
 {prefix:'/admin/project-architect-applications',capabilities:['projects.review']},
 {prefix:'/admin/project-operations',capabilities:['projects.manage']},
 {prefix:'/admin/team-formation',capabilities:['projects.manage']},
 {prefix:'/admin/project-governance',capabilities:['projects.manage']},
 {prefix:'/admin/qa',capabilities:['projects.manage']},
 {prefix:'/admin/proof',capabilities:['proof.verify']},
 {prefix:'/admin/spotlights',capabilities:['spotlight.govern']},
 {prefix:'/admin/website/navigation',capabilities:['website.navigation.manage','website.content.publish']},
 {prefix:'/admin/website',capabilities:['website.content.edit','website.content.publish','website.navigation.manage']}
];

const API_RULES:readonly RouteRule[]=[
 {prefix:'/api/admin/access',capabilities:['admin.access.manage']},
 {prefix:'/api/admin/audit',capabilities:['system.audit.read']},
 {prefix:'/api/admin/system',capabilities:['system.audit.read']},
 {prefix:'/api/admin/settings',capabilities:['platform.settings.manage']},
 {prefix:'/api/admin/project-role-catalogue',capabilities:['platform.settings.manage']},
 {prefix:'/api/admin/platform',capabilities:['platform.settings.manage']},
 {prefix:'/api/admin/communications/documents',capabilities:['careers.review','communications.manage']},
 {prefix:'/api/admin/communications',capabilities:['communications.manage']},
 {prefix:'/api/admin/notifications',capabilities:['communications.manage']},
 {prefix:'/api/admin/careers',capabilities:['careers.review']},
 {prefix:'/api/admin/applications',capabilities:['projects.review']},
 {prefix:'/api/admin/project-architect-applications',capabilities:['projects.review']},
 {prefix:'/api/admin/projects',capabilities:['projects.manage']},
 {prefix:'/api/admin/project-flow',capabilities:['projects.manage']},
 {prefix:'/api/admin/project-roles',capabilities:['projects.manage']},
 {prefix:'/api/admin/project-governance',capabilities:['projects.manage']},
 {prefix:'/api/admin/presentation-slots',capabilities:['projects.manage']},
 {prefix:'/api/admin/qa-team',capabilities:['projects.manage']},
 {prefix:'/api/admin/contributions',capabilities:['proof.verify']},
 {prefix:'/api/admin/spotlights',capabilities:['spotlight.govern']},
 {prefix:'/api/admin/website',capabilities:['website.content.edit','website.content.publish','website.navigation.manage']}
];

function matches(pathname:string,prefix:string){return pathname===prefix||pathname.startsWith(`${prefix}/`)}
function explicitConfiguration(user:AdminIdentity){return user.app_metadata?.admin_capabilities}
function validArray(value:unknown):value is string[]{return Array.isArray(value)&&value.every(item=>item==='*'||isKnownAdminCapability(item))}

export function isFullAdminConfiguration(user:AdminIdentity|null|undefined){
 if(!isTrustedAdmin(user))return false;
 const configured=explicitConfiguration(user||{});
 if(configured===undefined||configured===null)return true;
 if(!validArray(configured))return false;
 return configured.includes('*');
}

export function isCustomAdminConfiguration(user:AdminIdentity|null|undefined){
 if(!isTrustedAdmin(user))return false;
 const configured=explicitConfiguration(user||{});
 return validArray(configured)&&!configured.includes('*');
}

export function adminRouteAllowed(user:AdminIdentity|null|undefined,pathname:string){
 if(!isTrustedAdmin(user))return false;
 if(isFullAdminConfiguration(user))return true;
 if(!isCustomAdminConfiguration(user))return false;
 if(pathname==='/admin'||pathname==='/admin/overview')return true;
 const rules=pathname.startsWith('/api/admin')?API_RULES:PAGE_RULES;
 const rule=rules.find(item=>matches(pathname,item.prefix));
 if(!rule)return false;
 return rule.capabilities.some(capability=>hasAdminCapability(user,capability));
}

export const CUSTOM_ADMIN_PAGE_RULES=PAGE_RULES;
export const CUSTOM_ADMIN_API_RULES=API_RULES;
