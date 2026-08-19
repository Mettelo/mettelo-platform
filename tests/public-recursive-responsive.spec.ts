import {expect,test,type Browser,type Page} from '@playwright/test';

const viewports=[
  {width:375,height:812},
  {width:390,height:844},
  {width:414,height:896},
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
  const dimensions=await page.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth,
    bodyScrollWidth:document.body.scrollWidth
  }));
  expect(Math.max(dimensions.scrollWidth,dimensions.bodyScrollWidth),`${path} must not overflow horizontally`).toBeLessThanOrEqual(dimensions.clientWidth+1);
}

async function collectLinks(page:Page,origin:string){
  const hrefs=await page.locator('a[href]').evaluateAll(anchors=>anchors.map(anchor=>(anchor as HTMLAnchorElement).href));
  return hrefs.map(href=>normalizePublicPath(href,origin)).filter((path):path is string=>Boolean(path));
}

async function discoverPublicPaths(browser:Browser){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const rootResponse=await page.goto('/',{waitUntil:'domcontentloaded'});
  expect(rootResponse?.status()).toBeLessThan(400);
  const origin=new URL(page.url()).origin;
  const discovered=new Set<string>(seedRoutes);
  const queue=[...seedRoutes];

  const sitemap=await page.request.get(`${origin}/sitemap.xml`);
  if(sitemap.ok()){
    const xml=await sitemap.text();
    for(const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)){
      const path=normalizePublicPath(match[1],origin);
      if(path&&!discovered.has(path)){discovered.add(path);queue.push(path);}
    }
  }

  while(queue.length){
    const path=queue.shift()!;
    const response=await page.goto(`${origin}${path}`,{waitUntil:'domcontentloaded'});
    if(!response||response.status()>=400)continue;
    for(const linkedPath of await collectLinks(page,origin)){
      if(!discovered.has(linkedPath)){
        discovered.add(linkedPath);
        queue.push(linkedPath);
      }
    }
  }

  await page.close();
  return [...discovered].sort();
}

let publicPaths:string[]=[];

test.beforeAll(async({browser},testInfo)=>{
  testInfo.setTimeout(180_000);
  publicPaths=await discoverPublicPaths(browser);
  expect(publicPaths.length,'recursive public route discovery should find at least the seed public pages').toBeGreaterThanOrEqual(seedRoutes.length);
});

test.describe('recursive public responsive coverage',()=>{
  for(const viewport of viewports){
    test(`every discoverable public page reflows at ${viewport.width}px`,async({page})=>{
      test.setTimeout(240_000);
      await page.setViewportSize(viewport);
      for(const path of publicPaths){
        const response=await page.goto(path,{waitUntil:'domcontentloaded'});
        expect(response?.status(),`${path} should render`).toBeLessThan(400);
        await expect(page.locator('main')).toBeVisible();
        await expectNoHorizontalOverflow(page,path);
      }
    });
  }

  test('every discoverable public page survives 200 percent text sizing on mobile',async({page})=>{
    test.setTimeout(240_000);
    await page.setViewportSize({width:390,height:844});
    for(const path of publicPaths){
      const response=await page.goto(path,{waitUntil:'domcontentloaded'});
      expect(response?.status(),`${path} should render`).toBeLessThan(400);
      await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
      await expectNoHorizontalOverflow(page,path);
      await page.evaluate(()=>{document.documentElement.style.fontSize='';});
    }
  });

  test('public project detail stays single-column on phone widths',async({page})=>{
    test.setTimeout(90_000);
    const projectPath=publicPaths.find(path=>/^\/projects\/[^/]+$/.test(path));
    test.skip(!projectPath,'No public project detail is currently discoverable.');
    for(const width of [375,390,414]){
      await page.setViewportSize({width,height:896});
      const response=await page.goto(projectPath!,{waitUntil:'domcontentloaded'});
      expect(response?.status()).toBeLessThan(400);
      await expectNoHorizontalOverflow(page,projectPath!);
      const grid=page.locator('.projectDetailGridV2');
      await expect(grid).toBeVisible();
      const gridColumns=await grid.evaluate(element=>getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length);
      expect(gridColumns,`project detail should use one content column at ${width}px`).toBe(1);
      const side=await page.locator('.projectDetailSideV2').boundingBox();
      if(side)expect(side.width).toBeLessThanOrEqual(width);
    }
  });
});
