import type { MetadataRoute } from 'next';

export default function sitemap():MetadataRoute.Sitemap{
  const base='https://mettelo.com';
  const routes=['','/about','/join','/membership','/projects','/showcase','/opportunities','/events','/community','/people','/mentors','/contribute','/blog','/media','/spotlight','/partnership','/contact','/newsletter','/feedback','/privacy','/terms','/community-guidelines'];
  return routes.map((route)=>({url:`${base}${route}`,lastModified:new Date(),changeFrequency:route===''?'weekly':'monthly',priority:route===''?1:0.7}));
}
