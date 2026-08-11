'use client';

import {useEffect,useState} from 'react';

type User={id:string;email:string;name:string;is_admin:boolean;created_at:string};
export default function AdminAccessManager(){
  const [users,setUsers]=useState<User[]>([]);const [loading,setLoading]=useState(true);const [working,setWorking]=useState('');const [message,setMessage]=useState('');
  async function load(){setLoading(true);const response=await fetch('/api/admin/access');const body=await response.json().catch(()=>({}));if(response.ok)setUsers(body.users||[]);else setMessage(body.error||'Unable to load accounts.');setLoading(false);}
  useEffect(()=>{void load();},[]);
  async function change(user:User){setWorking(user.id);setMessage('');const response=await fetch('/api/admin/access',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({user_id:user.id,action:user.is_admin?'revoke':'grant'})});const body=await response.json().catch(()=>({}));if(!response.ok)setMessage(body.error||'Unable to update access.');else{setUsers(current=>current.map(item=>item.id===user.id?{...item,is_admin:body.is_admin}:item));setMessage(body.is_admin?'Admin access granted.':'Admin access removed.');}setWorking('');}
  return <div>{loading?<p>Loading accounts…</p>:<div style={{display:'grid',gap:10}}>{users.map(user=><div className="listRow" key={user.id}><div><strong>{user.name||user.email||'Mettelo account'}</strong><br/><small>{user.email} · joined {new Date(user.created_at).toLocaleDateString('en-GB')}</small></div><div className="actions"><span className={`chip ${user.is_admin?'green':''}`}>{user.is_admin?'ADMIN':'MEMBER'}</span><button className="button ghost" type="button" disabled={working===user.id} onClick={()=>change(user)}>{working===user.id?'Updating…':user.is_admin?'Remove admin':'Grant admin'}</button></div></div>)}</div>}<div className="formStatus" role="status">{message}</div></div>;
}
