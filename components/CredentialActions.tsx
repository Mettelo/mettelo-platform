'use client';

import {useState} from 'react';
import SocialShare from '@/components/SocialShare';

export default function CredentialActions({credentialId,name,status}:{credentialId:string;name:string;status:string}){
 const [message,setMessage]=useState('');const url=`https://mettelo.com/credentials/${credentialId}`;const shareText=`${name} — Mettelo Data & AI Project Architect credential (${status}). Verify: ${url}`;
 async function copyLinkedIn(){const text=`Credential name: Mettelo Data & AI Project Architect\nIssuing organisation: Mettelo\nCredential ID: ${credentialId}\nCredential URL: ${url}`;try{await navigator.clipboard.writeText(text);setMessage('LinkedIn-ready credential details copied. Paste them into the Licenses & certifications section on LinkedIn.')}catch{setMessage('Copy was unavailable. Use the credential ID and verification link shown on this page.')}}
 return <div className="credentialActions"><div className="actions"><SocialShare url={url} text={shareText} label="Share credential"/><button className="button ghost" type="button" onClick={()=>window.print()}>Download / print credential</button><button className="button ghost" type="button" onClick={()=>void copyLinkedIn()}>Copy LinkedIn details</button></div><p className="panelNote"><strong>LinkedIn:</strong> add this under Licenses &amp; certifications using “Mettelo” as the issuing organisation, the credential ID shown here, and this verification URL. Do not describe it as employment or a professional certification.</p><div className="formStatus" role="status" aria-live="polite">{message}</div><style jsx>{`.credentialActions{margin-top:20px}@media(max-width:480px){.credentialActions :global(.actions){display:grid;grid-template-columns:1fr}.credentialActions :global(.button){width:100%}}@media print{.credentialActions{display:none}}`}</style></div>;
}
