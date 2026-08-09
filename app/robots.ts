import type { MetadataRoute } from 'next';
export default function robots():MetadataRoute.Robots{return {rules:[{userAgent:'*',allow:'/',disallow:['/admin','/member']}],sitemap:'https://mettelo.com/sitemap.xml'};}
