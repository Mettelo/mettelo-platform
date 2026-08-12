import {NextResponse} from 'next/server';
import {RoomServiceClient} from 'livekit-server-sdk';

export const dynamic='force-dynamic';

function validLiveKitUrl(value:string|undefined){
  if(!value)return false;
  try{return ['wss:','https:'].includes(new URL(value.trim()).protocol)}catch{return false}
}

function providerErrorCategory(error:unknown){
  const candidate=error as {status?:number;statusCode?:number;code?:string;name?:string;message?:string};
  const status=Number(candidate?.status||candidate?.statusCode||0);
  const code=String(candidate?.code||'').toUpperCase();
  const name=String(candidate?.name||'').toLowerCase();
  const message=String(candidate?.message||'').toLowerCase();
  if(status===401||status===403||message.includes('unauthorized')||message.includes('forbidden')||message.includes('authentication'))return 'authentication';
  if(message.includes('provider timeout')||name.includes('timeout')||code==='ETIMEDOUT'||code==='ESOCKETTIMEDOUT')return 'timeout';
  if(code==='ENOTFOUND'||code==='EAI_AGAIN'||code==='ECONNREFUSED'||code==='ECONNRESET'||message.includes('fetch failed')||message.includes('network'))return 'network';
  if(code.includes('CERT')||message.includes('certificate')||message.includes('tls')||message.includes('ssl'))return 'tls';
  return 'provider';
}

export async function GET(){
  const serverUrl=process.env.LIVEKIT_URL?.trim();
  const publicUrl=process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim();
  const apiKey=process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret=process.env.LIVEKIT_API_SECRET?.trim();
  const configured={
    serverUrl:validLiveKitUrl(serverUrl),
    publicUrl:validLiveKitUrl(publicUrl),
    apiKey:Boolean(apiKey),
    apiSecret:Boolean(apiSecret),
  };
  const urlMatch=configured.serverUrl&&configured.publicUrl&&serverUrl===publicUrl;
  if(!Object.values(configured).every(Boolean))return NextResponse.json({ready:false,configured,urlMatch,providerReachable:false,providerError:'configuration'},{status:503,headers:{'cache-control':'no-store'}});
  try{
    const apiUrl=serverUrl!.replace(/^wss:/,'https:').replace(/^ws:/,'http:');
    const client=new RoomServiceClient(apiUrl,apiKey!,apiSecret!);
    await Promise.race([
      client.listRooms(),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('Provider timeout')),5000)),
    ]);
    return NextResponse.json({ready:true,configured,urlMatch,providerReachable:true,providerError:null},{headers:{'cache-control':'no-store'}});
  }catch(error){
    const providerError=providerErrorCategory(error);
    console.warn('LiveKit provider health check failed',{providerError});
    return NextResponse.json({ready:false,configured,urlMatch,providerReachable:false,providerError},{status:503,headers:{'cache-control':'no-store'}});
  }
}
