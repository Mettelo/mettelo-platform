import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  fullyParallel:false,
  retries:1,
  workers:1,
  reporter:'line',
  use:{baseURL:'http://127.0.0.1:3000',trace:'retain-on-failure'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
  webServer:{command:'npm run dev -- --hostname 127.0.0.1',url:'http://127.0.0.1:3000/signin',reuseExistingServer:false,timeout:120000,env:{NEXT_PUBLIC_SITE_URL:'http://127.0.0.1:3000',NEXT_PUBLIC_SUPABASE_URL:'https://aconptuqupsgznyrxhrh.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_C5OTze0onbkbLl7Lorpjcg_FX1kDL6P'}}
});
