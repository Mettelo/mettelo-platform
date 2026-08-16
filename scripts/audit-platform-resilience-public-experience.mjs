import fs from 'node:fs';

const checks=[];
function read(path){return fs.readFileSync(path,'utf8')}
function expect(path,needles,label){const source=read(path);const missing=needles.filter(value=>!source.includes(value));if(missing.length){console.error(`FAIL ${label}: ${path} missing ${missing.join(', ')}`);process.exitCode=1}else{console.log(`PASS ${label}`)}checks.push(label)}

expect('components/HardenedCard.tsx',['metteloHardenedCard','data-summary-lines','data-title-lines'],'shared hardened card primitive');
expect('app/mobile.css',['overflow-wrap:anywhere','word-break:break-word','min-width:0!important','grid-template-columns:repeat(3,minmax(0,1fr))','@media(max-width:480px)','@media(min-width:481px) and (max-width:1024px)','@media(min-width:1025px)','a[href="/project-architect"]'],'system card/grid resilience and three breakpoints');
expect('app/api/forms/route.ts',['fieldLimits','hasPathologicalToken','status:422','contribution:2000','message:3000'],'server-side free-text validation');
expect('app/page.tsx',['Professional capability infrastructure','technology-led platform','href="/auth/signup"','Africa and beyond','href="/faq"','HomeHeroShowcase','getHeroMetrics',"db.from('profiles')","db.from('opportunities')",'ESTABLISHED_COMMUNITY_REACH=5689','heroCommunityProof','heroCommunityAvatars','professionals building capability and accessing opportunity'],'homepage positioning generic community proof and live metrics');
expect('components/HomeHeroShowcase.tsx',['role="tablist"','aria-selected','Previous showcase slide','Next showcase slide','LIVE_THRESHOLD=500','Projects delivered','Public projects','Open opportunities','Proof signals','Verified Proof','Established Mettelo total','Live platform total'],'accessible three-slide homepage showcase with threshold and live metrics');
expect('components/HeaderNavigation.tsx',["['Projects','/projects']","['Opportunities','/opportunities']","['Proof','/showcase']","['Events','/events']","['For organisations','/organisations']","['About Mettelo','/about']",'exploreNavigation',"['Community','/community']","['Insights','/blog']","['Spotlight','/spotlight']","['Careers','/careers']","['FAQ','/faq']",'exploreMenu','explorePanel','Mobile Explore navigation','closeOutside','pointerdown','Go to Mettelo homepage','globalWorkspaceHomeButton','memberHomeButton','adminHomeButton'],'global Explore navigation dismissal and homepage controls');
expect('app/layout.tsx',['<HeaderNavigation/>','href="/community">Community','Company & Support','For organisations'],'footer and header use final public information architecture');
expect('app/home-social-proof.css',['heroCommunityProof','heroCommunityAvatar','1500px','white-space:nowrap','@media(max-width:480px)','@media(min-width:481px) and (max-width:1024px)','@media(min-width:1025px)','overflow-wrap:anywhere'],'community social proof and wider hero are responsive and contained');
expect('components/HomeLiveContent.tsx',['safeText','liveCardTitle','liveCardSummary','replace(/\\S{56,}/g'],'live homepage data display is bounded');
expect('app/home-overhaul.css',['overflow-wrap:anywhere','word-break:break-word','-webkit-line-clamp:4','grid-template-columns:repeat(4,minmax(0,1fr))','@media(max-width:480px)','@media(min-width:481px) and (max-width:1024px)','@media(min-width:1025px)','prefers-reduced-motion'],'homepage containment and responsive overhaul');
expect('app/about/page.tsx',['technology-led organisation','Africa and beyond','African ambition and global usefulness','href="/auth/signup"'],'About mission and vision positioning');
expect('app/join/page.tsx',["redirect('/auth/signup')"],'Join route collapses to signup');
expect('middleware.ts',["pathname==='/project-architect'","target.pathname='/member/project-architect'","'/project-architect'"],'Project Architect member-only redirect');
expect('components/FAQAccordion.tsx',['aria-expanded','aria-controls','role="region"','hidden={!expanded}'],'FAQ accordion accessibility');
expect('app/faq/page.tsx',['What is Mettelo, and who is it for?','How do project applications work?','What does “Proof” mean on Mettelo?','Is Mettelo only for people in Africa?','STILL HAVE QUESTIONS?'],'FAQ content coverage');

if(process.exitCode)process.exit(process.exitCode);console.log(`Platform resilience/public experience audit passed (${checks.length} contracts).`);
