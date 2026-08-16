import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import AdminSectionTabs from '@/components/AdminSectionTabs';
import AdminNewsInsightsTable from '@/components/AdminNewsInsightsTable';

export const dynamic='force-dynamic';
type Post={id:string;slug:string;title:string;summary:string;body:string;author_name:string;content_type:string;featured_image:string|null;featured_image_alt:string|null;seo_title:string|null;seo_description:string|null;status:string;published_at:string|null;updated_at:string};
export default async function AdminNewsPage(){const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');const db=serviceDb();let posts:Post[]=[];if(db){const {data}=await db.from('content_posts').select('id,slug,title,summary,body,author_name,content_type,featured_image,featured_image_alt,seo_title,seo_description,status,published_at,updated_at').order('updated_at',{ascending:false});posts=(data||[]) as Post[];}return <section className="section softSection"><div className="shell"><AdminSectionTabs label="Content sections" tabs={[{label:'News & Insights',href:'/admin/content/news'},{label:'Structured Content',href:'/admin/content/structured'}]}/><AdminNewsInsightsTable initialPosts={posts}/></div></section>}
