export type FitSignalStatus='match'|'review'|'gap';
export type MemberProjectFitSignal={key:string;label:string;status:FitSignalStatus;summary:string;detail:string};
export type MemberRoleFit={roleId:string;matchedSkills:string[];skillsToReview:string[];preferredRoleMatch:boolean;status:'aligned'|'partial'|'review';summary:string};
export type MemberProjectFit={signals:MemberProjectFitSignal[];matchedCount:number;reviewCount:number;gapCount:number;roleFits:Record<string,MemberRoleFit>};

type Facet={slug:string;name?:string|null};
type Role={id:string;title:string;skills:string[];recommendedSkills?:string[];canonicalRoleKey?:string|null};
type Input={profile:{skills?:string[]|null;preferredRoles?:string[]|null;experienceLevel?:string|null;weeklyCapacity?:string|null};preferredDomains:Facet[];preferredTools:Facet[];project:{difficultyLevel?:string|null;weeklyCommitment?:string|null;domains:Facet[];tools:Facet[]};roles:Role[]};
type HourRange={min:number;max:number};

function norm(value:string|null|undefined){return(value||'').trim().toLowerCase().replace(/[–—]/g,'-').replace(/[^a-z0-9+#.]+/g,' ').replace(/\s+/g,' ').trim()}
function tokens(values:string[]|null|undefined){return new Set((values||[]).map(norm).filter(Boolean))}
function facetKeys(values:Facet[]){return new Set(values.flatMap(item=>[norm(item.slug),norm(item.name)].filter(Boolean)))}
function overlap(a:Set<string>,b:Set<string>){return[...a].filter(value=>b.has(value))}
function hourRange(value:string|null|undefined):HourRange|null{
 const raw=(value||'').replace(/[–—]/g,'-');
 const range=raw.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);if(range)return{min:Number(range[1]),max:Number(range[2])};
 const upTo=raw.match(/(?:up to|max(?:imum)?|<=?)\s*(\d+(?:\.\d+)?)/i);if(upTo)return{min:0,max:Number(upTo[1])};
 const plus=raw.match(/(\d+(?:\.\d+)?)\s*\+/);if(plus)return{min:Number(plus[1]),max:Number.POSITIVE_INFINITY};
 const single=raw.match(/(\d+(?:\.\d+)?)/);return single?{min:Number(single[1]),max:Number(single[1])}:null;
}
export function compareWeeklyCapacity(memberCapacity:string|null|undefined,projectCommitment:string|null|undefined):FitSignalStatus{
 const member=hourRange(memberCapacity),project=hourRange(projectCommitment);
 if(!member||!project)return'review';
 return member.max>=project.min?'match':'gap';
}
function experienceRank(value:string|null|undefined){const key=norm(value);if(!key)return null;if(/beginner|entry|foundation|junior/.test(key))return 1;if(/intermediate|mid/.test(key))return 2;if(/advanced|senior|expert|capstone/.test(key))return 3;return null}
function signal(key:string,label:string,status:FitSignalStatus,summary:string,detail:string):MemberProjectFitSignal{return{key,label,status,summary,detail}}

export function evaluateMemberProjectFit(input:Input):MemberProjectFit{
 const memberSkills=tokens(input.profile.skills),preferredRoles=tokens(input.profile.preferredRoles),preferredDomains=facetKeys(input.preferredDomains),preferredTools=facetKeys(input.preferredTools),projectDomains=facetKeys(input.project.domains),projectTools=facetKeys(input.project.tools);const signals:MemberProjectFitSignal[]=[];
 const domainMatches=overlap(preferredDomains,projectDomains);signals.push(preferredDomains.size===0?signal('domain','Domain alignment','review','No domain preference recorded','Add a domain preference if you want Mettelo to compare this project with the areas you want to work in.'):domainMatches.length>0?signal('domain','Domain alignment','match','Your domain preferences overlap','At least one of your saved domain preferences matches this project.'):signal('domain','Domain alignment','review','No saved domain overlap','This does not block you. Review whether the project domain is still relevant to the experience you want to build.'));
 const toolMatches=overlap(preferredTools,projectTools);signals.push(projectTools.size===0?signal('tools','Tool alignment','review','No governed project tools published','Tool fit cannot be compared yet because the project has no governed tool metadata.'):preferredTools.size===0?signal('tools','Tool alignment','review','No tool preference recorded','Add tool preferences if you want a clearer comparison with project methods and tooling.'):toolMatches.length>0?signal('tools','Tool alignment','match',`${toolMatches.length} tool preference${toolMatches.length===1?'':'s'} overlap`,'Your saved tool preferences overlap with governed tools used by this project.'):signal('tools','Tool alignment','review','No saved tool overlap','This is not an automatic rejection. Treat it as a learning/fit question before applying.'));
 const capacityStatus=compareWeeklyCapacity(input.profile.weeklyCapacity,input.project.weeklyCommitment);signals.push(capacityStatus==='review'?signal('commitment','Weekly capacity','review','Commitment needs a manual check','Mettelo could not safely compare the published weekly commitment with your saved capacity.'):capacityStatus==='match'?signal('commitment','Weekly capacity','match','Your saved capacity can meet the project minimum',`Saved capacity: ${input.profile.weeklyCapacity}. Project: ${input.project.weeklyCommitment}.`):signal('commitment','Weekly capacity','gap','Your saved capacity is below the project minimum',`Saved capacity: ${input.profile.weeklyCapacity}. Project: ${input.project.weeklyCommitment}. Update your capacity only if your circumstances have genuinely changed.`));
 const memberLevel=experienceRank(input.profile.experienceLevel),projectLevel=experienceRank(input.project.difficultyLevel);signals.push(memberLevel==null||projectLevel==null?signal('experience','Experience context','review','Experience level needs a manual check','The member or project experience level is not structured enough for a reliable automatic comparison.'):memberLevel>=projectLevel?signal('experience','Experience context','match','Your recorded experience meets or exceeds the project level',`Your level: ${input.profile.experienceLevel}. Project level: ${input.project.difficultyLevel}.`):signal('experience','Experience context','review','Project level is above your recorded experience',`Your level: ${input.profile.experienceLevel}. Project level: ${input.project.difficultyLevel}. This is guidance, not an automatic rejection.`));
 const roleFits:Record<string,MemberRoleFit>={};for(const role of input.roles){const roleSkills=[...(role.skills||[]),...(role.recommendedSkills||[])].map(item=>item.trim()).filter(Boolean);const matched=roleSkills.filter(item=>memberSkills.has(norm(item)));const review=roleSkills.filter(item=>!memberSkills.has(norm(item))).slice(0,6);const roleKeys=new Set([norm(role.title),norm(role.canonicalRoleKey)].filter(Boolean));const preferredRoleMatch=overlap(preferredRoles,roleKeys).length>0;const status=matched.length>=Math.min(2,roleSkills.length||2)||preferredRoleMatch?'aligned':matched.length>0?'partial':'review';roleFits[role.id]={roleId:role.id,matchedSkills:matched.slice(0,8),skillsToReview:review,preferredRoleMatch,status,summary:status==='aligned'?'Strong signals from your saved profile':status==='partial'?'Some profile signals overlap':'Review this role against your experience before continuing'}}
 const matchedCount=signals.filter(item=>item.status==='match').length,gapCount=signals.filter(item=>item.status==='gap').length;return{signals,matchedCount,reviewCount:signals.length-matchedCount-gapCount,gapCount,roleFits};
}
