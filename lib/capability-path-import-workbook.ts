export type WorkbookCell=string|number|boolean|null;
export type WorkbookSheets=Record<string,WorkbookCell[][]>;

export type CapabilityPathImportManifest={
  manifest_version:'capability-paths-v1';
  source_filename:string;
  source_sha256:string;
  source_version:string;
  expected:{paths:number;placements:number;projects:number};
  paths:Array<{source_key:string;source_sheet:string;source_row:number;slug:string;name:string;target_role:string;short_description:string;description:string;progression_summary:string;target_outcome:string;sort_order:number}>;
  projects:Array<{source_key:string;source_sheet:string;source_row:number;slug:string;title:string;summary:string;problem_statement:string;use_case:string;decision_to_support:string;project_objective:string;deliverables:string;success_criteria:string;stakeholder:string;domain:string;dataset:string;source_organisation:string;source_url:string;licence:string;data_reality:string;technical_skills:string[];professional_skills:string[];tools:string[];methods:string[];team_roles:string;evidence_proof:string;duration_weeks:number|null;weekly_commitment:string;team_size:number;review_decision:string}>;
  placements:Array<{source_key:string;source_sheet:string;source_row:number;path_key:string;project_source_key:string;position:number;stage_name:string;stage_slug:string;competency_focus:string;capability_built:string;prerequisite_project_source_key:string;path_outcome:string}>;
  resources:Array<{project_source_key:string;title:string;source_organisation:string;source_url:string;licence:string;data_reality:string;governance_status:'green'|'amber'|'red'|'link_only';storage_decision:'review'|'store_allowed'|'link_only'|'do_not_store';attribution_required:boolean;review_note:string}>;
};

type ZipEntry={name:string;compression:number;compressedSize:number;localOffset:number};
const decoder=new TextDecoder();
function u16(view:DataView,offset:number){return view.getUint16(offset,true)}
function u32(view:DataView,offset:number){return view.getUint32(offset,true)}
function xml(text:string){return new DOMParser().parseFromString(text,'application/xml')}
function slugify(value:string){return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,90)}
function text(value:unknown){return String(value??'').trim()}
function clip(value:string,max:number){return value.length<=max?value:value.slice(0,max-1).trimEnd()+'…'}
function splitTerms(value:string){return [...new Set(value.split(/;|\n|,(?=\s*[A-Za-z])/g).map(item=>item.trim()).filter(Boolean))]}
function durationWeeks(value:string){const match=value.match(/\b(\d{1,3})\s*week/i);return match?Number(match[1]):null}
function teamSize(value:string){const counts=[...value.matchAll(/(?:^|[,;])\s*(\d+)\s+/g)].map(match=>Number(match[1]));const sum=counts.reduce((a,b)=>a+b,0);return Math.max(1,Math.min(50,sum||5))}
function governance(...parts:string[]):'green'|'amber'|'red'|'link_only'{const value=parts.join(' ').toUpperCase();if(value.includes('RED'))return'red';if(value.includes('AMBER')||value.includes('HOLD'))return'amber';if(value.includes('GREEN')||value.includes('CC0')||value.includes('CC BY'))return'green';return'link_only'}
function attribution(licence:string){return /CC\s*BY|ATTRIBUT/i.test(licence)}
function rowObject(headers:WorkbookCell[],row:WorkbookCell[]){const out:Record<string,WorkbookCell>={};headers.forEach((header,index)=>{if(text(header))out[text(header)]=row[index]??null});return out}
function headerIndex(rows:WorkbookCell[][],candidates:string[]){return rows.findIndex(row=>candidates.includes(text(row[0])))}
function field(obj:Record<string,WorkbookCell>,...names:string[]){for(const name of names){if(name in obj)return text(obj[name])}return''}

async function inflateRaw(data:Uint8Array){if(typeof DecompressionStream==='undefined')throw new Error('This browser cannot safely read XLSX files. Use a current Chrome, Edge or Safari release.');const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return new Uint8Array(await new Response(stream).arrayBuffer())}

