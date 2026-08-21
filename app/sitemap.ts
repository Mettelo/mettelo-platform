import type {MetadataRoute} from 'next';
import {getPublicPageSeo} from '@/lib/website-seo';

const BASE='https://mettelo.com';
const STATIC_ROUTES=['/join','/membership','/projects','/showcase','/opportunities','/events','/community','/people','/mentors','/contribute','/blog','/media','/spotlight','/project-architect','/careers','/partnership','/newsletter','/feedback','/privacy','/terms','/community-guidelines'];

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const [home,about,contact]=await Promise.all([getPublicPageSeo('home'),getPublicPageSeo('about'),getPublicPageSeo('contact')]);
  const managed=[
    {route:'',index:home.index,priority:1,changeFrequency:'weekly' as const},
    {route:'/about',index:about.index,priority:.7,changeFrequency:'monthly' as const},
    {route:'/contact',index:contact.index,priority:.7,changeFrequency:'monthly' as const}
  ].filter(item=>item.index);
  const now=new Date();
  return [
    ...managed.map(item=>({url:`${BASE}${item.route}`,lastModified:now,changeFrequency:item.changeFrequency,priority:item.priority})),
    ...STATIC_ROUTES.map(route=>({url:`${BASE}${route}`,lastModified:now,changeFrequency:'monthly' as const,priority:.7}))
  ];
}
