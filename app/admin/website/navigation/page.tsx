import {redirect} from 'next/navigation';
import {AdminWebsiteNavigationEditor} from '@/components/AdminWebsiteChromeEditors';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {DEFAULT_WEBSITE_CHROME,validateWebsiteChromePayload,type WebsiteNavigationConfig} from '@/lib/website-chrome';

export const dynamic='force-dynamic';

export default async function AdminWebsiteNavigationPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(!hasAdminCapability(user,'website.navigation.manage'))redirect('/admin');
 const db=serviceDb();if(!db)return <section className="section"><div className="shell"><div className="adminEmpty"><h1>Navigation unavailable</h1><p>Admin data service is not configured.</p></div></div></section>;
 const [{data:draft},{data:published}]=await Promise.all([db.from('website_chrome_drafts').select('payload,updated_at').eq('scope','navigation').maybeSingle(),db.from('website_chrome_public').select('payload,published_at').eq('scope','navigation').maybeSingle()]);
 const draftValidated=validateWebsiteChromePayload('navigation',draft?.payload);const publishedValidated=validateWebsiteChromePayload('navigation',published?.payload);
 const initialDraft=(draftValidated.ok?draftValidated.payload:DEFAULT_WEBSITE_CHROME.navigation) as WebsiteNavigationConfig;const initialPublished=(publishedValidated.ok?publishedValidated.payload:DEFAULT_WEBSITE_CHROME.navigation) as WebsiteNavigationConfig;
 return <section className="section softSection"><div className="shell"><AdminWebsiteNavigationEditor initialDraft={initialDraft} initialPublished={initialPublished} publishedAt={published?.published_at||null}/></div></section>;
}
