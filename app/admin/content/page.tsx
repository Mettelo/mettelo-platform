import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import AdminContentManager from '@/components/AdminContentManager';
import AdminInsightsManager from '@/components/AdminInsightsManager';

export const dynamic='force-dynamic';
type Post={id:string;slug:string;title:string;summary:string;body:string;author_name:string;content_type:string;featured_image:string|null;featured_image_alt:string|null;seo_title:string|null;seo_description:string|null;status:string;published_at:string|null;updated_at:string};
export default async function AdminContentPage(){const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');const db=serviceDb();let posts:Post[]=[];if(db){const {data}=await db.from('content_posts').select('id,slug,title,summary,body,author_name,content_type,featured_image,featured_image_alt,seo_title,seo_description,status,published_at,updated_at').order('updated_at',{ascending:false});posts=(data||[]) as Post[];}return <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Admin · Content & Insights</div><h1>Create, publish and manage Mettelo content.</h1></div><p>Run News, Insights and Research from the same publishing workspace while keeping projects, opportunities and events operationally separate.</p></div><AdminInsightsManager initialPosts={posts}/><div style={{marginTop:28}}><AdminContentManager/></div></div></section>;}
