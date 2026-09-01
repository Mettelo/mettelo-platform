import type {ReactNode} from 'react';
import PublicProjectCapabilityPaths from '@/components/PublicProjectCapabilityPaths';
import '../capability-paths-public.css';

export default async function ProjectDetailLayout({children,params}:{children:ReactNode;params:Promise<{id:string}>}){
 const {id}=await params;
 return <>{children}<PublicProjectCapabilityPaths projectId={id}/></>;
}
