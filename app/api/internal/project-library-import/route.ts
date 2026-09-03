import {createHash} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';

const EXPECTED_TOKEN_HASH='9fdf51c3c426dbfa5b2b6d296cc493055a5bbcb5eeb8b84224ea5f70f9e573bb';

function authorised(token:string|null){
  if(!token)return false;
  return createHash('sha256').update(token).digest('hex')===EXPECTED_TOKEN_HASH;
}

export async function GET(request:NextRequest){
  const token=request.nextUrl.searchParams.get('token');
  if(!authorised(token))return new NextResponse('Not found',{status:404});
  const mode=request.nextUrl.searchParams.get('mode')||'reconcile';
  if(!['inspect','stage','reconcile','apply'].includes(mode))return NextResponse.json({error:'Unsupported mode'},{status:400});

  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY;
  if(!url||!serviceKey)return NextResponse.json({error:'Provider not configured'},{status:503});

  const response=await fetch(`${url.replace(/\/$/,'')}/functions/v1/project-library-protected-loader?mode=${encodeURIComponent(mode)}`,{
    method:'POST',
    headers:{Authorization:`Bearer ${serviceKey}`,apikey:serviceKey,'content-type':'application/json'},
    body:'{}',
    cache:'no-store'
  });
  const text=await response.text();
  return new NextResponse(text,{status:response.status,headers:{'content-type':response.headers.get('content-type')||'application/json','cache-control':'no-store'}});
}
