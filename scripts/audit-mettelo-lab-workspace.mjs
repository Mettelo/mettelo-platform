import fs from 'node:fs';

const read=(file)=>fs.readFileSync(file,'utf8');
const layout=read('app/member/projects/[id]/layout.tsx');
const shellCss=read('app/member/projects/[id]/phase4-workspace.module.css');
const home=read('components/MetteloLabPanel.tsx');
const chat=read('components/ProjectMessagePanel.tsx');
const failures=[];
const requireText=(name,text,needle)=>{if(!text.includes(needle))failures.push(`${name}: missing ${JSON.stringify(needle)}`)};
const forbidText=(name,text,needle)=>{if(text.includes(needle))failures.push(`${name}: stale or unsafe text ${JSON.stringify(needle)}`)};

for(const label of ['Home','Plan','Tasks','Chat','Data','Proof','Resources','Events','Team'])requireText('desktop navigation',layout,`['${label}',`);
for(const label of ['Home','Tasks','Chat','Data','More'])requireText('mobile navigation',layout,`['${label}',`);
requireText('workspace identity',layout,'METTELO LAB');
forbidText('workspace identity',layout,'Project workspace');
requireText('mobile More',layout,"['Plan','#problem']");
requireText('mobile More',layout,"['Proof','#phase4-contributions']");
requireText('responsive shell',shellCss,'@media(max-width:1024px)');
requireText('responsive shell',shellCss,'@media(max-width:480px)');
requireText('responsive shell',shellCss,'.mobileNav');
requireText('Home',home,'METTELO LAB / HOME');
requireText('Home',home,'UP NEXT');
requireText('Team privacy',home,'YOUR TEAM');
for(const stale of ['lockedCohort','cohortSwitcher','Not a member','People working on this project'])forbidText('Team privacy',home,stale);
requireText('Chat',chat,'Project Chat');
requireText('Chat',chat,'messageMenu');
requireText('Chat',chat,'Write a message…');
for(const stale of ['Project conversation','Start the project conversation.'])forbidText('Chat terminology',chat,stale);

if(failures.length){console.error('Mettelo Lab workspace audit failed:\n'+failures.map(item=>`- ${item}`).join('\n'));process.exit(1)}
console.log('Mettelo Lab workspace audit passed.');
