import {defineConfig,devices} from '@playwright/test';

const baseURL=process.env.E2E_BASE_URL?.replace(/\/$/,'')||'http://127.0.0.1:3000';
const useRemoteDeployment=Boolean(process.env.E2E_BASE_URL);
const supabaseUrl=process.env.E2E_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'';
const supabaseAnonKey=process.env.E2E_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';

export default defineConfig({
  testDir:'./tests',
  fullyParallel:true,
  retries:1,
  workers:process.env.CI?4:2,
  reporter:'line',
  use:{baseURL,trace:'retain-on-failure'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
  webServer:useRemoteDeployment?undefined:{
    command:'npm run dev -- --hostname 127.0.0.1',
    url:'http://127.0.0.1:3000/signin',
    reuseExistingServer:false,
    timeout:120000,
    env:{
      ...process.env,
      NEXT_PUBLIC_SITE_URL:'http://127.0.0.1:3000',
      NEXT_PUBLIC_SUPABASE_URL:supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY:supabaseAnonKey,
      SUPABASE_SERVICE_ROLE_KEY:process.env.E2E_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||''
    }
  }
});
