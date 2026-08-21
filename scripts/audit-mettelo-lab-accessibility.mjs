import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const accessibility=read('app/member/projects/[id]/phase17-accessibility-hardening.module.css');
const mobile=read('app/member/projects/[id]/phase4-mobile-fixes.module.css');
const layout=read('app/member/projects/[id]/layout.tsx');
const nav=read('components/MetteloLabNavigation.tsx');
const chat=read('components/ProjectMessagePanel.tsx');
const visual=read('tests/mettelo-lab-visual.spec.ts');

const assert=(condition,message)=>{if(!condition)throw new Error(`Mettelo Lab accessibility audit failed: ${message}`)};

assert(mobile.includes("composes:accessibility from './phase17-accessibility-hardening.module.css'"),'Phase 17 accessibility layer must remain composed into the Lab shell');
assert(accessibility.includes(':focus-visible'),'interactive focus visibility must remain explicit');
assert(accessibility.includes('min-height:44px'),'practical interactive targets must remain at least 44px');
assert(accessibility.includes('@media(prefers-reduced-motion:reduce)'),'reduced-motion hardening must remain present');
assert(accessibility.includes('@media(forced-colors:active)'),'forced-colours support must remain present');
assert(accessibility.includes('var(--lab-shell-focus)'),'focus treatment must use the shared Lab shell token');
assert(layout.includes('Skip to Mettelo Lab content'),'Lab skip link must remain available');
assert(layout.includes('aria-label="Mettelo Lab workspace"'),'Lab workspace landmark must remain labelled');
assert(nav.includes("aria-current={active===item.view?'page':undefined}"),'navigation must continue exposing current-page semantics');
assert(chat.includes('aria-label="Send message"'),'Chat send control must remain explicitly named');
assert(chat.includes('role="log"')&&chat.includes('aria-live="polite"'),'Chat feed/live feedback semantics must remain available');
assert(visual.includes("page.emulateMedia({reducedMotion:'reduce'})"),'Chromium Lab QA must continue exercising reduced motion');
assert(visual.includes("document.documentElement.style.fontSize='200%'"),'Chromium Lab QA must continue exercising 200% text zoom');

console.log('Mettelo Lab accessibility audit passed.');
