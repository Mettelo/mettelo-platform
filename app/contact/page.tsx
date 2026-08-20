import type {Metadata} from 'next';
import ContactPage from './ContactPageContent';
import {buildPageMetadata} from '@/lib/website-seo';

export async function generateMetadata():Promise<Metadata>{return buildPageMetadata('contact')}
export default ContactPage;
