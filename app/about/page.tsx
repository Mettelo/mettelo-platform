import type {Metadata} from 'next';
import AboutPage from './AboutPageContent';
import {buildPageMetadata} from '@/lib/website-seo';

export async function generateMetadata():Promise<Metadata>{return buildPageMetadata('about')}
export default AboutPage;
