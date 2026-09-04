import type {CatalogueFacet} from '@/lib/project-catalogue-filtering';

function key(value:string|null|undefined){return String(value||'').trim().toLowerCase().replace(/&/g,' and ').replace(/[–—/]+/g,' ').replace(/[^a-z0-9+#.]+/g,' ').replace(/\s+/g,' ').trim()}
function facet(slug:string,label:string,aliases:string[]=[]):CatalogueFacet{return{slug,label,aliases}}

export const CANONICAL_CAREER_ROLES:CatalogueFacet[]=[
  facet('data-analyst','Data Analyst',['data analytics analyst']),
  facet('business-analyst','Business Analyst'),
  facet('bi-analyst','BI Analyst',['business intelligence analyst','bi developer']),
  facet('data-scientist','Data Scientist'),
  facet('data-engineer','Data Engineer'),
  facet('analytics-engineer','Analytics Engineer'),
  facet('ml-ai-engineer','ML / AI Engineer',['machine learning engineer','ml engineer','ai engineer','ai ml engineer','ml ai engineer']),
  facet('mlops-engineer','MLOps Engineer',['machine learning operations engineer']),
  facet('marketing-analyst','Marketing Analyst'),
  facet('product-analyst','Product Analyst'),
  facet('research-analyst','Research Analyst'),
  facet('operations-analyst','Operations Analyst'),
  facet('financial-analyst','Financial Analyst'),
  facet('risk-analyst','Risk Analyst'),
  facet('data-architect','Data Architect'),
  facet('data-governance-analyst','Data Governance Analyst',['data governance specialist']),
  facet('geospatial-analyst','Geospatial Analyst',['gis analyst','spatial analyst']),
  facet('software-engineer','Software Engineer',['application developer','software developer']),
  facet('cloud-engineer','Cloud Engineer'),
  facet('cybersecurity-analyst','Cybersecurity Analyst',['security analyst'])
];

const careerLookup=new Map<string,CatalogueFacet>();
for(const item of CANONICAL_CAREER_ROLES){for(const candidate of [item.slug,item.label,...(item.aliases||[])])careerLookup.set(key(candidate),item)}
export function normalizeCareerRole(value:string|null|undefined):CatalogueFacet|null{return careerLookup.get(key(value))||null}
export function normalizeCareerRoles(values:(string|null|undefined)[]):CatalogueFacet[]{const map=new Map<string,CatalogueFacet>();for(const value of values){const item=normalizeCareerRole(value);if(item&&!map.has(item.slug))map.set(item.slug,item)}return[...map.values()]}

export const CANONICAL_INDUSTRIES:CatalogueFacet[]=[
  facet('technology-saas','Technology & SaaS'),facet('financial-services','Financial Services'),facet('healthcare-life-sciences','Healthcare & Life Sciences'),facet('retail-ecommerce','Retail & E-commerce'),facet('marketing-media','Marketing & Media'),facet('government-public-services','Government & Public Services'),facet('transport-logistics','Transport & Logistics'),facet('manufacturing','Manufacturing'),facet('energy-utilities','Energy & Utilities'),facet('environment-sustainability','Environment & Sustainability'),facet('education','Education'),facet('people-hr','People & HR'),facet('real-estate-built-environment','Real Estate & Built Environment'),facet('agriculture-food','Agriculture & Food'),facet('research-science','Research & Science'),facet('cross-industry','Cross-industry')
];
const industryAliases:Record<string,string[]>={
  'technology-saas':['technology','software','saas','information technology','it services','digital platforms'],
  'financial-services':['financial services','finance','banking','fintech','insurance','payments','wealth management','capital markets'],
  'healthcare-life-sciences':['healthcare','health','life sciences','pharmaceuticals','pharma','biotech','clinical','public health'],
  'retail-ecommerce':['retail','ecommerce','e-commerce','consumer retail'],
  'marketing-media':['marketing','advertising','media','digital marketing','communications'],
  'government-public-services':['government','public services','public sector','local government','civil service'],
  'transport-logistics':['transport','transportation','logistics','supply chain','mobility','freight'],
  manufacturing:['manufacturing','industrial manufacturing','production'],
  'energy-utilities':['energy','utilities','power','electricity','water utilities','oil and gas'],
  'environment-sustainability':['environment','environmental','sustainability','climate','conservation','natural resources'],
  education:['education','edtech','higher education','schools','learning'],
  'people-hr':['human resources','hr','people analytics','workforce','talent'],
  'real-estate-built-environment':['real estate','property','construction','built environment','housing'],
  'agriculture-food':['agriculture','agri-food','food','food supply','farming','agritech','aquaculture'],
  'research-science':['research','science','scientific research','laboratory'],
  'cross-industry':['cross-industry','cross industry','general','multi-industry']
};
const industryLookup=new Map<string,CatalogueFacet>();
for(const item of CANONICAL_INDUSTRIES){for(const alias of [item.slug,item.label,...(industryAliases[item.slug]||[])])industryLookup.set(key(alias),item)}
export function normalizeIndustry(value:string|null|undefined):CatalogueFacet|null{return industryLookup.get(key(value))||null}

export const CANONICAL_TOOLS:CatalogueFacet[]=[
  facet('python','Python'),facet('sql','SQL'),facet('power-bi','Power BI',['powerbi','power bi desktop']),facet('tableau','Tableau'),facet('excel','Excel',['microsoft excel']),facet('postgresql','PostgreSQL',['postgres','postgre sql']),facet('github','GitHub',['github.com','git github']),facet('git','Git'),facet('r','R'),facet('spark','Apache Spark',['spark','pyspark']),facet('databricks','Databricks'),facet('snowflake','Snowflake'),facet('dbt','dbt'),facet('airflow','Apache Airflow',['airflow']),facet('azure','Microsoft Azure',['azure']),facet('aws','AWS',['amazon web services']),facet('gcp','Google Cloud',['google cloud platform','gcp']),facet('docker','Docker'),facet('kubernetes','Kubernetes'),facet('tensorflow','TensorFlow'),facet('pytorch','PyTorch'),facet('scikit-learn','scikit-learn',['sklearn']),facet('jupyter','Jupyter'),facet('looker','Looker'),facet('bigquery','BigQuery',['google bigquery'])
];
const toolLookup=new Map<string,CatalogueFacet>();
for(const item of CANONICAL_TOOLS){for(const candidate of [item.slug,item.label,...(item.aliases||[])])toolLookup.set(key(candidate),item)}
export function normalizeTool(value:string|null|undefined):CatalogueFacet|null{return toolLookup.get(key(value))||null}

export const CANONICAL_CAPABILITIES:CatalogueFacet[]=[
  facet('sql','SQL'),facet('python','Python'),facet('data-visualisation','Data visualisation',['data visualization','visualisation','visualization']),facet('dashboarding','Dashboarding',['dashboard development','dashboard design']),facet('forecasting','Forecasting',['time series forecasting']),facet('regression','Regression'),facet('classification','Classification'),facet('rag','RAG',['retrieval augmented generation','retrieval-augmented generation']),facet('nlp','NLP',['natural language processing']),facet('computer-vision','Computer Vision'),facet('stakeholder-communication','Stakeholder Communication',['stakeholder management','stakeholder engagement']),facet('data-quality','Data Quality',['data quality assurance','data validation']),facet('experimentation','Experimentation',['a b testing','ab testing','a/b testing']),facet('data-modelling','Data Modelling',['data modeling']),facet('etl-elt','ETL / ELT',['etl','elt','data pipelines']),facet('machine-learning','Machine Learning',['ml']),facet('statistical-analysis','Statistical Analysis',['statistics']),facet('requirements-analysis','Requirements Analysis',['requirements gathering']),facet('storytelling','Data Storytelling',['data storytelling']),facet('data-governance','Data Governance')
];
const capabilityLookup=new Map<string,CatalogueFacet>();
for(const item of CANONICAL_CAPABILITIES){for(const candidate of [item.slug,item.label,...(item.aliases||[])])capabilityLookup.set(key(candidate),item)}
export function normalizeCapability(value:string|null|undefined):CatalogueFacet|null{return capabilityLookup.get(key(value))||null}

export function normalizeFacetList(values:CatalogueFacet[],normalizer:(value:string|null|undefined)=>CatalogueFacet|null){const map=new Map<string,CatalogueFacet>();for(const value of values){const canonical=normalizer(value.slug)||normalizer(value.label)||value.aliases?.map(normalizer).find(Boolean)||null;if(canonical&&!map.has(canonical.slug))map.set(canonical.slug,canonical)}return[...map.values()].sort((a,b)=>a.label.localeCompare(b.label))}
