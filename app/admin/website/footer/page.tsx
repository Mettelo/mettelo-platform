import {redirect} from 'next/navigation';
import {AdminFooterSocialEditor} from '@/components/AdminWebsiteChromeEditors';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {DEFAULT_WEBSITE_CHROME,validateWebsiteChromePayload,type WebsiteFooterConfig} from '@/lib/website-chrome';

export const dynamic='force-dynamic';

export default async function AdminFooterSocialPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(!hasAdminCapability(user,'website.content.edit')||!hasAdminCapability(user,'platform.settings.manage'))redirect('/admin');
 const db=serviceDb();if(!db)return <section className="section"><div className="shell"><div className="adminEmpty"><h1>Footer & social unavailable</h1><p>Admin data service is not configured.</p></div></div></section>;
 const [{data:draft},{data:published},{data:settings}]=await Promise.all([
  db.from('website_chrome_drafts').select('payload,updated_at').eq('scope','footer').maybeSingle(),
  db.from('website_chrome_public').select('payload,published_at').eq('scope','footer').maybeSingle(),
  db.from('platform_settings').select('setting_key,label,value,value_type').in('setting_group',['social','contact']).order('sort_order').order('label')
 ]);
 const draftValidated=validateWebsiteChromePayload('footer',draft?.payload);const publishedValidated=validateWebsiteChromePayload('footer',published?.payload);
 const initialDraft=(draftValidated.ok?draftValidated.payload:DEFAULT_WEBSITE_CHROME.footer) as WebsiteFooterConfig;const initialPublished=(publishedValidated.ok?publishedValidated.payload:DEFAULT_WEBSITE_CHROME.footer) as WebsiteFooterConfig;
 return <section className="section softSection"><div className="shell"><AdminFooterSocialEditor initialFooter={initialDraft} initialPublished={initialPublished} publishedAt={published?.published_at||null} initialSettings={(settings||[]) as {setting_key:string;label:string;value:string|null;value_type:'text'|'email'|'url'}[]}/></div></section>;
}
