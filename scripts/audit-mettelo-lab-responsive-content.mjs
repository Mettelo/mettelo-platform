import fs from 'node:fs';

const css=fs.readFileSync('app/member/projects/[id]/phase16-responsive-content-stress.module.css','utf8');
const composition=fs.readFileSync('app/member/projects/[id]/phase4-mobile-fixes.module.css','utf8');
const visual=fs.readFileSync('tests/mettelo-lab-visual.spec.ts','utf8');

const required=[
  'composes:contentStress',
  'overflow-wrap:break-word',
  'word-break:normal',
  'font-size:clamp(1.75rem,3.8vw,2.55rem)',
  '@media(max-width:768px)',
  '@media(max-width:480px)',
  '@media(max-width:360px)',
  'grid-template-columns:1fr',
  'max-width:100%'
];
for(const token of required){
  const source=token==='composes:contentStress'?composition:css;
  if(!source.includes(token))throw new Error(`Phase 16 responsive-content contract missing: ${token}`);
}
for(const width of ['320','360','375','390','412','414','430','768','1024','1440']){
  if(!visual.includes(`width:${width}`))throw new Error(`Phase 16 requires viewport ${width} in Mettelo Lab visual QA.`);
}
if(!visual.includes("document.documentElement.style.fontSize='200%'"))throw new Error('Phase 16 requires 200% text-zoom coverage.');
if(!visual.includes('assertNoHorizontalOverflow'))throw new Error('Phase 16 requires horizontal-overflow assertions.');
if(/overflow-wrap:anywhere/.test(css))throw new Error('Phase 16 must use natural break-word wrapping, not aggressive anywhere wrapping.');
console.log('Phase 16 Mettelo Lab responsive content audit passed.');
