'use client';

import {useSearchParams} from 'next/navigation';

export default function ProjectPathBackContext({paths}:{paths:{slug:string;name:string}[]}){
 const search=useSearchParams();const slug=search.get('path');const match=slug?paths.find(path=>path.slug===slug):null;if(!match)return null;
 return <div className="pathBackContext"><a href={`/projects/paths/${match.slug}`}>← Back to {match.name} Capability Path</a></div>;
}
