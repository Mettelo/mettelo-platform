export type InsightSection={heading?:string;paragraphs:string[]};
export type InsightArticle={slug:string;title:string;category:string;summary:string;publishedAt:string;readTime:string;image:string;imageAlt:string;sections:InsightSection[]};

export const insightArticles:InsightArticle[]=[
{
slug:'capability-needs-more-than-certificates',
title:'Why capability needs more than another certificate',
category:'INSIGHT',
summary:'Courses can build knowledge. They do not automatically create the judgement, collaboration and evidence that real Data & AI work demands.',
publishedAt:'2026-08-11',readTime:'5 min read',image:'/insights/capability-proof.svg',imageAlt:'Abstract Mettelo illustration connecting learning, real work and proof',
sections:[
{paragraphs:['Data & AI professionals have more access to learning than ever. Tutorials, courses, certifications and AI-assisted learning can make technical knowledge easier to acquire. But access to knowledge has not solved a harder career problem: proving that you can apply what you know in a real environment.','The gap appears when the work becomes ambiguous. A dataset is incomplete. A stakeholder changes the question. A model performs well but cannot be explained. A dashboard is technically correct but does not help anyone decide what to do next. These are capability problems, not course-completion problems.']},
{heading:'The missing layer is application',paragraphs:['Real capability develops when people have to make trade-offs, explain their reasoning, respond to feedback and deliver something useful with other people. That is why Mettelo is building around real projects, contribution records and Proof rather than treating learning completion as the final signal.','A certificate can still be valuable. The point is that it should sit alongside evidence of what someone has built, improved, analysed, communicated or helped a team deliver.']},
{heading:'What stronger evidence looks like',paragraphs:['A stronger professional signal answers practical questions: What was the problem? What did you own? What constraints did you work within? What changed because of your contribution? What can another person verify?','The future of professional credibility will be less about collecting more claims and more about making useful capability visible.']}
]},
{
slug:'mettelo-careers-volunteer-roles-open',
title:'Mettelo Careers is live with volunteer roles open globally',
category:'NEWS',
summary:'We have opened six remote volunteer roles for people who want to help build Mettelo across product, community, growth, learning and Labs operations.',
publishedAt:'2026-08-11',readTime:'3 min read',image:'/insights/careers-open.svg',imageAlt:'Abstract Mettelo illustration representing a distributed global team',
sections:[
{paragraphs:['Mettelo Careers is now live. The first roles are volunteer positions designed for people who want to help build the company itself while working on clear, scoped responsibilities.','The current openings cover Software Development, Social Media, Community Management, Data Training, Growth and Data & AI Project Coordination. All six are remote and open globally.']},
{heading:'Why we separated Careers from Opportunities',paragraphs:['Mettelo Opportunities is for external Data & AI roles published by other organisations. Careers is different: it is where people apply to work with the Mettelo team itself. Keeping those journeys separate makes it clearer what someone is applying for and gives us a proper recruitment workflow.']},
{heading:'What we are looking for',paragraphs:['We are not looking for generic offers to “help anywhere”. Each role has a defined problem, responsibilities and expected contribution. We want people who can take ownership, communicate clearly and leave behind work that another person can understand and continue.','As Mettelo grows, Careers will support volunteer, contract, internship and future paid opportunities through the same internal recruitment system.']}
]},
{
slug:'what-good-data-ai-project-proof-looks-like',
title:'What good Data & AI project proof actually looks like',
category:'CAREER REALITY',
summary:'A polished dashboard or GitHub link is not enough on its own. Strong project proof shows the problem, decisions, trade-offs, contribution and outcome.',
publishedAt:'2026-08-10',readTime:'6 min read',image:'/insights/project-proof.svg',imageAlt:'Abstract Mettelo illustration of project evidence moving through review stages',
sections:[
{paragraphs:['Many portfolios show outputs but hide the work that made those outputs meaningful. A screenshot can show what a dashboard looks like. A repository can show that code exists. Neither automatically tells an employer how the person thought, what they owned or whether the work solved the right problem.','Good project proof preserves the context around the output.']},
{heading:'Start with the problem, not the tool',paragraphs:['A useful case study should explain the decision or operational problem first. Why did the work matter? Who needed the answer? What constraints shaped the approach? Only then should the tools and methods appear.','This is especially important in Data & AI because the same SQL query, model or visualisation can be either valuable or irrelevant depending on the question it was built to answer.']},
{heading:'Make individual contribution visible',paragraphs:['Team projects are valuable, but credibility weakens when every person claims the whole outcome. Strong proof separates team delivery from individual ownership: the analysis you led, the validation you performed, the stakeholder decision you influenced, the documentation you produced or the component you shipped.']},
{heading:'Show review and change',paragraphs:['Real work changes after feedback. Evidence of review, iteration, QA and trade-offs often says more about professional maturity than a perfectly polished final output. Mettelo Proof is being built to make those contribution signals easier to preserve and share.']}
]},
{
slug:'mettelo-spotlight-recognition-with-evidence',
title:'Mettelo Spotlight: recognition should be backed by evidence',
category:'PRODUCT UPDATE',
summary:'Our monthly Spotlight recognises building, collaboration and leadership using contribution signals rather than popularity or self-promotion.',
publishedAt:'2026-08-10',readTime:'4 min read',image:'/insights/spotlight-system.svg',imageAlt:'Abstract Mettelo illustration of three evidence-based recognition signals',
sections:[
{paragraphs:['Professional communities often recognise the loudest people because visibility is easy to observe. Useful contribution is harder. Someone may unblock a team, improve documentation, review another person’s work or quietly carry a difficult delivery responsibility without producing the most posts.','Mettelo Spotlight is designed around a different principle: recognition should follow evidence of contribution.']},
{heading:'Three different signals',paragraphs:['The monthly system separates Builder of the Month, Collaborator of the Month and Leader of the Month. They represent different ways of creating value and are deliberately not collapsed into a single popularity score.','The system uses activity and contribution signals as inputs, then keeps an Admin review step before publication. It also requires distinct eligible people rather than manufacturing a complete set of winners when the evidence is not there.']},
{heading:'Recognition should strengthen Proof',paragraphs:['The long-term purpose is not the badge itself. Recognition should become another credible signal that connects back to real work, verified contribution and professional evidence. That is why Spotlight sits alongside Proof rather than acting as a separate engagement feature.']}
]},
{
slug:'experience-before-the-job-title',
title:'You should not need the job title before you can build the experience',
category:'INSIGHT',
summary:'The experience paradox blocks capable people: employers ask for evidence of work that many candidates have never been given the opportunity to do.',
publishedAt:'2026-08-09',readTime:'5 min read',image:'/insights/experience-loop.svg',imageAlt:'Abstract Mettelo illustration breaking the experience and opportunity loop',
sections:[
{paragraphs:['A common career problem is structurally circular: you need experience to access an opportunity, but you need an opportunity to gain the experience. That affects career changers, graduates and professionals trying to move from reporting into more senior analytical work.','The usual response is to tell people to learn another tool. Sometimes that helps. Often it avoids the real problem. The missing thing is not knowledge of one more syntax; it is credible exposure to decisions, ambiguity, collaboration and delivery.']},
{heading:'Projects can close part of the gap',paragraphs:['A serious project can create a controlled environment where people practise the parts of work that are difficult to learn alone: scoping, ownership, review, handover, stakeholder communication, quality standards and shared deadlines.','But the project has to be designed like work. A solo tutorial renamed as a “real-world project” does not create the same evidence.']},
{heading:'Opportunity should follow demonstrated value',paragraphs:['Mettelo starts from a simple idea: people should be able to build credible evidence before the perfect job title arrives. That evidence should then make it easier for employers, collaborators and project leads to understand what the person can actually do.']}
]},
{
slug:'building-mettelo-beyond-community',
title:'Building Mettelo beyond community: the infrastructure we are working toward',
category:'BUILDING METTELO',
summary:'Community is Mettelo’s front door, not the whole company. We are building connected infrastructure across Labs, Proof, Talent, Research, AI and future products.',
publishedAt:'2026-08-09',readTime:'6 min read',image:'/insights/mettelo-infrastructure.svg',imageAlt:'Abstract Mettelo illustration of connected professional capability infrastructure',
sections:[
{paragraphs:['Mettelo began with a practical community problem: Data & AI professionals were learning, networking, searching for jobs and building portfolios in separate places. The more we looked at that fragmentation, the clearer the bigger opportunity became.','The company we are building is not a community platform with extra features. Community is the front door into a wider professional capability system.']},
{heading:'The connected layers',paragraphs:['Mettelo Community creates relationships and access. Labs creates environments for real collaborative work. Proof turns contribution into professional evidence. Talent connects demonstrated capability to opportunity. Research creates practical intelligence. Mettelo AI and future products can make those signals more useful and easier to act on.','The value comes from the connection between those layers, not from any one page on the website.']},
{heading:'Starting narrow, building for scale',paragraphs:['We are starting with Data & AI because the pace of change is high, skills are visible through work and the gap between learning and real experience is especially clear. The ambition is broader: infrastructure through which professional capability can be developed, demonstrated, discovered and deployed.','That will take time. Our approach is to build the working loop first, test it with real users and real contribution, and expand only where the evidence supports it.']}
]}
];

export function getInsightArticle(slug:string){return insightArticles.find(article=>article.slug===slug);}
