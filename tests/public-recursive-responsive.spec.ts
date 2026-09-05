import {expect,test,type Browser,type Page} from '@playwright/test';

const viewports=[
  {width:320,height:740},
  {width:360,height:800},
  {width:375,height:812},
  {width:390,height:844},
  {width:412,height:915},
  {width:414,height:896},
  {width:430,height:932},
  {width:768,height:1024},
  {width:1024,height:900},
  {width:1440,height:1000}
];

const blockedPrefixes=['/member','/admin','/api','/auth/callback','/dev'];
const seedRoutes=['/','/projects','/opportunities','/showcase','/people','/community','/events','/organisations','/partnership','/about','/blog','/careers','/contact','/feedback','/faq','/privacy','/terms','/community-guidelines','/signin'];

function normalizePublicPath(href:string,origin:string){
  try{
    const url=new URL(href,origin);
    if(url.origin!==origin)return null;
    if(blockedPrefixes.some(prefix=>url.pathname===prefix||url.pathname.startsWith(`${prefix}/`)))return null;
    if(/\.(?:png|jpe?g|gif|svg|webp|ico|pdf|zip|xml|txt)$/i.test(url.pathname))return null;
    return url.pathname.replace(/\/+$/,'')||'/';
  }catch{return null;}
}

async function expectNoHorizontalOverflow(page:Page,path:string){
  const report=await page.evaluate(()=>{
    const clientWidth=document.documentElement.clientWidth;
    const maxScrollWidth=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth);
    const offenders=Array.from(document.querySelectorAll<HTMLElement>('body *')).flatMap(element=>{
      const style=getComputedStyle(element);
      if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return [];
      const rect=element.getBoundingClientRect();
      if(rect.width===0&&rect.height===0)return [];
      if(element.closest('[data-horizontal-scroll="true"]'))return [];
      if(rect.left>=-1&&rect.right<=clientWidth+1&&element.scrollWidth<=Math.ceil(rect.width)+1)return [];
      return [{tag:element.tagName.toLowerCase(),id:element.id,className:element.className?.toString().slice(0,100)||'',left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width),scrollWidth:element.scrollWidth,whiteSpace:style.whiteSpace,overflowWrap:style.overflowWrap}];
    }).slice(0,10);
    return{clientWidth,maxScrollWidth,offenders};
  });
  expect(report.maxScrollWidth,`${path} must not overflow horizontally: ${JSON.stringify(report.offenders)}`).toBeLessThanOrEqual(report.clientWidth+1);
}

async function expectNoUnexpectedViewportEscape(page:Page,path:string){
  const offenders=await page.evaluate(()=>{
    const width=window.innerWidth;
    return Array.from(document.querySelectorAll<HTMLElement>('#main-content *')).flatMap(element=>{
      const style=getComputedStyle(element);
      if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return [];
      const rect=element.getBoundingClientRect();
      if(rect.width===0&&rect.height===0)return [];
      if(element.closest('[data-horizontal-scroll="true"]'))return [];
      const allowsHorizontalScroll=['auto','scroll'].includes(style.overflowX);
      if(allowsHorizontalScroll)return [];
      if(rect.left>=-1&&rect.right<=width+1)return [];
      return [{tag:element.tagName.toLowerCase(),className:element.className?.toString().slice(0,120)||'',left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width)}];
    }).slice(0,8);
  });
  expect(offenders,`${path} has visible elements escaping the mobile viewport: ${JSON.stringify(offenders)}`).toEqual([]);
}

async function collectLinks(page:Page,origin:string){
  const hrefs=await page.locator('a[href]').evaluateAll(anchors=>anchors.map(anchor=>(anchor as HTMLAnchorElement).href));
  return hrefs.map(href=>normalizePublicPath(href,origin)).filter((path):path is string=>Boolean(path));
}

