import Link from 'next/link';

export default function AdminProjectCreateButton(){
  return <Link className="button dark" href="/admin/project-operations/projects/new">Create project</Link>;
}