async function readZip(buffer:ArrayBuffer){
  const bytes=new Uint8Array(buffer),view=new DataView(buffer);let eocd=-1;
  for(let i=Math.max(0,bytes.length-65557);i<=bytes.length-22;i++){if(u32(view,i)===0x06054b50)eocd=i}
  if(eocd<0)throw new Error('The selected file is not a readable XLSX workbook.');
  const entries:ZipEntry[]=[];
  let cursor=u32(view,eocd+16);
  const count=u16(view,eocd+10);
  for(let i=0;i<count;i++){
    if(u32(view,cursor)!==0x02014b50)throw new Error('Workbook ZIP directory is invalid.');
    const compression=u16(view,cursor+10),compressedSize=u32(view,cursor+20),nameLen=u16(view,cursor+28),extraLen=u16(view,cursor+30),commentLen=u16(view,cursor+32),localOffset=u32(view,cursor+42);
    const name=decoder.decode(bytes.slice(cursor+46,cursor+46+nameLen));entries.push({name,compression,compressedSize,localOffset});cursor+=46+nameLen+extraLen+commentLen;
  }
  const map=new Map<string,Uint8Array>();
  for(const entry of entries){const local=entry.localOffset;if(u32(view,local)!==0x04034b50)continue;const nameLen=u16(view,local+26),extraLen=u16(view,local+28),start=local+30+nameLen+extraLen,raw=bytes.slice(start,start+entry.compressedSize);const data=entry.compression===0?raw:entry.compression===8?await inflateRaw(raw):null;if(data)map.set(entry.name,data)}
  return map;
}

function sharedStrings(doc:Document){return [...doc.getElementsByTagName('si')].map(si=>[...si.getElementsByTagName('t')].map(node=>node.textContent||'').join(''))}
function columnIndex(ref:string){const letters=(ref.match(/^[A-Z]+/i)?.[0]||'A').toUpperCase();let value=0;for(const char of letters)value=value*26+(char.charCodeAt(0)-64);return value-1}
function parseSheet(doc:Document,shared:string[]){const rows:WorkbookCell[][]=[];for(const row of [...doc.getElementsByTagName('row')]){const output:WorkbookCell[]=[];for(const cell of [...row.getElementsByTagName('c')]){const ref=cell.getAttribute('r')||'A1',index=columnIndex(ref),type=cell.getAttribute('t')||'',v=cell.getElementsByTagName('v')[0]?.textContent??'',inline=cell.getElementsByTagName('is')[0];let value:WorkbookCell=null;if(type==='s')value=shared[Number(v)]??'';else if(type==='inlineStr')value=inline?[...inline.getElementsByTagName('t')].map(n=>n.textContent||'').join(''):'';else if(type==='b')value=v==='1';else if(type==='str')value=v;else if(v!==''){const number=Number(v);value=Number.isFinite(number)?number:v}output[index]=value}rows.push(output)}return rows}

export async function readXlsxWorkbook(file:File):Promise<{sheets:WorkbookSheets;sha256:string}>{
  const buffer=await file.arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',buffer);const sha256=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');const entries=await readZip(buffer);
  const wbBytes=entries.get('xl/workbook.xml'),relsBytes=entries.get('xl/_rels/workbook.xml.rels');if(!wbBytes||!relsBytes)throw new Error('Workbook metadata is missing.');
  const wb=xml(decoder.decode(wbBytes)),rels=xml(decoder.decode(relsBytes));const relMap=new Map([...rels.getElementsByTagName('Relationship')].map(node=>[node.getAttribute('Id')||'',node.getAttribute('Target')||'']));const sharedBytes=entries.get('xl/sharedStrings.xml');const shared=sharedBytes?sharedStrings(xml(decoder.decode(sharedBytes))):[];const sheets:WorkbookSheets={};
  for(const sheet of [...wb.getElementsByTagName('sheet')]){const name=sheet.getAttribute('name')||'Sheet',rid=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||'',target=relMap.get(rid);if(!target)continue;const path=target.startsWith('/')?target.slice(1):`xl/${target.replace(/^\.\//,'')}`.replace('/worksheets/../','/');const bytes=entries.get(path);if(bytes)sheets[name]=parseSheet(xml(decoder.decode(bytes)),shared)}
  return{sheets,sha256};
}

