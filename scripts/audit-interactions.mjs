import fs from 'node:fs';
import path from 'node:path';

const roots=['app','components'];
const extensions=new Set(['.ts','.tsx','.js','.jsx']);
const files=[];
function walk(dir){
  if(!fs.existsSync(dir))return;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);
    else if(extensions.has(path.extname(entry.name)))files.push(full);
  }
}
roots.forEach(walk);

const issues=[];
const inventory=[];
const apiCalls=new Map();
function lineOf(text,index){return text.slice(0,index).split('\n').length;}
function addIssue(severity,file,line,type,detail){issues.push({severity,file,line,type,detail});}
function routeExists(url){
  const clean=url.split('?')[0].replace(/\/$/,'');
  const exact=path.join('app',clean,'route.ts');
  const exactJs=path.join('app',clean,'route.js');
  return fs.existsSync(exact)||fs.existsSync(exactJs);
}

// Return JSX opening tags without mistaking comparison/arrow operators inside
// attribute expressions (for example disabled={page>=pages}) for the tag end.
function* openingTags(text,tagName){
  const startPattern=new RegExp(`<${tagName}\\b`,'g');
  for(const match of text.matchAll(startPattern)){
    const start=match.index??0;let i=start+match[0].length;let braces=0;let quote='';let escaped=false;
    for(;i<text.length;i++){
      const ch=text[i];
      if(quote){
        if(escaped){escaped=false;continue;}
        if(ch==='\\\\'){escaped=true;continue;}
        if(ch===quote)quote='';
        continue;
      }
      if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
      if(ch==='{'){braces++;continue;}
      if(ch==='}'&&braces>0){braces--;continue;}
      if(ch==='>'&&braces===0){
        yield {index:start,attrs:text.slice(start+match[0].length,i)};
        break;
      }
    }
  }
}

for(const file of files){
  const text=fs.readFileSync(file,'utf8');
  const hasForm=/<form\b/.test(text);

  for(const match of openingTags(text,'form')){
    const attrs=match.attrs||'';const line=lineOf(text,match.index);
    const wired=/\bonSubmit\s*=/.test(attrs)||/\baction\s*=/.test(attrs);
    inventory.push({kind:'form',file,line,wired});
    if(!wired)addIssue('error',file,line,'form-no-action','Form has neither onSubmit nor action.');
    const action=attrs.match(/\baction\s*=\s*["']([^"']+)["']/)?.[1];
    if(action?.startsWith('/api/')&&!routeExists(action))addIssue('error',file,line,'missing-api-route',`Form action ${action} has no matching app API route.`);
  }

  for(const match of openingTags(text,'button')){
    const attrs=match.attrs||'';const line=lineOf(text,match.index);
    const explicitSubmit=/\btype\s*=\s*["']submit["']/.test(attrs);
    const explicitButton=/\btype\s*=\s*["']button["']/.test(attrs);
    const handler=/\bonClick\s*=|\bonPointerDown\s*=|\bonMouseDown\s*=/.test(attrs);
    const menuControl=/\baria-(expanded|controls|haspopup)\s*=/.test(attrs);
    const implicitSubmit=!explicitButton&&!explicitSubmit&&hasForm;
    const wired=explicitSubmit||implicitSubmit||handler||menuControl;
    inventory.push({kind:'button',file,line,wired,submit:explicitSubmit||implicitSubmit});
    if(!wired)addIssue('error',file,line,'button-no-action','Button has no click handler and is not a submit/menu control.');
  }

  for(const match of openingTags(text,'input')){
    const attrs=match.attrs||'';const line=lineOf(text,match.index);
    if(/\btype\s*=\s*["'](button|submit)["']/.test(attrs)){
      const submit=/\btype\s*=\s*["']submit["']/.test(attrs);const handler=/\bonClick\s*=/.test(attrs);
      inventory.push({kind:'input-action',file,line,wired:submit||handler});
      if(!submit&&!handler)addIssue('error',file,line,'input-button-no-action','Action input has no handler.');
    }
  }

  for(const match of openingTags(text,'a')){
    const attrs=match.attrs||'';const line=lineOf(text,match.index);
    const href=attrs.match(/\bhref\s*=\s*["']([^"']*)["']/)?.[1];
    if(href!==undefined){
      inventory.push({kind:'link',file,line,wired:Boolean(href&&href!=='#')});
      if(!href||href==='#'||href.startsWith('javascript:'))addIssue('error',file,line,'dead-link',`Anchor uses non-functional href: ${href||'(empty)'}.`);
    }
  }

  for(const match of text.matchAll(/fetch\(\s*[`"']([^`"']+)[`"']/g)){
    const url=match[1];const line=lineOf(text,match.index||0);
    if(url.startsWith('/api/')){
      const base=url.split('${')[0].replace(/\/$/,'');
      const calls=apiCalls.get(base)||[];calls.push({file,line});apiCalls.set(base,calls);
      if(!url.includes('${')&&!routeExists(url))addIssue('error',file,line,'missing-api-route',`fetch(${url}) has no matching app API route.`);
    }
  }
}

const counts=inventory.reduce((acc,item)=>{acc[item.kind]=(acc[item.kind]||0)+1;return acc;},{});
const report={generated_at:new Date().toISOString(),files_scanned:files.length,counts,api_endpoints:[...apiCalls.entries()].map(([url,calls])=>({url,calls})),issues};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/interaction-audit.json',JSON.stringify(report,null,2));
const md=[
  '# Mettelo Interaction Audit','',
  `Files scanned: ${files.length}`,
  `Forms: ${counts.form||0} · Buttons: ${counts.button||0} · Action inputs: ${counts['input-action']||0} · Links: ${counts.link||0}`,'',
  `Definite wiring issues: ${issues.length}`,'',
  ...issues.map(i=>`- **${i.type}** — \`${i.file}:${i.line}\` — ${i.detail}`),
  '', '## API calls',
  ...[...apiCalls.entries()].map(([url,calls])=>`- \`${url}\` — ${calls.map(c=>`${c.file}:${c.line}`).join(', ')}`)
];
fs.writeFileSync('artifacts/interaction-audit.md',md.join('\n'));
console.log(md.join('\n'));
if(issues.length){process.exitCode=1;}
