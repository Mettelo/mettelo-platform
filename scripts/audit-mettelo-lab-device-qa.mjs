import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const spec=read('tests/mettelo-lab-device-qa.spec.ts');
const visual=read('tests/mettelo-lab-visual.spec.ts');
const pkg=read('package.json');
const checks=[
 ['device QA spec exists',spec.includes('Mettelo Lab survives 200% text zoom across every destination')],
 ['all primary Lab views covered',"['home','plan','tasks','chat','data','proof','resources','events','team']".split(',').every(token=>spec.includes(token.replace(/[\[\]']/g,'')))],
 ['200 percent text zoom covered',spec.includes("document.documentElement.style.fontSize='200%'")],
 ['secondary More active hierarchy covered',spec.includes('More preserves mobile location for secondary destinations')&&spec.includes('data-more-current')],
 ['short mobile landscape covered',spec.includes('width:430,height:500')&&spec.includes('short mobile landscape')],
 ['interactive viewport containment covered',spec.includes('assertVisibleContentWithinViewport')],
 ['horizontal overflow covered',spec.includes('assertNoHorizontalOverflow')],
 ['existing screenshot matrix retained',visual.includes("phone-320")&&visual.includes("phone-430")&&visual.includes("tablet-768")&&visual.includes("tablet-1024")&&visual.includes("desktop-1440")],
 ['existing screenshot capture retained',visual.includes('artifacts/mettelo-lab-visual')&&visual.includes('page.screenshot')],
 ['device QA runs in smoke',pkg.includes('tests/mettelo-lab-device-qa.spec.ts')],
 ['Phase 18 audit chained',pkg.includes('audit-mettelo-lab-device-qa.mjs')]
];
const failed=checks.filter(([,ok])=>!ok);if(failed.length){for(const[name]of failed)console.error(`FAIL: ${name}`);process.exit(1)}for(const[name]of checks)console.log(`PASS: ${name}`);