export function normalizeCapabilityPathWorkbook(sheets:WorkbookSheets,source:{filename:string;sha256:string}):CapabilityPathImportManifest{
  const indexRows=sheets['Domain Paths Index'];const libraryRows=sheets['Project Library'];if(!indexRows||!libraryRows)throw new Error('Workbook must contain Domain Paths Index and Project Library sheets.');
  const indexHeader=headerIndex(indexRows,['Path Sheet']);if(indexHeader<0)throw new Error('Domain Paths Index header was not found.');const indexHeaders=indexRows[indexHeader];
  const index=indexRows.slice(indexHeader+1).map((row,i)=>({row:indexHeader+i+2,data:rowObject(indexHeaders,row)})).filter(item=>field(item.data,'Path Sheet'));
  const reviewRows=sheets['Review']||[],sourceRows=sheets['Sources']||[];const reviewHeader=headerIndex(reviewRows,['Project ID']),sourceHeader=headerIndex(sourceRows,['Project ID']);const reviewMap=new Map<string,Record<string,WorkbookCell>>(),sourceMap=new Map<string,Record<string,WorkbookCell>>();if(reviewHeader>=0){const headers=reviewRows[reviewHeader];reviewRows.slice(reviewHeader+1).forEach(row=>{const obj=rowObject(headers,row),id=field(obj,'Project ID');if(id)reviewMap.set(id,obj)})}if(sourceHeader>=0){const headers=sourceRows[sourceHeader];sourceRows.slice(sourceHeader+1).forEach(row=>{const obj=rowObject(headers,row),id=field(obj,'Project ID');if(id)sourceMap.set(id,obj)})}
  const libraryHeader=headerIndex(libraryRows,['Project ID']);if(libraryHeader<0)throw new Error('Project Library header was not found.');const libraryHeaders=libraryRows[libraryHeader];const projectMap=new Map<string,CapabilityPathImportManifest['projects'][number]>();
  libraryRows.slice(libraryHeader+1).forEach((row,i)=>{const obj=rowObject(libraryHeaders,row),id=field(obj,'Project ID');if(!id)return;const review=reviewMap.get(id)||{},src=sourceMap.get(id)||{};const title=field(obj,'Project Title');const useCase=field(obj,'Use Case (200+ words)'),objective=field(obj,'Project Objective'),decision=field(obj,'Decision to Support');const summary=clip([objective,decision].filter(Boolean).join(' ')||useCase||title,900);projectMap.set(id,{source_key:id,source_sheet:'Project Library',source_row:libraryHeader+i+2,slug:`${slugify(title)}-${slugify(id)}`,title,summary,problem_statement:field(obj,'Problem Statement (200+ words)'),use_case:useCase,decision_to_support:decision,project_objective:objective,deliverables:field(obj,'Specific Deliverables'),success_criteria:field(obj,'Success Criteria'),stakeholder:field(obj,'Stakeholder'),domain:field(obj,'Industry / Domain'),dataset:field(obj,'Dataset'),source_organisation:field(src,'Source')||field(obj,'Source'),source_url:field(src,'Working Link')||field(obj,'Data Link'),licence:field(src,'Licence')||field(obj,'Licence / Reuse'),data_reality:field(src,'Data Reality')||field(obj,'Data Reality'),technical_skills:splitTerms(field(obj,'Technical Skills')),professional_skills:splitTerms(field(obj,'Professional Skills')),tools:splitTerms(field(obj,'Tools')),methods:splitTerms(field(obj,'Methods')),team_roles:field(obj,'Team / Roles'),evidence_proof:field(obj,'Evidence / Proof'),duration_weeks:durationWeeks(field(obj,'Duration')),weekly_commitment:field(obj,'Weekly Commitment'),team_size:teamSize(field(obj,'Team / Roles')),review_decision:field(review,'Decision')||'UNREVIEWED'});});

  const paths:CapabilityPathImportManifest['paths']=[],placements:CapabilityPathImportManifest['placements']=[];
  index.forEach((item,sortIndex)=>{const sheetName=field(item.data,'Path Sheet'),rows=sheets[sheetName];if(!rows)return;const name=field(item.data,'Career / Domain Path'),targetRole=field(item.data,'Target Role'),progression=field(item.data,'Progression'),outcome=field(item.data,'End Capability');const pathKey=slugify(name||targetRole||sheetName);let purpose='';for(const row of rows.slice(0,8)){const first=text(row[0]);if(first==='Path Purpose')purpose=text(row.find((cell,index)=>index>0&&text(cell))||'');else if(/^Path purpose:/i.test(first))purpose=first.replace(/^Path purpose:\s*/i,'')}paths.push({source_key:pathKey,source_sheet:sheetName,source_row:item.row,slug:pathKey,name,target_role:targetRole,short_description:`A recommended professional progression through real Mettelo projects toward ${targetRole}.`,description:purpose,progression_summary:progression,target_outcome:outcome,sort_order:(sortIndex+1)*10});const h=headerIndex(rows,['Path #','Path Project #']);if(h<0)return;const headers=rows[h];const raw=rows.slice(h+1).map((row,i)=>({row:h+i+2,data:rowObject(headers,row)})).filter(item=>Number.isFinite(Number(field(item.data,'Path #','Path Project #')))&&Number(field(item.data,'Path #','Path Project #'))>0);const positionToProject=new Map(raw.map(entry=>[Number(field(entry.data,'Path #','Path Project #')),field(entry.data,'Project ID')]));for(const entry of raw){const position=Number(field(entry.data,'Path #','Path Project #')),projectId=field(entry.data,'Project ID'),stage=field(entry.data,'Stage','Path Stage'),prereqRaw=field(entry.data,'Prerequisite / Prior Project');let prereq='';const numberMatch=prereqRaw.match(/Project\s*(\d+)/i);if(numberMatch)prereq=positionToProject.get(Number(numberMatch[1]))||'';else if(projectMap.has(prereqRaw))prereq=prereqRaw;placements.push({source_key:`${pathKey}:${projectId}`,source_sheet:sheetName,source_row:entry.row,path_key:pathKey,project_source_key:projectId,position,stage_name:stage,stage_slug:slugify(stage)||`stage-${position}`,competency_focus:field(entry.data,'Competency Focus','Why This Project Is Here'),capability_built:field(entry.data,'Capability Built'),prerequisite_project_source_key:prereq,path_outcome:field(entry.data,'Path Outcome')})}}
  );

  const resources=[...projectMap.values()].filter(project=>project.source_url).map(project=>{const src=sourceMap.get(project.source_key)||{},review=reviewMap.get(project.source_key)||{},note=field(src,'Reuse Note')||field(review,'Legal / Licence OK?'),status=governance(note,project.licence);return{project_source_key:project.source_key,title:project.dataset||`${project.title} source`,source_organisation:project.source_organisation,source_url:project.source_url,licence:project.licence,data_reality:project.data_reality,governance_status:status,storage_decision:status==='red'?'do_not_store':status==='link_only'?'link_only':'review',attribution_required:attribution(project.licence),review_note:note}});
  const expectedPaths=index.length,expectedPlacements=index.reduce((sum,item)=>sum+(Number(field(item.data,'Projects'))||0),0);const expectedProjectIds=new Set(placements.map(item=>item.project_source_key));
  return{manifest_version:'capability-paths-v1',source_filename:source.filename,source_sha256:source.sha256,source_version:'v15',expected:{paths:expectedPaths,placements:expectedPlacements,projects:expectedProjectIds.size},paths,projects:[...projectMap.values()].filter(project=>expectedProjectIds.has(project.source_key)),placements,resources};
}
