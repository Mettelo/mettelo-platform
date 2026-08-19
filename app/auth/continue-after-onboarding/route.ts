import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';

function safePath(value:string|null){return value&&value.startsWith('/')&&!value.startsWith('//')?value:'/member'}

export async function GET(request:Request){
  const url=new URL(request.url);const store=await cookies();const fallback=safePath(url.searchParams.get('fallback'));const intent=safePath(store.get('mettelo_return_to')?.value||null);const response=NextResponse.redirect(new URL(intent||fallback,url.origin));response.cookies.set('mettelo_return_to','',{httpOnly:true,sameSite:'lax',secure:url.protocol==='https:',path:'/',maxAge:0});return response;
}
