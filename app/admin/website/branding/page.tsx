import {redirect} from 'next/navigation';
import {AdminWebsiteBrandingEditor} from '@/components/AdminWebsiteChromeEditors';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {DEFAULT_WEBSITE_CHROME,validateWebsiteChromePayload,type WebsiteBrandingConfig} from '@/lib/website-chrome';

export const dynamic='force-dynamic';

export default async function AdminWebsiteBrandingPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(!hasAdminCapability(user,'website.content.edit'))redirect('/admin');
 const db=serviceDb();if(!db)return <section className="section"><div className="shell"><div className="adminEmpty"><h1>Branding unavailable</h1><p>Admin data service is not configured.</p></div></div></section>;
 const [{data:draft},{data:published}]=await Promise.all([db.from('website_chrome_drafts').select('payload,updated_at').eq('scope','branding').maybeSingle(),db.from('website_chrome_public').select('payload,published_at').eq('scope','branding').maybeSingle()]);
 const draftValidated=validateWebsiteChromePayload('branding',draft?.payload);const publishedValidated=validateWebsiteChromePayload('branding',published?.payload);
 const initialDraft=(draftValidated.ok?draftValidated.payload:DEFAULT_WEBSITE_CHROME.branding) as WebsiteBrandingConfig;const initialPublished=(publishedValidated.ok?publishedValidated.payload:DEFAULT_WEBSITE_CHROME.branding) as WebsiteBrandingConfig;
 return <section className="section softSection"><div className="shell"><AdminWebsiteBrandingEditor initialDraft={initialDraft} initialPublished={initialPublished} publishedAt={published?.published_at||null}/></div></section>;
}
