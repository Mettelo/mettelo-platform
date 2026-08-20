import type {Metadata} from 'next';
import HomePage from './page-content';
import {buildPageMetadata} from '@/lib/website-seo';

export async function generateMetadata():Promise<Metadata>{return buildPageMetadata('home')}
export default HomePage;
