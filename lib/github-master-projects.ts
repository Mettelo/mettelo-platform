import masters from '@/data/github-master-projects.json';

export type GithubMasterProject = {
 id:string;name:string;track:string;brief:string;problem:string;sector:string;
 roles:string[];capabilities:string[];repository:string;status:string;
 use_case?:string;data_source?:string;duration?:string;team_size?:string;
};
const pinnedSourceCommit='65dc740ac1c6c8f88868863a6772150c1a5a12f7';
const records=masters as GithubMasterProject[];
const idPattern=/^MTL-(DA|DE|DS|AI|XF|BA)-(\d{3})$/;
const verified=records.length===50&&new Set(records.map(p=>p.id)).size===50
 &&new Set(records.map(p=>Number(idPattern.exec(p.id)?.[2]))).size===50
 &&records.every(p=>idPattern.test(p.id)&&p.name.trim()&&p.brief.trim()
 &&p.status==='Available'&&/^https:\/\/github\.com\/Mettelo\/[A-Za-z0-9_.-]+\/?$/.test(p.repository));
export function isGithubMasterDiscoveryEnabled(){
 return process.env.METTELO_PHASE2_CATALOGUE_MODE==='github50';
}
export function getGithubMasterProjects(){
 if(!verified)throw new Error('Pinned GitHub master catalogue validation failed');
 return records;
}
export function getGithubMasterProject(id:string){
 return getGithubMasterProjects().find(p=>p.id===id)||null;
}
export const githubMasterSourceRevision=pinnedSourceCommit;
