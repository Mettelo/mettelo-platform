import {expect,test,type Page} from '@playwright/test';

type Credentials={email:string;password:string};
const projectId='00000000-0000-4000-8000-00000000e2e1';
const runId='00000000-0000-4000-8000-00000000e211';
const chatUrl=`/member/projects/${projectId}?run=${runId}&view=chat`;

function credentials():Credentials{
 const email=process.env.E2E_MEMBER_EMAIL?.trim();
 const password=process.env.E2E_MEMBER_PASSWORD;
 if(!email||!password)throw new Error('Missing E2E member credentials.');
 return{email,password};
}

async function signIn(page:Page){
 const account=credentials();
 await page.goto(`/signin?next=${encodeURIComponent(chatUrl)}`,{waitUntil:'networkidle'});
 const main=page.locator('#main-content');
 await main.locator('input[type="email"]').fill(account.email);
 await main.locator('input[type="password"]').fill(account.password);
 await main.getByRole('button',{name:'Sign in →'}).click();
 await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000});
}

test('authenticated Lab member can create and read a run-scoped Chat message',async({page})=>{
 test.setTimeout(60_000);
 await signIn(page);

 const create=await page.request.post('/api/project-collaboration',{data:{
  action:'discussion',
  project_id:projectId,
  project_run_id:runId,
  body:'E2E Chat permission preflight',
  mentioned_user_ids:[],
  message_type:'update'
 }});
 const createBody=await create.text();
 expect(create.ok(),`Chat create failed (${create.status()}): ${createBody}`).toBeTruthy();

 const created=JSON.parse(createBody) as {item?:{id?:string}};
 expect(created.item?.id,'Chat create response includes the persisted message id').toBeTruthy();

 const read=await page.request.get(`/api/project-collaboration?project_id=${projectId}&project_run_id=${runId}`);
 const readBody=await read.text();
 expect(read.ok(),`Chat read failed (${read.status()}): ${readBody}`).toBeTruthy();
 const payload=JSON.parse(readBody) as {items?:Array<{id:string}>};
 expect(payload.items?.some(item=>item.id===created.item?.id),'New Chat message is readable in the same run').toBeTruthy();
});