async function discoverPublicPaths(browser:Browser){
  const context=await browser.newContext({viewport:{width:390,height:844},baseURL:process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:3000'});
  const page=await context.newPage();
  const origin=new URL(process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:3000').origin;
  const discovered=new Set<string>(seedRoutes);
  const queue=[...seedRoutes];

  const sitemap=await context.request.get('/sitemap.xml');
  if(sitemap.ok()){
    const xml=await sitemap.text();
    for(const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)){
      const path=normalizePublicPath(match[1],origin);
      if(path&&!discovered.has(path)){discovered.add(path);queue.push(path);}
    }
  }

  while(queue.length){
    const path=queue.shift()!;
    const response=await page.goto(path,{waitUntil:'domcontentloaded'});
    if(!response||response.status()>=400)continue;
    for(const linkedPath of await collectLinks(page,origin)){
      if(!discovered.has(linkedPath)){discovered.add(linkedPath);queue.push(linkedPath);}
    }
  }

  await context.close();
  return [...discovered].sort();
}

let publicPaths:string[]=[];

test.beforeAll(async({browser})=>{
  test.setTimeout(180_000);
  publicPaths=await discoverPublicPaths(browser);
  expect(publicPaths.length,'recursive public route discovery should find at least the seed pages').toBeGreaterThanOrEqual(seedRoutes.length);
});

test.describe('recursive public responsive coverage',()=>{
  for(const viewport of viewports){
    test(`every discoverable public page reflows at ${viewport.width}px`,async({page})=>{
      test.setTimeout(420_000);
      await page.setViewportSize(viewport);
      for(const path of publicPaths){
        const response=await page.goto(path,{waitUntil:'domcontentloaded'});
        expect(response?.status(),`${path} should render`).toBeLessThan(400);
        await expect(page.locator('#main-content')).toBeVisible();
        await expect(page.locator('main'),`${path} should expose exactly one main landmark`).toHaveCount(1);
        await expectNoHorizontalOverflow(page,path);
        if(viewport.width<=430)await expectNoUnexpectedViewportEscape(page,path);
      }
    });
  }

  for(const width of [320,390]){
    test(`every discoverable public page survives 200 percent text sizing at ${width}px`,async({page})=>{
      test.setTimeout(420_000);
      await page.setViewportSize({width,height:900});
      for(const path of publicPaths){
        const response=await page.goto(path,{waitUntil:'domcontentloaded'});
        expect(response?.status(),`${path} should render`).toBeLessThan(400);
        await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
        await expect(page.locator('main'),`${path} should expose exactly one main landmark`).toHaveCount(1);
        await expectNoHorizontalOverflow(page,path);
        await expectNoUnexpectedViewportEscape(page,path);
        await page.evaluate(()=>{document.documentElement.style.fontSize='';});
      }
    });
  }

  test('public project detail stays single-column across phone portrait and landscape widths',async({page})=>{
    test.setTimeout(120_000);
    const projectPath=publicPaths.find(path=>/^\/projects\/(?!paths$)[^/]+$/.test(path));
    test.skip(!projectPath,'No public project detail is currently discoverable.');
    for(const viewport of [{width:320,height:740},{width:360,height:800},{width:375,height:812},{width:390,height:844},{width:412,height:915},{width:414,height:896},{width:430,height:932},{width:667,height:375},{width:844,height:390}]){
      await page.setViewportSize(viewport);
      const response=await page.goto(projectPath!,{waitUntil:'domcontentloaded'});
      expect(response?.status()).toBeLessThan(400);
      await expectNoHorizontalOverflow(page,projectPath!);
      await expectNoUnexpectedViewportEscape(page,projectPath!);
      const content=page.locator('#project-content');
      await expect(content).toBeVisible();
      const contentBox=await content.boundingBox();
      expect(contentBox,`project detail content should render at ${viewport.width}x${viewport.height}`).not.toBeNull();
      if(contentBox)expect(contentBox.width).toBeLessThanOrEqual(viewport.width+1);
      // Phase 4 public discovery hands off through the governed Submit interest CTA.
      await expect(page.getByRole('link',{name:'Submit interest',exact:true}).last()).toBeVisible();
    }
  });

  test('mobile navigation opens without escaping the viewport',async({page})=>{
    test.setTimeout(180_000);
    for(const width of [320,360,390,430]){
      await page.setViewportSize({width,height:844});
      for(const path of ['/','/projects','/opportunities']){
        await page.goto(path,{waitUntil:'domcontentloaded'});
        const menu=page.locator('.mobileMenu');
        const summary=menu.locator(':scope > summary');
        await expect(summary).toBeVisible();
        await expect(menu).toHaveAttribute('data-mobile-menu-enhanced','true',{timeout:15_000});
        await summary.click();
        await expect(menu).toHaveAttribute('open','');
        const panel=page.locator('#mobile-navigation-panel');
        await expect(panel).toBeVisible();
        await expectNoHorizontalOverflow(page,path);
        await expectNoUnexpectedViewportEscape(page,path);
        const close=panel.locator('[data-mobile-menu-close]');
        await expect(close).toBeVisible();
        await close.click();
        await expect(menu).not.toHaveAttribute('open','');
      }
    }
  });
});