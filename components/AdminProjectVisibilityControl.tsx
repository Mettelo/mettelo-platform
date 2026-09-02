'use client';

import AdminStatusBadge from './AdminStatusBadge';

export default function AdminProjectVisibilityControl({visibility}:{projectId:string;visibility:string}){
  const current=visibility==='private'?'private':'public';
  return <div className="visibilityControl"><AdminStatusBadge status={current}/><small>Visibility is controlled by Publish, Unpublish and Archive actions.</small><style jsx>{`.visibilityControl{display:grid;gap:5px}.visibilityControl small{color:#697482;font-size:.65rem;line-height:1.4}`}</style></div>;
}
