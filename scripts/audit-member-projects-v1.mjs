import fs from 'node:fs';

const read=path=>fs.existsSync(path)?fs.readFileSync(path,'utf8'):'';
const page=read('app/member/projects/page.tsx');
const helper=read('lib/member-projects.ts');
const css=read('app/member/projects/member-projects.module.css');
const shell=read('components/MemberAppShell.tsx');
const nav=read('lib/member-navigation.ts');
const gate=read('app/member/projects/[id]/layout.tsx');

const checks=[
 ['Projects remains server authenticated',page.includes('createServerSupabaseClient')&&page.includes("redirect('/signin?next=/member/projects')")],
 ['portfolio uses bounded membership retrieval',page.includes(".limit(120)")&&page.includes("project_members")],
 ['active priority uses real task state',page.includes('projectPriority(')&&helper.includes('overdue')&&helper.includes('blocked')&&helper.includes('dueSoon')],
 ['active project CTA opens Mettelo Lab',page.includes('Open Mettelo Lab')&&page.includes('labHref(')],
 ['Lab authorization remains server side',gate.includes("['active','completed'].includes(membership.membership_status)")&&gate.includes("['active','review','completed'].includes(runStatus)" )],
 ['Team Forming is plain language and no action state is explicit',page.includes('Team forming')&&page.includes('No action needed right now')],
 ['preparing projects do not expose Lab entry',page.includes('href="/member/applications"')&&page.includes('Mettelo Lab remains closed until final readiness passes and the canonical start succeeds.')&&!/filteredPreparing[\s\S]*Open Mettelo Lab/.test(page.slice(page.indexOf('filteredPreparing'),page.indexOf('{showCompleted')))],
 ['completed Proof links require verified contribution state',page.includes("verification_status','verified'")&&page.includes('proofProjects.has(item.project_id)')],
 ['Discover and Recommended remain distinct member journeys',page.includes('href="/member/discover"')&&page.includes('href="/member/recommended"')&&!page.includes('href="/projects"')],
 ['search state and role filtering are accessible',page.includes('aria-label="Search my projects"')&&page.includes('aria-label="Project state"')&&page.includes('aria-label="Filter by project role"')],
 ['completed history is paginated',page.includes('PAGE_SIZE=6')&&page.includes('Page {page} of {totalPages}')],
 ['own team context uses assigned run only',page.includes('run_number')&&page.includes('Your team')],
 ['cross cohort rosters are not rendered',!page.includes('profiles(')&&!page.includes('full_name')&&!page.includes('teamRows')],
 ['prototype sample projects are not hardcoded',!page.includes('Open Data Quality Monitor')&&!page.includes('Customer Insight Sprint')&&!page.includes('Responsible AI Evaluation')],
 ['My Mettelo nav still contains exact mobile five',/mobilePersistentNav[\s\S]*label:'Home'[\s\S]*label:'Projects'[\s\S]*label:'Discover'[\s\S]*label:'Proof'[\s\S]*label:'More'/.test(nav)&&shell.includes("from '@/lib/member-navigation'")],
 ['mobile tablet desktop breakpoints are explicit',css.includes('@media(max-width:480px)')&&css.includes('@media(max-width:1024px)')],
 ['44px interactive target contract exists',css.includes('min-height:44px')],
 ['visible focus and reduced motion are preserved',css.includes(':focus-visible')&&css.includes('prefers-reduced-motion:reduce')],
 ['no project workspace features are duplicated into portfolio',!page.includes('ProjectConversation')&&!page.includes('ProjectDataGovernance')&&!page.includes('MetteloLabNavigation')]
];

let passed=0;
checks.forEach(([label,ok],index)=>{console.log(`${ok?'PASS':'FAIL'} ${String(index+1).padStart(2,'0')}/${checks.length} ${label}`);if(ok)passed+=1});
console.log(`\nMy Mettelo Projects portfolio audit: ${passed}/${checks.length} checks passed.`);
if(passed!==checks.length)process.exit(1);
