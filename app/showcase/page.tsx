import type {Metadata} from 'next';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import {getPublicWebsiteCmsPage} from '@/lib/website-pages-cms';

export const metadata:Metadata={title:'Project Showcase',description:'Completed Mettelo Labs work and verified public contributor evidence.'};
export const dynamic='force-dynamic';
type ProofRow={id:string;title:string;contribution_type:string;description:string|null;evidence_url:string|null;user_id:string;project_id:string|null;projects:{id:string;title:string;summary:string;github_url:string|null;status:string}|null};type Profile={id:string;full_name:string|null;headline:string|null};
export default async function ShowcasePage(){const supabase=createPublicSupabaseClient();let rows:ProofRow[]=[];let profiles:Profile[]=[];let loadError=false;if(supabase){const result=await supabase.from('contributions').select('id,title,contribution_type,description,evidence_url,user_id,project_id,projects(id,title,summary,g... (truncated)